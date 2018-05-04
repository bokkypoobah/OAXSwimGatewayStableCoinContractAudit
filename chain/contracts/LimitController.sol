pragma solidity 0.4.19;


import "dappsys.sol";


contract LimitController is DSMath, DSStop {

    uint256 public dailyLimit;

    uint256 public limitCounter;

    uint256 public lastLimitResetTime;

    function LimitController(DSAuthority _authority, uint256 _dailyLimit) public {
        require(_dailyLimit > 0);
        dailyLimit = _dailyLimit;
        resetLimit();
        setAuthority(_authority);
        setOwner(0x0);
    }

    function resetLimit() internal stoppable {
        assert(now - lastLimitResetTime >= 1 days);
        uint256 today = now - (now % 1 days);
        lastLimitResetTime = today;
        limitCounter = 0;
    }

    function isWithinLimit(uint wad) public returns (bool){
        //TODO test me and see if this can be split into a separate function
        if (now - lastLimitResetTime >= 1 days) {
            resetLimit();
        }

        //TODO test me with overflows and unexpected state changes
        return (add(limitCounter, wad) <= dailyLimit);
    }

    function bumpLimit(uint wad) public auth {
        limitCounter = add(limitCounter, wad);
    }
}