pragma solidity 0.4.23;

/// math.sol -- mixin for inline numerical wizardry

contract DSMath {
    function add(uint x, uint y) internal pure returns (uint z) {
        require((z = x + y) >= x);
    }
    function sub(uint x, uint y) internal pure returns (uint z) {
        require((z = x - y) <= x);
    }
    function mul(uint x, uint y) internal pure returns (uint z) {
        require(y == 0 || (z = x * y) / y == x);
    }

    function min(uint x, uint y) internal pure returns (uint z) {
        return x <= y ? x : y;
    }
    function max(uint x, uint y) internal pure returns (uint z) {
        return x >= y ? x : y;
    }
    function imin(int x, int y) internal pure returns (int z) {
        return x <= y ? x : y;
    }
    function imax(int x, int y) internal pure returns (int z) {
        return x >= y ? x : y;
    }

    uint constant WAD = 10 ** 18;
    uint constant RAY = 10 ** 27;

    function wmul(uint x, uint y) internal pure returns (uint z) {
        z = add(mul(x, y), WAD / 2) / WAD;
    }
    function rmul(uint x, uint y) internal pure returns (uint z) {
        z = add(mul(x, y), RAY / 2) / RAY;
    }
    function wdiv(uint x, uint y) internal pure returns (uint z) {
        z = add(mul(x, WAD), y / 2) / y;
    }
    function rdiv(uint x, uint y) internal pure returns (uint z) {
        z = add(mul(x, RAY), y / 2) / y;
    }

    function rpow(uint x, uint n) internal pure returns (uint z) {
        z = n % 2 != 0 ? x : RAY;

        for (n /= 2; n != 0; n /= 2) {
            x = rmul(x, x);

            if (n % 2 != 0) {
                z = rmul(z, x);
            }
        }
    }
}


/// erc20.sol -- API for the ERC20 token standard

contract ERC20Events {
    event Approval(address indexed src, address indexed guy, uint wad);
    event Transfer(address indexed src, address indexed dst, uint wad);
}

contract ERC20 is ERC20Events {
    function totalSupply() public view returns (uint);
    function balanceOf(address guy) public view returns (uint);
    function allowance(address src, address guy) public view returns (uint);

    function approve(address guy, uint wad) public returns (bool);
    function transfer(address dst, uint wad) public returns (bool);
    function transferFrom(
        address src, address dst, uint wad
    ) public returns (bool);
}


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


// roles.sol - roled based authentication

contract DSRoles is DSAuth, DSAuthority
{
    mapping(address=>bool) _root_users;
    mapping(address=>bytes32) _user_roles;
    mapping(address=>mapping(bytes4=>bytes32)) _capability_roles;
    mapping(address=>mapping(bytes4=>bool)) _public_capabilities;

    event LogSetRootUser(address indexed who, bool enabled);
    event LogSetUserRole(address indexed who, bytes32 indexed userRoles, uint8 role, bool enabled);
    event LogSetPublicCapability(address code, bytes4 sig, bool enabled);
    event LogSetRoleCapability(address code, bytes32 capabilityRoles, uint8 role, bytes4 sig, bool enabled);

    function getUserRoles(address who)
        public
        view
        returns (bytes32)
    {
        return _user_roles[who];
    }

    function getCapabilityRoles(address code, bytes4 sig)
        public
        view
        returns (bytes32)
    {
        return _capability_roles[code][sig];
    }

    function isUserRoot(address who)
        public
        view
        returns (bool)
    {
        return _root_users[who];
    }

    function isCapabilityPublic(address code, bytes4 sig)
        public
        view
        returns (bool)
    {
        return _public_capabilities[code][sig];
    }

    function hasUserRole(address who, uint8 role)
        public
        view
        returns (bool)
    {
        bytes32 roles = getUserRoles(who);
        bytes32 shifted = bytes32(uint256(uint256(2) ** uint256(role)));
        return bytes32(0) != roles & shifted;
    }

    function canCall(address caller, address code, bytes4 sig)
        public
        view
        returns (bool)
    {
        if( isUserRoot(caller) || isCapabilityPublic(code, sig) ) {
            return true;
        } else {
            bytes32 has_roles = getUserRoles(caller);
            bytes32 needs_one_of = getCapabilityRoles(code, sig);
            return bytes32(0) != has_roles & needs_one_of;
        }
    }

    function BITNOT(bytes32 input) internal pure returns (bytes32 output) {
        return (input ^ bytes32(uint(-1)));
    }

    function setRootUser(address who, bool enabled)
        public
        auth
    {
        _root_users[who] = enabled;
        emit LogSetRootUser(who, enabled);
    }

    function setUserRole(address who, uint8 role, bool enabled)
        public
        auth
    {
        bytes32 last_roles = _user_roles[who];
        bytes32 shifted = bytes32(uint256(uint256(2) ** uint256(role)));
        if( enabled ) {
            _user_roles[who] = last_roles | shifted;
        } else {
            _user_roles[who] = last_roles & BITNOT(shifted);
        }
        emit LogSetUserRole(who, _user_roles[who], role, enabled);
    }

    function setPublicCapability(address code, bytes4 sig, bool enabled)
        public
        auth
    {
        _public_capabilities[code][sig] = enabled;
        emit LogSetPublicCapability(code, sig, enabled);
    }

    function setRoleCapability(uint8 role, address code, bytes4 sig, bool enabled)
        public
        auth
    {
        bytes32 last_roles = _capability_roles[code][sig];
        bytes32 shifted = bytes32(uint256(uint256(2) ** uint256(role)));
        if( enabled ) {
            _capability_roles[code][sig] = last_roles | shifted;
        } else {
            _capability_roles[code][sig] = last_roles & BITNOT(shifted);
        }
        emit LogSetRoleCapability(code, _capability_roles[code][sig], role, sig, enabled);
    }

}


/// base.sol -- basic ERC20 implementation

contract DSTokenBase is ERC20, DSMath {
    uint256                                            _supply;
    mapping (address => uint256)                       _balances;
    mapping (address => mapping (address => uint256))  _approvals;

    constructor(uint supply) public {
        _balances[msg.sender] = supply;
        _supply = supply;
    }

    function totalSupply() public view returns (uint) {
        return _supply;
    }
    function balanceOf(address src) public view returns (uint) {
        return _balances[src];
    }
    function allowance(address src, address guy) public view returns (uint) {
        return _approvals[src][guy];
    }

    function transfer(address dst, uint wad) public returns (bool) {
        return transferFrom(msg.sender, dst, wad);
    }

    function transferFrom(address src, address dst, uint wad)
        public
        returns (bool)
    {
        if (src != msg.sender) {
            _approvals[src][msg.sender] = sub(_approvals[src][msg.sender], wad);
        }

        _balances[src] = sub(_balances[src], wad);
        _balances[dst] = add(_balances[dst], wad);

        emit Transfer(src, dst, wad);

        return true;
    }

    function approve(address guy, uint wad) public returns (bool) {
        _approvals[msg.sender][guy] = wad;

        emit Approval(msg.sender, guy, wad);

        return true;
    }
}


/// token.sol -- ERC20 implementation with minting and burning

contract DSToken is DSTokenBase(0), DSStop {

    bytes32  public  symbol;

    constructor(bytes32 symbol_) public {
        symbol = symbol_;
    }

    event Mint(address indexed guy, uint wad);
    event Burn(address indexed guy, uint wad);

    function approve(address guy) public stoppable returns (bool) {
        return super.approve(guy, uint(-1));
    }

    function approve(address guy, uint wad) public stoppable returns (bool) {
        return super.approve(guy, wad);
    }

    function transferFrom(address src, address dst, uint wad)
        public
        stoppable
        returns (bool)
    {
        if (src != msg.sender && _approvals[src][msg.sender] != uint(-1)) {
            _approvals[src][msg.sender] = sub(_approvals[src][msg.sender], wad);
        }

        _balances[src] = sub(_balances[src], wad);
        _balances[dst] = add(_balances[dst], wad);

        emit Transfer(src, dst, wad);

        return true;
    }

    function push(address dst, uint wad) public {
        transferFrom(msg.sender, dst, wad);
    }
    function pull(address src, uint wad) public {
        transferFrom(src, msg.sender, wad);
    }
    function move(address src, address dst, uint wad) public {
        transferFrom(src, dst, wad);
    }

    function mint(uint wad) public {
        mint(msg.sender, wad);
    }
    function burn(uint wad) public {
        burn(msg.sender, wad);
    }
    function mint(address guy, uint wad) public auth stoppable {
        _balances[guy] = add(_balances[guy], wad);
        _supply = add(_supply, wad);
        emit Mint(guy, wad);
    }
    function burn(address guy, uint wad) public auth stoppable {
        if (guy != msg.sender && _approvals[guy][msg.sender] != uint(-1)) {
            _approvals[guy][msg.sender] = sub(_approvals[guy][msg.sender], wad);
        }

        _balances[guy] = sub(_balances[guy], wad);
        _supply = sub(_supply, wad);
        emit Burn(guy, wad);
    }

    bytes32   public  name = "";

    function setName(bytes32 name_) public auth {
        name = name_;
    }
}


contract DSSoloVault is DSAuth {
    ERC20 public token;

    function swap(ERC20 token_) public auth {
        token = token_;
    }

    function push(address dst, uint wad) public auth {
        require(
            token.transfer(dst, wad),
            "Can't push"
        );
    }

    function pull(address src, uint wad) public auth {
        require(
            token.transferFrom(src, this, wad),
            "Can't pull"
        );
    }

    function push(address dst) public {
        push(dst, token.balanceOf(this));
    }

    function pull(address src) public {
        pull(src, token.balanceOf(src));
    }

    function mint(address guy, uint wad) public auth {
        DSToken(token).mint(guy, wad);
    }

    function burn(address guy, uint wad) public auth {
        DSToken(token).burn(guy, wad);
    }

    function mint(uint wad) public auth {
        DSToken(token).mint(wad);
    }

    function burn(uint wad) public auth {
        DSToken(token).burn(wad);
    }

    function burn() public auth {
        DSToken(token).burn(token.balanceOf(this));
    }

    function approve(address guy, uint wad) public auth returns (bool) {
        return DSToken(token).approve(guy, wad);
    }

    function approve(address guy) public auth returns (bool) {
        return DSToken(token).approve(guy);
    }
}


contract GateRoles is DSRoles {

    uint8 public constant SYSTEM_ADMIN = 1;
    uint8 public constant KYC_OPERATOR = 2;
    uint8 public constant MONEY_OPERATOR = 3;

}


// ERC20Authority, ERC20Auth, TokenAuthority, TokenAuth

interface ERC20Authority {
    function canApprove(address src, address dst, address guy, uint wad) external view returns (bool);
    function canTransfer(address src, address dst, address to, uint wad) external view returns (bool);
    function canTransferFrom(address src, address dst, address from, address to, uint wad) external view returns (bool);
}


contract ERC20Auth is DSAuth {
    ERC20Authority public erc20Authority;

    event LogSetERC20Authority(ERC20Authority erc20Authority);

    modifier authApprove(address guy, uint wad) {
        require(
            erc20Authority.canApprove(msg.sender, this, guy, wad),
            "Message sender is not authorized to use approve function"
        );
        _;
    }

    modifier authTransfer(address to, uint wad) {
        require(
            erc20Authority.canTransfer(msg.sender, this, to, wad),
            "Message sender is not authorized to use transfer function"
        );
        _;
    }

    modifier authTransferFrom(address from, address to, uint wad) {
        require(
            erc20Authority.canTransferFrom(msg.sender, this, from, to, wad),
            "Message sender is not authorized to use transferFrom function"
        );
        _;
    }

    function setERC20Authority(ERC20Authority _erc20Authority) public auth {
        erc20Authority = _erc20Authority;
        emit LogSetERC20Authority(erc20Authority);
    }
}


interface TokenAuthority {
    function canMint(address src, address dst, address guy, uint wad) external view returns (bool);
    function canBurn(address src, address dst, address guy, uint wad) external view returns (bool);
}


contract TokenAuth is DSAuth {
    TokenAuthority public tokenAuthority;

    event LogSetTokenAuthority(TokenAuthority tokenAuthority);

    modifier authMint(address guy, uint wad) {
        require(
            tokenAuthority.canMint(msg.sender, this, guy, wad),
            "Message sender is not authorized to use mint function"
        );
        _;
    }

    modifier authBurn(address guy, uint wad) {
        require(
            tokenAuthority.canBurn(msg.sender, this, guy, wad),
            "Message sender is not authorized to use burn function"
        );
        _;
    }

    function setTokenAuthority(TokenAuthority _tokenAuthority) public auth {
        tokenAuthority = _tokenAuthority;
        emit LogSetTokenAuthority(tokenAuthority);
    }
}




contract TransferFeeControllerInterface {
    function calculateTransferFee(address from, address to, uint wad) public view returns (uint);
}


contract FiatToken is DSToken, ERC20Auth, TokenAuth {

    uint8 public constant decimals = 18;
    TransferFeeControllerInterface public transferFeeController;
    address public transferFeeCollector;

    event LogSetTransferFeeCollector(address feeCollector);
    event LogSetTransferFeeController(address transferFeeController);

    constructor(
        DSAuthority _authority,
        bytes32 symbol,
        bytes32 tokenName,
        address transferFeeCollector_,
        TransferFeeControllerInterface transferFeeController_
    )
    DSToken(symbol)
    public
    {
        setName(tokenName);
        setAuthority(_authority);
        setOwner(0x0);
        transferFeeCollector = transferFeeCollector_;
        transferFeeController = transferFeeController_;
    }

    function approve(address guy, uint wad)
    public
    authApprove(guy, wad)
    returns (bool) {
        return super.approve(guy, wad);
    }

    function transfer(address to, uint wad)
    public
    authTransfer(to, wad)
    returns (bool) {
        return transferFrom(msg.sender, to, wad);
    }

    function transferFrom(address from, address to, uint wad)
    public
    authTransferFrom(from, to, wad)
    returns (bool) {
        uint fee = transferFeeController.calculateTransferFee(from, to, wad);
        bool transferToStatus = super.transferFrom(from, to, sub(wad, fee));
        bool transferFeeStatus = super.transferFrom(from, transferFeeCollector, fee);
        return (transferToStatus && transferFeeStatus);
    }

    function mint(address guy, uint wad) public authMint(guy, wad) {
        super.mint(guy, wad);
        emit Transfer(address(0), guy, wad);
    }

    function burn(address guy, uint wad) public authBurn(guy, wad) {
        super.burn(guy, wad);
        emit Transfer(guy, address(0), wad);
    }

    function setTransferFeeCollector(address feeCollector_)
    public
    auth
    {
        transferFeeCollector = feeCollector_;
        emit LogSetTransferFeeCollector(transferFeeCollector);
    }

    function setTransferFeeController(TransferFeeControllerInterface transferFeeController_)
    public
    auth
    {
        transferFeeController = transferFeeController_;
        emit LogSetTransferFeeController(transferFeeController);
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


contract LimitController is DSMath, DSStop {

    uint256 public mintLimitCounter;
    uint256 public burnLimitCounter;
    uint256 public lastLimitResetTime;
    LimitSetting public limitSetting;

    constructor(DSAuthority _authority, LimitSetting limitSetting_) public {
        require(
            address(_authority) != address(0),
            "DSAuthority is mandatory"
        );
        require(
            address(limitSetting_) != address(0),
            "LimitSetting is mandatory"
        );

        limitSetting = limitSetting_;
        resetLimit();
        setAuthority(_authority);
        setOwner(0x0);
    }

    function isWithinMintLimit(address guy, uint256 wad) public returns (bool) {
        if (now - lastLimitResetTime >= 1 days) {
            resetLimit();
        }

        // check if it is within global accumulated limit && custom limit per transaction
        return (add(mintLimitCounter, wad) <= limitSetting.getMintDailyLimit(0x0)) &&
            (wad <= limitSetting.getMintDailyLimit(guy));
    }

    function isWithinBurnLimit(address guy, uint256 wad) public returns (bool) {
        if (now - lastLimitResetTime >= 1 days) {
            resetLimit();
        }

        // check if it is within global accumulated limit && custom limit per transaction
        return (add(burnLimitCounter, wad) <= limitSetting.getBurnDailyLimit(0x0)) &&
            (wad <= limitSetting.getBurnDailyLimit(guy));
    }

    function bumpMintLimitCounter(uint256 wad) public auth {
        mintLimitCounter = add(mintLimitCounter, wad);
    }

    function bumpBurnLimitCounter(uint256 wad) public auth {
        burnLimitCounter = add(burnLimitCounter, wad);
    }

    function resetLimit() internal stoppable {
        require(
            now - lastLimitResetTime >= 1 days,
            "Last limit setting time should larger or equal than 1 day to reset the limit counter"
        );
        uint256 today = now - (now % 1 days);
        lastLimitResetTime = uint256(int256(today) + limitSetting.getLimitCounterResetTimeOffset());
        mintLimitCounter = 0;
        burnLimitCounter = 0;
    }

}


contract Gate is DSSoloVault, ERC20Events, DSMath, DSStop {

    LimitController public limitController;

    event DepositRequested(address indexed by, uint256 amount);
    event Deposited(address indexed guy, uint256 amount);
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

    function mint(address guy, uint wad) public mintLimited(msg.sender, wad) stoppable {
        super.mint(guy, wad);
        limitController.bumpMintLimitCounter(wad);
 
        emit Deposited(guy, wad);
    }

    function withdraw(uint256 wad) public stoppable {
        emit WithdrawalRequested(msg.sender, wad);
    }

    function burn(address guy, uint wad) public burnLimited(msg.sender, wad) stoppable {
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


contract TransferFeeController is TransferFeeControllerInterface, DSMath, DSAuth {
    //transfer fee is calculated by transferFeeAbs+amt*transferFeeBps
    uint public defaultTransferFeeAbs;
    uint public defaultTransferFeeBps;

    event LogSetDefaultTransferFee(uint defaultTransferFeeAbs, uint defaultTransferFeeBps);

    constructor(DSAuthority _authority, uint defaultTransferFeeAbs_, uint defaultTransferFeeBps_)
    public {
        setAuthority(_authority);
        setOwner(0x0);
        defaultTransferFeeAbs = defaultTransferFeeAbs_;
        defaultTransferFeeBps = defaultTransferFeeBps_;
    }

    function divRoundUp(uint x, uint y) internal pure returns (uint z) {
        require(
            y > 0,
            "Second parameter must be positive"
        );
        z = add(mul(x, 1), y / 2) / y;
    }

    function calculateTransferFee(address /*from*/, address /*to*/, uint wad)
    public
    view
    returns (uint) {
        return add(defaultTransferFeeAbs, divRoundUp(mul(wad, defaultTransferFeeBps), 10000));
    }

    function setDefaultTransferFee(uint defaultTransferFeeAbs_, uint defaultTransferFeeBps_)
    public
    auth
    {
        require(
            defaultTransferFeeBps_ <= 10,
            "Default Transfer Fee Bps must be less than or equal to 10"
        );
        defaultTransferFeeAbs = defaultTransferFeeAbs_;
        defaultTransferFeeBps = defaultTransferFeeBps_;
        emit LogSetDefaultTransferFee(defaultTransferFeeAbs, defaultTransferFeeBps);
    }
}


contract GateWithFee is Gate {

    address public mintFeeCollector;
    address public burnFeeCollector;

    constructor(
        DSAuthority _authority,
        DSToken fiatToken,
        LimitController _limitController,
        address mintFeeCollector_,
        address burnFeeCollector_
        )
    public
    Gate(_authority, fiatToken, _limitController)
    {
        mintFeeCollector = mintFeeCollector_;
        burnFeeCollector = burnFeeCollector_;
    }

    function setMintFeeCollector(address mintFeeCollector_) public auth {
        mintFeeCollector = mintFeeCollector_;
    }

    function setBurnFeeCollector(address burnFeeCollector_) public auth {
        burnFeeCollector = burnFeeCollector_;
    }

    function setTransferFeeCollector(address transferFeeCollector_) public auth {
        (FiatToken(token)).setTransferFeeCollector(transferFeeCollector_);
    }

    function setTransferFeeController(TransferFeeControllerInterface transferFeeController_) public auth {
        (FiatToken(token)).setTransferFeeController(transferFeeController_);
    }

    function mintWithFee(address guy, uint wad, uint fee) public auth {
        super.mint(guy, wad);
        super.mint(mintFeeCollector, fee);
    }

    function burnWithFee(address guy, uint wad, uint fee) public auth {
        super.burn(guy, sub(wad, fee));
        token.transferFrom(guy, burnFeeCollector, fee);
    }

}
