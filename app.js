const express = require('express');
const Web3 = require('web3');

require('dotenv').config();
const NodeCache = require('node-cache');
const WebSocket = require('ws');
const EventEmitter = require('events');


const app = express();
const port = 4000;
const abi = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "roller",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "result",
        "type": "uint256"
      }
    ],
    "name": "DiceRolled",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "rollDice",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// Contract address
const contractAddress = process.env.CONTRACT_ADDRESS;

// Set up WebSocket connection
const wsProvider = new Web3.providers.WebsocketProvider(`wss://sepolia.infura.io/ws/v3/${process.env.INFURA_PROJECT_ID}`);
const web3Ws = new Web3(wsProvider);

const web3 = new Web3(new Web3.providers.HttpProvider(`https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`));


// Create contract instances for both HTTP and WebSocket providers
const contract = new web3.eth.Contract(abi, contractAddress);
const contractWs = new web3Ws.eth.Contract(abi, contractAddress);

// Set up event emitter for transaction results
const txEventEmitter = new EventEmitter();

// Unlock your account (Replace with your account and private key)
const account = process.env.ACCOUNT_ADDRESS;
const privateKey = process.env.PRIVATE_KEY;

const cache = new NodeCache({ stdTTL: 600 }); // Cache for 10 minutes

// Function to process transaction in the background
async function processTransaction(txHash, txId) {
  try {
    const receipt = await web3.eth.getTransactionReceipt(txHash);
    if (receipt) {
      const event = receipt.logs.find(log => log.address.toLowerCase() === contractAddress.toLowerCase());
      if (event) {
        const eventAbi = contract.options.jsonInterface.find((e) => e.name === 'DiceRolled' && e.type === 'event');
        const decodedEvent = web3.eth.abi.decodeLog(eventAbi.inputs, event.data, event.topics.slice(1));
        cache.set(txId, { status: 'completed', result: decodedEvent.result });
      }
    } else {
      setTimeout(() => processTransaction(txHash, txId), 5000); // Retry after 5 seconds
    }
  } catch (error) {
    console.error('Error processing transaction:', error);
    cache.set(txId, { status: 'error', message: error.message });
  }
}

// Endpoint to roll dice
app.get('/roll-dice', async (req, res) => {
  try {
    const tx = contractWs.methods.rollDice();
    const gas = await tx.estimateGas({ from: account });
    const gasPrice = await web3.eth.getGasPrice();
    const data = tx.encodeABI();
    const nonce = await web3.eth.getTransactionCount(account);

    const signedTx = await web3.eth.accounts.signTransaction(
      {
        to: contractAddress,
        data,
        gas,
        gasPrice,
        nonce,
        chainId: 11155111 // Sepolia testnet chain ID
      },
      privateKey
    );

    // Generate a unique ID for this transaction
    const txId = web3.utils.sha3(Date.now().toString() + account);

    // Send the transaction
    web3.eth.sendSignedTransaction(signedTx.rawTransaction)
      .on('transactionHash', (hash) => {
        cache.set(txId, { status: 'pending', hash });
        processTransaction(hash, txId); // Start processing in background
        // Respond immediately with the transaction hash
        res.json({ txId, transactionHash: hash, message: "Transaction submitted. Waiting for confirmation." });
      })
      // .on('receipt', (receipt) => {
      //   const event = receipt.logs.find(log => log.address.toLowerCase() === contractAddress.toLowerCase());
      //   if (event) {
      //     const eventAbi = contract.options.jsonInterface.find((e) => e.name === 'DiceRolled' && e.type === 'event');
      //     const decodedEvent = web3.eth.abi.decodeLog(eventAbi.inputs, event.data, event.topics.slice(1));
      //     cache.set(txId, { status: 'completed', result: decodedEvent.result, receipt });
      //   }
      // })
      .on('error', (error) => {
        cache.set(txId, { status: 'error', message: error.message });
      });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to get the result of a specific transaction
app.get('/roll-dice-result/:txId', (req, res) => {
  const txId = req.params.txId;
  const result = cache.get(txId);

  if (result) {
    res.json(result);
  } else {
    res.status(404).json({ message: "Transaction not found or expired from cache" });
  }
});


// Endpoint to get block details
app.get('/block/:blockNumber', async (req, res) => {
  const blockNumber = req.params.blockNumber;
  try {
    const block = await web3.eth.getBlock(blockNumber);
    console.log("blockNumber: ", blockNumber, " - ", "block: ", block);
    res.json(block);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// New endpoint to get all rollDice blocks and transactions
app.get('/roll-dice-history', async (req, res) => {
  try {
    // Get all DiceRolled events
    const events = await contract.getPastEvents('DiceRolled', {
      fromBlock: 0,
      toBlock: 'latest'
    });

    // Process events to get block and transaction details
    const rollDiceHistory = await Promise.all(events.map(async (event) => {
      const block = await web3.eth.getBlock(event.blockNumber);
      const transaction = await web3.eth.getTransaction(event.transactionHash);

      return {
        blockNumber: event.blockNumber,
        blockHash: block.hash,
        blockTimestamp: new Date(block.timestamp * 1000).toISOString(),
        transactionHash: event.transactionHash,
        from: transaction.from,
        to: transaction.to,
        rollResult: event.returnValues.result
      };
    }));

    res.json(rollDiceHistory);
  } catch (error) {
    console.error('Error fetching roll dice history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// Set up WebSocket event listener
contractWs.events.DiceRolled()
  .on('data', (event) => {
    console.log('Dice rolled:', event.returnValues.result);
    // You can add additional logic here to handle the event
  })
  .on('error', console.error);