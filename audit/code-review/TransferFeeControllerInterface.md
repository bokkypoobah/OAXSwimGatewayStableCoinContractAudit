# TransferFeeControllerInterface

Source file [../../chain/contracts/TransferFeeControllerInterface.sol](../../chain/contracts/TransferFeeControllerInterface.sol).

<br />

<hr />

```javascript
// BK Ok
pragma solidity 0.4.23;


// BK Ok
import "dappsys.sol";


// BK Ok
contract TransferFeeControllerInterface {
    // BK Ok
    function calculateTransferFee(address from, address to, uint wad) public view returns (uint);
}

```
