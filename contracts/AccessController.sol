// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

/// @title ArchRole
/// @dev Contract used to inherit standard role enforcement across Archimedes contracts
abstract contract AccessController is AccessControlUpgradeable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant EXECUTIVE_ROLE = keccak256("EXECUTIVE_ROLE");
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    address private _addressExecutive;
    address private _addressGovernor;
    address private _addressGuardian;

    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not Admin");
        _;
    }

    modifier onlyExecutive() {
        require(hasRole(EXECUTIVE_ROLE, msg.sender), "Caller is not Executive");
        _;
    }

    modifier onlyGovernor() {
        require(hasRole(GOVERNOR_ROLE, msg.sender), "Caller is not Governor");
        _;
    }

    modifier onlyGuardian() {
        require(hasRole(GUARDIAN_ROLE, msg.sender), "Caller is not Guardian");
        _;
    }

    function addAdmin(address newAdmin) public onlyAdmin {
        _grantRole(ADMIN_ROLE, newAdmin);
    }

    function revokeAdmin(address admin) public onlyAdmin {
        _revokeRole(ADMIN_ROLE, admin);
    }

    function setGovernor(address newGovernor) public onlyAdmin {
        address oldGov = _addressGovernor;
        require(oldGov != newGovernor, "New gov must be different");
        _grantRole(GOVERNOR_ROLE, newGovernor);
        _revokeRole(GOVERNOR_ROLE, oldGov);
        _addressGovernor = newGovernor;
    }

    function setExecutive(address newExecutive) public onlyAdmin {
        address oldExec = _addressExecutive;
        require(oldExec != newExecutive, "New exec must be different");
        _grantRole(EXECUTIVE_ROLE, newExecutive);
        _revokeRole(EXECUTIVE_ROLE, oldExec);
        _addressExecutive = newExecutive;
    }

    function setGuardian(address newGuardian) public onlyAdmin {
        address oldGuardian = _addressGuardian;
        require(oldGuardian != newGuardian, "New guardian must be different");
        _grantRole(GUARDIAN_ROLE, newGuardian);
        _revokeRole(GOVERNOR_ROLE, oldGuardian);
        _addressGovernor = newGuardian;
    }

    function getAddressExecutive() public view returns (address) {
        return _addressExecutive;
    }

    function getAddressGovernor() public view returns (address) {
        return _addressGovernor;
    }

    function getAddressGuardian() public view returns (address) {
        return _addressGuardian;
    }

    function _requireAdmin() internal view {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not admin");
    }
}
