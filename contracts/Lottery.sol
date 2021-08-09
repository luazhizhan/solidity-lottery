// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/math/SafeMath.sol";

contract Lottery {
    using SafeMath for uint256;
    event Purchase(
        address indexed _sender,
        uint256 _tickets,
        uint256 indexed _gameId
    );
    event Draw(
        address indexed _winner,
        uint256 _amount,
        uint256 indexed _gameId
    );

    mapping(uint256 => address[]) public games;
    uint256 public gameId = 1;
    uint256 public blocksInterval;
    uint256 public price;
    uint256 public drawBlock;

    constructor(uint256 _blocksInterval, uint256 _price) {
        blocksInterval = _blocksInterval;
        price = _price;
        drawBlock = blocksInterval.add(block.number);
    }

    function random() private view returns (uint256) {
        return
            uint256(
                keccak256(
                    abi.encodePacked(msg.sender, block.timestamp, games[gameId])
                )
            );
    }

    function purchase(uint256 _tickets) public payable {
        require(block.number < drawBlock, "Lucky draw time!");
        require(_tickets >= 1, "Min 1 ticket.");
        uint256 totalPrice = _tickets.mul(price);
        assert(msg.value == totalPrice);

        // Access current game using game id
        address[] storage currentGame = games[gameId];

        // Add tickets (sender address) to the game
        for (uint256 i = 0; i < _tickets; i = i.add(1)) {
            currentGame.push(msg.sender);
        }
        emit Purchase(msg.sender, _tickets, gameId);
    }

    function draw() public {
        require(block.number >= drawBlock, "Not time yet!");
        address[] memory currentGame = games[gameId];
        if (currentGame.length == 0) {
            // no players
            emit Draw(address(0), 0, gameId);
            gameId = gameId.add(1);
            drawBlock = blocksInterval.add(block.number);
        } else {
            uint256 index = random().mod(currentGame.length);
            emit Draw(currentGame[index], address(this).balance, gameId);
            gameId = gameId.add(1);
            drawBlock = blocksInterval.add(block.number);
            payable(currentGame[index]).transfer(address(this).balance);
        }
    }
}
