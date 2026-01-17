import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

/**
 * Deploys the SidebetFactory contract
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deploySidebetFactory: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Deploy SidebetFactory
  const factory = await deploy("SidebetFactory", {
    from: deployer,
    args: [deployer], // initialOwner
    log: true,
    autoMine: true,
  });

  console.log("✅ SidebetFactory deployed to:", factory.address);

  // Optionally deploy a MockToken for testing
  const isTestnet = hre.network.name === "hardhat" || hre.network.name === "localhost";

  if (isTestnet) {
    const mockToken = await deploy("MockToken", {
      from: deployer,
      args: ["USD Coin", "USDC", 6], // name, symbol, decimals
      log: true,
      autoMine: true,
    });

    console.log("✅ MockToken deployed to:", mockToken.address);

    // Mint some tokens to deployer
    const tokenContract = await hre.ethers.getContractAt("MockToken", mockToken.address);
    const mintAmount = hre.ethers.parseUnits("1000000", 6); // 1M USDC
    await tokenContract.mint(deployer, mintAmount);
    console.log("✅ Minted 1M USDC to deployer");
  }

  // Get the deployed contract
  const factoryContract = await hre.ethers.getContract<Contract>("SidebetFactory", deployer);
  console.log("📦 Factory owner:", await factoryContract.owner());
};

export default deploySidebetFactory;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags SidebetFactory
deploySidebetFactory.tags = ["SidebetFactory", "Sidebets"];
