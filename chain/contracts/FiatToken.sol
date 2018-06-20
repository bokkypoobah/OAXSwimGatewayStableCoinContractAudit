pragma solidity 0.4.19;


// auth, token, guard
import "dappsys.sol";


// ERC20Authority, ERC20Auth, TokenAuthority, TokenAuth
import "TokenAuth.sol";
import "TransferFeeControllerInterface.sol";
import "Kyc.sol";


contract FiatToken is DSToken, ERC20Auth, TokenAuth {

    uint8 public constant decimals = 18;

    TransferFeeControllerInterface public transferFeeController;
    AddressControlStatus public addressControlStatus;

    address public transferFeeCollector;
    address public confiscateCollector;
    bool public confiscateEnabled;

    event Confiscate(address indexed src, address indexed dst, uint256 amount);
    event UnConfiscate(address indexed src, address indexed dst, uint256 amount);

    function FiatToken(
        DSAuthority _authority, 
        bytes32 symbol, 
        address transferFeeCollector_, 
        TransferFeeControllerInterface transferFeeController_,
        AddressControlStatus addressControlStatus_,
        address confiscateCollector_
    )
    DSToken(symbol)
    public
    {
        setAuthority(_authority);
        setOwner(0x0);
        transferFeeCollector = transferFeeCollector_;
        transferFeeController = transferFeeController_;
        addressControlStatus = addressControlStatus_;
        confiscateCollector = confiscateCollector_;

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
    }

    function burn(address guy, uint wad) public authBurn(guy, wad) {
        super.burn(guy, wad);
    }

    function setTransferFeeCollector(address feeCollector_)
    public
    auth
    {
        transferFeeCollector = feeCollector_;
    }

    function setTransferFeeController(TransferFeeControllerInterface transferFeeController_)
    public
    auth
    {
        transferFeeController = transferFeeController_;
    }

    modifier canConfiscate(address guy, bool isConfiscate) {
        require(addressControlStatus.frozenAddress(guy) == isConfiscate); // && confiscateEnabled
        require(confiscateEnabled);
        _;
    }

    function confiscate(address src, uint wad)
    public
    auth
    canConfiscate(src, true)
    returns (bool)
    {
        _balances[src] = sub(_balances[src], wad);
        _balances[confiscateCollector] = add(_balances[confiscateCollector], wad);

        Confiscate(src, confiscateCollector, wad);
    }

    function unConfiscate(address src, uint wad)
    public
    auth
    canConfiscate(src, false)
    returns (bool)
    {
        _balances[src] = add(_balances[src], wad);
        _balances[confiscateCollector] = sub(_balances[confiscateCollector], wad);

        UnConfiscate(confiscateCollector, src, wad);
    }

    function setConfiscateCollector(address confiscateCollector_)
    public
    auth
    returns (bool)
    {
        confiscateCollector = confiscateCollector_;
    }

    function enableConfiscate()
    public
    auth
    returns (bool)
    {
        confiscateEnabled = true;
    }

    function disableConfiscate()
    public
    auth
    returns (bool)
    {
        confiscateEnabled = false;
    }
}