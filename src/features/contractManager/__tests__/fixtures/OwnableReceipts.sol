// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice Standalone native receipts wallet. Funds can only go to its deployer.
contract OwnableReceipts {
    address public owner;

    constructor() { owner = msg.sender; }
    receive() external payable {}

    function withdrawFunds() external {
        require(msg.sender == owner, "Not owner");
        (bool sent,) = payable(owner).call{value: address(this).balance}("");
        require(sent, "Transfer failed");
    }
}
