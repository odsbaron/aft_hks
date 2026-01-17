/**
 * Verify deployed contracts on Monad Testnet
 */

import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Verifying deployed contracts...\n");

  // Get addresses from env or deployments
  const { deployments } = hre;
  const factoryDeployment = await deployments.get("SidebetFactory");
  const tokenDeployment = await deployments.get("MockToken");

  const factoryAddress = factoryDeployment.address;
  const tokenAddress = tokenDeployment.address;

  console.log("📋 Deployed Contracts:");
  console.log("  Factory:", factoryAddress);
  console.log("  Token:  ", tokenAddress);
  console.log("");

  // Verify Factory
  console.log("🏭 SidebetFactory:");
  const factory = await ethers.getContractAt("SidebetFactory", factoryAddress);
  const owner = await factory.owner();
  const marketCount = await factory.getMarketCount();

  console.log("  Owner:       ", owner);
  console.log("  Market Count:", marketCount.toString());
  console.log("  Explorer:    ", `https://explorer.testnet.monad.xyz/address/${factoryAddress}`);
  console.log("");

  // Verify Token
  console.log("🪙 MockToken:");
  const token = await ethers.getContractAt("MockToken", tokenAddress);
  const [name, symbol, decimals, totalSupply] = await Promise.all([
    token.name(),
    token.symbol(),
    token.decimals(),
    token.totalSupply(),
  ]);

  console.log("  Name:         ", name);
  console.log("  Symbol:       ", symbol);
  console.log("  Decimals:     ", decimals);
  console.log("  Total Supply:", ethers.formatUnits(totalSupply, decimals));
  console.log("  Explorer:     ", `https://explorer.testnet.monad.xyz/address/${tokenAddress}`);
  console.log("");

  // Test prediction
  console.log("🧪 Testing CREATE2 prediction...");
  const predictedAddress = await factory.predictSidebetAddress(
    "Test Market",
    70, // 70% threshold
    tokenAddress,
    ethers.parseEther("100"), // 100 min stake
    ethers.id("test-salt") // salt
  );

  console.log("  Predicted Market Address:", predictedAddress);
  console.log("");

  console.log("✅ All contracts verified successfully!");
  console.log("\n📝 Copy these addresses to your .env files:");
  console.log(`  NEXT_PUBLIC_FACTORY_ADDRESS=${factoryAddress}`);
  console.log(`  NEXT_PUBLIC_TOKEN_ADDRESS=${tokenAddress}`);
  console.log(`  SIDEBET_FACTORY_ADDRESS=${factoryAddress}`);
  console.log(`  MOCK_TOKEN_ADDRESS=${tokenAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
