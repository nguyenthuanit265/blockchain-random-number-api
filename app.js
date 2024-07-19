const express = require('express');
const Web3 = require('web3');
require('dotenv').config();

const app = express();
const port = 4000;

// Connect to the Sepolia testnet using Infura
const web3 = new Web3(new Web3.providers.HttpProvider(`https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`));

// ABI of your deployed contract
// const abi = [
//     {
//         "inputs": [],
//         "name": "getRandomNumber",
//         "outputs": [
//             {
//                 "internalType": "uint256",
//                 "name": "",
//                 "type": "uint256"
//             }
//         ],
//         "stateMutability": "view",
//         "type": "function"
//     }
// ];

const abi = [
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
		"stateMutability": "view",
		"type": "function"
	}
];

// Contract address
const contractAddress = process.env.CONTRACT_ADDRESS;
const contract = new web3.eth.Contract(abi, contractAddress);

// Endpoint to get the random number
app.get('/roll-dice', async (req, res) => {
    try {
        const rollDiceResponse = await contract.methods.rollDice().call();
        console.log("rollDiceResponse: ", rollDiceResponse);
        res.json({ rollDiceResponse });
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

// Endpoint to get the latest block number
app.get('/latest-block', async (req, res) => {
    try {
        const latestBlockNumber = await web3.eth.getBlockNumber();
        console.log("latestBlockNumber: ", latestBlockNumber);
        res.json({ latestBlockNumber });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
