// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

// Openzeppelin.
import "./openzeppelin-solidity/contracts/SafeMath.sol";

// Interfaces.
import './interfaces/IOracle.sol';
import './interfaces/IVirtualTradingEnvironmentRegistry.sol';
import './interfaces/external/IVTEDataFeed.sol';

// Inheritance.
import './interfaces/IVirtualTradingEnvironment.sol';

contract VirtualTradingEnvironment is IVirtualTradingEnvironment {
    using SafeMath for uint256;

    IOracle public immutable oracle;
    IVirtualTradingEnvironmentRegistry public immutable registry;
    address public immutable override VTEOwner;
    address public override dataFeed;
    string public override name;

    // Total leverage factor across all positions.
    uint256 public cumulativeLeverageFactor;

    uint256 public numberOfPositions;
    // (asset symbol => position info).
    mapping (string => Position) public positions;

    constructor(address _owner, address _oracle, address _registry, string memory _name) {
        VTEOwner = _owner;
        name = _name;
        oracle = IOracle(_oracle);
        registry = IVirtualTradingEnvironmentRegistry(_registry);
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    /**
    * @notice Simulates a market order for the given asset.
    * @dev This function can only be called by the VTE owner.
    * @dev Transaction will revert if adding the given leverage factor exceeds the max leverage factor.
    * @param _asset Symbol of the asset.
    * @param _isBuy Whether the order represents a 'buy' order.
    * @param _leverageFactor Amount of leverage to use; denominated by 100.
    *                        Ex) 2x leverage = 200; 0.25x leverage = 25.
    */
    function placeOrder(string memory _asset, bool _isBuy, uint256 _leverageFactor) external override onlyOwner {
        require(cumulativeLeverageFactor.add(_leverageFactor) <= registry.maximumLeverageFactor(), "VirtualTradingEnvironment: New cumulative leverage factor is too high.");
        require(numberOfPositions < registry.maximumNumberOfPositions(), "VirtualTradingEnvironment: Too many positions.");

        uint256 currentPrice = oracle.getLatestPrice(_asset);
        require(currentPrice > 0, "VirtualTradingEnvironment: Error getting the latest price.");

        // Gas savings.
        Position memory position = positions[_asset];

        // Check if opening a position.
        if (position.leverageFactor == 0) {
            numberOfPositions = numberOfPositions.add(1);
            positions[_asset].isLong = _isBuy;

            // Update local variable.
            position.isLong = _isBuy;
        }

        // If order is same direction as position, add to leverage factor.
        if ((position.isLong && _isBuy) || (!position.isLong && !_isBuy)) {
            // Update local variable.
            position.leverageFactor = position.leverageFactor.add(_leverageFactor);

            positions[_asset].leverageFactor = position.leverageFactor;
            cumulativeLeverageFactor = cumulativeLeverageFactor.add(_leverageFactor);
        }
        // Reduce position or switch directions.
        else {
            // Reduce position.
            if (position.leverageFactor >= _leverageFactor) {
                // Update local variable.
                position.leverageFactor = position.leverageFactor.sub(_leverageFactor);

                positions[_asset].leverageFactor = position.leverageFactor;
                cumulativeLeverageFactor = cumulativeLeverageFactor.sub(_leverageFactor);
            }
            // Switch directions.
            else {
                positions[_asset].leverageFactor = _leverageFactor.sub(position.leverageFactor);
                positions[_asset].isLong = !position.isLong;
                cumulativeLeverageFactor = cumulativeLeverageFactor.sub(position.leverageFactor).add(_leverageFactor).sub(position.leverageFactor);

                // Update local variable.
                position.leverageFactor = _leverageFactor.sub(position.leverageFactor);
            }
        }

        // Check if closing a position.
        if (position.leverageFactor == 0) {
            numberOfPositions = numberOfPositions.sub(1);
        }

        IVTEDataFeed(dataFeed).updateData(_asset, _isBuy, currentPrice, _leverageFactor);

        emit PlacedOrder(_asset, _isBuy, currentPrice, _leverageFactor);
    }

    /**
    * @notice Simulates a market order to close the position in the given asset.
    * @dev This function can only be called by the VTE owner.
    * @dev Transaction will revert if the VTE does not have a position in the given asset.
    * @param _asset Symbol of the asset.
    */
    function closePosition(string memory _asset) external override onlyOwner {
        // Gas savings.
        Position memory position = positions[_asset];

        require(position.leverageFactor > 0, "VirtualTradingEnvironment: Position does not exist.");

        uint256 currentPrice = oracle.getLatestPrice(_asset);
        require(currentPrice > 0, "VirtualTradingEnvironment: Error getting the latest price.");

        numberOfPositions = numberOfPositions.sub(1);
        positions[_asset].leverageFactor = 0;
        cumulativeLeverageFactor = cumulativeLeverageFactor.sub(position.leverageFactor);
        IVTEDataFeed(dataFeed).updateData(_asset, !position.isLong, currentPrice, position.leverageFactor);

        emit PlacedOrder(_asset, !position.isLong, currentPrice, position.leverageFactor);
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    /**
    * @notice Sets the address of the VTE's VirtualTradingEnvironmentDataFeed contract.
    * @dev This function can only be called once by the VirtualTradingEnvironmentRegistry contract.
    * @param _dataFeed Address of the VirtualTradingEnvironmentDataFeed contract.
    */
    function setDataFeed(address _dataFeed) external override onlyVTERegistry {
        dataFeed = _dataFeed;

        emit SetDataFeed(_dataFeed);
    }

    /**
    * @notice Updates the name of this VTE.
    * @dev This function can only be called once by the VirtualTradingEnvironmentRegistry contract.
    * @param _newName The new name for this VTE.
    */
    function updateName(string memory _newName) external override onlyVTERegistry {
        string memory oldName = name;

        name = _newName;

        emit UpdatedName(oldName, _newName);
    }

    /* ========== MODIFIERS ========== */

    modifier onlyOwner() {
        require(msg.sender == VTEOwner, "VirtualTradingEnvironment: Only the owner can call this function.");
        _;
    }

    modifier onlyVTERegistry() {
        require(msg.sender == address(registry), "VirtualTradingEnvironment: Only the VirtualTradingEnvironmentRegistry contract can call this function.");
        _;
    }

    /* ========== EVENTS ========== */

    event SetDataFeed(address newDataFeed);
    event PlacedOrder(string asset, bool isBuy, uint256 assetPrice, uint256 leverageFactor);
    event UpdatedName(string oldName, string newName);
}