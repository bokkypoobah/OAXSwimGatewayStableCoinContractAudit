# GateWithFee

Source file [../../chain/contracts/GateWithFee.sol](../../chain/contracts/GateWithFee.sol).

<br />

<hr />

```javascript
// BK Ok
pragma solidity 0.4.23;


// BK Ok
import "dappsys.sol";


// auth, token, math
// BK Next 6 Ok
import "solovault.sol";
import "GateRoles.sol";
import "FiatToken.sol";
import "Gate.sol";
import "TransferFeeController.sol";
import "LimitController.sol";


// BK NOTE - gateWithFee.address=GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7
// BK NOTE - gateWithFee.authority=GateRoles:0xbfffb78bbb3a27d78857021d162b64c577626b62
// BK NOTE - gateWithFee.owner=0x0000000000000000000000000000000000000000
// BK NOTE - gateWithFee.limitController=LimitController:0xb0eeb0a47f153af1da1807db53880e212cdf6c79
// BK NOTE - gateWithFee.mintFeeCollector=Account #6 - MintFeeCollector:0xa66a85ede0cbe03694aa9d9de0bb19c99ff55bd9
// BK NOTE - gateWithFee.burnFeeCollector=Account #7 - BurnFeeCollector:0xa77a2b9d4b1c010a22a7c565dc418cef683dbcec
// BK NOTE - gateWithFee.transferFeeController=TransferFeeController:0x6f6219a19a821e2ed20b1d5485c24915d6c96517
// BK NOTE - gateWithFee.stopped=false
// BK NOTE - gateWithFee.token=FiatToken 'USD' 'USDToken':0xb45408db6a4c5977d6fa0acc5581023882c89268
// BK NOTE - gateWithFee.LogSetAuthority 0 #40492 {"authority":"0xbfffb78bbb3a27d78857021d162b64c577626b62"}
// BK NOTE - gateWithFee.LogSetOwner 0 #40492 {"owner":"0xa11aae29840fbb5c86e6fd4cf809eba183aef433"}
// BK NOTE - gateWithFee.LogSetOwner 1 #40492 {"owner":"0x0000000000000000000000000000000000000000"}
// BK NOTE - gateWithFee.LogSetLimitController 0 #40492 {"_limitController":"0xb0eeb0a47f153af1da1807db53880e212cdf6c79"}
// BK Ok
contract GateWithFee is Gate {

    // BK Next 2 Ok
    address public mintFeeCollector;
    address public burnFeeCollector;

    // BK NOTE - Should make this public
    // BK Ok
    TransferFeeController transferFeeController;

    // BK Ok - Constructor
    constructor(
        DSAuthority _authority,
        DSToken fiatToken, 
        LimitController _limitController, 
        address mintFeeCollector_, 
        address burnFeeCollector_,
        TransferFeeController transferFeeController_
        )
    public
    Gate(_authority, fiatToken, _limitController)
    {
        // BK Next 2 Ok
        mintFeeCollector = mintFeeCollector_;
        burnFeeCollector = burnFeeCollector_;

        // BK Ok
        transferFeeController = transferFeeController_;
    }

    // BK NOTE - gateRoles.RoleCapability code GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 capabilityRoles 0x0000000000000000000000000000000000000000000000000000000000000002 for setMintFeeCollector(address) role SYSTEM_ADMIN:1 true #40497 0x2f5c8cf5c8b99c8cd75127b6a40d0d49bc483989827f7db1e386f1d4264c50a6
    // BK Ok - Only authorised account can execute
    function setMintFeeCollector(address mintFeeCollector_) public auth {
        // BK Ok
        mintFeeCollector = mintFeeCollector_;
    }

    // BK NOTE - gateRoles.RoleCapability code GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 capabilityRoles 0x0000000000000000000000000000000000000000000000000000000000000002 for setBurnFeeCollector(address) role SYSTEM_ADMIN:1 true #40497 0xbde89aa114fbc4ee2c79d10629d780713648c23ce81ed6d8b28c21383f8c0da8
    // BK Ok - Only authorised account can execute
    function setBurnFeeCollector(address burnFeeCollector_) public auth {
        // BK Ok
        burnFeeCollector = burnFeeCollector_;
    }

    // BK NOTE - gateRoles.RoleCapability code GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 capabilityRoles 0x0000000000000000000000000000000000000000000000000000000000000002 for setTransferFeeCollector(address) role SYSTEM_ADMIN:1 true #40497 0x5bf0ad77d412611bfadcf775657e7603a19ffc3136e705828898a3fe4a7db7ec
    // BK Ok - Only authorised account can execute
    function setTransferFeeCollector(address transferFeeCollector_) public auth {
        // BK NOTE - tokenGuard.Permit from GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 to FiatToken 'USD' 'USDToken':0xb45408db6a4c5977d6fa0acc5581023882c89268 for setTransferFeeCollector(address) #40503 0x290a5b6e1ad2858a30400fa99173f8e1decb15f6a74891ed9bafbb0646262387
        // BK Ok
        (FiatToken(token)).setTransferFeeCollector(transferFeeCollector_);
    }

    // BK NOTE - gateRoles.RoleCapability code GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 capabilityRoles 0x0000000000000000000000000000000000000000000000000000000000000002 for setTransferFeeController(address) role SYSTEM_ADMIN:1 true #40497 0xf739e8d0d4ff535acfad82e90665a573e50ee1a9a63fb6ced14a50af572b21f4
    // BK Ok - Only authorised account can execute
    function setTransferFeeController(TransferFeeControllerInterface transferFeeController_) public auth {
        // BK NOTE - tokenGuard.Permit from GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 to FiatToken 'USD' 'USDToken':0xb45408db6a4c5977d6fa0acc5581023882c89268 for setTransferFeeController(address) #40503 0x359297c01766e93709f406eebacd097ad5679e7f2da703031ebd2eda0d541dc6
        // BK Ok
        (FiatToken(token)).setTransferFeeController(transferFeeController_);
    }

    // BK NOTE - gateRoles.RoleCapability code GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 capabilityRoles 0x0000000000000000000000000000000000000000000000000000000000000008 for mintWithFee(address,uint256,uint256) role MONEY_OPERATOR:3 true #40496 0xdf6dffa03a1a6588a07353a78097ff9e01e3272d8fceb6b6fd8a809ec8d3730a
    // BK Ok - Only authorised account can execute
    function mintWithFee(address guy, uint wad, uint fee) public auth {
        super.mint(guy, wad);
        // BK NOTE - If `wad` is represented by some real-world fiat amount, fee will be created out of thin air
        super.mint(mintFeeCollector, fee);
    }

    // BK NOTE - gateRoles.RoleCapability code GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 capabilityRoles 0x0000000000000000000000000000000000000000000000000000000000000008 for burnWithFee(address,uint256,uint256) role MONEY_OPERATOR:3 true #40496 0x31827934e965e6e092a836bc968a764db15736a0feeceddbd988f654c0251d74
    // BK Ok - Only authorised account can execute
    function burnWithFee(address guy, uint wad, uint fee) public auth {
        // BK Ok
        super.burn(guy, sub(wad, fee));
        // BK NOTE - `guy` must already have approved the following transfer
        // BK Ok
        token.transferFrom(guy, burnFeeCollector, fee);
    }

}

```
