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


contract AddressStatus is DSAuth {
    mapping(address => bool) public status;

    event LogSetAddressStatus(address indexed guy, bool status);

    constructor(DSAuthority authority) public  {
        require(
            address(authority) != address(0),
            "Authority is mandatory"
        );

        setAuthority(authority);
        setOwner(0x0);
    }

    function set(address guy, bool newStatus) public auth {
        status[guy] = newStatus;
        emit LogSetAddressStatus(guy, newStatus);
    }
}

interface MembershipInterface {
    function isMember(address guy) external view returns (bool);
}

contract MockOAXMembership is AddressStatus, MembershipInterface {
    constructor(DSAuthority authority) AddressStatus(authority) public {
    }

    function isMember(address guy) public view returns (bool) {
        return !status[guy];
    }
}
