pragma solidity 0.4.19;


import "dappsys.sol";


// auth, token, math
import "solovault.sol";
import "GateRoles.sol";
import "FiatToken.sol";
import "Gate.sol";


contract GateWithFee is Gate {
    address feeCollector;

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
        /* Because the EIP20 standard says so, we emit a Transfer event:
           A token contract which creates new tokens SHOULD trigger a
           Transfer event with the _from address set to 0x0 when tokens are created.
            (https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20-token-standard.md)
        */
        Transfer(0x0, guy, wad);
        Transfer(0x0, feeCollector, fee);
    }
}
