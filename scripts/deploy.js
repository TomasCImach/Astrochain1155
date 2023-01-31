// This is a script for deploying your contracts. You can adapt it to deploy
// yours, or create new ones.

const path = require("path");
const astrochain_args = require("../astrochain_arguments.json")

async function main() {
  // This is just a convenience check
  if (network.name === "hardhat") {
    console.warn(
      "You are trying to deploy a contract to the Hardhat Network, which" +
        "gets automatically created and destroyed every time. Use the Hardhat" +
        " option '--network localhost'"
    );
  }

  // ethers is available in the global scope
  const [deployer] = await ethers.getSigners();
  console.log(
    "Deploying the contracts with the account:",
    await deployer.getAddress()
  );

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const Astrochain = await ethers.getContractFactory("Astrochain");
  const astrochain = await Astrochain.deploy(astrochain_args[0], astrochain_args[1]);
  await astrochain.deployed();

  console.log("Astrochain address:", astrochain.address);

  // We also save the contract's artifacts and address in the frontend directory
  saveFrontendFiles(astrochain);
}

function saveFrontendFiles(astrochain) {
  const fs = require("fs");
  const contractsDir = path.join(__dirname, "..", "frontend", "src", "contracts");

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  fs.writeFileSync(
    path.join(contractsDir, "contract-address.json"),
    JSON.stringify({ Astrochain: astrochain.address }, undefined, 2)
  );

  const AstrochainArtifact = artifacts.readArtifactSync("Astrochain");

  fs.writeFileSync(
    path.join(contractsDir, "Astrochain.json"),
    JSON.stringify(AstrochainArtifact, null, 2)
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
