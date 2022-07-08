const { ethers } = require("hardhat");

const CANDLESTICK_DATA_FEED_REGISTRY_ADDRESS_TESTNET = "0x1f19A758382F51811C5D429F30Ad78192C377383";
const CANDLESTICK_DATA_FEED_REGISTRY_ADDRESS_MAINNET = "";

const VTE_DATA_FEED_REGISTRY_ADDRESS_TESTNET = "0xD5ac9fBe8Ae711bf228Ed9a9B9B76D6731808dD5";
const VTE_DATA_FEED_REGISTRY_ADDRESS_MAINNET = "";

const DATA_SOURCE_ADDRESS_TESTNET = "0x2855D2c2345A305f2F200Fa3F38ea92fBc035926";
const DATA_SOURCE_ADDRESS_MAINNET = "";

const ORACLE_ADDRESS_TESTNET = "0xFD174a7467db999B34A8AA7aB3EAd47020091385";
const ORACLE_ADDRESS_MAINNET = "";

const FACTORY_ADDRESS_TESTNET = "0x1F0eBaaF4EB7E89b805EAf65b77daA78a344356E";
const FACTORY_ADDRESS_MAINNET = "";

const REGISTRY_ADDRESS_TESTNET = "0xC887d0748e24ca77Dd3c807E3Fab5d79b344eF13";
const REGISTRY_ADDRESS_MAINNET = "";

async function deployDataSource() {
    const signers = await ethers.getSigners();
    deployer = signers[0];
    
    let DataSourceFactory = await ethers.getContractFactory('TradegenCandlestickDataSource');
    
    let dataSource = await DataSourceFactory.deploy(CANDLESTICK_DATA_FEED_REGISTRY_ADDRESS_TESTNET);
    await dataSource.deployed();
    let dataSourceAddress = dataSource.address;
    console.log("TradegenCandlestickDataSource: " + dataSourceAddress);
}

async function deployOracle() {
    const signers = await ethers.getSigners();
    deployer = signers[0];
    
    let OracleFactory = await ethers.getContractFactory('Oracle');
    
    let oracle = await OracleFactory.deploy(DATA_SOURCE_ADDRESS_TESTNET);
    await oracle.deployed();
    let oracleAddress = oracle.address;
    console.log("Oracle: " + oracleAddress);
}

async function deployVTEFactory() {
    const signers = await ethers.getSigners();
    deployer = signers[0];
    
    let VTEFactoryFactory = await ethers.getContractFactory('VirtualTradingEnvironmentFactory');
    
    let factory = await VTEFactoryFactory.deploy(ORACLE_ADDRESS_TESTNET);
    await factory.deployed();
    let factoryAddress = factory.address;
    console.log("VirtualTradingEnvironmentFactory: " + factoryAddress);
}

async function deployVTERegistry() {
    const signers = await ethers.getSigners();
    deployer = signers[0];
    
    let VTERegistryFactory = await ethers.getContractFactory('VirtualTradingEnvironmentRegistry');
    
    let registry = await VTERegistryFactory.deploy(FACTORY_ADDRESS_TESTNET, VTE_DATA_FEED_REGISTRY_ADDRESS_TESTNET);
    await registry.deployed();
    let registryAddress = registry.address;
    console.log("VirtualTradingEnvironmentRegistry: " + registryAddress);
}

async function setRegistry() {
    const signers = await ethers.getSigners();
    deployer = signers[0];
    
    let VTEFactoryFactory = await ethers.getContractFactory('VirtualTradingEnvironmentFactory');
    let factory = VTEFactoryFactory.attach(FACTORY_ADDRESS_TESTNET);
    
    let tx = await factory.initializeContract(REGISTRY_ADDRESS_TESTNET);
    await tx.wait();
  
    let registry = await factory.virtualTradingEnvironmentRegistry();
    console.log(registry);
  }

/*
deployDataSource()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })

deployOracle()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })

deployVTEFactory()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })

deployVTERegistry()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })*/

setRegistry()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })