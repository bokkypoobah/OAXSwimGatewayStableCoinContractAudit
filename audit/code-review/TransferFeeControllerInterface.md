# TransferFeeControllerInterface

Source file [../../chain/contracts/TransferFeeControllerInterface.sol](../../chain/contracts/TransferFeeControllerInterface.sol).

<br />

<hr />

```javascript
pragma solidity 0.4.23;


import "dappsys.sol";


contract TransferFeeControllerInterface {
    function calculateTransferFee(address from, address to, uint wad) public view returns (uint);
}

```
