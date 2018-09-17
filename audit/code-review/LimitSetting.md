# LimitSetting

Source file [../../chain/contracts/LimitSetting.sol](../../chain/contracts/LimitSetting.sol).

<br />

<hr />

```javascript
pragma solidity 0.4.23;

import "dappsys.sol";

// BK NOTE - limitSetting.address=LimitSetting:0xa15ac97faf20d873309a67d762acc3968912e688
// BK NOTE - limitSetting.authority=GateRoles:0xbfffb78bbb3a27d78857021d162b64c577626b62
// BK NOTE - limitSetting.owner=0x0000000000000000000000000000000000000000
// BK NOTE - limitSetting.stopped=false
// BK NOTE - limitSetting.limitCounterResetTimeOffset=0
// BK NOTE - limitSetting.lastSettingResetTime=1534310818 Wed, 15 Aug 2018 05:26:58 UTC
// BK NOTE - limitSetting.defaultDelayTime=0
// BK NOTE - limitSetting.defaultDelayTimeBuffer=0
// BK NOTE - limitSetting.lastDefaultDelaySettingResetTime=0
// BK NOTE - limitSetting.defaultMintDailyLimit=1e+22 10000
// BK NOTE - limitSetting.defaultBurnDailyLimit=1e+22 10000
// BK NOTE - limitSetting.defaultMintDailyLimitBuffer=1e+22 10000
// BK NOTE - limitSetting.defaultBurnDailyLimitBuffer=1e+22 10000
// BK NOTE - limitSetting.LogSetAuthority 0 #6987 {"authority":"0xbfffb78bbb3a27d78857021d162b64c577626b62"}
// BK NOTE - limitSetting.LogSetOwner 0 #6987 {"owner":"0xa11aae29840fbb5c86e6fd4cf809eba183aef433"}
// BK NOTE - limitSetting.LogSetOwner 1 #6987 {"owner":"0x0000000000000000000000000000000000000000"}
// BK NOTE - Used in LimitController
contract LimitSetting is DSAuth, DSStop {

    // offset timestamp for limit counter reset time point
    // BK NOTE - This is an `int` and not a `uint`
    // BK Ok
    int256 public limitCounterResetTimeOffset;

    // last reset time for apply daily limit
    // BK Ok
    uint256 public lastSettingResetTime;

    // delay hours settings for apply daily limit
    // BK NOTE - Next 3 can be made public for traceability
    // BK Next 3 Ok
    uint256 private defaultDelayTime;
    uint256 private defaultDelayTimeBuffer;
    uint256 private lastDefaultDelaySettingResetTime;

    // current limit setting
    // BK NOTE - Next 2 can be made public for traceability
    // BK Next 2 Ok
    uint256 private defaultMintDailyLimit;
    uint256 private defaultBurnDailyLimit;
    // BK Next 2 Ok
    mapping(address => uint256) private mintCustomDailyLimit;
    mapping(address => uint256) private burnCustomDailyLimit;

    // upcoming limit setting
    // BK NOTE - Next 2 can be made public for traceablity
    // BK Next 2 Ok
    uint256 private defaultMintDailyLimitBuffer;
    uint256 private defaultBurnDailyLimitBuffer;
    // BK Next 2 Ok
    mapping(address => uint256) private mintCustomDailyLimitBuffer;
    mapping(address => uint256) private burnCustomDailyLimitBuffer;

    // BK Ok - Constructor
    constructor(
        DSAuthority _authority,
        uint256 _defaultMintDailyLimit,
        uint256 _defaultBurnDailyLimit,
        int256 _defaultLimitCounterResetTimeOffset,
        uint256 _defaultSettingDelayTime
    ) public {
        // BK Ok
        require(
            address(_authority) != address(0),
            "DSAuthority is mandatory"
        );
        // BK Ok
        require(
            _defaultMintDailyLimit > 0,
            "Daily mint limit must be positive"
        );
        // BK Ok
        require(
            _defaultBurnDailyLimit > 0,
            "Daily burn limit must be positive"
        );

        // BK Ok
        setLimitCounterResetTimeOffset(_defaultLimitCounterResetTimeOffset);
        lastDefaultDelaySettingResetTime = now;
        // BK Ok
        resetSettingDelayBuffer();
        // BK Next 5 Ok
        defaultDelayTime = _defaultSettingDelayTime;
        defaultMintDailyLimit = _defaultMintDailyLimit;
        defaultBurnDailyLimit = _defaultBurnDailyLimit;
        defaultMintDailyLimitBuffer = _defaultMintDailyLimit;
        defaultBurnDailyLimitBuffer = _defaultBurnDailyLimit;

        // BK Next 2 Ok
        setAuthority(_authority);
        setOwner(0x0);
    }

    // Configurable Minting Quantity Limits reset time point
    // BK NOTE - gateRoles.RoleCapability code LimitSetting:0xa15ac97faf20d873309a67d762acc3968912e688 capabilityRoles 0x0000000000000000000000000000000000000000000000000000000000000002 for setLimitCounterResetTimeOffset(int256) role SYSTEM_ADMIN:1 true #7000 0x93e27e0483f35ee02190cfcfb9f33d7f48a862523e62a9c1ca6197ba6cd44644
    // BK Ok - Only SYSTEM_ADMIN can execute
    function setLimitCounterResetTimeOffset(int256 _timestampOffset) public auth {
        require(
            _timestampOffset >= - 39600 && _timestampOffset <= 50400,
            "Time offset must be within [-11, 14] hours"
        );
        // BK NOTE - Should log the changes with an event
        // BK Ok
        limitCounterResetTimeOffset = _timestampOffset;
    }

    // BK Ok - View function
    function getLimitCounterResetTimeOffset() public view returns (int256) {
        // BK Ok
        return limitCounterResetTimeOffset;
    }

    // BK NOTE - gateRoles.RoleCapability code LimitSetting:0xa15ac97faf20d873309a67d762acc3968912e688 capabilityRoles 0x0000000000000000000000000000000000000000000000000000000000000002 for setSettingDefaultDelayHours(uint256) role SYSTEM_ADMIN:1 true #7000 0x3951263abb528c0a2a92f5ef3ef7071ff266653ef6040ec7a6371ec75210a939
    // BK Ok - Only SYSTEM_ADMIN can execute
    function setDefaultDelayHours(uint256 _hours) public auth {
        require(
            _hours * 1 hours <= 1 weeks,
            "Maximum number of delay time is 1 week"
        );
        // BK NOTE - The variable name implies *Hours*, but the number is stored in seconds
        // BK Ok
        defaultDelayTimeBuffer = _hours * 1 hours;
        // BK Ok
        lastDefaultDelaySettingResetTime = now;
        // BK Ok
        resetSettingDelayBuffer();
    }

    // BK Next 4 Ok
    event AdjustMintLimitRequested(address guy, uint wad);
    event AdjustBurnLimitRequested(address guy, uint wad);

    // BK NOTE - gateRoles.RoleCapability code LimitSetting:0xa15ac97faf20d873309a67d762acc3968912e688 capabilityRoles 0x0000000000000000000000000000000000000000000000000000000000000002 for setDefaultMintDailyLimit(uint256) role SYSTEM_ADMIN:1 true #7000 0x7ad23983e3aa67eda4b68e04e07255cdda95fba7e3fd5df17710e0bc1a7685a5
    // BK Ok - Only SYSTEM_ADMIN can execute
    function setDefaultMintDailyLimit(uint256 limit) public auth {
        // BK Ok
        require(
            limit > 0,
            "Daily mint limit must be positive"
        );
        // BK Ok
        defaultMintDailyLimitBuffer = limit;
        // BK Ok - Log event
        emit AdjustMintLimitRequested(address(0), defaultMintDailyLimitBuffer);
        // BK Ok
        resetSettingDelayBuffer();
    }

    // BK NOTE - gateRoles.RoleCapability code LimitSetting:0xa15ac97faf20d873309a67d762acc3968912e688 capabilityRoles 0x0000000000000000000000000000000000000000000000000000000000000002 for setDefaultBurnDailyLimit(uint256) role SYSTEM_ADMIN:1 true #7000 0x70c2e8971ec386b38c43d4b2f402b94c417383bf3e62f80dd1ddfdf7aff027c4
    // BK Ok - Only SYSTEM_ADMIN can execute
    function setDefaultBurnDailyLimit(uint256 limit) public auth {
        // BK Ok
        require(
            limit > 0,
            "Daily burn limit must be positive"
        );
        // BK Ok
        defaultBurnDailyLimitBuffer = limit;
        // BK Ok - Log event
        emit AdjustBurnLimitRequested(address(0), defaultBurnDailyLimitBuffer);
        // BK Ok
        resetSettingDelayBuffer();
    }

    // BK NOTE - gateRoles.RoleCapability code LimitSetting:0xa15ac97faf20d873309a67d762acc3968912e688 capabilityRoles 0x0000000000000000000000000000000000000000000000000000000000000002 for setCustomMintDailyLimit(address,uint256) role SYSTEM_ADMIN:1 true #7000 0x7d968b73d3c34d71c2c90a2b922d7ee2d8190e54b073ecf98060ee7023593ec6
    // BK Ok - Only SYSTEM_ADMIN can execute
    function setCustomMintDailyLimit(address guy, uint256 limit) public auth {
        // BK Ok
        require(
            limit > 0,
            "Custom daily mint limit must be positive"
        );
        // BK Ok
        require(
            limit <= defaultMintDailyLimitBuffer,
            "Custom daily mint limit must be less than or equal to global mint limit buffer"
        );
        // BK Ok
        require(
            guy != 0x0,
            "Custom limit cannot apply to 0x0 address"
        );
        // BK Ok
        mintCustomDailyLimitBuffer[guy] = limit;
        // BK Ok - Log event
        emit AdjustMintLimitRequested(guy, mintCustomDailyLimitBuffer[guy]);
        // BK Ok
        resetSettingDelayBuffer();
    }

    // BK NOTE - gateRoles.RoleCapability code LimitSetting:0xa15ac97faf20d873309a67d762acc3968912e688 capabilityRoles 0x0000000000000000000000000000000000000000000000000000000000000002 for setCustomBurnDailyLimit(address,uint256) role SYSTEM_ADMIN:1 true #7000 0x950637422ee9cb81af8440e1222be82607f6ef21641f61f58f23c9e46e265e68
    // BK Ok - Only SYSTEM_ADMIN can execute
    function setCustomBurnDailyLimit(address guy, uint256 limit) public auth {
        // BK Ok
        require(
            limit > 0,
            "Custom daily burn limit must be positive"
        );
        // BK Ok
        require(
            limit <= defaultBurnDailyLimitBuffer,
            "Custom daily burn limit must be less than or equal to global burn limit buffer"
        );
        // BK Ok
        require(
            guy != 0x0,
            "Custom limit cannot apply to 0x0 address"
        );
        // BK Ok
        burnCustomDailyLimitBuffer[guy] = limit;
        // BK Ok - Log event
        emit AdjustBurnLimitRequested(guy, burnCustomDailyLimitBuffer[guy]);
        // BK Ok
        resetSettingDelayBuffer();
    }

    // BK NOTE - LimitController calls this with 0x0 or an account
    // BK Ok - Any account can execute with another account as `guy` but it does not matter
    function getMintDailyLimit(address guy) public returns (uint256) {
        // BK Ok
        if (now - lastSettingResetTime >= getDefaultDelayTime() || getDefaultDelayTime() == 0) {
            // BK Ok
            if (mintCustomDailyLimitBuffer[guy] > 0) {
                // BK Ok
                mintCustomDailyLimit[guy] = mintCustomDailyLimitBuffer[guy];
                // BK Ok
                return mintCustomDailyLimit[guy];
            }
            // BK Ok
            defaultMintDailyLimit = defaultMintDailyLimitBuffer;
            // BK Ok
            return defaultMintDailyLimit;
        // BK Ok
        } else {
            // BK Ok
            if (mintCustomDailyLimit[guy] > 0) {
                // BK Ok
                return mintCustomDailyLimit[guy];
            }
            // BK Ok
            return defaultMintDailyLimit;
        }
    }

    // BK NOTE - LimitController calls this with 0x0 or an account
    // BK Ok - Any account can execute with another account as `guy` but it does not matter
    function getBurnDailyLimit(address guy) public returns (uint256) {
        // BK Ok
        if (now - lastSettingResetTime >= getDefaultDelayTime() || getDefaultDelayTime() == 0) {
            // BK Ok
            if (burnCustomDailyLimitBuffer[guy] > 0) {
                // BK Ok
                burnCustomDailyLimit[guy] = burnCustomDailyLimitBuffer[guy];
                // BK Ok
                return burnCustomDailyLimit[guy];
            }
            // BK Ok
            defaultBurnDailyLimit = defaultBurnDailyLimitBuffer;
            // BK Ok
            return defaultBurnDailyLimit;
        // BK Ok
        } else {
            // BK Ok
            if (burnCustomDailyLimit[guy] > 0) {
                // BK Ok
                return burnCustomDailyLimit[guy];
            }
            // BK Ok
            return defaultBurnDailyLimit;
        }
    }

    // BK Ok - Internal function
    function resetSettingDelayBuffer() internal stoppable {
        // BK Ok
        lastSettingResetTime = now;
    }

    // BK NOTE - 30 days to change the delay changes
    function getDefaultDelayTime() internal returns (uint256) {
        // BK Ok
        if (now - lastDefaultDelaySettingResetTime >= 30 days) {
            // BK Ok
            defaultDelayTime = defaultDelayTimeBuffer;
        }
        // BK Ok
        return defaultDelayTime;
    }

}

```
