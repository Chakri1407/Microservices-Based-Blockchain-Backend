// test-key.js
const { ethers } = require("ethers");
const wallet = new ethers.Wallet("19ebf68548a576fe88d0e4bf415c754dfc01e1c54573f3c30917207feb72e4b3");
console.log("Address:", wallet.address);

// check-balance.js
const provider = new ethers.JsonRpcProvider("https://polygon-amoy.g.alchemy.com/v2/eZEGi9ZbatIv9XAeJ8x37");
provider.getBalance("0xe8239aFA5Cc7Ec80d27713A60D2E50facbeA3BC0").then(balance => console.log("Balance:", ethers.formatEther(balance)));


provider.getBlockNumber().then(console.log).catch(console.error);