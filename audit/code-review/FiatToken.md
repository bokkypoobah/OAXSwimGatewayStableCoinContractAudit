# FiatToken

Source file [../../chain/contracts/FiatToken.sol](../../chain/contracts/FiatToken.sol).

<br />

<hr />

```solidity
// BK Ok
pragma solidity 0.4.23;


// auth, token, guard
// BK Ok
import "dappsys.sol";


// ERC20Authority, ERC20Auth, TokenAuthority, TokenAuth
// BK Next 2 Ok
import "TokenAuth.sol";
import "TransferFeeControllerInterface.sol";


// BK NOTE - tokenAContractAddress=FiatToken 'USD' 'USDToken':0xb45408db6a4c5977d6fa0acc5581023882c89268
// BK NOTE - token.authority=FiatTokenGuard:0xfd2dc31157ecf6599df9eafa6871afd33dbea620
// BK NOTE - token.owner=0x0000000000000000000000000000000000000000
// BK NOTE - token.transferFeeController=TransferFeeController:0x6f6219a19a821e2ed20b1d5485c24915d6c96517
// BK NOTE - token.transferFeeCollector=Account #5 - TransferFeeCollector:0xa55a151eb00fded1634d27d1127b4be4627079ea
// BK NOTE - token.symbol=USD
// BK NOTE - token.name=USDToken
// BK NOTE - token.decimals=18
// BK NOTE - token.totalSupply=0 0
// BK NOTE - token.LogSetAuthority 0 #40480 {"authority":"0xfd2dc31157ecf6599df9eafa6871afd33dbea620"}
// BK NOTE - token.LogSetOwner 0 #40480 {"owner":"0xa11aae29840fbb5c86e6fd4cf809eba183aef433"}
// BK NOTE - token.LogSetOwner 1 #40480 {"owner":"0x0000000000000000000000000000000000000000"}
// BK NOTE - DSAuth is inherited through TokenAuth, ERC20Auth and DSToken->DSStop
// BK Ok
contract FiatToken is DSToken, ERC20Auth, TokenAuth {

    // BK Ok
    uint8 public constant decimals = 18;

    // BK Ok
    TransferFeeControllerInterface public transferFeeController;

    // BK Ok
    address public transferFeeCollector;

    // BK Ok
    event LogSetTransferFeeCollector(address feeCollector);
    event LogSetTransferFeeController(address transferFeeController);

    // BK Ok - Constructor
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
        // BK Ok
        setName(tokenName);
        // BK Next 2 Ok
        setAuthority(_authority);
        setOwner(0x0);
        // BK Next 2 Ok
        transferFeeCollector = transferFeeCollector_;
        transferFeeController = transferFeeController_;
    }

    // BK NOTE - modifier TokenAuth:ERC20Auth.authApprove(...)
    // BK Ok
    function approve(address guy, uint wad)
    public
    authApprove(guy, wad)
    returns (bool) {
        // BK Ok
        return super.approve(guy, wad);
    }

    // BK NOTE - modifier TokenAuth:ERC20Auth.authTransfer(...)
    // BK Ok
    function transfer(address to, uint wad)
    public
    authTransfer(to, wad)
    returns (bool) {
        // BK Ok
        return transferFrom(msg.sender, to, wad);
    }

    // BK NOTE - modifier TokenAuth:ERC20Auth.authTransferFrom(...)
    // BK Ok
    function transferFrom(address from, address to, uint wad)
    public
    authTransferFrom(from, to, wad)
    returns (bool) {
        // BK Ok
        uint fee = transferFeeController.calculateTransferFee(from, to, wad);
        // BK Ok
        bool transferToStatus = super.transferFrom(from, to, sub(wad, fee));
        // BK Ok
        bool transferFeeStatus = super.transferFrom(from, transferFeeCollector, fee);
        // BK Ok
        return (transferToStatus && transferFeeStatus);
    }

    // BK NOTE - The following will be checked on the DSToken level, but the DSToken.mint(uint256) and DSToken.burn(uint256) functions don't have auth checks. Instead the checks are on the 
    // BK NOTE -   * tokenGuard.Permit from GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 to FiatToken 'USD' 'USDToken':0xb45408db6a4c5977d6fa0acc5581023882c89268 for mint(uint256) #7015 0x9c7e6acf4ba38b358009b1675d1e0d4f6e9e0420b5bd04e902b9afca5a54dea7
    // BK NOTE -   * tokenGuard.Permit from GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 to FiatToken 'USD' 'USDToken':0xb45408db6a4c5977d6fa0acc5581023882c89268 for burn(uint256) #7015 0x047d9ff1451f99474e4135131ecd01bffb0e7474325b9345f6fb55b1d894c119
    // BK NOTE - tokenGuard.Permit from GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 to FiatToken 'USD' 'USDToken':0xb45408db6a4c5977d6fa0acc5581023882c89268 for mint(address,uint256) #7015 0x1201e6b0b058d2153093251a52af3d820dcd44e1c64d2f17e922436c05b6be02
    // BK NOTE - modifier TokenAuth:TokenAuth.authMint(...)
    function mint(address guy, uint wad) public authMint(guy, wad) {
        // BK NOTE - DSToken.mint(...) does not emit a `Transfer(address(0), guy, wad)` event. Add here or to DSToken.mint(...)
        // BK Ok
        super.mint(guy, wad);
        // BK Ok - Log event
        emit Transfer(address(0), guy, wad);
    }

    // BK NOTE - tokenGuard.Permit from GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 to FiatToken 'USD' 'USDToken':0xb45408db6a4c5977d6fa0acc5581023882c89268 for burn(address,uint256) #7016 0x67e7a88c77146ff732ad632be35c73b75c41f122d625804564928fb70e34336d
    // BK NOTE - modifier TokenAuth:TokenAuth.authBurn(...)
    // BK NOTE - Burns need to be `approve(...)`-d by the account, if the account is not the tx sending account
    function burn(address guy, uint wad) public authBurn(guy, wad) {
        // BK NOTE - DSToken.burn(...) does not emit a `Transfer(guy, address(0), wad)` event. Add here or to DSToken.burn(...)
        // BK Ok
        super.burn(guy, wad);
        // BK Ok - Log event
        emit Transfer(guy, address(0), wad);
    }

    // BK NOTE - tokenGuard.Permit from GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 to FiatToken 'USD' 'USDToken':0xb45408db6a4c5977d6fa0acc5581023882c89268 for setTransferFeeCollector(address) #40503 0x290a5b6e1ad2858a30400fa99173f8e1decb15f6a74891ed9bafbb0646262387
    // BK Ok
    function setTransferFeeCollector(address feeCollector_)
    public
    auth
    {
        // BK NOTE - Should add event to log changes
        // BK Ok
        transferFeeCollector = feeCollector_;
        // BK Ok - Log event
        emit LogSetTransferFeeCollector(transferFeeCollector);
    }

    // BK NOTE - tokenGuard.Permit from GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 to FiatToken 'USD' 'USDToken':0xb45408db6a4c5977d6fa0acc5581023882c89268 for setTransferFeeController(address) #40503 0x359297c01766e93709f406eebacd097ad5679e7f2da703031ebd2eda0d541dc6
    // BK Ok
    function setTransferFeeController(TransferFeeControllerInterface transferFeeController_)
    public
    auth
    {
        // BK NOTE - Should add event to log changes
        // BK Ok
        transferFeeController = transferFeeController_;
        // BK Ok - Log event
        emit LogSetTransferFeeController(transferFeeController);
    }
}

```
