# Membership

Source file [../../chain/contracts/Membership.sol](../../chain/contracts/Membership.sol).

<br />

<hr />

```solidity
// BK Ok
pragma solidity 0.4.23;

// BK Ok
import "AddressStatus.sol";

//BK Ok
interface MembershipInterface {
 // BK Ok
    function isMember(address guy) external returns (bool);
}

//BK NOTE - This testing code should be removed from Membership.sol
//BK Ok
contract MockOAXMembership is AddressStatus, MembershipInterface {
 // BK Ok
    constructor(DSAuthority authority) AddressStatus(authority) public {
    }

 // BK Ok
    function isMember(address guy) public returns (bool) {
        // BK NOTE - This is for testing to allow all addresses to be treated as being approved
        return !status[guy];
    }
}

```
