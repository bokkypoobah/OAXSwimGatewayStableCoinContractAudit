# Gate

Source file [../../chain/contracts/Gate.sol](../../chain/contracts/Gate.sol).

<br />

<hr />

```javascript
pragma solidity 0.4.23;


import "dappsys.sol";


// auth, token, math
import "solovault.sol";
import "GateRoles.sol";
import "FiatToken.sol";
import "LimitController.sol";


contract Gate is DSSoloVault, ERC20Events, DSMath, DSStop {

    LimitController public limitController;

    event DepositRequested(address indexed by, uint256 amount);

    event WithdrawalRequested(address indexed from, uint256 amount);

    event Withdrawn(address indexed from, uint256 amount);

    constructor(DSAuthority _authority, DSToken fiatToken, LimitController _limitController)
    public
    {
        swap(fiatToken);
        setAuthority(_authority);
        setLimitController(_limitController);
        setOwner(0x0);
    }

    event LogSetLimitController(LimitController _limitController);

    function setLimitController(LimitController _limitController)
    public
    auth
    {
        limitController = _limitController;
        emit LogSetLimitController(_limitController);
    }

    modifier mintLimited(address guy, uint wad) {
        require(
            limitController.isWithinMintLimit(guy, wad),
            "Mint limit exceeded"
        );
        _;
    }
    
    modifier burnLimited(address guy, uint wad) {
        require(
            limitController.isWithinBurnLimit(guy, wad),
            "Burn limit exceeded"
        );
        _;
    }

    function deposit(uint256 wad) public stoppable {
        emit DepositRequested(msg.sender, wad);
    }

    function mint(address guy, uint wad) public mintLimited(guy, wad) stoppable {
        super.mint(guy, wad);
        limitController.bumpMintLimitCounter(wad);
        /* Because the EIP20 standard says so, we emit a Transfer event:
           A token contract which creates new tokens SHOULD trigger a
           Transfer event with the _from address set to 0x0 when tokens are created.
            (https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20-token-standard.md)
        */
        emit Transfer(0x0, guy, wad);
    }

    function withdraw(uint256 wad) public stoppable {
        emit WithdrawalRequested(msg.sender, wad);
    }

    function burn(address guy, uint wad) public burnLimited(guy, wad) stoppable {
        super.burn(guy, wad);
        limitController.bumpBurnLimitCounter(wad);
        emit Withdrawn(guy, wad);
    }

    function setERC20Authority(ERC20Authority _erc20Authority) public auth {
        FiatToken(token).setERC20Authority(_erc20Authority);
    }

    function setTokenAuthority(TokenAuthority _tokenAuthority) public auth {
        FiatToken(token).setTokenAuthority(_tokenAuthority);
    }

    function stopToken() public auth note {
        FiatToken(token).stop();
    }

    function startToken() public auth note {
        FiatToken(token).start();
    }
}

```
