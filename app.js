require('dotenv').config();
const express = require('express');
const { ethers } = require('ethers');

const app = express();
const port = 4000;

// Connect Sepolia by Infura
const provider = new ethers.providers.InfuraProvider('sepolia', process.env.INFURA_API_KEY);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// ABI contract VRF
const vrfAbi = [
  "function rollDice() public returns (bytes32 requestId)",
  "event DiceRolled(bytes32 indexed requestId)",
  "event DiceLanded(uint256 result)"
];

// Address contract VRF
const vrfContractAddress = process.env.VRF_CONTRACT_ADDRESS;
const vrfContract = new ethers.Contract(vrfContractAddress, vrfAbi, wallet);

// Endpoint
app.get('/roll-dice', async (req, res) => {
  try {
    const tx = await vrfContract.rollDice();
    const receipt = await tx.wait();

    const requestId = receipt.events.find(event => event.event === 'DiceRolled').args.requestId;

    vrfContract.once('DiceLanded', (result) => {
      res.json({ result: result.toString() });
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'erorr call func rollDice' });
  }
});

// Khởi động server
app.listen(port, () => {
  console.log(`API server running at http://localhost:${port}`);
});
