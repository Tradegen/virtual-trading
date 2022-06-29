// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

// Openzeppelin.
import "./openzeppelin-solidity/contracts/SafeMath.sol";
import "./openzeppelin-solidity/contracts/Ownable.sol";
import "./openzeppelin-solidity/contracts/ERC20/SafeERC20.sol";

// Interfaces.
import './interfaces/IVirtualTradingEnvironmentFactory.sol';
import './interfaces/IVirtualTradingEnvironment.sol';
import './interfaces/external/IVTEDataFeedRegistry.sol';
import './interfaces/external/IVTEDataFeed.sol';

// Inheritance.
import './interfaces/IVirtualTradingEnvironmentRegistry.sol';

contract VirtualTradingEnvironmentRegistry is IVirtualTradingEnvironmentRegistry, Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    uint256 public MAX_VTE_PER_USER;
    uint256 public CREATION_FEE;
    uint256 public MAX_USAGE_FEE;

    IVirtualTradingEnvironmentFactory public immutable factory;
    IVTEDataFeedRegistry public immutable dataFeedRegistry;
    address public immutable feeToken;
    address public immutable xTGEN;

    address public operator;
    address public registrar;

    uint256 public override maximumNumberOfPositions;
    uint256 public override maximumLeverageFactor;

    uint256 public numberOfVTEs;
    // (VTE index => VTE contract address).
    // Starts at index 1.
    mapping (uint256 => address) public virtualTradingEnvironments;
    // (VTE contract address => VTE index).
    mapping (address => uint256) public VTEAddresses;
    // (user address => number of VTEs the user owns).
    mapping (address => uint256) public VTEsPerUser;

    constructor(address _factory, address _registry, address _feeToken, address _xTGEN) {
        factory = IVirtualTradingEnvironmentFactory(_factory);
        registry = IVTEDataFeedRegistry(_registry);
        feeToken = IERC20(_feeToken);
        xTGEN = _xTGEN;

        operator = msg.sender;
        registrar = msg.sender;
        maximumNumberOfPositions = 8;
        maximumLeverageFactor = 1000;

        MAX_VTE_PER_USER = 3;
        CREATION_FEE = 1e20;
        MAX_USAGE_FEE = 1e21;
    }

    /* ========== VIEWS ========== */

    /**
    * @notice Returns the address of the given VTE's data feed.
    * @dev Returns address(0) if the VTE is not found.
    * @dev Either [_index] or [_VTE] is used for getting the data.
    * @dev If [_index] is 0, then [_VTE] is used.
    * @dev If [_VTE] is address(0), then [_index] is used.
    * @dev If [_index] and [_VTE] are both valid values, then [_index] is used.
    * @param _index Index of the virtual trading environment.
    * @param _VTE Address of the virtual trading environment.
    * @return address Address of the VTE's data feed.
    */
    function getVTEDataFeed(uint256 _index, address _VTE) external view override returns (address) {
        if (_index == 0) {
            return IVirtualTradingEnvironment(_VTE).dataFeed();
        }

        if (_VTE == address(0)) {
            return IVirtualTradingEnvironment(VTEAddresses[_index]).dataFeed();
        }

        return address(0);
    }

    /**
    * @notice Returns the address of the given VTE's owner.
    * @dev Returns address(0) if the VTE is not found.
    * @dev Either [_index] or [_VTE] is used for getting the data.
    * @dev If [_index] is 0, then [_VTE] is used.
    * @dev If [_VTE] is address(0), then [_index] is used.
    * @dev If [_index] and [_VTE] are both valid values, then [_index] is used.
    * @param _index Index of the virtual trading environment.
    * @param _VTE Address of the virtual trading environment.
    * @return address Address of the VTE's owner.
    */
    function getOwner(uint256 _index, address _VTE) external view override returns (address) {
        if (_index == 0) {
            return IVirtualTradingEnvironment(_VTE).owner();
        }

        if (_VTE == address(0)) {
            return IVirtualTradingEnvironment(VTEAddresses[_index]).owner();
        }

        return address(0);
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    /**
     * @notice Creates a virtual trading environment contract.
     * @dev Transaction will revert if _usageFee is too high.
     * @param _usageFee Fee that users pay when making a request to the VTE's data feed.
     */
    function createVirtualTradingEnvironment(uint256 _usageFee) external override {
        require(VTEsPerUser[msg.sender] < MAX_VTE_PER_USER, "VirtualTradingEnvironmentRegistry: User already has VTEs.");
        require(_usageFee <= MAX_USAGE_FEE, "VirtualTradingEnvironmentRegistry: Usage fee is too high.");

        // Gas savings.
        uint256 index = numberOfVTEs.add(1);

        // Create the contract and get address.
        address VTE = factory.createVirtualTradingEnvironment(msg.sender);

        numberOfVTEs = index;
        VTEsPerUser[msg.sender] = VTEsPerUser[msg.sender].add(1);
        virtualTradingEnvironments[index] = VTE;
        VTEAddresses[VTE] = index;

        emit CreatedVTE(index, VTE, msg.sender);
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    /**
    * @notice Updates the address of the given VTE's data feed.
    * @dev Only the owner of the VirtualTradingEnvironmentRegistry contract can call this function.
    * @dev Transaction will revert if the VTE is not found.
    * @param _index Index of the virtual trading environment.
    * @param _dataFeed Address of the VirtualTradingEnvironmentDataFeed contract.
    */
    function setDataFeed(uint256 _index, address _dataFeed) external override {
        require(_index > 0 && _index <= numberOfVTEs, "VirtualTradingEnvironmentRegistry: Index out of bounds.");
        require(VTEAddresses[_index] == IVTEDataFeed(_dataFeed).dataProvider(), "VirtualTradingEnvironmentRegistry: VTE is not the data provider for this data feed.");

        IVirtualTradingEnvironment(VTEAddresses[_index]).setDataFeed(_dataFeed);

        emit SetDataFeed(_index, _dataFeed);
    }

    /**
     * @notice Updates the address of the operator.
     * @dev This function can only be called by the VirtualTradingEnvironmentRegistry owner.
     * @param _newOperator Address of the new operator.
     */
    function setOperator(address _newOperator) external override onlyOwner {
        operator = _newOperator;

        emit SetOperator(_newOperator);
    }

    /**
     * @notice Updates the address of the registrar.
     * @dev This function can only be called by the VirtualTradingEnvironmentRegistry owner.
     * @param _newRegistrar Address of the new registrar.
     */
    function setRegistrar(address _newRegistrar) external override onlyOwner {
        registrar = _newRegistrar;

        emit SetRegistrar(_newRegistrar);
    }

    /**
     * @notice Increases the maximum number of VTEs per user.
     * @dev This function can only be called by the operator.
     * @param _newLimit The new maximum number of VTEs per user.
     */
    function increaseMaxVTEsPerUser(uint256 _newLimit) external onlyOperator {
        require(_newLimit > MAX_VTE_PER_USER, "VirtualTradingEnvironmentRegistry: New limit must be higher.");

        MAX_VTE_PER_USER = _newLimit;

        emit IncreasedMaxVTEsPerUser(_newLimit);
    }

    /**
     * @notice Updates the mint fee.
     * @dev This function can only be called by the operator.
     * @param _newFee The new mint fee.
     */
    function updateMintFee(uint256 _newFee) external onlyOperator {
        require(_newFee >= 0, "VirtualTradingEnvironmentRegistry: New fee must be positive.");

        CREATION_FEE = _newFee;

        emit UpdatedCreationFee(_newFee);
    }

    /**
     * @notice Updates the max usage fee.
     * @dev This function can only be called by the operator.
     * @param _newFee The new max usage fee.
     */
    function updateMaxUsageFee(uint256 _newFee) external onlyOperator {
        require(_newFee >= 0, "VirtualTradingEnvironmentRegistry: New fee must be positive.");

        MAX_USAGE_FEE = _newFee;

        emit UpdatedMaxUsageFee(_newFee);
    }

    /* ========== MODIFIERS ========== */

    modifier onlyRegistrar() {
        require(msg.sender == registrar, "VirtualTradingEnvironmentRegistry: Only the registrar can call this function.");
        _;
    }

    modifier onlyOperator() {
        require(msg.sender == operator, "VirtualTradingEnvironmentRegistry: Only the operator can call this function.");
        _;
    }

    /* ========== EVENTS ========== */

    event SetOperator(address newOperator);
    event SetRegistrar(address newRegistrar);
    event SetDataFeed(uint256 index, address dataFeed);
    event IncreasedMaxVTEsPerUser(uint256 newLimit);
    event UpdatedCreationFee(uint256 newFee);
    event UpdatedMaxUsageFee(uint256 newFee);
    event CreatedVTE(uint256 index, address contractAddress, address owner);
}