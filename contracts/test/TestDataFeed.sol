// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

contract TestDataFeed {
    address public provider;

    constructor() {}

    function setProvider(address _provider) external {
        provider = _provider;
    }

    function dataProvider() external view returns (address) {
        return provider;
    }

    function updateData(string memory, bool, uint256, uint256) external {}
}

