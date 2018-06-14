pragma solidity 0.4.19;

import "../FiatToken.sol";

contract MockMembershipAuthority {

    mapping (address => bool) public membershipAddress;

    function MockMembershipAuthority() public {
    }

    function isMember(address guy)
    public
    view
    returns (bool) {
        return !membershipAddress[guy];        
    }
}