const express = require('express');
const Web3 = require('web3');
require('dotenv').config();
const NodeCache = require('node-cache');

const app = express();
const port = 4000;

// Connect to the Sepolia testnet using Infura
const web3 = new Web3(new Web3.providers.HttpProvider(`https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`));

//const abi = [
//	{
//		"inputs": [],
//		"name": "rollDice",
//		"outputs": [
//			{
//				"internalType": "uint256",
//				"name": "",
//				"type": "uint256"
//			}
//		],
//		"stateMutability": "view",
//		"type": "function"
//	}
//];

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
const contract = new web3.eth.Contract(abi, contractAddress);

// Unlock your account (Replace with your account and private key)
const account = process.env.ACCOUNT_ADDRESS;
const privateKey = process.env.PRIVATE_KEY;

// Cache setup
const cache = new NodeCache({ stdTTL: 600 }); // 10 minutes

// Endpoint to get the random number
//app.get('/roll-dice', async (req, res) => {
//    try {
//        const rollDiceResponse = await contract.methods.rollDice().call();
//        console.log("rollDiceResponse: ", rollDiceResponse);
//        res.json({ rollDiceResponse });
//    } catch (error) {
//        res.status(500).json({ error: error.message });
//    }
//});

// Endpoint to roll dice
app.get('/roll-dice', async (req, res) => {
  try {
    const tx = contract.methods.rollDice();
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

    web3.eth.sendSignedTransaction(signedTx.rawTransaction)
      .on('receipt', async (receipt) => {

        console.log("sendSignedTransaction - receipt: ", receipt);
        // Decode event logs to get the dice roll result
        const eventAbi = contract.options.jsonInterface.find((e) => e.name === 'DiceRolled' && e.type === 'event');
        const event = receipt.logs.find(log => log.address.toLowerCase() === contractAddress.toLowerCase());

        if (event) {
          const decodedEvent = web3.eth.abi.decodeLog(eventAbi.inputs, event.data, event.topics.slice(1));
          res.json({ rollDiceResponse: decodedEvent.result, receiptFromSignedTransaction: receipt });
        } else {
          res.status(500).json({ error: "Event not found in transaction receipt" });
        }
      })
      .on('error', (error) => {
        res.status(500).json({ error: error.message });
      });


  } catch (error) {
    res.status(500).json({ error: error.message });
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

// Endpoint to fetch blocks containing rollDice transactions with pagination
app.get('/fetch-roll-dice-blocks', async (req, res) => {
  // const page = parseInt(req.query.page) || 1;
  // const pageSize = parseInt(req.query.pageSize) || 1000; // Fetch 1000 blocks at a time

  try {
    // const cacheKey = `events_${page}_${pageSize}`;
    // if (cache.has(cacheKey)) {
    //   return res.json(cache.get(cacheKey));
    // }

    const events = await contract.getPastEvents('DiceRolled', {
      fromBlock: 0,
      toBlock: 'latest'
    });

    const blocks = new Set();
    for (let event of events) {
      blocks.add(event.blockNumber);
    }

    const blockData = [];
    for (let blockNumber of blocks) {
      const block = await web3.eth.getBlock(blockNumber, true); // Fetch block with transaction details
      blockData.push(block);
    }

    // cache.set(cacheKey, blockData);
    res.json(blockData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
