pragma solidity 0.4.19;


import "dappsys.sol";


contract LimitController is DSMath, DSStop {

    uint256 public mintDailyLimit;

    uint256 public burnDailyLimit;

    uint256 public mintLimitCounter;

    uint256 public burnLimitCounter;

    uint256 public lastLimitResetTime;

    function LimitController(DSAuthority _authority, uint256 _mintDailyLimit, uint256 _burnDailyLimit) public {
        require(_mintDailyLimit > 0);
        require(_burnDailyLimit > 0);
        mintDailyLimit = _mintDailyLimit;
        burnDailyLimit = _burnDailyLimit;
        resetLimit();
        setAuthority(_authority);
        setOwner(0x0);
    }

    function resetLimit() internal stoppable {
        assert(now - lastLimitResetTime >= 1 days);
        uint256 today = now - (now % 1 days);
        lastLimitResetTime = today;
        mintLimitCounter = 0;
        burnLimitCounter = 0;
    }


    function isWithinMintLimit(uint wad) public returns (bool){
        //TODO test me and see if this can be split into a separate function
        if (now - lastLimitResetTime >= 1 days) {
            resetLimit();
        }

        //TODO test me with overflows and unexpected state changes
        return (add(mintLimitCounter, wad) <= mintDailyLimit);
    }

    function isWithinBurnLimit(uint wad) public returns (bool){
        //TODO test me and see if this can be split into a separate function
        if (now - lastLimitResetTime >= 1 days) {
            resetLimit();
        }

        //TODO test me with overflows and unexpected state changes
        return (add(burnLimitCounter, wad) <= burnDailyLimit);
    }

    function bumpMintLimit(uint wad) public auth {
        mintLimitCounter = add(mintLimitCounter, wad);
    }

    function bumpBurnLimit(uint wad) public auth {
        burnLimitCounter = add(burnLimitCounter, wad);
    }
}