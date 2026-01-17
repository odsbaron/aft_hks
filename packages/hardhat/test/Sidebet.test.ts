import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { Sidebet, SidebetFactory, MockToken, Sidebet__factory } from "../typechain-types";

describe("Sidebet Contracts", function () {
  let sidebetFactory: SidebetFactory;
  let mockToken: MockToken;
  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let charlie: HardhatEthersSigner;
  let dave: HardhatEthersSigner;

  const MIN_STAKE = ethers.parseEther("100"); // 100 tokens
  const THRESHOLD = 6000; // 60%
  const TOKEN_DECIMALS = 18;

  beforeEach(async function () {
    [owner, alice, bob, charlie, dave] = await ethers.getSigners();

    // Deploy MockToken
    const MockToken = await ethers.getContractFactory("MockToken");
    mockToken = await MockToken.deploy("USDC Mock", "USDC", TOKEN_DECIMALS);
    await mockToken.waitForDeployment();

    // Mint tokens to all users
    for (const signer of [owner, alice, bob, charlie, dave]) {
      await mockToken.mint(signer.address, ethers.parseEther("10000"));
    }

    // Deploy SidebetFactory
    const SidebetFactory = await ethers.getContractFactory("SidebetFactory");
    sidebetFactory = await SidebetFactory.deploy(owner.address);
    await sidebetFactory.waitForDeployment();
  });

  describe("SidebetFactory", function () {
    it("Should deploy factory with correct owner", async function () {
      expect(await sidebetFactory.owner()).to.equal(owner.address);
    });

    it("Should create a new market", async function () {
      const tx = await sidebetFactory.createSidebet(
        "Will BTC hit 100k?",
        THRESHOLD,
        await mockToken.getAddress(),
        MIN_STAKE,
      );

      const receipt = await tx.wait();
      expect(receipt?.logs).to.have.lengthOf.at.least(1); // At least creation event

      expect(await sidebetFactory.marketCount()).to.equal(1);

      // Get market address from event
      const marketAddress = await sidebetFactory.allMarkets(0);
      expect(await sidebetFactory.isMarket(marketAddress)).to.equal(true);
    });

    it("Should track markets by creator", async function () {
      await sidebetFactory
        .connect(alice)
        .createSidebet("Alice's Market", THRESHOLD, await mockToken.getAddress(), MIN_STAKE);

      const aliceMarkets = await sidebetFactory.getMarketsByCreator(alice.address);
      expect(aliceMarkets).to.have.lengthOf(1);
    });

    it("Should return paginated markets", async function () {
      // Create 3 markets
      for (let i = 0; i < 3; i++) {
        await sidebetFactory.createSidebet(`Market ${i}`, THRESHOLD, await mockToken.getAddress(), MIN_STAKE);
      }

      const page1 = await sidebetFactory.getMarkets(0, 2);
      const page2 = await sidebetFactory.getMarkets(2, 2);

      expect(page1).to.have.lengthOf(2);
      expect(page2).to.have.lengthOf(1);
    });
  });

  describe("Sidebet Market", function () {
    let sidebet: Sidebet;
    let marketAddress: string;

    beforeEach(async function () {
      // Create a market through factory
      const tx = await sidebetFactory.createSidebet(
        "Will BTC hit 100k?",
        THRESHOLD,
        await mockToken.getAddress(),
        MIN_STAKE,
      );
      await tx.wait();

      // Get market address
      marketAddress = await sidebetFactory.allMarkets(0);
      // FIXED: Connect to owner signer instead of provider
      sidebet = Sidebet__factory.connect(marketAddress, owner);
    });

    describe("Market Creation", function () {
      it("Should have correct initial state", async function () {
        const info = await sidebet.getMarketInfo();
        expect(info.topic).to.equal("Will BTC hit 100k?");
        expect(info.thresholdPercent).to.equal(THRESHOLD);
        expect(info.totalParticipants).to.equal(0);
        expect(info.totalStaked).to.equal(0);
      });

      it("Should have correct status", async function () {
        expect(await sidebet.getStatus()).to.equal(0); // Status.Open = 0
      });

      it("Should calculate required votes correctly", async function () {
        // Before any participants, required votes = 1 (minimum)
        expect(await sidebet.getRequiredVotes()).to.equal(1);
      });

      it("Should have correct creator", async function () {
        expect(await sidebet.creator()).to.equal(owner.address);
      });
    });

    describe("Staking", function () {
      it("Should allow staking on an outcome", async function () {
        const stakeAmount = ethers.parseEther("200");

        await mockToken.connect(alice).approve(await sidebet.getAddress(), stakeAmount);
        await sidebet.connect(alice).stake(stakeAmount, 0); // Stake on "No"

        const info = await sidebet.getMarketInfo();
        expect(info.totalParticipants).to.equal(1);
        expect(info.totalStaked).to.equal(stakeAmount);

        const participant = await sidebet.participants(alice.address);
        expect(participant.stake).to.equal(stakeAmount);
        expect(participant.outcome).to.equal(0);
      });

      it("Should reject stake below minimum", async function () {
        const stakeAmount = ethers.parseEther("50"); // Below MIN_STAKE (100)

        await mockToken.connect(alice).approve(await sidebet.getAddress(), stakeAmount);
        await expect(sidebet.connect(alice).stake(stakeAmount, 0)).to.be.revertedWithCustomError(
          sidebet,
          "InvalidAmount",
        );
      });

      it("Should reject invalid outcome", async function () {
        const stakeAmount = ethers.parseEther("200");

        await mockToken.connect(alice).approve(await sidebet.getAddress(), stakeAmount);
        await expect(
          sidebet.connect(alice).stake(stakeAmount, 2), // Invalid outcome
        ).to.be.revertedWithCustomError(sidebet, "InvalidOutcome");
      });

      it("Should allow increasing existing stake", async function () {
        const stakeAmount = ethers.parseEther("200");

        await mockToken.connect(alice).approve(await sidebet.getAddress(), stakeAmount * 2n);

        await sidebet.connect(alice).stake(stakeAmount, 0);
        await sidebet.connect(alice).stake(stakeAmount, 1);

        const participant = await sidebet.participants(alice.address);
        expect(participant.stake).to.equal(stakeAmount * 2n);
        expect(participant.outcome).to.equal(1); // Updated to latest
      });

      it("Should emit StakeDeposited event", async function () {
        const stakeAmount = ethers.parseEther("200");

        await mockToken.connect(alice).approve(await sidebet.getAddress(), stakeAmount);

        await expect(sidebet.connect(alice).stake(stakeAmount, 0))
          .to.emit(sidebet, "StakeDeposited")
          .withArgs(alice.address, stakeAmount, 0);
      });
    });

    describe("Proposal", function () {
      it("Should allow participant to propose result", async function () {
        // Alice stakes first
        const stakeAmount = ethers.parseEther("200");
        await mockToken.connect(alice).approve(await sidebet.getAddress(), stakeAmount);
        await sidebet.connect(alice).stake(stakeAmount, 0);

        // Alice proposes result
        await sidebet.connect(alice).proposeResult(1, ethers.encodeBytes32String("evidence"));

        expect(await sidebet.getStatus()).to.equal(1); // Status.Proposed = 1

        const proposal = await sidebet.getProposal();
        expect(proposal.outcome).to.equal(1);
        expect(proposal.proposer).to.equal(alice.address);
      });

      it("Should reject proposal from non-participant", async function () {
        await expect(
          sidebet.connect(bob).proposeResult(1, ethers.encodeBytes32String("evidence")),
        ).to.be.revertedWithCustomError(sidebet, "NotParticipant");
      });

      it("Should reject proposal when not in Open status", async function () {
        // Alice stakes and proposes
        const stakeAmount = ethers.parseEther("200");
        await mockToken.connect(alice).approve(await sidebet.getAddress(), stakeAmount);
        await sidebet.connect(alice).stake(stakeAmount, 0);
        await sidebet.connect(alice).proposeResult(1, ethers.encodeBytes32String("evidence"));

        // Try to propose again
        await expect(
          sidebet.connect(alice).proposeResult(0, ethers.encodeBytes32String("evidence2")),
        ).to.be.revertedWithCustomError(sidebet, "InvalidStatus");
      });
    });

    describe("Consensus & Finalization", function () {
      const STAKE_AMOUNT = ethers.parseEther("200");

      beforeEach(async function () {
        // 5 participants stake
        const stakers = [alice, bob, charlie, dave, owner];

        for (const staker of stakers) {
          await mockToken.connect(staker).approve(await sidebet.getAddress(), STAKE_AMOUNT);
          // Alice, Bob on "No" (0), Charlie, Dave, Owner on "Yes" (1)
          const outcome = staker === alice || staker === bob ? 0 : 1;
          await sidebet.connect(staker).stake(STAKE_AMOUNT, outcome);
        }

        // Propose result "Yes"
        await sidebet.connect(charlie).proposeResult(1, ethers.encodeBytes32String("evidence"));
      });

      it("Should calculate correct threshold", async function () {
        // 5 participants, 60% threshold = 3 required votes
        expect(await sidebet.getRequiredVotes()).to.equal(3);
      });

      it("Should check threshold correctly", async function () {
        // Initially 0 attestations
        expect(await sidebet.isThresholdMet()).to.equal(false);
      });

      it("Should build correct EIP-712 digest", async function () {
        const digest = await sidebet.buildDigest(1);
        void expect(digest).to.be.a.properHex;
      });

      it("Should verify signatures correctly", async function () {
        // Use signTypedData for proper EIP-712 signature
        const domain = {
          name: "Sidebet",
          version: "1",
          chainId: (await ethers.provider.getNetwork()).chainId,
          verifyingContract: marketAddress,
        };

        const types = {
          Attestation: [
            { name: "market", type: "address" },
            { name: "outcome", type: "uint256" },
            { name: "nonce", type: "uint256" },
          ],
        };

        const value = {
          market: marketAddress,
          outcome: 1,
          nonce: await sidebet.nonce(),
        };

        const signature = await charlie.signTypedData(domain, types, value);

        const recovered = await sidebet.verifySignature(signature, 1);
        expect(recovered).to.equal(charlie.address);
      });

      it("Should finalize with consensus after dispute period", async function () {
        // Fast forward past dispute period
        await ethers.provider.send("evm_increaseTime", [2 * 60 * 60]); // 2 hours
        await ethers.provider.send("evm_mine", []);

        // Get signatures from 3 participants (60% of 5)
        const domain = {
          name: "Sidebet",
          version: "1",
          chainId: (await ethers.provider.getNetwork()).chainId,
          verifyingContract: marketAddress,
        };

        const types = {
          Attestation: [
            { name: "market", type: "address" },
            { name: "outcome", type: "uint256" },
            { name: "nonce", type: "uint256" },
          ],
        };

        const value = {
          market: marketAddress,
          outcome: 1,
          nonce: await sidebet.nonce(),
        };

        // Charlie, Dave, Owner sign (all voted "Yes")
        const signatures = await Promise.all([
          charlie.signTypedData(domain, types, value),
          dave.signTypedData(domain, types, value),
          owner.signTypedData(domain, types, value),
        ]);

        // Finalize
        await sidebet.finalizeWithConsensus(signatures, 1);

        expect(await sidebet.getStatus()).to.equal(2); // Status.Resolved = 2

        // Check payouts - winners should have more tokens
        const charlieBalance = await mockToken.balanceOf(charlie.address);
        expect(charlieBalance).to.be.gt(ethers.parseEther("10000")); // Won
      });

      it("Should reject finalization before dispute period", async function () {
        const domain = {
          name: "Sidebet",
          version: "1",
          chainId: (await ethers.provider.getNetwork()).chainId,
          verifyingContract: marketAddress,
        };

        const types = {
          Attestation: [
            { name: "market", type: "address" },
            { name: "outcome", type: "uint256" },
            { name: "nonce", type: "uint256" },
          ],
        };

        const value = {
          market: marketAddress,
          outcome: 1,
          nonce: await sidebet.nonce(),
        };

        const signatures = await Promise.all([
          charlie.signTypedData(domain, types, value),
          dave.signTypedData(domain, types, value),
          owner.signTypedData(domain, types, value),
        ]);

        await expect(sidebet.finalizeWithConsensus(signatures, 1)).to.be.revertedWithCustomError(
          sidebet,
          "DisputeActive",
        );
      });

      it("Should reject finalization with insufficient signatures", async function () {
        // Fast forward past dispute period
        await ethers.provider.send("evm_increaseTime", [2 * 60 * 60]);
        await ethers.provider.send("evm_mine", []);

        const domain = {
          name: "Sidebet",
          version: "1",
          chainId: (await ethers.provider.getNetwork()).chainId,
          verifyingContract: marketAddress,
        };

        const types = {
          Attestation: [
            { name: "market", type: "address" },
            { name: "outcome", type: "uint256" },
            { name: "nonce", type: "uint256" },
          ],
        };

        const value = {
          market: marketAddress,
          outcome: 1,
          nonce: await sidebet.nonce(),
        };

        // Only 2 signatures (need 3)
        const signatures = await Promise.all([
          charlie.signTypedData(domain, types, value),
          dave.signTypedData(domain, types, value),
        ]);

        await expect(sidebet.finalizeWithConsensus(signatures, 1)).to.be.revertedWithCustomError(
          sidebet,
          "ThresholdNotMet",
        );
      });
    });

    describe("Dispute", function () {
      const STAKE_AMOUNT = ethers.parseEther("200");

      beforeEach(async function () {
        // 5 participants stake
        const stakers = [alice, bob, charlie, dave, owner];

        for (const staker of stakers) {
          await mockToken.connect(staker).approve(await sidebet.getAddress(), STAKE_AMOUNT);
          const outcome = staker === alice || staker === bob ? 0 : 1;
          await sidebet.connect(staker).stake(STAKE_AMOUNT, outcome);
        }

        // Propose result
        await sidebet.connect(charlie).proposeResult(1, ethers.encodeBytes32String("evidence"));
      });

      it("Should allow participant to raise dispute", async function () {
        await sidebet.connect(alice).dispute("This is wrong!");

        expect(await sidebet.getStatus()).to.equal(3); // Status.Disputed = 3

        const proposal = await sidebet.getProposal();
        // Dispute period should be extended
        const block = await ethers.provider.getBlock("latest");
        expect(block!.timestamp).to.be.lt(proposal.disputeUntil);
      });

      it("Should reject dispute from non-participant", async function () {
        // Need a new signer who hasn't staked
        const signers = await ethers.getSigners();
        const eve = signers[5];

        await expect(sidebet.connect(eve).dispute("I disagree!")).to.be.revertedWithCustomError(
          sidebet,
          "NotParticipant",
        );
      });

      it("Should reject dispute after period ends", async function () {
        await ethers.provider.send("evm_increaseTime", [2 * 60 * 60]);
        await ethers.provider.send("evm_mine", []);

        await expect(sidebet.connect(alice).dispute("Too late!")).to.be.revertedWithCustomError(
          sidebet,
          "DisputeActive",
        );
      });
    });

    describe("Cancellation", function () {
      it("Should allow creator to cancel within deadline", async function () {
        // Alice stakes first
        const stakeAmount = ethers.parseEther("200");
        await mockToken.connect(alice).approve(await sidebet.getAddress(), stakeAmount);
        await sidebet.connect(alice).stake(stakeAmount, 0);

        // Note: The creator is the address that created the market via factory
        // In this case, owner created it
        await sidebet.cancel();

        expect(await sidebet.getStatus()).to.equal(4); // Status.Cancelled = 4

        // Alice should have her stake back
        const aliceBalance = await mockToken.balanceOf(alice.address);
        expect(aliceBalance).to.equal(ethers.parseEther("10000")); // Original amount
      });

      it("Should reject cancellation after deadline", async function () {
        await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
        await ethers.provider.send("evm_mine", []);

        await expect(sidebet.cancel()).to.be.revertedWithCustomError(sidebet, "TooLateToCancel");
      });

      it("Should reject cancellation when not in Open status", async function () {
        // Alice stakes and proposes
        const stakeAmount = ethers.parseEther("200");
        await mockToken.connect(alice).approve(await sidebet.getAddress(), stakeAmount);
        await sidebet.connect(alice).stake(stakeAmount, 0);
        await sidebet.connect(alice).proposeResult(1, ethers.encodeBytes32String("evidence"));

        await expect(sidebet.cancel()).to.be.revertedWithCustomError(sidebet, "InvalidStatus");
      });

      it("Should only allow creator to cancel", async function () {
        await expect(sidebet.connect(alice).cancel()).to.be.revertedWithCustomError(sidebet, "OnlyCreator");
      });
    });

    describe("Progress Tracking", function () {
      const STAKE_AMOUNT = ethers.parseEther("200");

      beforeEach(async function () {
        const stakers = [alice, bob, charlie, dave, owner];

        for (const staker of stakers) {
          await mockToken.connect(staker).approve(await sidebet.getAddress(), STAKE_AMOUNT);
          const outcome = staker === alice || staker === bob ? 0 : 1;
          await sidebet.connect(staker).stake(STAKE_AMOUNT, outcome);
        }

        await sidebet.connect(charlie).proposeResult(1, ethers.encodeBytes32String("evidence"));
      });

      it("Should return 0 progress when no attestations", async function () {
        expect(await sidebet.getProgress()).to.equal(0);
      });

      it("Should calculate progress correctly", async function () {
        // Progress is calculated as (attestations / participants) * 10000
        // With 5 participants and 3 attestations (60% threshold met), progress = 6000

        const domain = {
          name: "Sidebet",
          version: "1",
          chainId: (await ethers.provider.getNetwork()).chainId,
          verifyingContract: marketAddress,
        };

        const types = {
          Attestation: [
            { name: "market", type: "address" },
            { name: "outcome", type: "uint256" },
            { name: "nonce", type: "uint256" },
          ],
        };

        const value = {
          market: marketAddress,
          outcome: 1,
          nonce: await sidebet.nonce(),
        };

        // Fast forward past dispute period
        await ethers.provider.send("evm_increaseTime", [2 * 60 * 60]);
        await ethers.provider.send("evm_mine", []);

        // 3 out of 5 participants attest (meets 60% threshold)
        const signatures = await Promise.all([
          charlie.signTypedData(domain, types, value),
          dave.signTypedData(domain, types, value),
          owner.signTypedData(domain, types, value),
        ]);

        // Finalize successfully
        await sidebet.finalizeWithConsensus(signatures, 1);

        // After finalization, progress should show 60% = 6000 basis points
        const progress = await sidebet.getProgress();
        expect(progress).to.be.closeTo(6000, 100);

        // Market should be resolved
        expect(await sidebet.getStatus()).to.equal(2); // Resolved
      });
    });
  });

  describe("MockToken", function () {
    // Separate mock token tests without beforeEach token minting
    let testToken: MockToken;

    beforeEach(async function () {
      const MockToken = await ethers.getContractFactory("MockToken");
      testToken = await MockToken.deploy("Test Token", "TEST", TOKEN_DECIMALS);
      await testToken.waitForDeployment();
    });

    it("Should mint tokens to address", async function () {
      await testToken.mint(alice.address, ethers.parseEther("1000"));
      expect(await testToken.balanceOf(alice.address)).to.equal(ethers.parseEther("1000"));
    });

    it("Should allow batch minting", async function () {
      const recipients = [alice.address, bob.address, charlie.address];
      const amounts = recipients.map(() => ethers.parseEther("100"));

      await testToken.batchMint(recipients, amounts);

      for (const recipient of recipients) {
        expect(await testToken.balanceOf(recipient)).to.equal(ethers.parseEther("100"));
      }
    });

    it("Should have correct decimals", async function () {
      expect(await testToken.decimals()).to.equal(TOKEN_DECIMALS);
    });

    it("Should work with faucet", async function () {
      await testToken.connect(alice).faucet(ethers.parseEther("500"));
      expect(await testToken.balanceOf(alice.address)).to.equal(ethers.parseEther("500"));
    });
  });
});
