pragma solidity 0.4.19;


import "dappsys.sol";


contract LimitSetting is DSAuth, DSStop {

    uint256 private defaultDelayHours;

    uint256 public lastDailyLimitResetTime;

    uint256 public lastDailyBurnLimitResetTime;

    uint256 private defaultMintDailyLimit;

    uint256 private defaultBurnDailyLimit;

    uint256 private defaultMintDailyLimitDelayed;   

    uint256 private defaultBurnDailyLimitDelayed;

    mapping (address => uint256) private mintCustomDailyLimit;

    mapping (address => uint256) private burnCustomDailyLimit;

    mapping (address => uint256) private mintCustomDailyLimitDelayed;

    mapping (address => uint256) private burnCustomDailyLimitDelayed;

    function LimitSetting(DSAuthority _authority, uint256 _defaultMintDailyLimit, uint256 _defaultBurnDailyLimit) public {
        require(address(_authority) != address(0));
        require(_defaultMintDailyLimit > 0);
        require(_defaultBurnDailyLimit > 0);

        setDefaultDelayHours(0);
        defaultMintDailyLimit = _defaultMintDailyLimit;
        defaultBurnDailyLimit = _defaultBurnDailyLimit;
        defaultMintDailyLimitDelayed = _defaultMintDailyLimit;
        defaultBurnDailyLimitDelayed = _defaultBurnDailyLimit;
        resetDailyLimitTime();

        setAuthority(_authority);
        setOwner(0x0);
    }

    function resetDailyLimitTime() internal stoppable {
        lastDailyLimitResetTime = now;
    }

    function setDefaultDelayHours(uint256 _hours) public auth {
        defaultDelayHours = _hours * 1 hours;
        resetDailyLimitTime();
    }

    function setDefaultMintDailyLimit(uint256 limit) public auth {
        require(limit > 0);
        defaultMintDailyLimitDelayed = limit;
        resetDailyLimitTime();
    }

    function setDefaultBurnDailyLimit(uint256 limit) public auth {
        require(limit > 0);
        defaultBurnDailyLimitDelayed = limit;
        resetDailyLimitTime();
    }

    function setCustomMintDailyLimit(address guy, uint256 limit) public auth {
        require(limit > 0);
        mintCustomDailyLimitDelayed[guy] = limit;
        resetDailyLimitTime();
    }

    function setCustomBurnDailyLimit(address guy, uint256 limit) public auth {
        require(limit > 0);
        burnCustomDailyLimitDelayed[guy] = limit;
        resetDailyLimitTime();
    }

    function getMintDailyLimit(address guy) public returns (uint) {
        assert(now >= lastDailyLimitResetTime);
        if (now - lastDailyLimitResetTime >= defaultDelayHours || defaultDelayHours == 0) {
            if (mintCustomDailyLimitDelayed[guy] > 0) {
                mintCustomDailyLimit[guy] = mintCustomDailyLimitDelayed[guy];
                return mintCustomDailyLimit[guy];
            }
            defaultMintDailyLimit = defaultMintDailyLimitDelayed;
            return defaultMintDailyLimit;
        } else {
            if (mintCustomDailyLimit[guy] > 0) {
                return mintCustomDailyLimit[guy];
            }
            return defaultMintDailyLimit;
        }
    }

    function getBurnDailyLimit(address guy) public returns (uint) {
        assert(now >= lastDailyLimitResetTime);
        if (now - lastDailyLimitResetTime >= defaultDelayHours) {
            if (burnCustomDailyLimitDelayed[guy] > 0) {
                burnCustomDailyLimit[guy] = burnCustomDailyLimitDelayed[guy];
                return burnCustomDailyLimit[guy];
            }
            defaultBurnDailyLimit = defaultBurnDailyLimitDelayed;
            return defaultBurnDailyLimit;
        } else {
            if (burnCustomDailyLimit[guy] > 0) {
                return burnCustomDailyLimit[guy];
            }
            return defaultBurnDailyLimit;
        }
    }

}