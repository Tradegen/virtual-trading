// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

// Libraries.
import "./Utils.sol";

// Inheritance.
import '../../interfaces/external/IVTEDataFeed.sol';

// Interfaces.
import '../../interfaces/IOracle.sol';
import './IFeePool.sol';
import '../../interfaces/IVirtualTradingEnvironment.sol';

// OpenZeppelin.
import '../../openzeppelin-solidity/contracts/SafeMath.sol';
import '../../openzeppelin-solidity/contracts/ERC20/SafeERC20.sol';

contract VTEDataFeed is IVTEDataFeed {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /* ========== CONSTANTS ========== */

    // Maximum usage fee is 1,000 fee tokens.
    uint256 public constant MAX_USAGE_FEE = 1e21;

    // Minimum amount of time between fee changes.
    uint256 public constant MIN_TIME_BETWEEN_FEE_CHANGES = 1 days;

    // Maximum % that a portfolio can fall while 'net current value' is positive.
    // Used to prevent a phase transition when theoretical losses exceed 100%.
    uint256 public constant SCALING_FACTOR = 80;

    /* ========== STATE VARIABLES ========== */

    // Timestamp of the last usage fee update.
    uint256 private lastFeeChangeTimestamp;

    // Timestamp at which this data feed was created.
    uint256 public override createdOn;

    // Address of the user/contract responsible for supplying data to this contract.
    address public override dataProvider;

    // Address of the user/contract that can update the settings of this contract.
    // Operator is initially the contract owner.
    address public operator;

    // Stores usage fees.
    IFeePool immutable feePool;

    // Used for getting the current price of an asset.
    IOracle immutable oracle;

    // Address of the data feed's virtual trading environment.
    address public immutable VTE;

    // The token that is used for paying usage fees.
    address public immutable override feeToken;

    // Number of fee tokens to pay whenever a contract view the current VTE price.
    // Fee tokens are sent to the VTE owner via the FeePool contract.
    uint256 public override usageFee;

    // Keeps track of the total number of updates this data feed has made.
    uint256 public numberOfUpdates;

    // Timestamp at which the last update was made.
    uint256 public override lastUpdated;

    // (update index => order info).
    // Starts at index 1.
    mapping (uint256 => Order) internal orders;

    // (update index => timestamp at which the update was made).
    mapping (uint256 => uint256) public indexTimestamps;

    // Total number of positions the VTE currently has.
    uint256 public numberOfPositions;

    // (position index => position info).
    mapping (uint256 => Position) public positions;

    // (asset symbol => position index).
    // Maps to index 0 if there is no position with the given symbol.
    mapping (string => uint256) public positionIndexes;

    uint256 internal latestPortfolioValue;

    /* ========== CONSTRUCTOR ========== */

    constructor(address _dataProvider, address _operator, address _feePool, address _oracle, address _VTE, address _feeToken, uint256 _usageFee) {
        require(_usageFee <= MAX_USAGE_FEE, "VTEDataFeed: Cannot exceed maximum usage fee.");

        dataProvider = _dataProvider;
        operator = _operator;
        feePool = IFeePool(_feePool);
        oracle = IOracle(_oracle);
        VTE = _VTE;
        feeToken = _feeToken;
        usageFee = _usageFee;
        createdOn = block.timestamp;
        latestPortfolioValue = 1e18;
    }

    /* ========== VIEWS ========== */

    /**
    * @notice Returns the timestamp at which the update at the given index was made.
    * @param _index Index in this data feed's history of updates.
    * @return uint256 Timestamp at which the update was made.
    */
    function getIndexTimestamp(uint256 _index) external view override returns (uint256) {
        return indexTimestamps[_index];
    }

    /**
     * @notice Returns the order info at the given index.
     * @param _index Index of the order.
     * @return (address, bool, uint256, uint256, uint256) Symbol of the asset, whether the order was a 'buy', timestamp, asset's price, and the leverage factor.
     */
    function getOrderInfo(uint256 _index) external view override returns (string memory, bool, uint256, uint256, uint256) {
        // Gas savings.
        Order memory order = orders[_index];

        return (order.asset, order.isBuy, order.timestamp, order.assetPrice, order.leverageFactor);
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    /**
     * @notice Adds the order to the ledger and updates the VTE's token price.
     * @dev This function is meant to be called by the dedicated data provider whenever the VTE owner
     *      makes a trade.
     * @param _asset Symbol of the asset.
     * @param _isBuy Whether the order is a 'buy' order.
     * @param _price Price at which the order executed.
     * @param _leverageFactor Amount of leverage used.
     */
    function updateData(string memory _asset, bool _isBuy, uint256 _price, uint256 _leverageFactor) external override onlyDataProvider {
        (uint256 positiveCurrentValue, uint256 negativeCurrentValue) = _updatePositions(_asset, _isBuy, _price, _leverageFactor);
        
        // Gas savings.
        uint256 index = numberOfUpdates.add(1);
        uint256 VTEPrice = _calculateTokenPrice(positiveCurrentValue, negativeCurrentValue);

        orders[index] = Order({
            asset: _asset,
            isBuy: _isBuy,
            timestamp: block.timestamp,
            assetPrice: _price,
            leverageFactor: _leverageFactor
        });

        numberOfUpdates = index;
        indexTimestamps[index] = block.timestamp;
        lastUpdated = block.timestamp;

        emit UpdatedData(index, _asset, _isBuy, _price, _leverageFactor, VTEPrice);
    }

    /**
     * @notice Returns the current token price of the VTE.
     * @dev Contracts calling this function need to pay the usage fee.
     * @return (uint256) Price of the VTE's token, in USD.
     */
    function getTokenPrice() external override returns (uint256) {
        // Collects the usage fee from the caller.
        IERC20(feeToken).safeTransferFrom(msg.sender, address(this), usageFee);

        // Transfers the usage fee to the VTE owner via FeePool contract.
        IERC20(feeToken).approve(address(feePool), usageFee);
        feePool.addFees(IVirtualTradingEnvironment(VTE).VTEOwner(), usageFee);

        Params memory params = _calculateCurrentValues("");
        uint256 price = _calculateTokenPrice(params.positiveCurrentValue, params.negativeCurrentValue);

        emit GetTokenPrice(msg.sender, usageFee, price);

        return price;
    }

    /* ========== INTERNAL FUNCTIONS ========== */

    /**
     * @notice Returns the sum of [(% change) * 1e18 / 100] for profitable/unprofitable positions.
     */
    function _calculateCurrentValues(string memory _asset) internal view returns (Params memory params) {
        // Gas savings.
        uint256 positionCount = numberOfPositions;

        for (uint256 i = 1; i <= positionCount; i++) {
            Position memory position = positions[i];
            uint256 currentPrice = oracle.getLatestPrice(position.asset);

            // Profitable long position.
            if (currentPrice >= position.entryPrice && position.isLong) {
                uint256 amount = (currentPrice.sub(position.entryPrice)).mul(position.leverageFactor).div(position.entryPrice);
                params.positiveCurrentValue = params.positiveCurrentValue.add(amount);

                if (keccak256(abi.encodePacked(position.asset)) == keccak256(abi.encodePacked(_asset))) {
                    params.isPositive = true;
                    params.valueRemoved = amount;
                }
            }
            // Profitable short position.
            else if (currentPrice <= position.entryPrice && !position.isLong) {
                uint256 amount = (position.entryPrice.sub(currentPrice)).mul(position.leverageFactor).div(position.entryPrice);
                params.positiveCurrentValue = params.positiveCurrentValue.add(amount);

                if (keccak256(abi.encodePacked(position.asset)) == keccak256(abi.encodePacked(_asset))) {
                    params.isPositive = true;
                    params.valueRemoved = amount;
                }
            }
            // Unprofitable long position. 
            else if (currentPrice < position.entryPrice && position.isLong) {
                uint256 amount = (position.entryPrice.sub(currentPrice)).mul(position.leverageFactor).div(position.entryPrice);
                params.negativeCurrentValue = params.negativeCurrentValue.add(amount);

                if (keccak256(abi.encodePacked(position.asset)) == keccak256(abi.encodePacked(_asset))) {
                    params.valueRemoved = amount;
                }
            }
            // Unprofitable short position.
            else {
                uint256 amount = (currentPrice.sub(position.entryPrice)).mul(position.leverageFactor).div(position.entryPrice);
                params.negativeCurrentValue = params.negativeCurrentValue.add(amount);

                if (keccak256(abi.encodePacked(position.asset)) == keccak256(abi.encodePacked(_asset))) {
                    params.valueRemoved = amount;
                }
            }
        }
    }

    /**
     * @notice Calculates the current token price of the VTE.
     * @param _positiveCurrentValue The sum of [(% change) * 1e18 / 100] for profitable positions.
     * @param _negativeCurrentValue The sum of [(% change) * 1e18 / 100] for unprofitable positions.
     * @return (uint256) Price of the VTE's token, in USD.
     */
    function _calculateTokenPrice(uint256 _positiveCurrentValue, uint256 _negativeCurrentValue) internal view returns (uint256) {
        // Return early if the VTE has not made any trades yet.
        if (numberOfUpdates == 0) {
            return 1e18;
        }

        (uint256 caseNumber, uint256 scalar) = Utils.calculateCase(_positiveCurrentValue, _negativeCurrentValue);

        // >=0% gain.
        if (caseNumber == 1) {
            return latestPortfolioValue.mul(scalar.add(1e18)).div(1e18);
        }
        // <100% loss.
        else if (caseNumber == 2) {
            return latestPortfolioValue.sub(latestPortfolioValue.mul(SCALING_FACTOR).mul(scalar).div(1e18).div(100));
        }
        // 100% loss.
        else if (caseNumber == 3) {
            return latestPortfolioValue.mul(uint256(100).sub(SCALING_FACTOR)).div(100);
        }

        // >100% loss.
        return latestPortfolioValue.mul(uint256(100).sub(SCALING_FACTOR)).div(100).mul(1e18).div(scalar);
    }

    /**
     * @notice Updates the VTE's positions based on the latest order.
     * @param _asset Symbol of the asset.
     * @param _isBuy Whether the order represents a 'buy' order.
     * @param _price Price at which the order executed.
     * @param _leverageFactor Amount of leveraged used in the order; 18 decimals.
     * @return (uint256, uint256) The total positive current value and the total negative current value.
     */
    function _updatePositions(string memory _asset, bool _isBuy, uint256 _price, uint256 _leverageFactor) internal returns (uint256, uint256) {
        // Gas savings.
        uint256 index = positionIndexes[_asset];
        Position memory position = positions[index];

        Params memory params = _calculateCurrentValues(_asset);

        // Check if opening a position.
        if (position.leverageFactor == 0) {
            // Update local variables.
            position.isLong = _isBuy;
            index = numberOfPositions.add(1);

            numberOfPositions = index;
            positionIndexes[_asset] = index;
            positions[index].isLong = _isBuy;
            positions[index].asset = _asset;
        }

        // If order is same direction as position, add to leverage factor.
        if ((position.isLong && _isBuy) || (!position.isLong && !_isBuy)) {
            positions[index].leverageFactor = position.leverageFactor.add(_leverageFactor);
            // Calculate new entry price.
            // New position.
            if (position.entryPrice == 0) {
                positions[index].entryPrice = _price;
            }
            // Adding to long position.
            else if (position.isLong) {
                uint256 denominator = _price >= position.entryPrice ? (position.leverageFactor.mul(_price.sub(position.entryPrice))).add(position.entryPrice.mul(position.leverageFactor.add(_leverageFactor))) : (position.entryPrice.mul(position.leverageFactor.add(_leverageFactor))).sub((position.leverageFactor.mul(position.entryPrice.sub(_price))));
                positions[index].entryPrice = (_price.mul(position.entryPrice).mul(position.leverageFactor.add(_leverageFactor))).div(denominator);
            }
            // Adding to short position.
            else {
                uint256 denominator = _price <= position.entryPrice ? (position.entryPrice.mul(position.leverageFactor.add(_leverageFactor))).sub((position.leverageFactor.mul(position.entryPrice.sub(_price)))) : (position.leverageFactor.mul(_price.sub(position.entryPrice))).add(position.entryPrice.mul(position.leverageFactor.add(_leverageFactor)));
                positions[index].entryPrice = (_price.mul(position.entryPrice).mul(position.leverageFactor.add(_leverageFactor))).div(denominator);
            }
            
            // Update local variable.
            position.leverageFactor = position.leverageFactor.add(_leverageFactor);
        }
        // Reduce position or switch directions.
        else {
            // Update portfolio value.
            latestPortfolioValue = latestPortfolioValue.mul(Utils.calculateScalar(params.positiveCurrentValue, params.negativeCurrentValue, params.valueRemoved, params.isPositive)).div(1e18);

            // Reset position's entry price.
            positions[index].entryPrice = _price;

            if (position.leverageFactor >= _leverageFactor) {
                positions[index].leverageFactor = position.leverageFactor.sub(_leverageFactor);

                // Update local variable.
                position.leverageFactor = position.leverageFactor.sub(_leverageFactor);
            }
            else {
                positions[index].leverageFactor = _leverageFactor.sub(position.leverageFactor);
                positions[index].isLong = !position.isLong;

                // Update local variable.
                position.leverageFactor = _leverageFactor.sub(position.leverageFactor);
            }
        }

        // Check if closing a position.
        // Move the last position to the current position and delete the last position.
        if (position.leverageFactor == 0) {
            string memory lastAsset = positions[numberOfPositions].asset;

            positionIndexes[lastAsset] = index;
            positionIndexes[_asset] = 0;
            positions[index] = positions[numberOfPositions];
            delete positions[numberOfPositions];
            numberOfPositions = numberOfPositions.sub(1);
        }

        return (params.positiveCurrentValue, params.negativeCurrentValue);
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    /**
    * @notice Updates the address of the data provider allowed to update this data feed.
    * @dev Only the contract operator can call this function.
    * @param _newProvider Address of the new data provider.
    */
    function updateDedicatedDataProvider(address _newProvider) external override onlyOperator {
        dataProvider = _newProvider;

        emit UpdatedDedicatedDataProvider(_newProvider);
    }

    /**
    * @notice Updates the operator of this contract.
    * @dev Only the contract owner can call this function.
    * @param _newOperator Address of the new operator.
    */
    function setOperator(address _newOperator) external override onlyOperator {
        operator = _newOperator;

        emit SetOperator(_newOperator);
    }

    /**
    * @notice Updates the usage fee for this data feed.
    * @dev Only the data feed owner (VTE owner) can call this function.
    * @dev Assumes that the given fee is scaled to 18 decimals.
    */
    function updateUsageFee(uint256 _newFee) external override onlyVTEOwner {
        require(_newFee <= MAX_USAGE_FEE, "VTEDataFeed: New usage fee cannot be greater than the max usage fee.");
        require(block.timestamp.sub(lastFeeChangeTimestamp) >= MIN_TIME_BETWEEN_FEE_CHANGES, "VTEDataFeed: Not enough time between fee changes.");

        usageFee = _newFee;
        lastFeeChangeTimestamp = block.timestamp;

        emit UpdatedUsageFee(_newFee);
    }

    /* ========== MODIFIERS ========== */

    modifier onlyOperator() {
        require(msg.sender == operator, "VTEDataFeed: Only the operator can call this function.");
        _;
    }

    modifier onlyDataProvider() {
        require(msg.sender == dataProvider, "VTEDataFeed: Only the data provider can call this function.");
        _;
    }

    modifier onlyVTEOwner() {
        require(msg.sender == IVirtualTradingEnvironment(VTE).VTEOwner(), "VTEDataFeed: Only the VTE owner can call this function.");
        _;
    }

    /* ========== EVENTS ========== */

    event UpdatedData(uint256 index, string asset, bool isBuy, uint256 assetPrice, uint256 leverageFactor, uint256 VTEPrice);
    event UpdatedDedicatedDataProvider(address newProvider);
    event SetOperator(address newOperator);
    event UpdatedUsageFee(uint256 newFee);
    event GetTokenPrice(address caller, uint256 amountPaid, uint256 tokenPrice);
}