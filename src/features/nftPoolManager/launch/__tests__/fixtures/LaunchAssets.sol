// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Test-only assets deployed exclusively on the isolated loopback fork.
contract LaunchNFT {
    string public name = "Fork NFT";
    string public symbol = "FNFT";
    function totalSupply() external pure returns (uint256) { return 1; }
    function supportsInterface(bytes4) external pure returns (bool) { return true; }
}

contract LaunchReward {
    string public name = "Fork USDT";
    string public symbol = "FUSDT";
    uint8 public decimals = 6;
    uint256 public totalSupply = 1000000000;
    mapping(address => uint256) public balanceOf;
    constructor() { balanceOf[msg.sender] = totalSupply; }
    function transfer(address recipient, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[recipient] += amount;
        return true;
    }
}
