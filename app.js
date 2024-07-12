require('dotenv').config();
const express = require('express');
const { ethers } = require('ethers');

// Khởi tạo ứng dụng Express
const app = express();
const port = 3000;

// Cấu hình kết nối đến Ethereum blockchain
const provider = new ethers.providers.InfuraProvider('mainnet', process.env.INFURA_API_KEY);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// ABI của hợp đồng VRF
const vrfAbi = [
    // ABI của các hàm cần thiết
];

// Địa chỉ hợp đồng VRF
const vrfContractAddress = process.env.VRF_CONTRACT_ADDRESS;

// Tạo đối tượng hợp đồng VRF
const vrfContract = new ethers.Contract(vrfContractAddress, vrfAbi, wallet);

// Endpoint để yêu cầu số ngẫu nhiên
app.get('/random', async (req, res) => {
    try {
        // Gọi hàm yêu cầu số ngẫu nhiên từ hợp đồng
        const tx = await vrfContract.requestRandomNumber();
        const receipt = await tx.wait();

        // Lấy kết quả từ sự kiện phát sinh trong giao dịch
        const randomResult = receipt.events[0].args.randomNumber;

        res.json({ randomNumber: randomResult.toString() });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Có lỗi xảy ra khi yêu cầu số ngẫu nhiên' });
    }
});

// Khởi động máy chủ
app.listen(port, () => {
    console.log(`API phát sinh số ngẫu nhiên đang chạy tại http://localhost:${port}`);
});
