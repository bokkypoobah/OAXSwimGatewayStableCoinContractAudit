pragma solidity ^0.4.19;


// auth, token, guard
import "dappsys.sol";


// ERC20Authority, ERC20Auth, TokenAuthority, TokenAuth
import "TokenAuth.sol";


contract FiatToken is DSToken, ERC20Auth, TokenAuth {
    uint8 public constant decimals = 18;
    //transfer fee is calculated by transferFeeAbs+amt*transferFeeBps
    uint public transferFeeAbs;

    uint public transferFeeBps;

    address public feeCollector;

    function FiatToken(DSAuthority _authority, bytes32 symbol, address feeCollector_)
    DSToken(symbol)
    public
    {
        setAuthority(_authority);
        setOwner(0x0);
        feeCollector = feeCollector_;
    }

    function approve(address guy, uint wad)
    public
    authApprove(guy, wad)
    returns (bool) {
        return super.approve(guy, wad);
    }

    event Temp(uint amt);

    function transfer(address to, uint wad)
    public
    authTransfer(to, wad)
    returns (bool) {
        return transferFrom(msg.sender, to, wad);
    }

    function transferFrom(address from, address to, uint wad)
    public
    authTransferFrom(from, to, wad)
    returns (bool) {
        uint fee = calculateTransferFee(wad);
        bool transferToStatus = super.transferFrom(from, to, sub(wad, fee));
        bool transferFeeStatus = super.transferFrom(from, feeCollector, fee);
        return (transferToStatus && transferFeeStatus);
    }

    function mint(address guy, uint wad) public authMint(guy, wad) {
        super.mint(guy, wad);
    }

    function burn(address guy, uint wad) public authBurn(guy, wad) {
        super.burn(guy, wad);
    }

    function calculateTransferFee(uint wad)
    public
    view
    returns (uint){
        return transferFeeAbs + div(mul(wad, transferFeeBps), 10000);
    }

    function setTransferFee(uint transferFeeAbs_, uint transferFeeBps_)
    public
    auth
    {
        transferFeeAbs = transferFeeAbs_;
        transferFeeBps = transferFeeBps_;
    }
}
