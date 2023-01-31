// This is an example test file. Hardhat will run every *.js file in `test/`,
// so feel free to add new ones.

// Hardhat tests are normally written with Mocha and Chai.

// We import Chai to use its asserting functions here.
const { expect } = require("chai");
const astrochain_args = require("../astrochain_arguments.json")

// We use `loadFixture` to share common setups (or fixtures) between tests.
// Using this simplifies your tests and makes them run faster, by taking
// advantage or Hardhat Network's snapshot functionality.
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require("hardhat");

// `describe` is a Mocha function that allows you to organize your tests.
// Having your tests organized makes debugging them easier. All Mocha
// functions are available in the global scope.
//
// `describe` receives the name of a section of your test suite, and a
// callback. The callback must define the tests of that section. This callback
// can't be an async function.
describe("Astrochain contract", function () {
  // We define a fixture to reuse the same setup in every test. We use
  // loadFixture to run this setup once, snapshot that state, and reset Hardhat
  // Network to that snapshot in every test.
  async function deployAstrochainFixture() {
    // Get the ContractFactory and Signers here.
    const Astrochain = await ethers.getContractFactory("Astrochain");
    const [owner, addr1, addr2, signer] = await ethers.getSigners();

    // To deploy our contract, we just have to call Token.deploy() and await
    // for it to be deployed(), which happens onces its transaction has been
    // mined.
    const hardhatAstrochain = await Astrochain.deploy(astrochain_args[0], astrochain_args[1]);

    await hardhatAstrochain.deployed();

    // Fixtures can return anything you consider useful for your tests
    return { Astrochain, hardhatAstrochain, owner, addr1, addr2, signer };
  }

  // You can nest describe calls to create subsections.
  describe("Deployment", function () {
    // `it` is another Mocha function. This is the one you use to define your
    // tests. It receives the test name, and a callback function.
    //
    // If the callback function is async, Mocha will `await` it.
    it("Should set the right owner", async function () {
      // We use loadFixture to setup our environment, and then assert that
      // things went well
      const { hardhatAstrochain, owner } = await loadFixture(deployAstrochainFixture);
      const admin_role = await hardhatAstrochain.ADMIN_ROLE();
      expect(await hardhatAstrochain.hasRole(admin_role, owner.address)).to.equal(true);
    });

    it("Should set the right name and symbol", async function () {
      const { hardhatAstrochain } = await loadFixture(deployAstrochainFixture);
      expect(await hardhatAstrochain.name()).to.equal(astrochain_args[0]);
      expect(await hardhatAstrochain.symbol()).to.equal(astrochain_args[1]);
    });
  });

  describe("Whitelist Minting", function () {
    it("Should allow", async function () {
      const { hardhatAstrochain, owner, addr1, signer } = await loadFixture(deployAstrochainFixture);

      await hardhatAstrochain.setWhitelistMintingOpen(true);
      await hardhatAstrochain.addSigner(signer.address)

      const nounce = ethers.utils.formatBytes32String("first")
      const rawMessage = new Uint8Array([
        ...ethers.utils.arrayify(addr1.address),
        ...ethers.utils.zeroPad(nounce, 32)
      ])
      const signature = signer.signMessage(rawMessage)

      await hardhatAstrochain.connect(addr1)["mintWhitelist(address,uint256,bytes32,bytes)"](addr1.address, 1, nounce, signature, { value: ethers.utils.parseEther("0.02") });

      expect(
        await hardhatAstrochain.connect(addr1).balanceOf(addr1.address, 0)
      ).to.equal(1);
    });

    it("Should fail if whitelistMintingOpen is set to false", async function () {
      const { hardhatAstrochain, owner, addr1, signer } = await loadFixture(deployAstrochainFixture);

      await hardhatAstrochain.addSigner(signer.address)

      const nounce = ethers.utils.formatBytes32String("first")
      const rawMessage = new Uint8Array([
        ...ethers.utils.arrayify(addr1.address),
        ...ethers.utils.zeroPad(nounce, 32)
      ])
      const signature = signer.signMessage(rawMessage)

      await expect(
        hardhatAstrochain.connect(addr1)["mintWhitelist(address,uint256,bytes32,bytes)"](addr1.address, 1, nounce, signature, { value: ethers.utils.parseEther("0.02") })
      ).to.be.revertedWith("Astrochain: Whitelist minting closed");
    });

    it("Should fail if amount is not correct", async function () {
      const { hardhatAstrochain, owner, addr1, signer } = await loadFixture(deployAstrochainFixture);

      await hardhatAstrochain.setWhitelistMintingOpen(true);
      await hardhatAstrochain.addSigner(signer.address)

      const nounce = ethers.utils.formatBytes32String("first")
      const rawMessage = new Uint8Array([
        ...ethers.utils.arrayify(addr1.address),
        ...ethers.utils.zeroPad(nounce, 32)
      ])
      const signature = signer.signMessage(rawMessage)

      await expect(
        hardhatAstrochain.connect(addr1)["mintWhitelist(address,uint256,bytes32,bytes)"](addr1.address, 1, nounce, signature, { value: ethers.utils.parseEther("0.01") })
      ).to.be.revertedWith("Astrochain: Transfer minting price for batch whitelist minting");

      await expect(
        hardhatAstrochain.connect(addr1)["mintWhitelist(address,uint256,bytes32,bytes)"](addr1.address, 1, nounce, signature, { value: ethers.utils.parseEther("0.03") })
      ).to.be.revertedWith("Astrochain: Transfer minting price for batch whitelist minting");
    });

    it("Batch minting and single mint", async function () {
      const { hardhatAstrochain, owner, addr1, signer } = await loadFixture(deployAstrochainFixture);

      await hardhatAstrochain.setWhitelistMintingOpen(true);
      await hardhatAstrochain.addSigner(signer.address)

      const nounce = ethers.utils.formatBytes32String("first")
      const rawMessage = new Uint8Array([
        ...ethers.utils.arrayify(addr1.address),
        ...ethers.utils.zeroPad(nounce, 32)
      ])
      const signature = signer.signMessage(rawMessage)

      await expect(
        hardhatAstrochain.connect(addr1)["mintWhitelist(address,uint256,bytes32,bytes)"](addr1.address, 3, nounce, signature, { value: ethers.utils.parseEther("0.06") })
      ).to.be.revertedWith("Astrochain: Max whitelist minting amount");

      await hardhatAstrochain.connect(addr1)["mintWhitelist(address,uint256,bytes32,bytes)"](addr1.address, 2, nounce, signature, { value: ethers.utils.parseEther("0.04") });
      expect(
        await hardhatAstrochain.connect(addr1).balanceOf(addr1.address, 0)
      ).to.equal(1);
      expect(
        await hardhatAstrochain.connect(addr1).balanceOf(addr1.address, 1)
      ).to.equal(1);

      const nounce2 = ethers.utils.formatBytes32String("second")
      const rawMessage2 = new Uint8Array([
        ...ethers.utils.arrayify(addr1.address),
        ...ethers.utils.zeroPad(nounce2, 32)
      ])
      const signature2 = signer.signMessage(rawMessage2)

      await hardhatAstrochain.connect(addr1)["mintWhitelist(address,bytes32,bytes)"](addr1.address, nounce2, signature2, { value: ethers.utils.parseEther("0.02") });
      expect(
        await hardhatAstrochain.connect(addr1).balanceOf(addr1.address, 2)
      ).to.equal(1);
    })

    it("Should fail if pause is set to true and then allow when false", async function () {
      const { hardhatAstrochain, owner, addr1, signer } = await loadFixture(deployAstrochainFixture);

      await hardhatAstrochain.setWhitelistMintingOpen(true);
      await hardhatAstrochain.addSigner(signer.address)

      const nounce = ethers.utils.formatBytes32String("first")
      const rawMessage = new Uint8Array([
        ...ethers.utils.arrayify(addr1.address),
        ...ethers.utils.zeroPad(nounce, 32)
      ])
      const signature = signer.signMessage(rawMessage)

      await hardhatAstrochain.pause();

      await expect(
        hardhatAstrochain.connect(addr1)["mintWhitelist(address,uint256,bytes32,bytes)"](addr1.address, 1, nounce, signature, { value: ethers.utils.parseEther("0.02") })
      ).to.be.revertedWith("Pausable: paused");

      await hardhatAstrochain.unpause();

      await hardhatAstrochain.connect(addr1)["mintWhitelist(address,uint256,bytes32,bytes)"](addr1.address, 1, nounce, signature, { value: ethers.utils.parseEther("0.02") });

      expect(
        await hardhatAstrochain.connect(addr1).balanceOf(addr1.address, 0)
      ).to.equal(1);
    });

    it("Should fail when trying to use one signature twice", async function () {
      const { hardhatAstrochain, owner, addr1, signer } = await loadFixture(deployAstrochainFixture);

      await hardhatAstrochain.setWhitelistMintingOpen(true);
      await hardhatAstrochain.addSigner(signer.address)

      const nounce = ethers.utils.formatBytes32String("first")
      const rawMessage = new Uint8Array([
        ...ethers.utils.arrayify(addr1.address),
        ...ethers.utils.zeroPad(nounce, 32)
      ])
      const signature = signer.signMessage(rawMessage)

      await hardhatAstrochain.connect(addr1)["mintWhitelist(address,uint256,bytes32,bytes)"](addr1.address, 1, nounce, signature, { value: ethers.utils.parseEther("0.02") });

      await expect(
        hardhatAstrochain.connect(addr1)["mintWhitelist(address,uint256,bytes32,bytes)"](addr1.address, 1, nounce, signature, { value: ethers.utils.parseEther("0.02") })
      ).to.be.revertedWith("SignatureChecker: Message already used");
    });

    it("Should fail when signature is corrupt", async function () {
      const { hardhatAstrochain, owner, addr1, addr2, signer } = await loadFixture(deployAstrochainFixture);

      await hardhatAstrochain.setWhitelistMintingOpen(true);
      await hardhatAstrochain.addSigner(signer.address)

      const nounce = ethers.utils.formatBytes32String("first")
      const nounce2 = ethers.utils.formatBytes32String("second")
      const rawMessage = new Uint8Array([
        ...ethers.utils.arrayify(addr1.address),
        ...ethers.utils.zeroPad(nounce, 32)
      ])
      const signature_addr2 = addr2.signMessage(rawMessage)
      const signature = signer.signMessage(rawMessage)

      await expect(
        hardhatAstrochain.connect(addr1)["mintWhitelist(address,uint256,bytes32,bytes)"](addr1.address, 1, nounce, signature_addr2, { value: ethers.utils.parseEther("0.02") })
      ).to.be.revertedWith("SignatureChecker: Invalid signature");

      await expect(
        hardhatAstrochain.connect(addr1)["mintWhitelist(address,uint256,bytes32,bytes)"](addr2.address, 1, nounce, signature, { value: ethers.utils.parseEther("0.02") })
      ).to.be.revertedWith("SignatureChecker: Invalid signature");

      await expect(
        hardhatAstrochain.connect(addr1)["mintWhitelist(address,uint256,bytes32,bytes)"](addr1.address, 1, nounce2, signature, { value: ethers.utils.parseEther("0.02") })
      ).to.be.revertedWith("SignatureChecker: Invalid signature");
    });

    it("Price change", async function () {
      const { hardhatAstrochain, owner, addr1, signer } = await loadFixture(deployAstrochainFixture);

      await hardhatAstrochain.setWhitelistMintingOpen(true);
      await hardhatAstrochain.addSigner(signer.address)

      const nounce = ethers.utils.formatBytes32String("first")
      const rawMessage = new Uint8Array([
        ...ethers.utils.arrayify(addr1.address),
        ...ethers.utils.zeroPad(nounce, 32)
      ])
      const signature = signer.signMessage(rawMessage)

      await hardhatAstrochain.setWhitelistMintingPrice(ethers.utils.parseEther("0.03"))

      await hardhatAstrochain.connect(addr1)["mintWhitelist(address,uint256,bytes32,bytes)"](addr1.address, 1, nounce, signature, { value: ethers.utils.parseEther("0.03") });

      expect(
        await hardhatAstrochain.connect(addr1).balanceOf(addr1.address, 0)
      ).to.equal(1);
    });


  });

  describe("Public Minting", function () {
    it("Should fail if publicMintingOpen is set to false", async function () {
      const { hardhatAstrochain, owner, addr1 } = await loadFixture(deployAstrochainFixture);

      await expect(
        hardhatAstrochain.connect(addr1)["mintPublic(address,uint256)"](addr1.address, 1, { value: ethers.utils.parseEther("0.04") })
      ).to.be.revertedWith("Astrochain: Public minting closed");
    });

    it("Should allow if publicMintingOpen is set to true", async function () {
      const { hardhatAstrochain, owner, addr1 } = await loadFixture(deployAstrochainFixture);

      await hardhatAstrochain.setPublicMintingOpen(true);

      await hardhatAstrochain.connect(addr1)["mintPublic(address,uint256)"](addr1.address, 1, { value: ethers.utils.parseEther("0.04") });

      expect(
        await hardhatAstrochain.connect(addr1).balanceOf(addr1.address, 0)
      ).to.equal(1);
    });

    it("Should fail if amount is not correct", async function () {
      const { hardhatAstrochain, owner, addr1 } = await loadFixture(deployAstrochainFixture);

      await hardhatAstrochain.setPublicMintingOpen(true);

      await expect(
        hardhatAstrochain.connect(addr1)["mintPublic(address,uint256)"](addr1.address, 1, { value: ethers.utils.parseEther("0.03") })
      ).to.be.revertedWith("Astrochain: Transfer minting price");

      await expect(
        hardhatAstrochain.connect(addr1)["mintPublic(address,uint256)"](addr1.address, 1, { value: ethers.utils.parseEther("0.05") })
      ).to.be.revertedWith("Astrochain: Transfer minting price");
    });

    it("Batch minting and single mint", async function () {
      const { hardhatAstrochain, owner, addr1 } = await loadFixture(deployAstrochainFixture);

      await hardhatAstrochain.setPublicMintingOpen(true);

      await expect(
        hardhatAstrochain.connect(addr1)["mintPublic(address,uint256)"](addr1.address, 6, { value: ethers.utils.parseEther("0.24") })
      ).to.be.revertedWith("Astrochain: Max minting amount");

      await hardhatAstrochain.connect(addr1)["mintPublic(address,uint256)"](addr1.address, 5, { value: ethers.utils.parseEther("0.2") });
      expect(
        await hardhatAstrochain.connect(addr1).balanceOf(addr1.address, 0)
      ).to.equal(1);
      expect(
        await hardhatAstrochain.connect(addr1).balanceOf(addr1.address, 1)
      ).to.equal(1);
      expect(
        await hardhatAstrochain.connect(addr1).balanceOf(addr1.address, 2)
      ).to.equal(1);
      expect(
        await hardhatAstrochain.connect(addr1).balanceOf(addr1.address, 3)
      ).to.equal(1);
      expect(
        await hardhatAstrochain.connect(addr1).balanceOf(addr1.address, 4)
      ).to.equal(1);

      await hardhatAstrochain.connect(addr1)["mintPublic(address)"](addr1.address, { value: ethers.utils.parseEther("0.04") });
      expect(
        await hardhatAstrochain.connect(addr1).balanceOf(addr1.address, 5)
      ).to.equal(1);
    })

    it("Should fail if pause is set to true and then allow when false", async function () {
      const { hardhatAstrochain, owner, addr1 } = await loadFixture(deployAstrochainFixture);

      await hardhatAstrochain.setPublicMintingOpen(true);

      await hardhatAstrochain.pause();

      await expect(
        hardhatAstrochain.connect(addr1)["mintPublic(address,uint256)"](addr1.address, 1, { value: ethers.utils.parseEther("0.04") })
      ).to.be.revertedWith("Pausable: paused");

      await hardhatAstrochain.unpause();

      await hardhatAstrochain.connect(addr1)["mintPublic(address,uint256)"](addr1.address, 1, { value: ethers.utils.parseEther("0.04") });

      expect(
        await hardhatAstrochain.connect(addr1).balanceOf(addr1.address, 0)
      ).to.equal(1);
    });

    it("Price change", async function () {
      const { hardhatAstrochain, owner, addr1 } = await loadFixture(deployAstrochainFixture);

      await hardhatAstrochain.setPublicMintingOpen(true);
      await hardhatAstrochain.setPublicMintingPrice(ethers.utils.parseEther("0.05"));

      await hardhatAstrochain.connect(addr1)["mintPublic(address,uint256)"](addr1.address, 1, { value: ethers.utils.parseEther("0.05") });

      expect(
        await hardhatAstrochain.connect(addr1).balanceOf(addr1.address, 0)
      ).to.equal(1);
    });
  });
});
