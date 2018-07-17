# dappsys

Source file [../../chain/contracts/dappsys.sol](../../chain/contracts/dappsys.sol).

<br />

<hr />

```javascript
/// math.sol -- mixin for inline numerical wizardry




// BK NOTE - Solidity versions vary from contract to contract in this file
// BK Ok
pragma solidity ^0.4.13;

// BK Ok
contract DSMath {
    // BK Ok - Pure function
    function add(uint x, uint y) internal pure returns (uint z) {
        // BK Ok
        require((z = x + y) >= x);
    }
    // BK Ok - Pure function
    function sub(uint x, uint y) internal pure returns (uint z) {
        // BK Ok
        require((z = x - y) <= x);
    }
    // BK Ok - Pure function
    function mul(uint x, uint y) internal pure returns (uint z) {
        // BK Ok
        require(y == 0 || (z = x * y) / y == x);
    }

    // BK Ok - Pure function
    function min(uint x, uint y) internal pure returns (uint z) {
        // BK Ok
        return x <= y ? x : y;
    }
    // BK Ok - Pure function
    function max(uint x, uint y) internal pure returns (uint z) {
        // BK Ok
        return x >= y ? x : y;
    }
    // BK Ok - Pure function
    function imin(int x, int y) internal pure returns (int z) {
        // BK Ok
        return x <= y ? x : y;
    }
    // BK Ok - Pure function
    function imax(int x, int y) internal pure returns (int z) {
        // BK Ok
        return x >= y ? x : y;
    }

    // BK Next 2 Ok - Both only used in this contract
    uint constant WAD = 10 ** 18;
    uint constant RAY = 10 ** 27;

    // BK Ok - Pure function, not used
    function wmul(uint x, uint y) internal pure returns (uint z) {
        // BK Ok
        z = add(mul(x, y), WAD / 2) / WAD;
    }
    // BK Ok - Pure function, not used other than in rpow(...) below
    function rmul(uint x, uint y) internal pure returns (uint z) {
        // BK Ok
        z = add(mul(x, y), RAY / 2) / RAY;
    }
    // BK Ok - Pure function, not used
    function wdiv(uint x, uint y) internal pure returns (uint z) {
        // BK Ok
        z = add(mul(x, WAD), y / 2) / y;
    }
    // BK Ok - Pure function, not used
    function rdiv(uint x, uint y) internal pure returns (uint z) {
        // BK Ok
        z = add(mul(x, RAY), y / 2) / y;
    }

    // BK NOTE - https://mpark.github.io/programming/2014/08/18/exponentiation-by-squaring/
    // BK NOTE - double exp(double x, int n) {
    // BK NOTE -   if (n < 0) return 1 / exp(x, -n);
    // BK NOTE -   double result = 1;
    // BK NOTE -   while (n > 0) {
    // BK NOTE -     if (n % 2 == 1) result *= x;
    // BK NOTE -     x *= x;
    // BK NOTE -     n /= 2;
    // BK NOTE -   }  // while
    // BK NOTE -   return result;
    // BK NOTE - }
    // BK Ok - Pure function, not used
    function rpow(uint x, uint n) internal pure returns (uint z) {
        // BK Ok
        z = n % 2 != 0 ? x : RAY;

        // BK Next block Ok
        for (n /= 2; n != 0; n /= 2) {
            x = rmul(x, x);

            if (n % 2 != 0) {
                z = rmul(z, x);
            }
        }
    }
}
/// erc20.sol -- API for the ERC20 token standard



// BK Ok
pragma solidity ^0.4.8;

// BK Ok
contract ERC20Events {
    // BK Ok
    event Approval(address indexed src, address indexed guy, uint wad);
    // BK Ok
    event Transfer(address indexed src, address indexed dst, uint wad);
}

// BK Ok
contract ERC20 is ERC20Events {
    // BK Ok
    function totalSupply() public view returns (uint);
    // BK Ok
    function balanceOf(address guy) public view returns (uint);
    // BK Ok
    function allowance(address src, address guy) public view returns (uint);

    // BK Ok
    function approve(address guy, uint wad) public returns (bool);
    // BK Ok
    function transfer(address dst, uint wad) public returns (bool);
    // BK Ok
    function transferFrom(
        address src, address dst, uint wad
    ) public returns (bool);
}



// BK Ok
pragma solidity ^0.4.23;

// BK Ok - Referenced by LimitController and LimitSetting
contract DSAuthority {
    // BK Ok - Interface
    function canCall(
        address src, address dst, bytes4 sig
    ) public view returns (bool);
}

// BK Ok
contract DSAuthEvents {
    // BK Next 2 Ok
    event LogSetAuthority (address indexed authority);
    event LogSetOwner     (address indexed owner);
}

// BK Ok
contract DSAuth is DSAuthEvents {
    // BK Ok
    DSAuthority  public  authority;
    // BK Ok
    address      public  owner;

    // BK Ok - Constructor
    constructor() public {
        // BK Ok
        owner = msg.sender;
        // BK Ok - Log event
        emit LogSetOwner(msg.sender);
    }

    // BK Ok - Only authorised account can set the owner
    function setOwner(address owner_)
        public
        auth
    {
        // BK Ok
        owner = owner_;
        // BK Ok - Log event
        emit LogSetOwner(owner);
    }

    // BK Ok - Only authorised account can set the authority
    function setAuthority(DSAuthority authority_)
        public
        auth
    {
        // BK Ok
        authority = authority_;
        // BK Ok - Log event
        emit LogSetAuthority(authority);
    }

    // BK Ok - Modifier
    modifier auth {
        // BK Ok
        require(isAuthorized(msg.sender, msg.sig));
        // BK Ok
        _;
    }

    // BK Ok - View function
    function isAuthorized(address src, bytes4 sig) internal view returns (bool) {
        // BK Ok - Contract authorised to call itself
        if (src == address(this)) {
            // BK Ok
            return true;
        // BK Ok - Owner authorised to call
        } else if (src == owner) {
            // BK Ok
            return true;
        // BK Ok - No authority set, not permissioned
        } else if (authority == DSAuthority(0)) {
            // BK Ok
            return false;
        // BK Ok
        } else {
            // BK Ok - Check with authority whether call is permissioned
            return authority.canCall(src, this, sig);
        }
    }
}
/// note.sol -- the `note' modifier, for logging calls as events




// BK Ok
pragma solidity ^0.4.23;

// BK Ok
contract DSNote {
    // BK Ok - Event
    event LogNote(
        bytes4   indexed  sig,
        address  indexed  guy,
        bytes32  indexed  foo,
        bytes32  indexed  bar,
        uint              wad,
        bytes             fax
    ) anonymous;

    // BK Ok - Modifier
    modifier note {
        // BK Next 2 Ok
        bytes32 foo;
        bytes32 bar;

        // BK Ok
        assembly {
            // BK Ok - Get first parameter
            foo := calldataload(4)
            // BK Ok - Get next parameter
            bar := calldataload(36)
        }

        // BK Ok - Log event
        emit LogNote(msg.sig, msg.sender, foo, bar, msg.value, msg.data);

        // BK Ok
        _;
    }
}
/// stop.sol -- mixin for enable/disable functionality





// BK Ok
pragma solidity ^0.4.23;


// BK Ok
contract DSStop is DSNote, DSAuth {

    // BK Ok
    bool public stopped;

    // BK Ok - Modifier
    modifier stoppable {
        // BK Ok
        require(!stopped);
        // BK Ok
        _;
    }
    // BK Ok - Only authorised account can execute
    function stop() public auth note {
        // BK Ok
        stopped = true;
    }
    // BK Ok - Only authorised account can execute
    function start() public auth note {
        // BK Ok
        stopped = false;
    }

}
// guard.sol -- simple whitelist implementation of DSAuthority





// BK Ok
pragma solidity ^0.4.23;


// BK Ok
contract DSGuardEvents {
    // BK Ok - Event
    event LogPermit(
        bytes32 indexed src,
        bytes32 indexed dst,
        bytes32 indexed sig
    );

    // BK Ok - Event
    event LogForbid(
        bytes32 indexed src,
        bytes32 indexed dst,
        bytes32 indexed sig
    );
}

// BK Ok
contract DSGuard is DSAuth, DSAuthority, DSGuardEvents {
    // BK Ok
    bytes32 constant public ANY = bytes32(uint(-1));

    // BK Ok
    mapping (bytes32 => mapping (bytes32 => mapping (bytes32 => bool))) acl;

    // BK Ok - View function
    function canCall(
        address src_, address dst_, bytes4 sig
    ) public view returns (bool) {
        // BK Next 2 Ok
        bytes32 src = bytes32(src_);
        bytes32 dst = bytes32(dst_);

        // BK Ok
        return acl[src][dst][sig]
            || acl[src][dst][ANY]
            || acl[src][ANY][sig]
            || acl[src][ANY][ANY]
            || acl[ANY][dst][sig]
            || acl[ANY][dst][ANY]
            || acl[ANY][ANY][sig]
            || acl[ANY][ANY][ANY];
    }

    // BK Ok - Only authorised account can execute
    function permit(bytes32 src, bytes32 dst, bytes32 sig) public auth {
        // BK Ok
        acl[src][dst][sig] = true;
        // BK Ok - Log event
        emit LogPermit(src, dst, sig);
    }

    // BK Ok - Only authorised account can execute
    function forbid(bytes32 src, bytes32 dst, bytes32 sig) public auth {
        // BK Ok
        acl[src][dst][sig] = false;
        // BK Ok - Log event
        emit LogForbid(src, dst, sig);
    }

    // BK Ok - Only authorised account can execute
    function permit(address src, address dst, bytes32 sig) public {
        // BK Ok
        permit(bytes32(src), bytes32(dst), sig);
    }
    // BK Ok - Only authorised account can execute
    function forbid(address src, address dst, bytes32 sig) public {
        // BK Ok
        forbid(bytes32(src), bytes32(dst), sig);
    }

}

// BK Ok
contract DSGuardFactory {
    // BK Ok
    mapping (address => bool)  public  isGuard;

    // BK Ok - Anyone account can execute this function
    function newGuard() public returns (DSGuard guard) {
        // BK Ok
        guard = new DSGuard();
        // BK Ok
        guard.setOwner(msg.sender);
        // BK Ok
        isGuard[guard] = true;
    }
}
// roles.sol - roled based authentication





pragma solidity ^0.4.13;


contract DSRoles is DSAuth, DSAuthority
{
    mapping(address=>bool) _root_users;
    mapping(address=>bytes32) _user_roles;
    mapping(address=>mapping(bytes4=>bytes32)) _capability_roles;
    mapping(address=>mapping(bytes4=>bool)) _public_capabilities;

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
    }

    function setPublicCapability(address code, bytes4 sig, bool enabled)
        public
        auth
    {
        _public_capabilities[code][sig] = enabled;
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

    }

}
/// base.sol -- basic ERC20 implementation





pragma solidity ^0.4.23;


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





pragma solidity ^0.4.23;



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
// multivault.sol -- vault for holding different kinds of ERC20 tokens





pragma solidity ^0.4.13;


// BK Ok - Not used in OAX contracts
contract DSMultiVault is DSAuth {
    function push(ERC20 token, address dst, uint wad) public auth {
        require(token.transfer(dst, wad));
    }
    function pull(ERC20 token, address src, uint wad) public auth {
        require(token.transferFrom(src, this, wad));
    }

    function push(ERC20 token, address dst) public {
        push(token, dst, token.balanceOf(this));
    }
    function pull(ERC20 token, address src) public {
        pull(token, src, token.balanceOf(src));
    }

    function mint(DSToken token, uint wad) public auth {
        token.mint(wad);
    }
    function burn(DSToken token, uint wad) public auth {
        token.burn(wad);
    }
    function mint(DSToken token, address guy, uint wad) public auth {
        token.mint(guy, wad);
    }
    function burn(DSToken token, address guy, uint wad) public auth {
        token.burn(guy, wad);
    }

    function burn(DSToken token) public auth {
        token.burn(token.balanceOf(this));
    }
}
// vault.sol -- vault for holding a single kind of ERC20 tokens





pragma solidity ^0.4.23;


// BK Ok - Not used in OAX contracts
contract DSVault is DSMultiVault {
    ERC20  public  token;

    function swap(ERC20 token_) public auth {
        token = token_;
    }

    function push(address dst, uint wad) public {
        push(token, dst, wad);
    }
    function pull(address src, uint wad) public {
        pull(token, src, wad);
    }

    function push(address dst) public {
        push(token, dst);
    }
    function pull(address src) public {
        pull(token, src);
    }

    function mint(uint wad) public {
        super.mint(DSToken(token), wad);
    }
    function burn(uint wad) public {
        super.burn(DSToken(token), wad);
    }

    function burn() public {
        burn(DSToken(token));
    }
}
// exec.sol - base contract used by anything that wants to do "untyped" calls





pragma solidity ^0.4.23;

// BK Ok - Not used in OAX contracts
contract DSExec {
    function tryExec( address target, bytes calldata, uint value)
             internal
             returns (bool call_ret)
    {
        return target.call.value(value)(calldata);
    }
    function exec( address target, bytes calldata, uint value)
             internal
    {
        if(!tryExec(target, calldata, value)) {
            revert();
        }
    }

    function exec( address t, bytes c )
        internal
    {
        exec(t, c, 0);
    }
    function exec( address t, uint256 v )
        internal
    {
        bytes memory c; exec(t, c, v);
    }
    function tryExec( address t, bytes c )
        internal
        returns (bool)
    {
        return tryExec(t, c, 0);
    }
    function tryExec( address t, uint256 v )
        internal
        returns (bool)
    {
        bytes memory c; return tryExec(t, c, v);
    }
}
// thing.sol - `auth` with handy mixins. your things should be DSThings





// BK Ok
pragma solidity ^0.4.13;


// BK Ok - Not used in OAX contracts
contract DSThing is DSAuth, DSNote, DSMath {

    // BK Ok - Pure function
    function S(string s) internal pure returns (bytes4) {
        // BK Ok
        return bytes4(keccak256(s));
    }

}

```
