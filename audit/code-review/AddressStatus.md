# AddressStatus

Source file [../../chain/contracts/AddressStatus.sol](../../chain/contracts/AddressStatus.sol).

<br />

<hr />

```javascript
// BK Ok
pragma solidity 0.4.23;

// BK Ok
import "dappsys.sol";

contract AddressStatus is DSAuth {
    // BK Ok - Called by TokenRules:BaseRules.canMint(...), TokenRules:BoundaryKycRules.canMint() and Membership:MockOAXMembership.isMember(...)
    mapping(address => bool) public status;

    // BK Ok - Event
    event AddressStatusSet(address indexed guy, bool status);

    // BK Ok - Constructor
    constructor(DSAuthority authority) public  {
        // BK Ok
        require(
            address(authority) != address(0),
            "Authority is mandatory"
        );

        // BK Next 2 Ok
        setAuthority(authority);
        setOwner(0x0);
    }

    // BK Ok - Only authorised account can execute
    function set(address guy, bool newStatus) public auth {
        // BK Ok
        status[guy] = newStatus;
        // BK Ok - Log event
        emit AddressStatusSet(guy, newStatus);
    }
}

```
