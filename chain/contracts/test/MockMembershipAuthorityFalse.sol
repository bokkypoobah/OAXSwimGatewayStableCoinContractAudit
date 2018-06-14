pragma solidity 0.4.19;

import "../FiatToken.sol";

contract MockMembershipAuthorityFalse {

    mapping (address => bool) public membershipAddress;

    function MockMembershipAuthorityFalse() public {
    }

    function isMember(address guy)
    public
    view
    returns (bool) {
        return membershipAddress[guy];        
    }
}