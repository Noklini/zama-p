import { ethers } from "hardhat";

async function main() {
  console.log("Deploying PrivateMessenger...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  const PrivateMessenger = await ethers.getContractFactory("PrivateMessenger");
  const messenger = await PrivateMessenger.deploy();

  await messenger.waitForDeployment();

  const address = await messenger.getAddress();
  console.log("PrivateMessenger deployed to:", address);

  // Output for frontend configuration
  console.log("\n--- Frontend Configuration ---");
  console.log(`VITE_CONTRACT_ADDRESS=${address}`);

  return address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
