// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

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

    address private _nominatedAdmin;
    address private _oldAdmin;

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */

    uint256[44] private __gap;

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

    function setAdmin(address newAdmin) public onlyAdmin {
        if (newAdmin == _msgSender()) {
            revert("new admin must be different");
        }
        _nominatedAdmin = newAdmin;
        _oldAdmin = _msgSender();
    }

    function acceptAdminRole() external {
        if (_nominatedAdmin == address(0) || _oldAdmin == address(0)) {
            revert("no nominated admin");
        }
        if (_nominatedAdmin == _msgSender()) {
            _grantRole(ADMIN_ROLE, _msgSender());
            _revokeRole(ADMIN_ROLE, _oldAdmin);

            _nominatedAdmin = address(0);
            _oldAdmin = address(0);
        }
    }

    function renounceRole(bytes32 role, address account) public virtual override {
        if (hasRole(ADMIN_ROLE, msg.sender)) {
            revert("Admin cant use renounceRole");
        }
        require(account == _msgSender(), "can only renounce roles for self");

        _revokeRole(role, account);
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
        _revokeRole(GUARDIAN_ROLE, oldGuardian);
        _addressGuardian = newGuardian;
    }

    function _setAndRevokeAnyRole(
        bytes32 role,
        address newRoleAddress,
        address oldRoleAddress
    ) internal {
        _grantRole(role, newRoleAddress);
        _revokeRole(role, oldRoleAddress);
    }

    function getAddressExecutive() public view returns (address) {
        return _addressExecutive;
    }

    function getAddressGovernor() external view returns (address) {
        return _addressGovernor;
    }

    function getAddressGuardian() external view returns (address) {
        return _addressGuardian;
    }

    function _requireAdmin() internal view {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not admin");
    }
}
