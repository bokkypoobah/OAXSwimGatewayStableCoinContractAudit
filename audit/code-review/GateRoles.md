# GateRoles

Source file [../../chain/contracts/GateRoles.sol](../../chain/contracts/GateRoles.sol).

<br />

<hr />

```solidity
// BK Ok
pragma solidity 0.4.23;

// BK Ok
import "dappsys.sol";

// auth, guard, roles

// BK Ok
contract GateRoles is DSRoles {

    // BK Next 3 Ok
    uint8 public constant SYSTEM_ADMIN = 1;
    uint8 public constant KYC_OPERATOR = 2;
    uint8 public constant MONEY_OPERATOR = 3;

}

```
