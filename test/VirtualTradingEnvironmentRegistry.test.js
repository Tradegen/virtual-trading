const { expect } = require("chai");
const { parseEther } = require("@ethersproject/units");
/*
describe("VirtualTradingEnvironmentRegistry", () => {
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

  let registry;
  let registryAddress;
  let RegistryFactory;

  before(async () => {
    const signers = await ethers.getSigners();

    deployer = signers[0];
    otherUser = signers[1];

    DataFeedRegistryFactory = await ethers.getContractFactory('TestDataFeedRegistry');
    DataSourceFactory = await ethers.getContractFactory('TradegenCandlestickDataSource');
    OracleFactory = await ethers.getContractFactory('Oracle');
    VTEFactory = await ethers.getContractFactory('VirtualTradingEnvironment');
    FactoryFactory = await ethers.getContractFactory('VirtualTradingEnvironmentFactory');
    RegistryFactory = await ethers.getContractFactory('VirtualTradingEnvironmentRegistry');

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
  });

  beforeEach(async () => {
    registry = await RegistryFactory.deploy(factoryAddress, dataFeedRegistryAddress);
    await registry.deployed();
    registryAddress = registry.address;

    let tx = await factory.initializeContract(registryAddress);
    await tx.wait();
  });

  describe("#createVirtualTradingEnvironment", () => {
    it("usage fee too high", async () => {
        let tx = registry.createVirtualTradingEnvironment(parseEther("10000000"));
        await expect(tx).to.be.reverted;
    });

    it("meets requirements", async () => {
        let tx = await registry.createVirtualTradingEnvironment(parseEther("100"));
        let temp = await tx.wait();
        let event = temp.events[temp.events.length - 1];
        VTEAddress = event.args.contractAddress;
        VTE = VTEFactory.attach(VTEAddress);

        let VTEOwner = await VTE.VTEOwner();
        expect(VTEOwner).to.equal(deployer.address);

        let oracle1 = await VTE.oracle();
        expect(oracle1).to.equal(oracleAddress);

        let registry = await VTE.registry();
        expect(registry).to.equal(registryAddress);

        let dataFeed = await VTE.dataFeed();
        expect(dataFeed).to.equal(dataFeedRegistryAddress);

        let numberOfVTE = await registry.numberOfVTEs();
        expect(numberOfVTE).to.equal(1);

        let address = await registry.virtualTradingEnvironments(1);
        expect(address).to.equal(VTEAddress);

        let index = await registry.VTEAddresses(VTEAddress);
        expect(index).to.equal(1);

        let ZERO_ADDRESS = await registry.virtualTradingEnvironments(8);

        let owner1 = await registry.getOwner(1, ZERO_ADDRESS);
        expect(owner1).to.equal(deployer.address);

        let owner2 = await registry.getOwner(0, VTEAddress);
        expect(owner2).to.equal(deployer.address);

        let dataFeed1 = await registry.getVTEDataFeed(1, ZERO_ADDRESS);
        expect(dataFeed1).to.equal(dataFeedRegistryAddress);

        let dataFeed2 = await registry.getVTEDataFeed(0, VTEAddress);
        expect(dataFeed2).to.equal(dataFeedRegistryAddress);
    });

    it("too many VTE per user", async () => {
        let tx = await registry.createVirtualTradingEnvironment(parseEther("100"));
        await tx.wait();

        let tx2 = await registry.createVirtualTradingEnvironment(parseEther("200"));
        await tx2.wait();

        let tx3 = registry.createVirtualTradingEnvironment(parseEther("300"));
        await expect(tx3).to.be.reverted;
    });
  });

  describe("#setOperator", () => {
    it("onlyOwner", async () => {
        let tx = registry.connect(otherUser).setOperator(otherUser.address);
        await expect(tx).to.be.reverted;
    });

    it("meets requirements", async () => {
        let tx = await registry.setOperator(otherUser.address);
        await tx.wait();

        let operator = await registry.operator();
        expect(operator).to.equal(otherUser.address);
    });
  });

  describe("#setRegistrar", () => {
    it("onlyOwner", async () => {
        let tx = registry.connect(otherUser).setRegistrar(otherUser.address);
        await expect(tx).to.be.reverted;
    });

    it("meets requirements", async () => {
        let tx = await registry.setRegistrar(otherUser.address);
        await tx.wait();

        let registrar = await registry.registrar();
        expect(registrar).to.equal(otherUser.address);
    });
  });

  describe("#increaseMaxVTEsPerUser", () => {
    it("onlyOperator", async () => {
        let tx = registry.connect(otherUser).increaseMaxVTEsPerUser(5);
        await expect(tx).to.be.reverted;
    });

    it("new limit must be higher", async () => {
        let tx = registry.increaseMaxVTEsPerUser(1);
        await expect(tx).to.be.reverted;
    });

    it("meets requirements", async () => {
        let tx = await registry.increaseMaxVTEsPerUser(5);
        await tx.wait();

        let limit = await registry.MAX_VTE_PER_USER();
        expect(limit).to.equal(5);
    });
  });

  describe("#updateCreationFee", () => {
    it("onlyOperator", async () => {
        let tx = registry.connect(otherUser).updateCreationFee(parseEther("1000"));
        await expect(tx).to.be.reverted;
    });

    it("meets requirements", async () => {
        let tx = await registry.updateCreationFee(parseEther("888"));
        await tx.wait();

        let fee = await registry.CREATION_FEE();
        expect(fee).to.equal(parseEther("888"));
    });
  });

  describe("#updateMaxUsageFee", () => {
    it("onlyOperator", async () => {
        let tx = registry.connect(otherUser).updateMaxUsageFee(parseEther("1000"));
        await expect(tx).to.be.reverted;
    });

    it("meets requirements", async () => {
        let tx = await registry.updateMaxUsageFee(parseEther("888"));
        await tx.wait();

        let fee = await registry.MAX_USAGE_FEE();
        expect(fee).to.equal(parseEther("888"));
    });
  });

  describe("#increaseMaximumNumberOfPositions", () => {
    it("onlyOperator", async () => {
        let tx = registry.connect(otherUser).increaseMaximumNumberOfPositions(88);
        await expect(tx).to.be.reverted;
    });

    it("new limit must be higher", async () => {
        let tx = registry.increaseMaximumNumberOfPositions(1);
        await expect(tx).to.be.reverted;
    });

    it("meets requirements", async () => {
        let tx = await registry.increaseMaximumNumberOfPositions(88);
        await tx.wait();

        let limit = await registry.maximumNumberOfPositions();
        expect(limit).to.equal(88);
    });
  });

  describe("#increaseMaximumLeverageFactor", () => {
    it("onlyOperator", async () => {
        let tx = registry.connect(otherUser).increaseMaximumLeverageFactor(parseEther("88"));
        await expect(tx).to.be.reverted;
    });

    it("new limit must be higher", async () => {
        let tx = registry.increaseMaximumLeverageFactor(parseEther("1"));
        await expect(tx).to.be.reverted;
    });

    it("meets requirements", async () => {
        let tx = await registry.increaseMaximumLeverageFactor(parseEther("88"));
        await tx.wait();

        let limit = await registry.maximumLeverageFactor();
        expect(limit).to.equal(parseEther("88"));
    });
  });
});*/