/**
 * Create a test market on deployed contracts
 */

import { ethers } from "hardhat";

async function main() {
  console.log("🏗️  Creating test market...\n");

  // Get deployed addresses
  const { deployments } = hre;
  const factoryDeployment = await deployments.get("SidebetFactory");
  const tokenDeployment = await deployments.get("MockToken");

  const factoryAddress = factoryDeployment.address;
  const tokenAddress = tokenDeployment.address;

  const [signer] = await ethers.getSigners();

  console.log("📋 Deployment Info:");
  console.log("  Factory:", factoryAddress);
  console.log("  Token:  ", tokenAddress);
  console.log("  Signer: ", signer.address);
  console.log("");

  // Get contracts
  const factory = await ethers.getContractAt("SidebetFactory", factoryAddress);
  const token = await ethers.getContractAt("MockToken", tokenAddress);

  // Check token balance
  const balance = await token.balanceOf(signer.address);
  console.log("💰 Token Balance:", ethers.formatUnits(balance, 6), "USDC");

  if (balance === 0n) {
    console.log("⚠️  No USDC balance. Minting tokens...");
    const mintTx = await token.mint(signer.address, ethers.parseUnits("10000", 6));
    await mintTx.wait();
    console.log("✅ Minted 10,000 USDC");
  }

  // Approve factory
  console.log("\n📝 Approving factory...");
  const approveTx = await token.approve(factoryAddress, ethers.MaxUint256);
  await approveTx.wait();
  console.log("✅ Approved");

  // Create market
  console.log("\n🏗️  Creating market...");
  const topic = "Will BTC reach $100k by end of 2025?";
  const thresholdPercent = 70;
  const minStake = ethers.parseUnits("100", 6); // 100 USDC
  const salt = ethers.id("btc-100k-2025");

  // Predict address first
  const predictedAddress = await factory.predictSidebetAddress(
    topic,
    thresholdPercent,
    tokenAddress,
    minStake,
    salt
  );
  console.log("  Predicted address:", predictedAddress);

  // Create market
  const createTx = await factory.createSidebet(
    topic,
    thresholdPercent,
    tokenAddress,
    minStake,
    salt
  );

  console.log("  Transaction hash:", createTx.hash);
  const receipt = await createTx.wait();
  console.log("  Block:", receipt.blockNumber);
  console.log("  Gas used:", receipt.gasUsed.toString());

  // Verify market was created
  const marketCount = await factory.getMarketCount();
  console.log("\n✅ Market created!");
  console.log("  Total markets:", marketCount.toString());
  console.log("  Market address:", predictedAddress);
  console.log("  Explorer:", `https://explorer.testnet.monad.xyz/address/${predictedAddress}`);

  // Log market details
  const market = await ethers.getContractAt("Sidebet", predictedAddress);
  const info = await market.getInfo();
  console.log("\n📊 Market Details:");
  console.log("  Topic:            ", info.topic);
  console.log("  Threshold:        ", info.thresholdPercent.toString(), "%");
  console.log("  Token:            ", info.token);
  console.log("  Total Staked:     ", ethers.formatUnits(info.totalStaked, 6), "USDC");
  console.log("  Participants:     ", info.totalParticipants.toString());
  console.log("  Status:           ", ["Open", "Proposed", "Resolved", "Disputed", "Cancelled"][info.status]);

  console.log("\n✅ Test market created successfully!");
  console.log("\n💡 Next steps:");
  console.log("  1. Visit the market page in your frontend");
  console.log("  2. Stake on YES or NO");
  console.log("  3. Wait for threshold to be met");
  console.log("  4. Propose an outcome");
  console.log("  5. Collect attestations");
  console.log("  6. Finalize the market");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
