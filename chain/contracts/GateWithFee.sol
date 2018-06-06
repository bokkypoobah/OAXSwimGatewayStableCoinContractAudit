pragma solidity 0.4.19;


import "dappsys.sol";


// auth, token, math
import "solovault.sol";
import "GateRoles.sol";
import "FiatToken.sol";
import "Gate.sol";
import "TransferFeeController.sol";
import "LimitController.sol";


contract GateWithFee is Gate {

    address public mintFeeCollector;
    address public burnFeeCollector;
    address public negativeInterestRateFeeCollector;

    TransferFeeController transferFeeController;

    function GateWithFee(
        DSAuthority _authority, 
        DSToken fiatToken, 
        LimitController _limitController, 
        address mintFeeCollector_, 
        address burnFeeCollector_,
        address negativeInterestRateFeeCollector_,
        TransferFeeController transferFeeController_
        )
    public
    Gate(_authority, fiatToken, _limitController)
    {
        mintFeeCollector = mintFeeCollector_;
        burnFeeCollector = burnFeeCollector_;
        negativeInterestRateFeeCollector = negativeInterestRateFeeCollector_;

        transferFeeController = transferFeeController_;
    }

    function setMintFeeCollector(address mintFeeCollector_) public auth {
        mintFeeCollector = mintFeeCollector_;
    }

    function setBurnFeeCollector(address burnFeeCollector_) public auth {
        burnFeeCollector = burnFeeCollector_;
    }

    function setNegativeInterestRateFeeCollector(address negativeInterestRateFeeCollector_) public auth {
        negativeInterestRateFeeCollector = negativeInterestRateFeeCollector_;
    }

    function setTransferFeeCollector(address transferFeeCollector_) public auth {
        (FiatToken(token)).setTransferFeeCollector(transferFeeCollector_);
    }

    function setTransferFeeController(TransferFeeControllerInterface transferFeeController_) public auth {
        (FiatToken(token)).setTransferFeeController(transferFeeController_);
    }

    function mintWithFee(address guy, uint wad, uint fee) public auth {
        super.mint(guy, wad);
        super.mint(mintFeeCollector, fee);
    }

    function burnWithFee(address guy, uint wad, uint fee) public auth {
        super.burn(guy, sub(wad, fee));
        token.transferFrom(guy, burnFeeCollector, fee);
    }

    event InterestPaymentRequest(address by, uint amount);

    event InterestPaymentSuccess(address by, uint amount);

    function requestInterestPayment(address by, uint amount) public auth {
        InterestPaymentRequest(by, amount);
    }

    function processInterestPayment(address by, uint amount) public auth {
        (FiatToken(token)).transferFrom(by, negativeInterestRateFeeCollector, amount);
        InterestPaymentSuccess(by, amount);
    }
}
