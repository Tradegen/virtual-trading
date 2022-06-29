// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

interface IVirtualTradingEnvironmentRegistry {

    /* ========== VIEWS ========== */

    /**
    * @notice Returns the maximum number of positions that a VTE can have.
    */
    function maximumNumberOfPositions() external view returns (uint256);

    /**
    * @notice Returns the maximum cumulative leverage factor of a VTE.
    */
    function maximumLeverageFactor() external view returns (uint256);

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
    function getVTEDataFeed(uint256 _index, address _VTE) external view returns (address);

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
    function getOwner(uint256 _index, address _VTE) external view returns (address);

    /* ========== MUTATIVE FUNCTIONS ========== */
    
    /**
    * @notice Updates the address of the given VTE's data feed.
    * @dev Only the owner of the VirtualTradingEnvironmentRegistry contract can call this function.
    * @dev Transaction will revert if the VTE is not found.
    * @param _index Index of the virtual trading environment.
    * @param _dataFeed Address of the VirtualTradingEnvironmentDataFeed contract.
    */
    function setDataFeed(uint256 _index, address _dataFeed) external;


    /**
     * @notice Creates a virtual trading environment contract.
     * @dev Transaction will revert if _usageFee is too high.
     * @param _usageFee Fee that users pay when making a request to the VTE's data feed.
     */
    function createVirtualTradingEnvironment(uint256 _usageFee) external;
    
    /* ========== RESTRICTED FUNCTIONS ========== */

    /**
     * @notice Updates the address of the operator.
     * @dev This function can only be called by the VirtualTradingEnvironmentRegistry owner.
     * @param _newOperator Address of the new operator.
     */
    function setOperator(address _newOperator) external;

    /**
     * @notice Updates the address of the registrar.
     * @dev This function can only be called by the VirtualTradingEnvironmentRegistry owner.
     * @param _newRegistrar Address of the new registrar.
     */
    function setRegistrar(address _newRegistrar) external;
}