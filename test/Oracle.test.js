const { expect } = require("chai");
const { parseEther } = require("@ethersproject/units");
/*
describe("Oracle", () => {
  let deployer;
  let otherUser;

  let dataFeedRegistry;
  let dataFeedRegistryAddress;
  let DataFeedRegistryFactory;

  let dataSource;
  let dataSourceAddress;
  let DataSourceFactory;

  let oracle;
  let oracleAddress;
  let OracleFactory;

  before(async () => {
    const signers = await ethers.getSigners();

    deployer = signers[0];
    otherUser = signers[1];

    DataFeedRegistryFactory = await ethers.getContractFactory('TestDataFeedRegistry');
    DataSourceFactory = await ethers.getContractFactory('TradegenCandlestickDataSource');
    OracleFactory = await ethers.getContractFactory('Oracle');

    dataFeedRegistry = await DataFeedRegistryFactory.deploy();
    await dataFeedRegistry.deployed();
    dataFeedRegistryAddress = dataFeedRegistry.address;

    dataSource = await DataSourceFactory.deploy(dataFeedRegistryAddress);
    await dataSource.deployed();
    dataSourceAddress = dataSource.address;
  });

  beforeEach(async () => {
    oracle = await OracleFactory.deploy(dataSourceAddress);
    await oracle.deployed();
    oracleAddress = oracle.address;
  });

  describe("#setDataSource", () => {
    it("onlyOwner", async () => {
        let tx = oracle.connect(otherUser).setDataSource(otherUser.address);
        await expect(tx).to.be.reverted;
    });

    it("meets requirements", async () => {
      let tx = await oracle.setDataSource(otherUser.address);
      await tx.wait();

      let newDataSource = await oracle.dataSource();
      expect(newDataSource).to.equal(otherUser.address);
    });
  });

  describe("#getLatestPrice", () => {
    it("meets requirements", async () => {
      let price = await oracle.getLatestPrice("BTC");
      expect(price).to.equal(parseEther("1"));
    });
  });
});*/