pragma solidity 0.4.23;

import "../FiatToken.sol";

contract MockTransferFeeController is TransferFeeControllerInterface {
    constructor() public {
    }

    function calculateTransferFee(address /*from*/, address /*to*/, uint /*wad*/)
    public
    view
    returns (uint){
        return 10;
    }
}
