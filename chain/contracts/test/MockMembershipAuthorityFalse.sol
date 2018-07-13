pragma solidity ^0.4.23;

import "../FiatToken.sol";

contract MockMembershipAuthorityFalse {

    mapping (address => bool) public membershipAddress;

    constructor() public {
    }

    function isMember(address guy)
    public
    view
    returns (bool) {
        return membershipAddress[guy];        
    }
}
