pragma solidity 0.4.23;


contract DSAuthority {
    function canCall(
        address src, address dst, bytes4 sig
    ) public view returns (bool);
}

contract DSAuthEvents {
    event LogSetAuthority (address indexed authority);
    event LogSetOwner     (address indexed owner);
}

contract DSAuth is DSAuthEvents {
    DSAuthority  public  authority;
    address      public  owner;

    constructor() public {
        owner = msg.sender;
        emit LogSetOwner(msg.sender);
    }

    function setOwner(address owner_)
        public
        auth
    {
        owner = owner_;
        emit LogSetOwner(owner);
    }

    function setAuthority(DSAuthority authority_)
        public
        auth
    {
        authority = authority_;
        emit LogSetAuthority(authority);
    }

    modifier auth {
        require(isAuthorized(msg.sender, msg.sig));
        _;
    }

    function isAuthorized(address src, bytes4 sig) internal view returns (bool) {
        if (src == address(this)) {
            return true;
        } else if (src == owner) {
            return true;
        } else if (authority == DSAuthority(0)) {
            return false;
        } else {
            return authority.canCall(src, this, sig);
        }
    }
}


/// note.sol -- the `note' modifier, for logging calls as events

contract DSNote {
    event LogNote(
        bytes4   indexed  sig,
        address  indexed  guy,
        bytes32  indexed  foo,
        bytes32  indexed  bar,
        uint              wad,
        bytes             fax
    ) anonymous;

    modifier note {
        bytes32 foo;
        bytes32 bar;

        assembly {
            foo := calldataload(4)
            bar := calldataload(36)
        }

        emit LogNote(msg.sig, msg.sender, foo, bar, msg.value, msg.data);

        _;
    }
}


/// stop.sol -- mixin for enable/disable functionality

contract DSStop is DSNote, DSAuth {

    bool public stopped;

    modifier stoppable {
        require(!stopped);
        _;
    }
    function stop() public auth note {
        stopped = true;
    }
    function start() public auth note {
        stopped = false;
    }

}


contract LimitSetting is DSAuth, DSStop {

    // offset timestamp for limit counter reset time point
    int256 public limitCounterResetTimeOffset;

    // last reset time for apply daily limit
    uint256 public lastSettingResetTime;

    // delay hours settings for apply daily limit
    uint256 private defaultDelayTime;
    uint256 private defaultDelayTimeBuffer;
    uint256 private lastDefaultDelaySettingResetTime;

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
        int256 _defaultLimitCounterResetTimeOffset,
        uint256 _defaultSettingDelayTime
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

        setLimitCounterResetTimeOffset(_defaultLimitCounterResetTimeOffset);
        lastDefaultDelaySettingResetTime = now;
        resetSettingDelayBuffer();
        defaultDelayTime = _defaultSettingDelayTime;
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

    function setDefaultDelayHours(uint256 _hours) public auth {
        require(
            _hours * 1 hours <= 1 weeks,
            "Maximum number of delay time is 1 week"
        );
        defaultDelayTimeBuffer = _hours * 1 hours;
        lastDefaultDelaySettingResetTime = now;
        resetSettingDelayBuffer();
    }

    event AdjustMintLimitRequested(address guy, uint wad);
    event AdjustBurnLimitRequested(address guy, uint wad);

    function setDefaultMintDailyLimit(uint256 limit) public auth {
        require(
            limit > 0,
            "Daily mint limit must be positive"
        );
        defaultMintDailyLimitBuffer = limit;
        emit AdjustMintLimitRequested(address(0), defaultMintDailyLimitBuffer);
        resetSettingDelayBuffer();
    }

    function setDefaultBurnDailyLimit(uint256 limit) public auth {
        require(
            limit > 0,
            "Daily burn limit must be positive"
        );
        defaultBurnDailyLimitBuffer = limit;
        emit AdjustBurnLimitRequested(address(0), defaultBurnDailyLimitBuffer);
        resetSettingDelayBuffer();
    }

    function setCustomMintDailyLimit(address guy, uint256 limit) public auth {
        require(
            limit > 0,
            "Custom daily mint limit must be positive"
        );
        require(
            limit <= defaultMintDailyLimitBuffer,
            "Custom daily mint limit must be less than or equal to global mint limit buffer"
        );
        require(
            guy != 0x0,
            "Custom limit cannot apply to 0x0 address"
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
        require(
            limit <= defaultBurnDailyLimitBuffer,
            "Custom daily burn limit must be less than or equal to global burn limit buffer"
        );
        require(
            guy != 0x0,
            "Custom limit cannot apply to 0x0 address"
        );
        burnCustomDailyLimitBuffer[guy] = limit;
        emit AdjustBurnLimitRequested(guy, burnCustomDailyLimitBuffer[guy]);
        resetSettingDelayBuffer();
    }

    function getMintDailyLimit(address guy) public returns (uint256) {
        if (now - lastSettingResetTime >= getDefaultDelayTime() || getDefaultDelayTime() == 0) {
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
        if (now - lastSettingResetTime >= getDefaultDelayTime() || getDefaultDelayTime() == 0) {
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

    function getDefaultDelayTime() internal returns (uint256) {
        if (now - lastDefaultDelaySettingResetTime >= 30 days) {
            defaultDelayTime = defaultDelayTimeBuffer;
        }
        return defaultDelayTime;
    }

}
