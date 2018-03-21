pragma solidity 0.4.19;


import "dappsys.sol";


// auth, token, math
import "solovault.sol";
import "GateRoles.sol";
import "FiatToken.sol";
import "Gate.sol";


contract GateWithFee is Gate {
    address public feeCollector;

    function GateWithFee(DSAuthority _authority, DSToken fiatToken, uint256 _dailyLimit, address feeCollector_)
    public
    Gate(_authority, fiatToken, _dailyLimit)
    {
        feeCollector = feeCollector_;
    }

    function setFeeCollector(address feeCollector_) public auth {
        feeCollector = feeCollector_;
    }

    function mintWithFee(address guy, uint wad, uint fee) public limited(wad) {
        super.mint(guy, wad);
        super.mint(feeCollector, fee);
    }

    function burnWithFee(address guy, uint wad, uint fee) public limited(wad) {
        super.burn(guy, sub(wad, fee));
        token.transferFrom(guy, feeCollector, fee);
    }

    function setTransferFee(uint transferFeeAbs_, uint transferFeeBps_)
    public
    auth
    {
        FiatToken fiatToken = FiatToken(address(token));
        fiatToken.setTransferFee(transferFeeAbs_, transferFeeBps_);
    }
}
