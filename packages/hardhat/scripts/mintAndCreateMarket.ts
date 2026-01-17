import { ethers } from "hardhat";

const FACTORY_ADDRESS = "0x370F50700391ec477a4Ba7Ff031e6b6B56822046";
const TOKEN_ADDRESS = "0xf96F14D7CCAD992Ed9FF367644c981846b5FB149";
const DEPLOYER = "0x83263612eCc2cf4e862E38A3E3c9edd1342600c7";

async function main() {
  console.log("🚀 Starting deployment tasks...\n");

  // 1. 铸币
  console.log("📝 Step 1: 铸造 MockToken...");
  const token = await ethers.getContractAt("MockToken", TOKEN_ADDRESS);
  const mintAmount = ethers.parseUnits("1000000", 6);

  const mintTx = await token.mint(DEPLOYER, mintAmount);
  await mintTx.wait();
  console.log("✅ 铸币成功!");
  console.log("   交易 hash:", mintTx.hash);

  // 查询余额
  const balance = await token.balanceOf(DEPLOYER);
  console.log("   余额:", ethers.formatUnits(balance, 6), "USDC\n");

  // 2. 创建市场
  console.log("📝 Step 2: 创建第一个市场...");
  const factory = await ethers.getContractAt("SidebetFactory", FACTORY_ADDRESS);

  const createTx = await factory.createSidebet(
    "BTC能否在2025年底突破15万美元?",
    6000, // 60% 阈值
    TOKEN_ADDRESS,
    ethers.parseUnits("100", 6) // 最低 100 USDC
  );
  const receipt = await createTx.wait();

  console.log("✅ 市场创建成功!");
  console.log("   交易 hash:", createTx.hash);
  console.log("   Gas 使用:", receipt?.gasUsed.toString());

  // 获取市场数量，新创建的市场在最后一个索引
  const marketCount = await factory.marketCount();
  console.log("   市场总数:", marketCount.toString());

  // 获取最新市场地址
  const markets = await factory.getMarkets(BigInt(marketCount) - 1n, 1);
  if (markets && markets.length > 0) {
    console.log("   市场地址:", markets[0]);
  }

  // 3. 浏览器链接
  console.log("\n📝 Step 3: 浏览器链接");
  console.log("   Factory:", `https://explorer.testnet.monad.xyz/address/${FACTORY_ADDRESS}`);
  console.log("   Token:", `https://explorer.testnet.monad.xyz/address/${TOKEN_ADDRESS}`);
  console.log("   铸币交易:", `https://explorer.testnet.monad.xyz/tx/${mintTx.hash}`);
  console.log("   创建市场交易:", `https://explorer.testnet.monad.xyz/tx/${createTx.hash}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
