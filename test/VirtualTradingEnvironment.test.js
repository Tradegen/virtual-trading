const { expect } = require("chai");
const { parseEther } = require("@ethersproject/units");

describe("VirtualTradingEnvironmentRegistry", () => {
  let deployer;
  let otherUser;

  let dataFeedRegistry;
  let dataFeedRegistryAddress;
  let DataFeedRegistryFactory;

  let dataFeed;
  let dataFeedAddress;
  let DataFeedFactory;

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
    DataFeedFactory = await ethers.getContractFactory('TestDataFeed');
    DataSourceFactory = await ethers.getContractFactory('TradegenCandlestickDataSource');
    OracleFactory = await ethers.getContractFactory('Oracle');
    VTEFactory = await ethers.getContractFactory('VirtualTradingEnvironment');
    FactoryFactory = await ethers.getContractFactory('VirtualTradingEnvironmentFactory');
    RegistryFactory = await ethers.getContractFactory('VirtualTradingEnvironmentRegistry');

    dataFeedRegistry = await DataFeedRegistryFactory.deploy();
    await dataFeedRegistry.deployed();
    dataFeedRegistryAddress = dataFeedRegistry.address;

    dataFeed = await DataFeedFactory.deploy();
    await dataFeed.deployed();
    dataFeedAddress = dataFeed.address;

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

    let tx3 = await dataFeed.setProvider(VTEAddress);
    await tx3.wait();

    let tx4 = await registry.setDataFeed(1, dataFeedAddress);
    await tx4.wait();
  });

  describe("#placeOrder", () => {
    it("onlyOwner", async () => {
        let tx = VTE.connect(otherUser).placeOrder("BTC", true, parseEther("1"));
        await expect(tx).to.be.reverted;
    });

    it("cumulative leverage factor too high", async () => {
        let tx = VTE.placeOrder("BTC", true, parseEther("100"));
        await expect(tx).to.be.reverted;
    });

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

    it("meets requirements; short position", async () => {
        let tx = await VTE.placeOrder("BTC", false, parseEther("1"));
        await tx.wait();

        let numberOfPositions = await VTE.numberOfPositions();
        expect(numberOfPositions).to.equal(1);

        let cumulativeLeverageFactor = await VTE.cumulativeLeverageFactor();
        expect(cumulativeLeverageFactor).to.equal(parseEther("1"));

        let position = await VTE.positions("BTC");
        expect(position[0]).to.be.false;
        expect(position[1]).to.equal(parseEther("1"));
    });

    it("multiple positions", async () => {
        let tx = await VTE.placeOrder("BTC", false, parseEther("1"));
        await tx.wait();

        let tx2 = await VTE.placeOrder("ETH", true, parseEther("3"));
        await tx2.wait();

        let numberOfPositions = await VTE.numberOfPositions();
        expect(numberOfPositions).to.equal(2);

        let cumulativeLeverageFactor = await VTE.cumulativeLeverageFactor();
        expect(cumulativeLeverageFactor).to.equal(parseEther("4"));

        let position1 = await VTE.positions("BTC");
        expect(position1[0]).to.be.false;
        expect(position1[1]).to.equal(parseEther("1"));

        let position2 = await VTE.positions("ETH");
        expect(position2[0]).to.be.true;
        expect(position2[1]).to.equal(parseEther("3"));
    });

    it("too many positions", async () => {
        let tx = await VTE.placeOrder("BTC", true, parseEther("1"));
        await tx.wait();

        let tx2 = await VTE.placeOrder("ETH", true, parseEther("1"));
        await tx2.wait();

        let tx3 = await VTE.placeOrder("USDC", true, parseEther("1"));
        await tx3.wait();

        let tx4 = await VTE.placeOrder("CELO", true, parseEther("1"));
        await tx4.wait();

        let tx5 = await VTE.placeOrder("MANA", true, parseEther("1"));
        await tx5.wait();

        let tx6 = VTE.placeOrder("SAND", true, parseEther("1"));
        await expect(tx6).to.be.reverted;

        let numberOfPositions = await VTE.numberOfPositions();
        expect(numberOfPositions).to.equal(5);

        let cumulativeLeverageFactor = await VTE.cumulativeLeverageFactor();
        expect(cumulativeLeverageFactor).to.equal(parseEther("5"));
    });

    it("reduce long position", async () => {
        let tx = await VTE.placeOrder("BTC", true, parseEther("1"));
        await tx.wait();

        let tx2 = await VTE.placeOrder("BTC", false, parseEther("0.5"));
        await tx2.wait();

        let numberOfPositions = await VTE.numberOfPositions();
        expect(numberOfPositions).to.equal(1);

        let cumulativeLeverageFactor = await VTE.cumulativeLeverageFactor();
        expect(cumulativeLeverageFactor).to.equal(parseEther("0.5"));

        let position = await VTE.positions("BTC");
        expect(position[0]).to.be.true;
        expect(position[1]).to.equal(parseEther("0.5"));
    });

    it("reduce short position", async () => {
        let tx = await VTE.placeOrder("BTC", false, parseEther("1"));
        await tx.wait();

        let tx2 = await VTE.placeOrder("BTC", true, parseEther("0.5"));
        await tx2.wait();

        let numberOfPositions = await VTE.numberOfPositions();
        expect(numberOfPositions).to.equal(1);

        let cumulativeLeverageFactor = await VTE.cumulativeLeverageFactor();
        expect(cumulativeLeverageFactor).to.equal(parseEther("0.5"));

        let position = await VTE.positions("BTC");
        expect(position[0]).to.be.false;
        expect(position[1]).to.equal(parseEther("0.5"));
    });

    it("reduce multiple positions", async () => {
        let tx = await VTE.placeOrder("BTC", true, parseEther("1"));
        await tx.wait();

        let tx2 = await VTE.placeOrder("ETH", false, parseEther("1"));
        await tx2.wait();

        let tx3 = await VTE.placeOrder("ETH", true, parseEther("0.5"));
        await tx3.wait();

        let tx4 = await VTE.placeOrder("BTC", false, parseEther("0.5"));
        await tx4.wait();

        let numberOfPositions = await VTE.numberOfPositions();
        expect(numberOfPositions).to.equal(2);

        let cumulativeLeverageFactor = await VTE.cumulativeLeverageFactor();
        expect(cumulativeLeverageFactor).to.equal(parseEther("1"));

        let position1 = await VTE.positions("BTC");
        expect(position1[0]).to.be.true;
        expect(position1[1]).to.equal(parseEther("0.5"));

        let position2 = await VTE.positions("ETH");
        expect(position2[0]).to.be.false;
        expect(position2[1]).to.equal(parseEther("0.5"));
    });

    it("flip long position", async () => {
        let tx = await VTE.placeOrder("BTC", true, parseEther("1"));
        await tx.wait();

        let tx2 = await VTE.placeOrder("BTC", false, parseEther("1.5"));
        await tx2.wait();

        let numberOfPositions = await VTE.numberOfPositions();
        expect(numberOfPositions).to.equal(1);

        let cumulativeLeverageFactor = await VTE.cumulativeLeverageFactor();
        expect(cumulativeLeverageFactor).to.equal(parseEther("0.5"));

        let position = await VTE.positions("BTC");
        expect(position[0]).to.be.false;
        expect(position[1]).to.equal(parseEther("0.5"));
    });

    it("flip short position", async () => {
        let tx = await VTE.placeOrder("BTC", false, parseEther("1"));
        await tx.wait();

        let tx2 = await VTE.placeOrder("BTC", true, parseEther("1.5"));
        await tx2.wait();

        let numberOfPositions = await VTE.numberOfPositions();
        expect(numberOfPositions).to.equal(1);

        let cumulativeLeverageFactor = await VTE.cumulativeLeverageFactor();
        expect(cumulativeLeverageFactor).to.equal(parseEther("0.5"));

        let position = await VTE.positions("BTC");
        expect(position[0]).to.be.true;
        expect(position[1]).to.equal(parseEther("0.5"));
    });

    it("flip a position with other positions", async () => {
        let tx = await VTE.placeOrder("BTC", false, parseEther("1"));
        await tx.wait();

        let tx2 = await VTE.placeOrder("ETH", true, parseEther("3"));
        await tx2.wait();

        let tx3 = await VTE.placeOrder("BTC", true, parseEther("1.5"));
        await tx3.wait();

        let numberOfPositions = await VTE.numberOfPositions();
        expect(numberOfPositions).to.equal(2);

        let cumulativeLeverageFactor = await VTE.cumulativeLeverageFactor();
        expect(cumulativeLeverageFactor).to.equal(parseEther("3.5"));

        let position1 = await VTE.positions("BTC");
        expect(position1[0]).to.be.true;
        expect(position1[1]).to.equal(parseEther("0.5"));

        let position2 = await VTE.positions("ETH");
        expect(position2[0]).to.be.true;
        expect(position2[1]).to.equal(parseEther("3"));
    });

    it("close position", async () => {
        let tx = await VTE.placeOrder("BTC", false, parseEther("1"));
        await tx.wait();

        let tx2 = await VTE.placeOrder("BTC", true, parseEther("1"));
        await tx2.wait();

        let numberOfPositions = await VTE.numberOfPositions();
        expect(numberOfPositions).to.equal(0);

        let cumulativeLeverageFactor = await VTE.cumulativeLeverageFactor();
        expect(cumulativeLeverageFactor).to.equal(0);

        let position = await VTE.positions("BTC");
        expect(position[0]).to.be.false;
        expect(position[1]).to.equal(0);
    });
  });

  describe("#closePosition", () => {
    it("onlyOwner", async () => {
        let tx = await VTE.placeOrder("BTC", true, parseEther("1"));
        await tx.wait();

        let tx2 = VTE.connect(otherUser).closePosition("BTC");
        await expect(tx2).to.be.reverted;
    });

    it("position does not exist", async () => {
        let tx = VTE.closePosition("BTC");
        await expect(tx).to.be.reverted;
    });

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
});