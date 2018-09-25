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
