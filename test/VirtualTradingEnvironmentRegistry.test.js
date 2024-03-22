const { expect } = require("chai");
const { parseEther } = require("@ethersproject/units");
/*
describe("VirtualTradingEnvironmentRegistry", () => {
  let deployer;
  let otherUser;

  let dataFeed;
  let dataFeedAddress;
  let DataFeedFactory;

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

  let ADDRESS_ZERO = "0x0000000000000000000000000000000000000000"

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
    DataFeedFactory = await ethers.getContractFactory('TestDataFeed');

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
        let tx = registry.createVirtualTradingEnvironment(parseEther("10000000"), "Test VTE");
        await expect(tx).to.be.reverted;
    });

    it("meets requirements", async () => {
        let tx = await registry.createVirtualTradingEnvironment(parseEther("100"), "Test VTE");
        let temp = await tx.wait();
        let event = temp.events[temp.events.length - 1];
        VTEAddress = event.args.contractAddress;
        VTE = VTEFactory.attach(VTEAddress);

        let name = await VTE.name();
        expect(name).to.equal("Test VTE");

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
        let tx = await registry.createVirtualTradingEnvironment(parseEther("100"), "Test VTE");
        await tx.wait();

        let tx2 = await registry.createVirtualTradingEnvironment(parseEther("200"), "Test VTE 2");
        await tx2.wait();

        let tx3 = registry.createVirtualTradingEnvironment(parseEther("300"), "Test VTE 3");
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

  describe("#updateMinimumTimeBetweenNameUpdates", () => {
    it("onlyOperator", async () => {
        let tx = registry.connect(otherUser).updateMinimumTimeBetweenNameUpdates(605000);
        await expect(tx).to.be.reverted;

        let minimumTime = await registry.MINIMUM_TIME_BETWEEN_NAME_UPDATES();
        // Number of seconds in a week.
        expect(minimumTime).to.equal(604800);
    });

    it("meets requirements", async () => {
        let tx = await registry.updateMinimumTimeBetweenNameUpdates(700000);
        await tx.wait();

        let minimumTime = await registry.MINIMUM_TIME_BETWEEN_NAME_UPDATES();
        expect(minimumTime).to.equal(700000);
    });
  });

  describe("#setDataFeed", () => {
    it("onlyOwner", async () => {
        let tx = registry.connect(otherUser).setDataFeed(1, otherUser.address);
        await expect(tx).to.be.reverted;
    });

    it("only data feed's data provider", async () => {
        let tx = await registry.createVirtualTradingEnvironment(parseEther("100"), "Test VTE");
        let temp = await tx.wait();
        let event = temp.events[temp.events.length - 1];
        VTEAddress = event.args.contractAddress;
        VTE = VTEFactory.attach(VTEAddress);

        dataFeed = await DataFeedFactory.deploy();
        await dataFeed.deployed();
        dataFeedAddress = dataFeed.address;

        let tx2 = await dataFeed.setProvider(deployer.address);
        await tx2.wait();

        let tx3 = registry.setDataFeed(1, dataFeedAddress);
        await expect(tx3).to.be.reverted;
  });

    it("meets requirements", async () => {
        let tx = await registry.createVirtualTradingEnvironment(parseEther("100"), "Test VTE");
        let temp = await tx.wait();
        let event = temp.events[temp.events.length - 1];
        VTEAddress = event.args.contractAddress;
        VTE = VTEFactory.attach(VTEAddress);

        dataFeed = await DataFeedFactory.deploy();
        await dataFeed.deployed();
        dataFeedAddress = dataFeed.address;

        let tx2 = await dataFeed.setProvider(VTEAddress);
        await tx2.wait();

        let tx3 = await registry.setDataFeed(1, dataFeedAddress);
        await tx3.wait();

        let address = await VTE.dataFeed();
        expect(address).to.equal(dataFeedAddress);
    });
  });

  describe("#getOwner", () => {
    it("returns address 0 when no valid parameters are provided", async () => {
      let tx = await registry.createVirtualTradingEnvironment(parseEther("100"), "Test VTE");
      let temp = await tx.wait();
      let event = temp.events[temp.events.length - 1];
      VTEAddress = event.args.contractAddress;
      VTE = VTEFactory.attach(VTEAddress);

      let owner = await registry.getOwner(0, ADDRESS_ZERO);
      expect(owner).to.equal(ADDRESS_ZERO);
    });

    it("index is not 0", async () => {
      let tx = await registry.createVirtualTradingEnvironment(parseEther("100"), "Test VTE");
      let temp = await tx.wait();
      let event = temp.events[temp.events.length - 1];
      VTEAddress = event.args.contractAddress;
      VTE = VTEFactory.attach(VTEAddress);

      let owner = await registry.getOwner(1, ADDRESS_ZERO);
      expect(owner).to.equal(deployer.address);
    });

    it("VTE address is not 0", async () => {
      let tx = await registry.createVirtualTradingEnvironment(parseEther("100"), "Test VTE");
      let temp = await tx.wait();
      let event = temp.events[temp.events.length - 1];
      VTEAddress = event.args.contractAddress;
      VTE = VTEFactory.attach(VTEAddress);

      let owner = await registry.getOwner(0, VTEAddress);
      expect(owner).to.equal(deployer.address);
    });
  });

  describe("#getVTEDataFeed", () => {
    it("returns address 0 when no valid parameters are provided", async () => {
      let tx = await registry.createVirtualTradingEnvironment(parseEther("100"), "Test VTE");
      let temp = await tx.wait();
      let event = temp.events[temp.events.length - 1];
      VTEAddress = event.args.contractAddress;
      VTE = VTEFactory.attach(VTEAddress);

      let address = await registry.getVTEDataFeed(0, ADDRESS_ZERO);
      expect(address).to.equal(ADDRESS_ZERO);
    });

    it("index is not 0", async () => {
      let tx = await registry.createVirtualTradingEnvironment(parseEther("100"), "Test VTE");
      let temp = await tx.wait();
      let event = temp.events[temp.events.length - 1];
      VTEAddress = event.args.contractAddress;
      VTE = VTEFactory.attach(VTEAddress);

      let expectedAddress = event.args.dataFeed;

      let address = await registry.getVTEDataFeed(1, ADDRESS_ZERO);
      expect(address).to.equal(expectedAddress);
    });

    it("VTE address is not 0", async () => {
      let tx = await registry.createVirtualTradingEnvironment(parseEther("100"), "Test VTE");
      let temp = await tx.wait();
      let event = temp.events[temp.events.length - 1];
      VTEAddress = event.args.contractAddress;
      VTE = VTEFactory.attach(VTEAddress);

      let expectedAddress = event.args.dataFeed;

      let address = await registry.getVTEDataFeed(0, VTEAddress);
      expect(address).to.equal(expectedAddress);
    });
  });

  describe("#getVTEName", () => {
    it("returns empty string when no valid parameters are provided", async () => {
      let tx = await registry.createVirtualTradingEnvironment(parseEther("100"), "Test VTE");
      let temp = await tx.wait();
      let event = temp.events[temp.events.length - 1];
      VTEAddress = event.args.contractAddress;
      VTE = VTEFactory.attach(VTEAddress);

      let name = await registry.getVTEName(0, ADDRESS_ZERO);
      expect(name).to.equal("");
    });

    it("index is not 0", async () => {
      let tx = await registry.createVirtualTradingEnvironment(parseEther("100"), "Test VTE");
      let temp = await tx.wait();
      let event = temp.events[temp.events.length - 1];
      VTEAddress = event.args.contractAddress;
      VTE = VTEFactory.attach(VTEAddress);

      let name = await registry.getVTEName(1, ADDRESS_ZERO);
      expect(name).to.equal("Test VTE");
    });

    it("VTE address is not 0", async () => {
      let tx = await registry.createVirtualTradingEnvironment(parseEther("100"), "Test VTE");
      let temp = await tx.wait();
      let event = temp.events[temp.events.length - 1];
      VTEAddress = event.args.contractAddress;
      VTE = VTEFactory.attach(VTEAddress);

      let name = await registry.getVTEName(0, VTEAddress);
      expect(name).to.equal("Test VTE");
    });
  });

  describe("#updateName", () => {
    it("onlyVTEOwner", async () => {
      let tx = await registry.createVirtualTradingEnvironment(parseEther("100"), "Test VTE");
      let temp = await tx.wait();
      let event = temp.events[temp.events.length - 1];
      VTEAddress = event.args.contractAddress;
      VTE = VTEFactory.attach(VTEAddress);

      let tx2 = registry.connect(otherUser).updateName(1, VTEAddress, "New Name");
      await expect(tx2).to.be.reverted;

      let name = await VTE.name();
      expect(name).to.equal("Test VTE");
    });

    it("meets requirements", async () => {
      let tx = await registry.createVirtualTradingEnvironment(parseEther("100"), "Test VTE");
      let temp = await tx.wait();
      let event = temp.events[temp.events.length - 1];
      VTEAddress = event.args.contractAddress;
      VTE = VTEFactory.attach(VTEAddress);

      let tx2 = await registry.updateName(1, VTEAddress, "New Name");
      await tx2.wait();

      let name = await VTE.name();
      expect(name).to.equal("New Name");
    });

    it("not enough time between name updates", async () => {
      let tx = await registry.createVirtualTradingEnvironment(parseEther("100"), "Test VTE");
      let temp = await tx.wait();
      let event = temp.events[temp.events.length - 1];
      VTEAddress = event.args.contractAddress;
      VTE = VTEFactory.attach(VTEAddress);

      let tx2 = await registry.updateName(1, VTEAddress, "New Name");
      await tx2.wait();

      let tx3 = registry.updateName(1, VTEAddress, "Another VTE Name");
      await expect(tx3).to.be.reverted;

      let name = await VTE.name();
      expect(name).to.equal("New Name");
    });

    it("update a second time after enough time has elapsed", async () => {
      let tx = await registry.createVirtualTradingEnvironment(parseEther("100"), "Test VTE");
      let temp = await tx.wait();
      let event = temp.events[temp.events.length - 1];
      VTEAddress = event.args.contractAddress;
      VTE = VTEFactory.attach(VTEAddress);

      let tx2 = await registry.updateMinimumTimeBetweenNameUpdates(1);
      await tx2.wait();

      let tx3 = await registry.updateName(1, VTEAddress, "New Name");
      await tx3.wait();

      let tx4 = await registry.updateName(1, VTEAddress, "Another VTE Name");
      await tx4.wait();

      let name = await VTE.name();
      expect(name).to.equal("Another VTE Name");
    });
  });
});*/