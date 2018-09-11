# Gate

Source file [../../chain/contracts/Gate.sol](../../chain/contracts/Gate.sol).

<br />

<hr />

```javascript
// BK Ok
pragma solidity 0.4.23;


// BK Ok
import "dappsys.sol";


// auth, token, math
// BK Next 4 Ok
import "solovault.sol";
import "GateRoles.sol";
import "FiatToken.sol";
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
// BK NOTE - function start() from DSStop
// BK NOTE -   gateRoles.RoleCapability code GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 capabilityRoles 0x0000000000000000000000000000000000000000000000000000000000000008 for start() role MONEY_OPERATOR:3 true #7009 0x028cb6e5b4d3c94a05dfef1b299039641a056c93a4e7cec1c19dcd3e0dcc2ae5
// BK NOTE - function stop() from DSStop
// BK NOTE -   gateRoles.RoleCapability code GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 capabilityRoles 0x0000000000000000000000000000000000000000000000000000000000000008 for stop() role MONEY_OPERATOR:3 true #7009 0x1c14a7d429880ee9dee5eb6325b5918d147044ebfeae8a0592c39bc0abab0a4e
// BK NOTE - Inherited by GateWithFee
// BK Ok
contract Gate is DSSoloVault, ERC20Events, DSMath, DSStop {

    // BK Ok
    LimitController public limitController;

    // BK Next 4 Ok - Events
    event DepositRequested(address indexed by, uint256 amount);
    event Deposited(address indexed guy, uint256 amount);
    event WithdrawalRequested(address indexed from, uint256 amount);
    event Withdrawn(address indexed from, uint256 amount);

    // BK Ok - Constructor
    constructor(DSAuthority _authority, DSToken fiatToken, LimitController _limitController)
    public
    {
        // BK Ok
        swap(fiatToken);
        // BK Ok
        setAuthority(_authority);
        // BK Ok
        setLimitController(_limitController);
        // BK Ok
        setOwner(0x0);
    }

    // BK Ok - Event
    event LogSetLimitController(LimitController _limitController);

    // BK NOTE - gateRoles.RoleCapability code GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 capabilityRoles 0x0000000000000000000000000000000000000000000000000000000000000002 for setLimitController(address) role SYSTEM_ADMIN:1 true #40496 0xb1926b5e381e97e4fc03365c64bb7e04cda1463913db537dada1ab49fce25059
    // BK Ok - Only SYSTEM_ADMIN can execute
    function setLimitController(LimitController _limitController)
    public
    auth
    {
        // BK Ok
        limitController = _limitController;
        // BK Ok
        emit LogSetLimitController(_limitController);
    }

    // BK Ok - Modifier
    modifier mintLimited(address guy, uint wad) {
        // BK Ok
        require(
            limitController.isWithinMintLimit(guy, wad),
            "Mint limit exceeded"
        );
        // BK Ok
        _;
    }
    
    // BK Ok - Modifier
    modifier burnLimited(address guy, uint wad) {
        // BK Ok
        require(
            limitController.isWithinBurnLimit(guy, wad),
            "Burn limit exceeded"
        );
        // BK Ok
        _;
    }

    // BK Ok - Anyone can execute
    function deposit(uint256 wad) public stoppable {
        // BK Ok
        emit DepositRequested(msg.sender, wad);
    }

    // BK NOTE - gateRoles.RoleCapability code GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 capabilityRoles 0x0000000000000000000000000000000000000000000000000000000000000008 for mint(address,uint256) role MONEY_OPERATOR:3 true #7009 0xd708b2e13f04e2429d20cc060d434e853c4654482d71a5f237ddbae1e852a60f
    // BK Ok - Only MONEY_OPERATOR can execute
    function mint(address guy, uint wad) public mintLimited(msg.sender, wad) stoppable {
        // BK NOTE - DSSoloVault.mint(...)
        // BK Ok
        super.mint(guy, wad);
        // BK NOTE - tokenGuard.Permit from GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 to LimitController:0xb0eeb0a47f153af1da1807db53880e212cdf6c79 for bumpMintLimitCounter(uint256) #7016 0xaee164bd6016cc1fee48b748936c0eef152d307aca4f1fc873a97939879b3547
        // BK Ok
        limitController.bumpMintLimitCounter(wad);

        // BK Ok - Log event
        emit Deposited(guy, wad);
     }

    // BK Ok - Anyone can execute
    function withdraw(uint256 wad) public stoppable {
        // BK Ok
        emit WithdrawalRequested(msg.sender, wad);
    }

    // BK NOTE - gateRoles.RoleCapability code GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 capabilityRoles 0x0000000000000000000000000000000000000000000000000000000000000008 for burn(address,uint256) role MONEY_OPERATOR:3 true #7009 0x8b504d69c0dd7ded35d6995ca9b7f8f60735e2d799081fac127aa37677ab463a
    // BK Ok - MONEY_OPERATOR can execute
    function burn(address guy, uint wad) public burnLimited(msg.sender, wad) stoppable {
        // BK Ok
        super.burn(guy, wad);
        // BK NOTE - tokenGuard.Permit from GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 to LimitController:0xb0eeb0a47f153af1da1807db53880e212cdf6c79 for bumpBurnLimitCounter(uint256) #7016 0xe4e79361855cbe1d73f44ca7956ff9e1eb8af2506e7cb454d3cf9a024a7ff037
        limitController.bumpBurnLimitCounter(wad);
        // BK Ok - Log event
        emit Withdrawn(guy, wad);
    }

    // BK NOTE - gateRoles.RoleCapability code GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 capabilityRoles 0x0000000000000000000000000000000000000000000000000000000000000002 for setERC20Authority(address) role SYSTEM_ADMIN:1 true #40496 0xd55e9dab42c1b11e9d3677c5991c519772a17ba993abaa0815d98a359ec68bd1
    // BK Ok - Only SYSTEM_ADMIN can execute
    function setERC20Authority(ERC20Authority _erc20Authority) public auth {
        // BK NOTE - tokenGuard.Permit from GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 to FiatToken 'USD' 'USDToken':0xb45408db6a4c5977d6fa0acc5581023882c89268 for setERC20Authority(address) #40502 0x9edad5bc948671c3051af6a9d3f426fed4e7aed1aca8d51a61da3a07f1cc7866
        // BK Ok
        FiatToken(token).setERC20Authority(_erc20Authority);
    }

    // BK NOTE - gateRoles.RoleCapability code GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 capabilityRoles 0x0000000000000000000000000000000000000000000000000000000000000002 for setTokenAuthority(address) role SYSTEM_ADMIN:1 true #40496 0x86c751c9f0565cde1e6debde48ed714fe26d36b2876e3ddb6f4d4c5e54dc44bd
    // BK Ok - Only SYSTEM_ADMIN can execute
    function setTokenAuthority(TokenAuthority _tokenAuthority) public auth {
        // BK NOTE - tokenGuard.Permit from GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 to FiatToken 'USD' 'USDToken':0xb45408db6a4c5977d6fa0acc5581023882c89268 for setTokenAuthority(address) #40502 0xc89c3184b0a6a67fd12275a41bab9c61224868c5e6803744c3c0396f99f7ce8d
        // BK Ok
        FiatToken(token).setTokenAuthority(_tokenAuthority);
    }

    // BK NOTE - gateRoles.RoleCapability code GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 capabilityRoles 0x0000000000000000000000000000000000000000000000000000000000000008 for stopToken() role MONEY_OPERATOR:3 true #7010 0x4cc6da103cb954b663fd715c626f641c99e2a7a66d77c0c914363832990c415e
    // BK Ok - Only MONEY_OPERATOR can execute
    function stopToken() public auth note {
        // BK NOTE - tokenGuard.Permit from GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 to FiatToken 'USD' 'USDToken':0xb45408db6a4c5977d6fa0acc5581023882c89268 for stop() #7016 0xd1e5191d9470ecde1217e9f881e27cd1e071a9fe2d7d0dd838f6061b06a8746c
        // BK Ok
        FiatToken(token).stop();
    }

    // BK NOTE - gateRoles.RoleCapability code GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 capabilityRoles 0x0000000000000000000000000000000000000000000000000000000000000008 for startToken() role MONEY_OPERATOR:3 true #7009 0x975a0659052ed208bab3892d44436cebf3761173bd3363a3ebfc1abfcb8c78c5
    // BK Ok - Only MONEY_OPERATOR can execute
    function startToken() public auth note {
        // BK NOTE - tokenGuard.Permit from GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 to FiatToken 'USD' 'USDToken':0xb45408db6a4c5977d6fa0acc5581023882c89268 for start() #7016 0xbc1d4b4bf5f0bdfa172bf50c30a711a51f7d98cca490f5231045bd7a18eb9411
        // BK Ok
        FiatToken(token).start();
    }
}

```
