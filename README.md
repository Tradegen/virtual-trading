# Virtual trading environments

Tradegen is a decentralized trading platform that focuses on asset management, algo trading, and virtual trading. These smart contracts manage a protocol for creating/updating virtual trading environments (VTEs).

VTEs let users paper-trade major cryptos (using oracle data) without any capital. Users can trade on leverage without worrying about liquidations or negative portfolio values because a 'smoothing factor' is applied to net portfolio value. Each VTE has a data feed that stores performance data on-chain. Developers can use the data feed to build applications (such as a synthetic asset protocol). Whenever a contract requests price data from a VTE data feed, the contract must pay a usage fee (specified by the VTE owner) to the VTE owner, allowing users to monetize their performance in paper-trading. 

## Disclaimer

These smart contracts are deployed on testnet but they have not been audited yet.

Most of the logic for updating VTEs is in the 'data-feeds' repo.

## Docs

Docs are available at https://docs.tradegen.io

## License

MIT
