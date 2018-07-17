# LimitSetting

Source file [../../chain/contracts/LimitSetting.sol](../../chain/contracts/LimitSetting.sol).

<br />

<hr />

```javascript
pragma solidity 0.4.23;

import "dappsys.sol";

contract LimitSetting is DSAuth, DSStop {

    // offset timestamp for limit counter reset time point
    int256 public limitCounterResetTimeOffset;

    // last reset time for apply daily limit
    uint256 public lastSettingResetTime;

    // delay hours settings for apply daily limit
    uint256 private defaultDelayHours;
    uint256 private defaultDelayHoursBuffer;
    uint256 private lastDefaultDelayHoursSettingResetTime;

    // current limit setting
    uint256 private defaultMintDailyLimit;
    uint256 private defaultBurnDailyLimit;
    mapping(address => uint256) private mintCustomDailyLimit;
    mapping(address => uint256) private burnCustomDailyLimit;

    // upcoming limit setting
    uint256 private defaultMintDailyLimitBuffer;
    uint256 private defaultBurnDailyLimitBuffer;
    mapping(address => uint256) private mintCustomDailyLimitBuffer;
    mapping(address => uint256) private burnCustomDailyLimitBuffer;

    constructor(
        DSAuthority _authority,
        uint256 _defaultMintDailyLimit,
        uint256 _defaultBurnDailyLimit,
        int256 _defaultLimitCounterResetTimeffset,
        uint256 _defaultSettingDelayHours
    ) public {
        require(
            address(_authority) != address(0),
            "DSAuthority is mandatory"
        );
        require(
            _defaultMintDailyLimit > 0,
            "Daily mint limit must be positive"
        );
        require(
            _defaultBurnDailyLimit > 0,
            "Daily burn limit must be positive"
        );

        setLimitCounterResetTimeOffset(_defaultLimitCounterResetTimeffset);
        resetSettingDelayBuffer();
        defaultDelayHours = _defaultSettingDelayHours;
        defaultMintDailyLimit = _defaultMintDailyLimit;
        defaultBurnDailyLimit = _defaultBurnDailyLimit;
        defaultMintDailyLimitBuffer = _defaultMintDailyLimit;
        defaultBurnDailyLimitBuffer = _defaultBurnDailyLimit;

        setAuthority(_authority);
        setOwner(0x0);
    }

    // Configurable Minting Quantity Limits reset time point
    function setLimitCounterResetTimeOffset(int256 _timestampOffset) public auth {
        require(
            _timestampOffset >= - 39600 && _timestampOffset <= 50400,
            "Time offset must be within [-11, 14] hours"
        );
        limitCounterResetTimeOffset = _timestampOffset;
    }

    function getLimitCounterResetTimeOffset() public view returns (int256) {
        return limitCounterResetTimeOffset;
    }

    function setSettingDefaultDelayHours(uint256 _hours) public auth {
        defaultDelayHoursBuffer = _hours * 1 hours;
        lastDefaultDelayHoursSettingResetTime = now;
        resetSettingDelayBuffer();
    }

    event AdjustMintLimitRequested(address guy, uint wad);
    event AdjustBurnLimitRequested(address guy, uint wad);
    event AdjustMintLimitRequested(uint wad);
    event AdjustBurnLimitRequested(uint wad);

    function setDefaultMintDailyLimit(uint256 limit) public auth {
        require(
            limit > 0,
            "Daily mint limit must be positive"
        );
        defaultMintDailyLimitBuffer = limit;
        emit AdjustMintLimitRequested(defaultMintDailyLimitBuffer);
        resetSettingDelayBuffer();
    }

    function setDefaultBurnDailyLimit(uint256 limit) public auth {
        require(
            limit > 0,
            "Daily burn limit must be positive"
        );
        defaultBurnDailyLimitBuffer = limit;
        emit AdjustBurnLimitRequested(defaultBurnDailyLimitBuffer);
        resetSettingDelayBuffer();
    }

    function setCustomMintDailyLimit(address guy, uint256 limit) public auth {
        require(
            limit > 0,
            "Custom daily mint limit must be positive"
        );
        mintCustomDailyLimitBuffer[guy] = limit;
        emit AdjustMintLimitRequested(guy, mintCustomDailyLimitBuffer[guy]);
        resetSettingDelayBuffer();
    }

    function setCustomBurnDailyLimit(address guy, uint256 limit) public auth {
        require(
            limit > 0,
            "Custom daily burn limit must be positive"
        );
        burnCustomDailyLimitBuffer[guy] = limit;
        emit AdjustBurnLimitRequested(guy, burnCustomDailyLimitBuffer[guy]);
        resetSettingDelayBuffer();
    }

    function getMintDailyLimit(address guy) public returns (uint256) {
        assert(now >= lastSettingResetTime);
        if (now - lastSettingResetTime >= getDefaultDelayHours() || getDefaultDelayHours() == 0) {
            if (mintCustomDailyLimitBuffer[guy] > 0) {
                mintCustomDailyLimit[guy] = mintCustomDailyLimitBuffer[guy];
                return mintCustomDailyLimit[guy];
            }
            defaultMintDailyLimit = defaultMintDailyLimitBuffer;
            return defaultMintDailyLimit;
        } else {
            if (mintCustomDailyLimit[guy] > 0) {
                return mintCustomDailyLimit[guy];
            }
            return defaultMintDailyLimit;
        }
    }

    function getBurnDailyLimit(address guy) public returns (uint256) {
        assert(now >= lastSettingResetTime);
        if (now - lastSettingResetTime >= getDefaultDelayHours() || getDefaultDelayHours() == 0) {
            if (burnCustomDailyLimitBuffer[guy] > 0) {
                burnCustomDailyLimit[guy] = burnCustomDailyLimitBuffer[guy];
                return burnCustomDailyLimit[guy];
            }
            defaultBurnDailyLimit = defaultBurnDailyLimitBuffer;
            return defaultBurnDailyLimit;
        } else {
            if (burnCustomDailyLimit[guy] > 0) {
                return burnCustomDailyLimit[guy];
            }
            return defaultBurnDailyLimit;
        }
    }

    function resetSettingDelayBuffer() internal stoppable {
        lastSettingResetTime = now;
    }

    function getDefaultDelayHours() internal returns (uint256) {
        if (now - lastDefaultDelayHoursSettingResetTime >= 2592000) {
            defaultDelayHours = defaultDelayHoursBuffer;
        }
        return defaultDelayHours;
    }

}

```
