# GateRoles

Source file [../../chain/contracts/GateRoles.sol](../../chain/contracts/GateRoles.sol).

<br />

<hr />

```javascript
pragma solidity 0.4.23;

import "dappsys.sol";

// auth, guard, roles

contract GateRoles is DSRoles {

    uint8 public constant SYSTEM_ADMIN = 1;
    uint8 public constant KYC_OPERATOR = 2;
    uint8 public constant MONEY_OPERATOR = 3;

}

```
