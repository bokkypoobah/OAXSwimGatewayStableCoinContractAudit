pragma solidity 0.4.23;


// auth, token, guard
import "dappsys.sol";


// ERC20Authority, ERC20Auth, TokenAuthority, TokenAuth
import "TokenAuth.sol";
import "TransferFeeControllerInterface.sol";


contract FiatToken is DSToken, ERC20Auth, TokenAuth {

    uint8 public constant decimals = 18;
    TransferFeeControllerInterface public transferFeeController;
    address public transferFeeCollector;

    event LogSetTransferFeeCollector(address feeCollector);
    event LogSetTransferFeeController(address transferFeeController);

    constructor(
        DSAuthority _authority, 
        bytes32 symbol,
        bytes32 tokenName,
        address transferFeeCollector_, 
        TransferFeeControllerInterface transferFeeController_
    )
    DSToken(symbol)
    public
    {
        setName(tokenName);
        setAuthority(_authority);
        setOwner(0x0);
        transferFeeCollector = transferFeeCollector_;
        transferFeeController = transferFeeController_;
    }

    function approve(address guy, uint wad)
    public
    authApprove(guy, wad)
    returns (bool) {
        return super.approve(guy, wad);
    }

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
        uint fee = transferFeeController.calculateTransferFee(from, to, wad);
        bool transferToStatus = super.transferFrom(from, to, sub(wad, fee));
        bool transferFeeStatus = super.transferFrom(from, transferFeeCollector, fee);
        return (transferToStatus && transferFeeStatus);
    }

    function mint(address guy, uint wad) public authMint(guy, wad) {
        super.mint(guy, wad);
        emit Transfer(address(0), guy, wad);
    }

    function burn(address guy, uint wad) public authBurn(guy, wad) {
        super.burn(guy, wad);
        emit Transfer(guy, address(0), wad);
    }

    function setTransferFeeCollector(address feeCollector_)
    public
    auth
    {
        transferFeeCollector = feeCollector_;
        emit LogSetTransferFeeCollector(transferFeeCollector);
    }

    function setTransferFeeController(TransferFeeControllerInterface transferFeeController_)
    public
    auth
    {
        transferFeeController = transferFeeController_;
        emit LogSetTransferFeeController(transferFeeController);
    }
}
