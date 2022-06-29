// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

// OpenZeppelin.
import "./openzeppelin-solidity/contracts/Ownable.sol";

// Internal references.
import './VirtualTradingEnvironment.sol';

// Inheritance.
import './interfaces/IVirtualTradingEnvironmentFactory.sol';

contract VirtualTradingEnvironmentFactory is IVirtualTradingEnvironmentFactory, Ownable {
    address public immutable oracle;
    address public virtualTradingEnvironmentRegistry;

    constructor(address _oracle, address _virtualTradingEnvironmentRegistry) Ownable() {
        oracle = _oracle;
        virtualTradingEnvironmentRegistry = _virtualTradingEnvironmentRegistry;
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    /**
    * @notice Deploys a VirtualTradingEnvironment contract and returns the contract's address.
    * @dev This function can only be called by the VirtualTradingEnvironmentRegistry contract.
    * @param _owner Address of the user that can trade in the VTE.
    * @return address Address of the deployed VTE contract.
    */
    function createVirtualTradingEnvironment(address _owner) external override onlyVirtualTradingEnvironmentRegistry returns (address) {
        address VTE = address(new VirtualTradingEnvironment(_owner, oracle, virtualTradingEnvironmentRegistry));

        emit CreatedVirtualTradingEnvironment(_owner);

        return VTE;
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    /**
    * @notice Sets the address of the VirtualTradingEnvironmentRegistry contract.
    * @dev The address is initialized outside of the constructor to avoid a circular dependency with VirtualTradingEnvironmentRegistry.
    * @dev This function can only be called by the VirtualTradingEnvironmentFactory owner.
    * @dev This function can only be called once.
    * @param _registry Address of the VirtualTradingEnvironmentRegistry contract.
    */
    function initializeContract(address _registry) external onlyOwner {
        virtualTradingEnvironmentRegistry = _registry;

        emit InitializedContract(_registry);
    }

    /* ========== MODIFIERS ========== */

    modifier onlyVirtualTradingEnvironmentRegistry() {
        require(msg.sender == virtualTradingEnvironmentRegistry,
                "VirtualTradingEnvironmentFactory: Only the VirtualTradingEnvironmentRegistry contract can call this function.");
        _;
    }

    /* ========== EVENTS ========== */

    event CreatedVirtualTradingEnvironment(address owner);
    event InitializedContract(address registryAddress);
}