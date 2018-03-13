pragma solidity 0.4.19;


import "dappsys.sol"; // auth, token, math
import "solovault.sol";
import "GateRoles.sol";
import "FiatToken.sol";


contract Gate is DSSoloVault, ERC20Events, DSMath {
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

    function resetLimit() internal {
        assert(now - lastLimitResetTime >= 1 days);
        uint256 today = now - (now % 1 days);
        lastLimitResetTime = today;
        limitCounter = 0;
    }

    modifier limited(uint wad) {
        if (now - lastLimitResetTime >= 1 days) {
            resetLimit();
        }

        limitCounter = add(limitCounter, wad);
        require(limitCounter <= dailyLimit);
        _;
    }

    function deposit(uint256 wad) public {
        DepositRequested(msg.sender, wad);
    }

    function mint(address guy, uint wad) public limited(wad) {
        super.mint(guy, wad);
        /* Because the EIP20 standard says so, we emit a Transfer event:
           A token contract which creates new tokens SHOULD trigger a
           Transfer event with the _from address set to 0x0 when tokens are created.
            (https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20-token-standard.md)
        */
        Transfer(0x0, this, wad);
    }

    function withdraw(uint256 wad) public {
        WithdrawalRequested(msg.sender, wad);
    }

    function burn(address guy, uint wad) public limited(wad) {
        super.burn(guy, wad);
        Withdrawn(guy, wad);
    }
}
