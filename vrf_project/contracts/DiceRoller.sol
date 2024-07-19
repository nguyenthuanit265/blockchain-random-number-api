// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DiceRoller {
    event DiceRolled(address indexed roller, uint256 result);

    function rollDice() public returns (uint256) {
        uint256 random = uint256(keccak256(abi.encodePacked(blockhash(block.number - 1), block.timestamp)));
        uint256 result = (random % 6) + 1;
        emit DiceRolled(msg.sender, result);
        return result;
    }
}
