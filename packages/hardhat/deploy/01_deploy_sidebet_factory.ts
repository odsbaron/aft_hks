import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys the SidebetFactory contract
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deploySidebetFactory: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Check if local network
  const isLocal = hre.network.name === "hardhat" || hre.network.name === "localhost";

  // Deploy SidebetFactory
  const factory = await deploy("SidebetFactory", {
    from: deployer,
    args: [deployer], // initialOwner
    log: true,
    autoMine: isLocal, // Only autoMine on local networks
  });

  console.log("✅ SidebetFactory deployed to:", factory.address);

  // Deploy MockToken for testing (on all networks)
  const mockToken = await deploy("MockToken", {
    from: deployer,
    args: ["USD Coin", "USDC", 6], // name, symbol, decimals
    log: true,
    autoMine: isLocal,
  });

  console.log("✅ MockToken deployed to:", mockToken.address);

  // Mint some tokens to deployer (skip on real networks where mint happens after deployment)
  if (isLocal) {
    const tokenContract = await hre.ethers.getContractAt("MockToken", mockToken.address);
    const mintAmount = hre.ethers.parseUnits("1000000", 6); // 1M USDC
    await tokenContract.mint(deployer, mintAmount);
    console.log("✅ Minted 1M USDC to deployer");
  } else {
    console.log("💡 On testnet/mainnet, mint tokens manually after deployment");
  }

  console.log("📦 Factory deployer:", deployer);
  console.log("🔗 Explorer: https://explorer.testnet.monad.xyz/address/" + factory.address);
};

export default deploySidebetFactory;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags SidebetFactory
deploySidebetFactory.tags = ["SidebetFactory", "Sidebets"];
