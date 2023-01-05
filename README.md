# Virtual trading environments

## Purpose

Create a decentralized system that lets users monetize their performance in paper trading.

## Overview

VTEs let users paper-trade major cryptos (using oracle data) without any capital. Users can trade on leverage without worrying about liquidations or negative portfolio values because a 'smoothing factor' is applied to net portfolio value. Each VTE has a data feed that stores performance data on-chain. Developers can use the data feed to build applications (such as a synthetic asset protocol). Whenever a contract requests price data from a VTE data feed, the contract must pay a usage fee (specified by the VTE owner) to the VTE owner, allowing users to monetize their performance in paper-trading.

## Smart Contracts

* Oracle - Gets the latest price of an asset.
* TradegenCandlestickDataSource - Gets the closing price of an asset's latest candlestick.
* VirtualTradingEnvironment - Makes simulated trades and sends them to a data feed.
* VirtualTradingEnvironmentFactory - Creates VirtualTradingEnvironment contracts.
* VirtualTradingEnvironmentRegistry - Registers/manages virtual trading environment and stores the protocol's parameters.

## Repository Structure

```
.
├── abi  ## Generated ABIs that developers can use to interact with the system.
├── addresses  ## Address of each deployed contract, organized by network.
├── contracts  ## All source code.
│   ├── interfaces  ## Interfaces used for defining/calling contracts.
│   ├── openzeppelin-solidity  ## Helper contracts provided by OpenZeppelin.
│   ├── test  ## Mock contracts used for testing main contracts.
├── test ## Source code for testing code in //contracts.
```

## Disclaimer

The smart contracts are deployed on testnet but they have not been audited yet.

Most of the logic for calculating the price of a VTE and tracking performance is in the 'data-feeds' repo.

## Documentation

To learn more about the Tradegen project, visit the docs at https://docs.tradegen.io.

This protocol is launched on the Celo blockchain. To learn more about Celo, visit their home page: https://celo.org/.

Source code for data feeds: https://github.com/Tradegen/data-feeds.

## License

MIT
