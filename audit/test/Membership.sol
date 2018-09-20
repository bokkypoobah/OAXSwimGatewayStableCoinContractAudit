pragma solidity 0.4.23;

import "AddressStatus.sol";

interface MembershipInterface {
    function isMember(address guy) external view returns (bool);
}

contract MockOAXMembership is AddressStatus, MembershipInterface {
    constructor(DSAuthority authority) AddressStatus(authority) public {
    }

    function isMember(address guy) public view returns (bool) {
        return !status[guy];
    }
}
