# Membership

Source file [../../chain/contracts/Membership.sol](../../chain/contracts/Membership.sol).

<br />

<hr />

```javascript
pragma solidity ^0.4.0;

import "AddressStatus.sol";

interface MembershipInterface {
    function isMember(address guy) public returns (bool);
}

contract MockOAXMembership is AddressStatus, MembershipInterface {
    constructor(DSAuthority authority) AddressStatus(authority) public {
    }

    function isMember(address guy) public returns (bool) {
        return status(guy);
    }
}

```
