import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ignition";
import * as dotenv from "dotenv";

dotenv.config();

// Helper function to ensure private key has 0x prefix
function formatPrivateKey(key: string): string {
  if (!key) return "";
  return key.startsWith("0x") ? key : `0x${key}`;
}

const config: HardhatUserConfig = {
  solidity: "0.8.0",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    amoy: {
      url: process.env.POLYGON_AMOY || "https://rpc-amoy.polygon.technology",
      accounts: process.env.PRIVATE_KEY ? [formatPrivateKey(process.env.PRIVATE_KEY)] : [],
      chainId: 80002,
      gasPrice: 35000000000, // 35 gwei
      gas: 6000000
    }
  },
  ignition: {
    requiredConfirmations: 1
  }
};

export default config;