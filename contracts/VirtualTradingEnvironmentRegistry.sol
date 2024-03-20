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
    uint256 public MAX_USAGE_FEE;
    uint256 public MINIMUM_TIME_BETWEEN_NAME_UPDATES;

    IVirtualTradingEnvironmentFactory public immutable factory;
    IVTEDataFeedRegistry public immutable dataFeedRegistry;

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
    // (VTE contract address => timestamp of last name update).
    mapping (address => uint256) public lastNameUpdateTimestamps;

    constructor(address _factory, address _registry) {
        factory = IVirtualTradingEnvironmentFactory(_factory);
        dataFeedRegistry = IVTEDataFeedRegistry(_registry);

        operator = msg.sender;
        registrar = msg.sender;
        maximumNumberOfPositions = 5;
        maximumLeverageFactor = 1e19;

        MAX_VTE_PER_USER = 2;
        MAX_USAGE_FEE = 1e21;
        MINIMUM_TIME_BETWEEN_NAME_UPDATES = 1 weeks;
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
            return IVirtualTradingEnvironment(virtualTradingEnvironments[_index]).dataFeed();
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
            return IVirtualTradingEnvironment(_VTE).VTEOwner();
        }

        if (_VTE == address(0)) {
            return IVirtualTradingEnvironment(virtualTradingEnvironments[_index]).VTEOwner();
        }

        return address(0);
    }

    /**
    * @notice Returns the name of the given VTE.
    * @dev Returns an empty string if the VTE is not found.
    * @dev Either [_index] or [_VTE] is used for getting the data.
    * @dev If [_index] is 0, then [_VTE] is used.
    * @dev If [_VTE] is address(0), then [_index] is used.
    * @dev If [_index] and [_VTE] are both valid values, then [_index] is used.
    * @param _index Index of the virtual trading environment.
    * @param _VTE Address of the virtual trading environment.
    * @return string Name of the VTE.
    */
    function getVTEName(uint256 _index, address _VTE) external view override returns (string memory) {
        if (_index == 0) {
            return IVirtualTradingEnvironment(_VTE).name();
        }

        if (_VTE == address(0)) {
            return IVirtualTradingEnvironment(virtualTradingEnvironments[_index]).name();
        }

        return "";
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    /**
     * @notice Creates a virtual trading environment contract.
     * @dev Transaction will revert if _usageFee is too high.
     * @param _usageFee Fee that users pay when making a request to the VTE's data feed.
     * @param _name Name of the VTE.
     */
    function createVirtualTradingEnvironment(uint256 _usageFee, string memory _name) external override {
        require(VTEsPerUser[msg.sender] < MAX_VTE_PER_USER, "VirtualTradingEnvironmentRegistry: User already has VTEs.");
        require(_usageFee <= MAX_USAGE_FEE, "VirtualTradingEnvironmentRegistry: Usage fee is too high.");

        // Gas savings.
        uint256 index = numberOfVTEs.add(1);

        // Create the contract and get address.
        address VTE = factory.createVirtualTradingEnvironment(msg.sender, _name);

        // Create data feed.
        address dataFeed = dataFeedRegistry.registerDataFeed(VTE, _usageFee, VTE);
        IVirtualTradingEnvironment(VTE).setDataFeed(dataFeed);

        numberOfVTEs = index;
        VTEsPerUser[msg.sender] = VTEsPerUser[msg.sender].add(1);
        virtualTradingEnvironments[index] = VTE;
        VTEAddresses[VTE] = index;

        emit CreatedVTE(index, VTE, msg.sender, _name);
    }

    /**
    * @notice Updates the name of the given VTE.
    * @dev This function can only be called by the VTE owner.
    * @dev Transaction will fail if this function is called before the minimum time between name updates.
    * @dev Either [_index] or [_VTE] is used for accessing the VTE.
    * @dev If [_index] is 0, then [_VTE] is used.
    * @dev If [_VTE] is address(0), then [_index] is used.
    * @dev If [_index] and [_VTE] are both valid values, then [_index] is used.
    * @param _index Index of the virtual trading environment.
    * @param _VTE Address of the virtual trading environment.
    * @param _newName New name for the VTE.
    */
    function updateName(uint256 _index, address _VTE, string memory _newName) external override onlyVTEOwner(_VTE == address(0) ? virtualTradingEnvironments[_index] : _VTE) {
        address VTEAddress = _VTE == address(0) ? virtualTradingEnvironments[_index] : _VTE;
        string memory oldName = IVirtualTradingEnvironment(VTEAddress).name();

        require(block.timestamp - lastNameUpdateTimestamps[VTEAddress] >= MINIMUM_TIME_BETWEEN_NAME_UPDATES, "VirtualTradingEnvironmentRegistry: Not enough time between name updates.");

        lastNameUpdateTimestamps[VTEAddress] = block.timestamp;
        IVirtualTradingEnvironment(VTEAddress).updateName(_newName);

        emit UpdatedVTEName(VTEAddress, oldName, _newName);
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    /**
    * @notice Updates the address of the given VTE's data feed.
    * @dev Only the owner of the VirtualTradingEnvironmentRegistry contract can call this function.
    * @dev Transaction will revert if the VTE is not found.
    * @param _index Index of the virtual trading environment.
    * @param _dataFeed Address of the VirtualTradingEnvironmentDataFeed contract.
    */
    function setDataFeed(uint256 _index, address _dataFeed) external override onlyOwner {
        require(_index > 0 && _index <= numberOfVTEs, "VirtualTradingEnvironmentRegistry: Index out of bounds.");
        require(virtualTradingEnvironments[_index] == IVTEDataFeed(_dataFeed).dataProvider(), "VirtualTradingEnvironmentRegistry: VTE is not the data provider for this data feed.");

        IVirtualTradingEnvironment(virtualTradingEnvironments[_index]).setDataFeed(_dataFeed);

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
     * @notice Updates the max usage fee.
     * @dev This function can only be called by the operator.
     * @param _newFee The new max usage fee.
     */
    function updateMaxUsageFee(uint256 _newFee) external onlyOperator {
        require(_newFee >= 0, "VirtualTradingEnvironmentRegistry: New fee must be positive.");

        MAX_USAGE_FEE = _newFee;

        emit UpdatedMaxUsageFee(_newFee);
    }

    /**
     * @notice Increases the maximum number of positions that a VTE can have.
     * @dev This function can only be called by the operator.
     * @param _newLimit The new maximum number of positions
     */
    function increaseMaximumNumberOfPositions(uint256 _newLimit) external onlyOperator {
        require(_newLimit > maximumNumberOfPositions, "VirtualTradingEnvironmentRegistry: New limit must be higher.");

        maximumNumberOfPositions = _newLimit;

        emit IncreasedMaximumNumberOfPositions(_newLimit);
    }

    /**
     * @notice Increases the maximum leverage factor that a VTE can have.
     * @dev This function can only be called by the operator.
     * @param _newLimit The new maximum leverage factor.
     */
    function increaseMaximumLeverageFactor(uint256 _newLimit) external onlyOperator {
        require(_newLimit > maximumLeverageFactor, "VirtualTradingEnvironmentRegistry: New limit must be higher.");

        maximumLeverageFactor = _newLimit;

        emit IncreasedMaximumLeverageFactor(_newLimit);
    }

    /**
     * @notice Increases the minimum time between VTE name updates.
     * @dev This function can only be called by the operator.
     * @param _newMinimumTime The new minimum time between name updates.
     */
    function increaseMinimumTimeBetweenNameUpdates(uint256 _newMinimumTime) external onlyOperator {
        require(_newMinimumTime > MINIMUM_TIME_BETWEEN_NAME_UPDATES, "VirtualTradingEnvironmentRegistry: New minimum time must be higher.");

        MINIMUM_TIME_BETWEEN_NAME_UPDATES = _newMinimumTime;

        emit IncreasedMinimumTimeBetweenNameUpdates(_newMinimumTime);
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

    modifier onlyVTEOwner(address _VTE) {
        require(msg.sender == IVirtualTradingEnvironment(_VTE).VTEOwner(), "VirtualTradingEnvironmentRegistry: Only the VTE owner can call this function.");
        _;
    }

    /* ========== EVENTS ========== */

    event SetOperator(address newOperator);
    event SetRegistrar(address newRegistrar);
    event SetDataFeed(uint256 index, address dataFeed);
    event IncreasedMaxVTEsPerUser(uint256 newLimit);
    event UpdatedCreationFee(uint256 newFee);
    event UpdatedMaxUsageFee(uint256 newFee);
    event CreatedVTE(uint256 index, address contractAddress, address owner, string name);
    event UpdatedVTEName(address VTE, string oldName, string newName);
    event IncreasedMaximumNumberOfPositions(uint256 newLimit);
    event IncreasedMaximumLeverageFactor(uint256 newLimit);
    event IncreasedMinimumTimeBetweenNameUpdates(uint256 newMinimumTime);
}