// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockToken
 * @notice A simple ERC20 token for testing purposes
 * @dev Mintable ERC20 with 6 decimals (like USDC)
 */
contract MockToken is ERC20, Ownable {
    uint8 private immutable _decimals;

    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);

    /**
     * @notice Constructor to create the token
     * @param name Token name
     * @param symbol Token symbol
     * @param decimals_ Number of decimals (default 6 for USDC-like)
     */
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_
    ) Ownable(msg.sender) ERC20(name, symbol) {
        _decimals = decimals_;
    }

    /**
     * @notice Returns the number of decimals used
     * @return The number of decimals
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @notice Mint tokens to an address
     * @param to Address to mint to
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @notice Burn tokens from an address
     * @param from Address to burn from
     * @param amount Amount to burn
     */
    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
        emit TokensBurned(from, amount);
    }

    /**
     * @notice Mint tokens to multiple addresses
     * @param recipients Addresses to mint to
     * @param amounts Amounts to mint (must match recipients length)
     */
    function batchMint(address[] calldata recipients, uint256[] calldata amounts) external onlyOwner {
        require(recipients.length == amounts.length, "Length mismatch");
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
            emit TokensMinted(recipients[i], amounts[i]);
        }
    }

    /**
     * @notice Helper function to get tokens for testing
     * @dev Anyone can call this to get free tokens on testnets
     * @param amount Amount of tokens to request
     */
    function faucet(uint256 amount) external {
        _mint(msg.sender, amount);
        emit TokensMinted(msg.sender, amount);
    }
}
