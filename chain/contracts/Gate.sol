pragma solidity 0.4.19;


import "dappsys.sol";


// auth, token, math
import "solovault.sol";
import "GateRoles.sol";
import "FiatToken.sol";


contract Gate is DSSoloVault, ERC20Events, DSMath, DSStop {
    uint256 public dailyLimit;

    uint256 public limitCounter;

    uint256 public lastLimitResetTime;

    event DepositRequested(address indexed by, uint256 amount);

    event WithdrawalRequested(address indexed from, uint256 amount);

    event Withdrawn(address indexed from, uint256 amount);

    function Gate(DSAuthority _authority, DSToken fiatToken, uint256 _dailyLimit)
    public
    {
        require(_dailyLimit > 0);
        dailyLimit = _dailyLimit;
        resetLimit();
        swap(fiatToken);
        setAuthority(_authority);
        setOwner(0x0);
    }

    modifier limited(uint wad) {
        if (now - lastLimitResetTime >= 1 days) {
            resetLimit();
        }

        limitCounter = add(limitCounter, wad);
        require(limitCounter <= dailyLimit);
        _;
    }

    function deposit(uint256 wad) public stoppable {
        DepositRequested(msg.sender, wad);
    }

    function mint(address guy, uint wad) public limited(wad) stoppable {
        super.mint(guy, wad);
        /* Because the EIP20 standard says so, we emit a Transfer event:
           A token contract which creates new tokens SHOULD trigger a
           Transfer event with the _from address set to 0x0 when tokens are created.
            (https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20-token-standard.md)
        */
        Transfer(0x0, guy, wad);
    }

    function withdraw(uint256 wad) public stoppable {
        WithdrawalRequested(msg.sender, wad);
    }

    function burn(address guy, uint wad) public limited(wad) stoppable {
        super.burn(guy, wad);
        Withdrawn(guy, wad);
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

    function resetLimit() internal stoppable {
        assert(now - lastLimitResetTime >= 1 days);
        uint256 today = now - (now % 1 days);
        lastLimitResetTime = today;
        limitCounter = 0;
    }
}
