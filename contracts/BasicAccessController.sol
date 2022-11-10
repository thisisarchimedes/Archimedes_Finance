// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts/access/AccessControl.sol";

abstract contract BasicAccessController is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    address private _addressMinter;

    address private _nominatedAdmin;
    address private _oldAdmin;

    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not Admin");
        _;
    }

    modifier onlyMinter() {
        require(hasRole(MINTER_ROLE, msg.sender), "Caller is not Minter");
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

    function setMinter(address newMinter) public onlyAdmin {
        address oldMinter = _addressMinter;
        require(oldMinter != newMinter, "New minster must be different");
        _grantRole(MINTER_ROLE, newMinter);
        _revokeRole(MINTER_ROLE, oldMinter);
        _addressMinter = newMinter;
    }

    function getAddressMinter() public view returns (address) {
        return _addressMinter;
    }

    function _requireAdmin() internal view {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not admin");
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[44] private __gap;
}
