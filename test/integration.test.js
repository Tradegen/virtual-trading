const { expect } = require("chai");
const { parseEther } = require("@ethersproject/units");
/*
describe("Integration", () => {
  let deployer;
  let otherUser;

  let utils;
  let utilsAddress;
  let UtilsFactory;

  let dataFeedRegistry;
  let dataFeedRegistryAddress;
  let DataFeedRegistryFactory;

  let dataFeed;
  let dataFeedAddress;
  let DataFeedFactory;

  let feePool;
  let feePoolAddress;
  let FeePoolFactory;

  let feeToken;
  let feeTokenAddress;
  let TokenFactory;

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

  let registry;
  let registryAddress;
  let RegistryFactory;

  before(async () => {
    const signers = await ethers.getSigners();

    deployer = signers[0];
    otherUser = signers[1];

    UtilsFactory = await ethers.getContractFactory('Utils');
    utils = await UtilsFactory.deploy();
    await utils.deployed();
    utilsAddress = utils.address;

    TokenFactory = await ethers.getContractFactory('TestTokenERC20');
    FeePoolFactory = await ethers.getContractFactory('FeePool');
    DataFeedRegistryFactory = await ethers.getContractFactory('TestDataFeedRegistry');
    DataFeedFactory = await ethers.getContractFactory('VTEDataFeed', {
        libraries: {
            Utils: utilsAddress,
        },
      });
    DataSourceFactory = await ethers.getContractFactory('TradegenCandlestickDataSource');
    OracleFactory = await ethers.getContractFactory('Oracle');
    VTEFactory = await ethers.getContractFactory('VirtualTradingEnvironment');
    FactoryFactory = await ethers.getContractFactory('VirtualTradingEnvironmentFactory');
    RegistryFactory = await ethers.getContractFactory('VirtualTradingEnvironmentRegistry');

    feeToken = await TokenFactory.deploy("Fee Token", "FEE");
    await feeToken.deployed();
    feeTokenAddress = feeToken.address;

    feePool = await FeePoolFactory.deploy(deployer.address, feeTokenAddress);
    await feePool.deployed();
    feePoolAddress = feePool.address;

    dataFeedRegistry = await DataFeedRegistryFactory.deploy();
    await dataFeedRegistry.deployed();
    dataFeedRegistryAddress = dataFeedRegistry.address;

    dataSource = await DataSourceFactory.deploy(dataFeedRegistryAddress);
    await dataSource.deployed();
    dataSourceAddress = dataSource.address;

    oracle = await OracleFactory.deploy(dataSourceAddress);
    await oracle.deployed();
    oracleAddress = oracle.address;

    factory = await FactoryFactory.deploy(oracleAddress);
    await factory.deployed();
    factoryAddress = factory.address;

    registry = await RegistryFactory.deploy(factoryAddress, dataFeedRegistryAddress);
    await registry.deployed();
    registryAddress = registry.address;

    let tx = await factory.initializeContract(registryAddress);
    await tx.wait();
  });

  beforeEach(async () => {
    registry = await RegistryFactory.deploy(factoryAddress, dataFeedRegistryAddress);
    await registry.deployed();
    registryAddress = registry.address;

    let tx = await factory.initializeContract(registryAddress);
    await tx.wait();

    let tx2 = await registry.createVirtualTradingEnvironment(parseEther("100"));
    let temp = await tx2.wait();
    let event = temp.events[temp.events.length - 1];
    VTEAddress = event.args.contractAddress;
    VTE = VTEFactory.attach(VTEAddress);

    dataFeed = await DataFeedFactory.deploy(VTEAddress, deployer.address, feePoolAddress, oracleAddress, VTEAddress, feeTokenAddress, parseEther("1"));
    await dataFeed.deployed();
    dataFeedAddress = dataFeed.address;

    let tx3 = await registry.setDataFeed(1, dataFeedAddress);
    await tx3.wait();
  });

  describe("#placeOrder", () => {
    it("meets requirements; long position", async () => {
        let tx = await VTE.placeOrder("BTC", true, parseEther("1"));
        await tx.wait();

        let numberOfPositions = await VTE.numberOfPositions();
        expect(numberOfPositions).to.equal(1);

        let cumulativeLeverageFactor = await VTE.cumulativeLeverageFactor();
        expect(cumulativeLeverageFactor).to.equal(parseEther("1"));

        let position = await VTE.positions("BTC");
        expect(position[0]).to.be.true;
        expect(position[1]).to.equal(parseEther("1"));
    });
  });

  describe("#closePosition", () => {
    it("meets requirements", async () => {
        let tx = await VTE.placeOrder("BTC", true, parseEther("1"));
        await tx.wait();

        let tx2 = await VTE.closePosition("BTC");
        await tx2.wait();

        let numberOfPositions = await VTE.numberOfPositions();
        expect(numberOfPositions).to.equal(0);

        let cumulativeLeverageFactor = await VTE.cumulativeLeverageFactor();
        expect(cumulativeLeverageFactor).to.equal(0);

        let position = await VTE.positions("BTC");
        expect(position[0]).to.be.true;
        expect(position[1]).to.equal(0);
    });
  });
});*/