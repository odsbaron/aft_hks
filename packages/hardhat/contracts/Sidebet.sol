// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Nonces.sol";
import "./interfaces/ISidebet.sol";

/**
 * @title Sidebet
 * @notice Social consensus betting market - participants stake on outcomes and resolve via EIP-712 signatures
 * @author Sidebets Team
 * @custom:security-contact security@sidebets.io
 */
contract Sidebet is ISidebet, ReentrancyGuard, Nonces {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;
    using Address for address;

    // ========== Constants ==========

    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant MIN_THRESHOLD = 5000;  // 50%
    uint256 private constant MAX_THRESHOLD = 9900;  // 99%
    uint256 private constant DISPUTE_PERIOD = 2 hours;
    uint256 private constant CANCEL_DEADLINE = 1 days;
    uint256 private constant MAX_PARTICIPANTS = 1000;

    // ========== EIP-712 Type Hashes ==========

    bytes32 private constant ATTESTATION_TYPEHASH = keccak256(
        "Attestation(address market,uint256 outcome,uint256 nonce)"
    );

    bytes32 private constant EIP712_DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    // ========== State Variables ==========

    Status public status;
    uint256 public nonce;

    MarketInfo public info;
    Proposal public proposal;

    // Creator address (set at deployment, can cancel market)
    address public immutable creator;

    // Staking token
    IERC20 public immutable token;

    // Minimum stake amount
    uint256 public immutable minStake;

    // EIP-712 Domain Separator
    bytes32 private immutable DOMAIN_SEPARATOR;

    // Participant mappings
    mapping(address => Participant) public participants;
    address[] public participantList;

    // ========== Modifiers ==========

    modifier onlyParticipant() {
        if (participants[msg.sender].wallet == address(0)) {
            revert NotParticipant(msg.sender);
        }
        _;
    }

    modifier onlyCreator() {
        if (msg.sender != creator) {
            revert OnlyCreator();
        }
        _;
    }

    modifier validStake(uint256 amount) {
        if (amount < minStake) {
            revert InvalidAmount();
        }
        _;
    }

    // ========== Constructor ==========

    /**
     * @notice Create a new betting market
     * @param topic Market topic/description
     * @param thresholdPercent Consensus threshold in basis points (5000-9900)
     * @param tokenAddress Token address for staking
     * @param minStakeAmount Minimum stake amount
     * @param creator_ Market creator address
     */
    constructor(
        string memory topic,
        uint256 thresholdPercent,
        address tokenAddress,
        uint256 minStakeAmount,
        address creator_
    ) {
        if (thresholdPercent < MIN_THRESHOLD || thresholdPercent > MAX_THRESHOLD) {
            revert ThresholdOutOfRange();
        }
        if (tokenAddress == address(0)) {
            revert InvalidToken();
        }

        info = MarketInfo({
            topic: topic,
            thresholdPercent: thresholdPercent,
            token: tokenAddress,
            totalParticipants: 0,
            totalStaked: 0,
            createdAt: block.timestamp,
            proposedAt: 0,
            resolvedAt: 0
        });

        token = IERC20(tokenAddress);
        creator = creator_;
        minStake = minStakeAmount;

        status = Status.Open;
        nonce = 0;

        // Initialize EIP-712 Domain Separator
        DOMAIN_SEPARATOR = keccak256(abi.encode(
            EIP712_DOMAIN_TYPEHASH,
            keccak256(bytes("Sidebet")),
            keccak256(bytes("1")),
            block.chainid,
            address(this)
        ));
    }

    // ========== External Functions ==========

    /**
     * @notice Stake tokens on an outcome
     * @param amount Amount to stake (must be >= minStake)
     * @param outcome Chosen outcome (0: No, 1: Yes)
     */
    function stake(uint256 amount, uint256 outcome)
        external
        nonReentrant
        validStake(amount)
    {

        if (status != Status.Open) {
            revert InvalidStatus(status, Status.Open);
        }
        if (outcome > 1) {
            revert InvalidOutcome(outcome);
        }
        // Check if sender is a contract (code size > 0)
        address sender = msg.sender;
        uint256 size;
        assembly {
            size := extcodesize(sender)
        }
        if (size > 0) {
            revert InvalidAmount(); // No contracts allowed
        }

        _joinParticipant(sender, amount, outcome);

        // Transfer tokens from sender to contract
        token.safeTransferFrom(msg.sender, address(this), amount);

        emit StakeDeposited(msg.sender, amount, outcome);
    }

    /**
     * @notice Propose a result for the market
     * @param outcome Proposed outcome (0: No, 1: Yes)
     * @param ipfsHash IPFS hash of evidence
     */
    function proposeResult(uint256 outcome, bytes32 ipfsHash)
        external
        onlyParticipant
    {

        if (status != Status.Open) {
            revert InvalidStatus(status, Status.Open);
        }
        if (outcome > 1) {
            revert InvalidOutcome(outcome);
        }

        status = Status.Proposed;
        info.proposedAt = block.timestamp;

        proposal = Proposal({
            outcome: outcome,
            proposer: msg.sender,
            attestationCount: 0,
            disputeUntil: block.timestamp + DISPUTE_PERIOD,
            ipfsHash: ipfsHash
        });

        emit ResultProposed(msg.sender, outcome, ipfsHash, proposal.disputeUntil);
    }

    /**
     * @notice Finalize market with consensus signatures
     * @param signatures Array of EIP-712 signatures from participants
     * @param outcome Outcome being finalized
     */
    function finalizeWithConsensus(bytes[] calldata signatures, uint256 outcome)
        external
        nonReentrant
    {

        if (status != Status.Proposed && status != Status.Disputed) {
            revert InvalidStatus(status, Status.Proposed);
        }
        if (outcome != proposal.outcome) {
            revert InvalidOutcome(outcome);
        }
        if (block.timestamp < proposal.disputeUntil) {
            revert DisputeActive();
        }

        // Verify signatures and count attestations
        uint256 validAttestations = _verifyAttestations(signatures, outcome);

        // Check if threshold is met
        uint256 requiredVotes = _calculateRequiredVotes();
        if (validAttestations < requiredVotes) {
            revert ThresholdNotMet(requiredVotes, validAttestations);
        }

        // Execute payout
        _executePayout(outcome);

        status = Status.Resolved;
        info.resolvedAt = block.timestamp;
        nonce++; // Increment nonce for future proposals

        emit MarketResolved(outcome, validAttestations, info.totalStaked);
    }

    /**
     * @notice Raise a dispute to extend consensus period
     * @param reason Reason for dispute
     */
    function dispute(string calldata reason)
        external
        onlyParticipant
    {

        if (status != Status.Proposed) {
            revert InvalidStatus(status, Status.Proposed);
        }
        if (block.timestamp >= proposal.disputeUntil) {
            revert DisputeActive();
        }

        status = Status.Disputed;
        proposal.disputeUntil = block.timestamp + DISPUTE_PERIOD * 2;

        emit DisputeRaised(msg.sender, reason, proposal.disputeUntil);
    }

    /**
     * @notice Cancel the market and refund all stakes
     * @dev Only creator can call, and only within 1 day of creation
     */
    function cancel()
        external
        onlyCreator
        nonReentrant
    {

        if (status != Status.Open) {
            revert InvalidStatus(status, Status.Open);
        }
        if (block.timestamp >= info.createdAt + CANCEL_DEADLINE) {
            revert TooLateToCancel();
        }

        status = Status.Cancelled;

        // Refund all stakes
        uint256 totalRefunded = 0;
        for (uint256 i = 0; i < participantList.length; i++) {
            address participantAddr = participantList[i];
            uint256 stakeAmount = participants[participantAddr].stake;
            if (stakeAmount > 0) {
                token.safeTransfer(participantAddr, stakeAmount);
                totalRefunded += stakeAmount;
            }
        }

        emit MarketCancelled(totalRefunded);
    }

    // ========== View Functions ==========

    /**
     * @notice Get market information
     */
    function getMarketInfo() external view override returns (MarketInfo memory) {
        return info;
    }

    /**
     * @notice Get proposal information
     */
    function getProposal() external view override returns (Proposal memory) {
        return proposal;
    }

    /**
     * @notice Get all participants
     */
    function getParticipants() external view override returns (Participant[] memory) {
        Participant[] memory result = new Participant[](participantList.length);
        for (uint256 i = 0; i < participantList.length; i++) {
            result[i] = participants[participantList[i]];
        }
        return result;
    }

    /**
     * @notice Check if consensus threshold has been met
     */
    function isThresholdMet() external view override returns (bool) {
        if (status != Status.Proposed && status != Status.Disputed) {
            return false;
        }
        uint256 required = _calculateRequiredVotes();
        return proposal.attestationCount >= required;
    }

    /**
     * @notice Get current progress as percentage in basis points
     */
    function getProgress() external view override returns (uint256) {
        if (info.totalParticipants == 0) {
            return 0;
        }
        return (proposal.attestationCount * BASIS_POINTS) / info.totalParticipants;
    }

    /**
     * @notice Get current market status
     */
    function getStatus() external view override returns (Status) {
        return status;
    }

    /**
     * @notice Get participant count
     */
    function getParticipantCount() external view returns (uint256) {
        return participantList.length;
    }

    /**
     * @notice Get total staked amount
     */
    function getTotalStaked() external view returns (uint256) {
        return info.totalStaked;
    }

    /**
     * @notice Get required votes for consensus
     */
    function getRequiredVotes() external view returns (uint256) {
        return _calculateRequiredVotes();
    }

    /**
     * @notice Build EIP-712 digest for signing
     * @param outcome Outcome to attest to
     * @return digest The EIP-712 digest
     */
    function buildDigest(uint256 outcome) external view returns (bytes32) {
        return _buildDigest(outcome);
    }

    /**
     * @notice Verify a single signature
     * @param signature EIP-712 signature
     * @param outcome Outcome to verify
     * @return signer Address of the signer
     */
    function verifySignature(bytes calldata signature, uint256 outcome)
        external view returns (address signer)
    {

        bytes32 digest = _buildDigest(outcome);
        return digest.recover(signature);
    }

    // ========== Internal Functions ==========

    /**
     * @notice Register a participant with their stake
     */
    function _joinParticipant(
        address participantAddr,
        uint256 amount,
        uint256 outcome
    ) private {
        Participant storage participant = participants[participantAddr];

        if (participant.wallet == address(0)) {
            // New participant
            if (participantList.length >= MAX_PARTICIPANTS) {
                revert InvalidAmount(); // Max participants reached
            }

            participant.wallet = participantAddr;
            participant.stake = amount;
            participant.outcome = outcome;
            participant.hasAttested = false;
            participantList.push(participantAddr);
            info.totalParticipants++;
        } else {
            // Existing participant, add to stake
            participant.stake += amount;
            participant.outcome = outcome; // Update to latest choice
        }

        info.totalStaked += amount;
    }

    /**
     * @notice Verify attestations from signatures
     * @return validCount Number of valid new attestations
     */
    function _verifyAttestations(bytes[] calldata signatures, uint256 outcome)
        private returns (uint256 validCount)
    {

        bytes32 digest = _buildDigest(outcome);

        for (uint256 i = 0; i < signatures.length; i++) {
            address signer = digest.recover(signatures[i]);

            if (participants[signer].wallet != address(0) &&
                !participants[signer].hasAttested) {

                participants[signer].hasAttested = true;
                validCount++;

                emit AttestationRecorded(signer, outcome);
            }
        }

        proposal.attestationCount += validCount;
    }

    /**
     * @notice Build EIP-712 digest
     */
    function _buildDigest(uint256 outcome) private view returns (bytes32) {
        return keccak256(abi.encodePacked(
            "\x19\x01",
            DOMAIN_SEPARATOR,
            keccak256(abi.encode(
                ATTESTATION_TYPEHASH,
                address(this),
                outcome,
                nonce
            ))
        ));
    }

    /**
     * @notice Calculate required votes for consensus
     */
    function _calculateRequiredVotes() private view returns (uint256) {
        uint256 required = (info.totalParticipants * info.thresholdPercent) / BASIS_POINTS;
        // At least 1 vote required
        return required > 0 ? required : 1;
    }

    /**
     * @notice Execute payout to winners
     */
    function _executePayout(uint256 winningOutcome) private {
        // Calculate winner and loser pools
        uint256 winnerPool;
        uint256 loserPool;

        for (uint256 i = 0; i < participantList.length; i++) {
            address participantAddr = participantList[i];
            Participant memory p = participants[participantAddr];

            if (p.outcome == winningOutcome) {
                winnerPool += p.stake;
            } else {
                loserPool += p.stake;
            }
        }

        // Distribute winnings
        for (uint256 i = 0; i < participantList.length; i++) {
            address participantAddr = participantList[i];
            Participant memory p = participants[participantAddr];

            if (p.outcome == winningOutcome && p.stake > 0) {
                // Winner gets: original stake + share of loser pool
                uint256 winnings = p.stake + (p.stake * loserPool / winnerPool);
                token.safeTransfer(participantAddr, winnings);
            }
        }
    }

    // ========== Fallback ==========

    /// @notice Prevent direct ETH transfers
    receive() external payable {
        revert InvalidAmount();
    }

    /// @notice Prevent direct ETH transfers
    fallback() external payable {
        revert InvalidAmount();
    }
}
