// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ISidebet
 * @notice Interface for Sidebet market contract
 * @dev Defines the core functions for social consensus betting markets
 */
interface ISidebet {
    // ========== Enums ==========

    enum Status {
        Open,       // Accepting participants and stakes
        Proposed,   // Result proposed, awaiting attestations
        Resolved,   // Market resolved and payouts distributed
        Disputed,   // Dispute raised, awaiting resolution
        Cancelled   // Market cancelled, stakes refunded
    }

    // ========== Structs ==========

    struct MarketInfo {
        string topic;              // Market topic/description
        uint256 thresholdPercent;  // Consensus threshold in basis points (10000 = 100%)
        address token;             // Token address for staking
        uint256 totalParticipants; // Total number of participants
        uint256 totalStaked;       // Total amount staked
        uint256 createdAt;         // Creation timestamp
        uint256 proposedAt;        // Proposal timestamp
        uint256 resolvedAt;        // Resolution timestamp
    }

    struct Participant {
        address wallet;      // Participant wallet address
        uint256 stake;       // Amount staked
        uint256 outcome;     // Chosen outcome (0: No, 1: Yes)
        bool hasAttested;    // Whether participant has attested to proposal
    }

    struct Proposal {
        uint256 outcome;           // Proposed outcome (0: No, 1: Yes)
        address proposer;          // Address of proposer
        uint256 attestationCount;  // Current number of attestations
        uint256 disputeUntil;      // Dispute period deadline
        bytes32 ipfsHash;          // IPFS hash of evidence/description
    }

    // ========== Errors ==========

    error NotParticipant(address);
    error InvalidStatus(Status current, Status expected);
    error InvalidOutcome(uint256);
    error ThresholdNotMet(uint256 required, uint256 actual);
    error DisputeActive();
    error MarketNotOpen();
    error OnlyCreator();
    error TooLateToCancel();
    error InvalidToken();
    error InvalidAmount();
    error ThresholdOutOfRange();

    // ========== Events ==========

    event StakeDeposited(address indexed participant, uint256 amount, uint256 outcome);
    event ResultProposed(address indexed proposer, uint256 outcome, bytes32 ipfsHash, uint256 disputeUntil);
    event AttestationRecorded(address indexed attestor, uint256 outcome);
    event MarketResolved(uint256 outcome, uint256 attestationCount, uint256 totalPayout);
    event MarketCancelled(uint256 totalRefunded);
    event DisputeRaised(address indexed disputer, string reason, uint256 newDisputeUntil);

    // ========== View Functions ==========

    /**
     * @notice Get market information
     * @return info Market information struct
     */
    function getMarketInfo() external view returns (MarketInfo memory info);

    /**
     * @notice Get proposal information
     * @return proposal Proposal struct
     */
    function getProposal() external view returns (Proposal memory proposal);

    /**
     * @notice Get all participants
     * @return participants Array of participant structs
     */
    function getParticipants() external view returns (Participant[] memory participants);

    /**
     * @notice Check if consensus threshold has been met
     * @return met True if threshold is met
     */
    function isThresholdMet() external view returns (bool met);

    /**
     * @notice Get current progress as percentage
     * @return progress Progress in basis points (10000 = 100%)
     */
    function getProgress() external view returns (uint256 progress);

    /**
     * @notice Get current market status
     * @return status Current market status
     */
    function getStatus() external view returns (Status status);

    // ========== State-Changing Functions ==========

    /**
     * @notice Stake tokens on an outcome
     * @param amount Amount to stake
     * @param outcome Chosen outcome (0: No, 1: Yes)
     */
    function stake(uint256 amount, uint256 outcome) external;

    /**
     * @notice Propose a result for the market
     * @param outcome Proposed outcome (0: No, 1: Yes)
     * @param ipfsHash IPFS hash of evidence
     */
    function proposeResult(uint256 outcome, bytes32 ipfsHash) external;

    /**
     * @notice Finalize market with consensus signatures
     * @param signatures Array of EIP-712 signatures
     * @param outcome Outcome being finalized
     */
    function finalizeWithConsensus(bytes[] calldata signatures, uint256 outcome) external;

    /**
     * @notice Raise a dispute to extend consensus period
     * @param reason Reason for dispute
     */
    function dispute(string calldata reason) external;

    /**
     * @notice Cancel the market and refund all stakes
     */
    function cancel() external;
}
