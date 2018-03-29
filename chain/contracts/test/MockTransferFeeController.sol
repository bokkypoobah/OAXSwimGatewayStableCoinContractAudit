pragma solidity 0.4.19;

import "../FiatToken.sol";

contract MockTransferFeeController is TransferFeeControllerInterface {
    function MockTransferFeeController() public {
    }

    function calculateTransferFee(address /*from*/, address /*to*/, uint /*wad*/)
    public
    view
    returns (uint){
        return 10;
    }
}