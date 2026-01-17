/**
 * Verify Monad Testnet connection and account balance
 */

import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Checking Monad Testnet connection...\n");

  const [signer] = await ethers.getSigners();
  const provider = ethers.provider;
  const balance = await provider.getBalance(signer.address);
  const blockNumber = await provider.getBlockNumber();

  console.log("📦 Network Info:");
  console.log("  Network:   monadTestnet");
  console.log("  Chain ID:  ", (await provider.getNetwork()).chainId);
  console.log("  Block:     ", blockNumber);
  console.log("");

  console.log("👤 Account Info:");
  console.log("  Address:  ", signer.address);
  console.log("  Balance:  ", ethers.formatEther(balance), "MON");
  console.log("");

  // Check balance
  const minBalance = ethers.parseEther("0.01"); // 0.01 MON minimum
  if (balance < minBalance) {
    console.error("❌ Insufficient balance!");
    console.error("   Current:", ethers.formatEther(balance), "MON");
    console.error("   Required: 0.01 MON");
    console.error("\n💡 Get testnet MON from: https://faucet.monad.xyz/");
    process.exit(1);
  }

  console.log("✅ Connection verified! Account ready for deployment.\n");

  // Estimate deployment cost
  console.log("💰 Deployment Cost Estimate:");
  const factoryBytecode = await ethers.getContractFactory("SidebetFactory");
  const deployTx = factoryBytecode.getDeployTransaction();

  try {
    const estimatedGas = await provider.estimateGas({
      data: deployTx.data,
    });
    const gasPrice = await provider.getFeeData();
    const estimatedCost = estimatedGas * (gasPrice.gasPrice || 0n);

    console.log("  Gas Estimate:  ", estimatedGas.toString());
    console.log("  Gas Price:     ", gasPrice.gasPrice?.toString() || "N/A");
    console.log("  Est. Cost:     ", ethers.formatEther(estimatedCost), "MON");
    console.log("");
  } catch {
    console.log("  (Could not estimate gas, will use during deployment)");
  }

  console.log("🚀 Ready to deploy! Run: yarn deploy --network monadTestnet");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
