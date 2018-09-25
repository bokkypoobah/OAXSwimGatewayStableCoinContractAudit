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


contract TransferFeeControllerInterface {
    function calculateTransferFee(address from, address to, uint wad) public view returns (uint);
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
