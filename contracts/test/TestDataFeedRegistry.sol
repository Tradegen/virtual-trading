// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

contract TestDataFeedRegistry {
    constructor() {}

    function getCurrentPrice(string memory _asset, uint256 _timeframe) external view returns (uint256) {
        return 1e18;
    }

    function registerDataFeed(address,uint256,address) external returns (address) {
        return address(this);
    }
}

