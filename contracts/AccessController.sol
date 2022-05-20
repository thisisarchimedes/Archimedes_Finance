// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @title ArchRole
/// @dev Contract used to inherit standard role enforcement across Archimedes contracts
abstract contract AccessController is AccessControl, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant EXECUTIVE_ROLE = keccak256("EXECUTIVE_ROLE");
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    address private _addressAdmin;
    address private _addressExecutive;
    address private _addressGovernor;
    address private _addressGuardian;

    bool private _initialized;
    bool private _initializing;
    bool private _rolesSet;

    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not admin");
        _;
    }

    modifier onlyExecutive() {
        require(hasRole(EXECUTIVE_ROLE, msg.sender), "Caller is not executive");
        _;
    }

    modifier onlyGovernor() {
        require(hasRole(GOVERNOR_ROLE, msg.sender), "Caller is not governor");
        _;
    }

    modifier onlyGuardian() {
        require(hasRole(GUARDIAN_ROLE, msg.sender), "Caller is not guardian");
        _;
    }

    modifier requireRoles() {
        require(_rolesSet, "Roles have not been set up");
        _;
    }

    modifier expectInitialized() {
        require(_initialized, "Contract is not initialized");
        _;
    }

    modifier initializer() {
        require(_initializing || !_initialized, "initializer: Already initialized");

        bool isTopLevelCall = !_initializing;
        if (isTopLevelCall) {
            _initializing = true;
            _initialized = true;
        }

        _;

        if (isTopLevelCall) {
            _initializing = false;
        }
    }

    constructor(address admin) {
        _setupRole(ADMIN_ROLE, admin);
        _addressAdmin = admin;
    }

    function setRoles(
        address executive,
        address governor,
        address guardian
    ) external onlyAdmin {
        _setupRole(EXECUTIVE_ROLE, executive);
        _setupRole(GOVERNOR_ROLE, governor);
        _setupRole(GUARDIAN_ROLE, guardian);
        _addressExecutive = executive;
        _addressGovernor = governor;
        _addressGuardian = guardian;
        _rolesSet = true;
    }

    /* Override required by Solidity: */
    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _getAddressAdmin() internal view requireRoles returns (address) {
        return _addressAdmin;
    }

    function _getAddressExecutive() internal view requireRoles returns (address) {
        return _addressExecutive;
    }

    function _getAddressGovernor() internal view requireRoles returns (address) {
        return _addressGovernor;
    }

    function _getAddressGuardian() internal view requireRoles returns (address) {
        return _addressGuardian;
    }
}
