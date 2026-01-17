// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./Sidebet.sol";
import "./interfaces/ISidebet.sol";

/**
 * @title SidebetFactory
 * @notice Factory contract for creating Sidebet markets using CREATE2
 * @author Sidebets Team
 */
contract SidebetFactory is Ownable {
    using Address for address;

    // ========== Events ==========

    event SidebetCreated(
        address indexed marketAddress,
        string topic,
        address indexed creator,
        bytes32 salt
    );

    event DeployerUpdated(address indexed oldDeployer, address indexed newDeployer);

    // ========== State Variables ==========

    uint256 public marketCount;

    // Market address => exists
    mapping(address => bool) public isMarket;

    // Creator => list of their markets
    mapping(address => address[]) public marketsByCreator;

    // List of all market addresses
    address[] public allMarkets;

    // ========== Constructor ==========

    constructor(address initialOwner) Ownable(initialOwner) {}

    // ========== External Functions ==========

    /**
     * @notice Create a new betting market
     * @param topic Market topic/description
     * @param thresholdPercent Consensus threshold in basis points (5000-9900)
     * @param tokenAddress Token address for staking
     * @param minStake Minimum stake amount
     * @return marketAddress Address of the newly created market
     */
    function createSidebet(
        string calldata topic,
        uint256 thresholdPercent,
        address tokenAddress,
        uint256 minStake
    ) external returns (address marketAddress) {
        // Generate salt for CREATE2
        bytes32 salt = keccak256(abi.encodePacked(
            msg.sender,
            block.timestamp,
            marketCount
        ));

        // Deploy new market using CREATE2
        Sidebet newMarket = new Sidebet{salt: salt}(
            topic,
            thresholdPercent,
            tokenAddress,
            minStake,
            msg.sender
        );

        marketAddress = address(newMarket);

        // Update state
        isMarket[marketAddress] = true;
        marketsByCreator[msg.sender].push(marketAddress);
        allMarkets.push(marketAddress);
        marketCount++;

        emit SidebetCreated(marketAddress, topic, msg.sender, salt);
    }

    /**
     * @notice Predict the address of a market before deployment
     * @param creator Address that will deploy the market
     * @param topic Market topic
     * @param thresholdPercent Consensus threshold
     * @param tokenAddress Token address
     * @param minStake Minimum stake amount
     * @param salt Salt for CREATE2
     * @return predicted Predicted contract address
     */
    function predictAddress(
        address creator,
        string calldata topic,
        uint256 thresholdPercent,
        address tokenAddress,
        uint256 minStake,
        bytes32 salt
    ) external view returns (address predicted) {
        // Get init code hash
        bytes memory initCode = type(Sidebet).creationCode;
        bytes memory initCodeWithArgs = abi.encodePacked(
            initCode,
            abi.encode(topic, thresholdPercent, tokenAddress, minStake, creator)
        );
        bytes32 initCodeHash = keccak256(initCodeWithArgs);

        // Calculate CREATE2 address
        predicted = address(uint160(uint256(
            keccak256(abi.encodePacked(
                bytes1(0xff),
                address(this),
                salt,
                initCodeHash
            ))
        )));
    }

    /**
     * @notice Get all markets by a specific creator
     * @param creator Address of the creator
     * @return markets Array of market addresses
     */
    function getMarketsByCreator(address creator)
        external view returns (address[] memory markets)
    {

        return marketsByCreator[creator];
    }

    /**
     * @notice Get paginated list of all markets
     * @param offset Starting index
     * @param limit Maximum number of markets to return
     * @return markets Array of market addresses
     */
    function getMarkets(uint256 offset, uint256 limit)
        external view returns (address[] memory markets)
    {

        uint256 total = allMarkets.length;
        if (offset >= total) {
            return new address[](0);
        }

        uint256 size = limit;
        if (offset + limit > total) {
            size = total - offset;
        }

        markets = new address[](size);
        for (uint256 i = 0; i < size; i++) {
            markets[i] = allMarkets[offset + i];
        }
    }

    /**
     * @notice Get the total number of markets
     * @return count Total market count
     */
    function getTotalMarkets() external view returns (uint256) {
        return allMarkets.length;
    }

    /**
     * @notice Get all market addresses
     * @dev Warning: May be expensive for large numbers of markets
     * @return markets Array of all market addresses
     */
    function getAllMarkets() external view returns (address[] memory) {
        return allMarkets;
    }

    /**
     * @notice Check if an address is a valid market created by this factory
     * @param market Address to check
     * @return valid True if the address is a valid market
     */
    function isValidMarket(address market) external view returns (bool) {
        return isMarket[market];
    }

    /**
     * @notice Get market info for a specific market
     * @param market Address of the market
     * @return info Market information
     */
    function getMarketInfo(address market)
        external view returns (ISidebet.MarketInfo memory info)
    {

        if (!isMarket[market]) {
            revert("Not a valid market");
        }
        return Sidebet(payable(market)).getMarketInfo();
    }

    /**
     * @notice Get market status
     * @param market Address of the market
     * @return status Current market status
     */
    function getMarketStatus(address market)
        external view returns (ISidebet.Status status)
    {

        if (!isMarket[market]) {
            revert("Not a valid market");
        }
        return Sidebet(payable(market)).getStatus();
    }

    // ========== Admin Functions ==========

    /**
     * @notice Transfer ownership of the factory
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) public override onlyOwner {
        super.transferOwnership(newOwner);
    }
}
