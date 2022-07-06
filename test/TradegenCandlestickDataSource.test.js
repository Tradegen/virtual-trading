const { expect } = require("chai");
const { parseEther } = require("@ethersproject/units");

describe("TradegenCandlestickDataSource", () => {
  let deployer;
  let otherUser;

  let dataFeedRegistry;
  let dataFeedRegistryAddress;
  let DataFeedRegistryFactory;

  let dataSource;
  let dataSourceAddress;
  let DataSourceFactory;

  before(async () => {
    const signers = await ethers.getSigners();

    deployer = signers[0];
    otherUser = signers[1];

    DataFeedRegistryFactory = await ethers.getContractFactory('TestDataFeedRegistry');
    DataSourceFactory = await ethers.getContractFactory('TradegenCandlestickDataSource');

    dataFeedRegistry = await DataFeedRegistryFactory.deploy();
    await dataFeedRegistry.deployed();
    dataFeedRegistryAddress = dataFeedRegistry.address;
  });

  beforeEach(async () => {
    dataSource = await DataSourceFactory.deploy(dataFeedRegistryAddress);
    await dataSource.deployed();
    dataSourceAddress = dataSource.address;
  });

  describe("#setRegistry", () => {
    it("onlyOwner", async () => {
        let tx = dataSource.connect(otherUser).setRegistry(otherUser.address);
        await expect(tx).to.be.reverted;
    });

    it("meets requirements", async () => {
      let tx = await dataSource.setRegistry(otherUser.address);
      await tx.wait();

      let registry = await dataSource.registry();
      expect(registry).to.equal(otherUser.address);
    });
  });

  describe("#getLatestPrice", () => {
    it("meets requirements", async () => {
      let price = await dataSource.getLatestPrice("BTC");
      expect(price).to.equal(parseEther("1"));
    });
  });
});