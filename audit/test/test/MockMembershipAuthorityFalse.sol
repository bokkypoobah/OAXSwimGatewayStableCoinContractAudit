pragma solidity 0.4.23;

import "AddressStatus.sol";

interface MembershipInterface {
    function isMember(address guy) external returns (bool);
}

contract MockMembershipAuthorityFalse is AddressStatus, MembershipInterface {
    constructor(DSAuthority authority) AddressStatus(authority) public {
    }

    function isMember(address guy) public returns (bool) {
        return status[guy];
    }
}
