// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract HBLOCK is ERC20, ERC20Burnable, Ownable {
    constructor(address initialOwner)
    ERC20("HBLOCK", "HB")
    {
        _mint(initialOwner, 1000000000 * 10 ** decimals()); // Mint tokens to initialOwner instead of msg.sender
        transferOwnership(initialOwner); // Transfer ownership to initialOwner
    }
}
