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

contract BaseRule is ERC20Authority, TokenAuthority {
    AddressStatus public blacklist;

    constructor(
        AddressStatus _blacklist
    ) public {
        require(_blacklist != address(0), "Blacklist contract is mandatory");
        blacklist = _blacklist;
    }

    /* ERC20Authority */
    function canApprove(address /*src*/, address /*dst*/, address guy, uint /*wad*/)
    public view returns (bool)
    {
        return !blacklist.status(guy);
    }

    function canTransferFrom(address /*src*/, address /*dst*/, address from, address to, uint /*wad*/)
    public view returns (bool)
    {
        return !blacklist.status(from) && !blacklist.status(to);
    }

    function canTransfer(address src, address dst, address to, uint wad)
    public view returns (bool)
    {
        return canTransferFrom(src, dst, src, to, wad);
    }

    /* TokenAuthority */
    function canMint(address /*src*/, address /*dst*/, address guy, uint /*wad*/) public view returns (bool)
    {
        return !blacklist.status(guy);
    }

    function canBurn(address src, address dst, address guy, uint wad) public view returns (bool)
    {
        return canMint(src, dst, guy, wad);
    }

}

contract BoundaryKycRule is BaseRule {

    AddressStatus public kyc;
    MembershipInterface public membership;

    constructor(
        AddressStatus _blacklist,
        AddressStatus _kyc,
        MembershipInterface _membership
    )
    public
    BaseRule(_blacklist)
    {
        require(_kyc != address(0), "KYC contract is mandatory");
        require(_membership != address(0), "Membership contract is mandatory");
        kyc = _kyc;
        membership = _membership;
    }

    /* TokenAuthority */
    function canMint(address src, address dst, address guy, uint wad) public view returns (bool)
    {
        return super.canMint(src, dst, guy, wad) && kyc.status(guy) && membership.isMember(guy);
    }

    function canBurn(address src, address dst, address guy, uint wad) public view returns (bool)
    {
        return super.canBurn(src, dst, guy, wad) && kyc.status(guy) && membership.isMember(guy);
    }

}

contract FullKycRule is BoundaryKycRule {

    constructor(
        AddressStatus _blacklist,
        AddressStatus _kyc,
        MembershipInterface _membership
    )
    BoundaryKycRule(_blacklist, _kyc, _membership)
    public
    {
        require(_kyc != address(0), "KYC contract is mandatory");
        require(_membership != address(0), "Membership contract is mandatory");
        kyc = _kyc;
        membership = _membership;
    }

    /* ERC20Authority */
    function canTransferFrom(address src, address dst, address from, address to, uint wad)
    public view returns (bool)
    {
        return super.canTransferFrom(src, dst, from, to, wad) && kyc.status(from) && kyc.status(to);
    }

    function canTransfer(address src, address dst, address to, uint wad)
    public view returns (bool)
    {
        return super.canTransfer(src, dst, to, wad) && canTransferFrom(src, dst, src, to, wad);
    }
}
