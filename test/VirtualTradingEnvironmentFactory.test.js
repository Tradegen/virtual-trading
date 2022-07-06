const { expect } = require("chai");
const { parseEther } = require("@ethersproject/units");

describe("VirtualTradingEnvironmentFactory", () => {
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

  let VTE;
  let VTEAddress;
  let VTEFactory;

  let factory;
  let factoryAddress;
  let FactoryFactory;

  before(async () => {
    const signers = await ethers.getSigners();

    deployer = signers[0];
    otherUser = signers[1];

    DataFeedRegistryFactory = await ethers.getContractFactory('TestDataFeedRegistry');
    DataSourceFactory = await ethers.getContractFactory('TradegenCandlestickDataSource');
    OracleFactory = await ethers.getContractFactory('Oracle');
    VTEFactory = await ethers.getContractFactory('VirtualTradingEnvironment');
    FactoryFactory = await ethers.getContractFactory('VirtualTradingEnvironmentFactory');

    dataFeedRegistry = await DataFeedRegistryFactory.deploy();
    await dataFeedRegistry.deployed();
    dataFeedRegistryAddress = dataFeedRegistry.address;

    dataSource = await DataSourceFactory.deploy(dataFeedRegistryAddress);
    await dataSource.deployed();
    dataSourceAddress = dataSource.address;

    oracle = await OracleFactory.deploy(dataSourceAddress);
    await oracle.deployed();
    oracleAddress = oracle.address;
  });

  beforeEach(async () => {
    factory = await FactoryFactory.deploy(oracleAddress, deployer.address);
    await factory.deployed();
    factoryAddress = factory.address;
  });

  describe("#initializeContract", () => {
    it("onlyOwner", async () => {
        let tx = factory.connect(otherUser).initializeContract(otherUser.address);
        await expect(tx).to.be.reverted;
    });

    it("meets requirements", async () => {
      let tx = await factory.initializeContract(otherUser.address);
      await tx.wait();

      let registry = await factory.virtualTradingEnvironmentRegistry();
      expect(registry).to.equal(otherUser.address);
    });
  });

  describe("#createVirtualTradingEnvironment", () => {
    it("onlyVirtualTradingEnvironmentRegistry", async () => {
        let tx = factory.connect(otherUser).createVirtualTradingEnvironment(otherUser.address);
        await expect(tx).to.be.reverted;
    });

    it("meets requirements", async () => {
        let tx = await factory.createVirtualTradingEnvironment(otherUser.address);
        let temp = await tx.wait();
        let event = temp.events[temp.events.length - 1];
        VTEAddress = event.args.VTE;
        VTE = VTEFactory.attach(VTEAddress);

        let VTEOwner = await VTE.VTEOwner();
        expect(VTEOwner).to.equal(otherUser.address);

        let oracle1 = await VTE.oracle();
        expect(oracle1).to.equal(oracleAddress);

        let registry = await VTE.registry();
        expect(registry).to.equal(deployer.address);
    });
  });
});