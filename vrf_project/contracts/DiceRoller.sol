// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DiceRoller {
    function rollDice() public view returns (uint256) {
        uint256 random = uint256(keccak256(abi.encodePacked(blockhash(block.number - 1), block.timestamp)));
        return (random % 6)  + 1;
    }
}
