pragma solidity 0.4.23;

import "dappsys.sol";
import "TokenAuth.sol";
import "AddressStatus.sol";
import "Membership.sol";

// FIXME This is just a draft; needs to be fully implemented with tests

contract BaseRules is ERC20Authority, TokenAuthority {
    AddressStatus public blacklist;
    AddressStatus public whitelist;
    MembershipInterface public membership;

    constructor(
        AddressStatus _blacklist,
        AddressStatus _whitelist,
        MembershipInterface _membership
    ) {
        require(_blacklist != address(0), "Blacklist contract is mandatory");
        blacklist = _blacklist;

        require(_whitelist != address(0), "Whitelist contract is mandatory");
        whitelist = _whitelist;

        require(_membership != address(0), "Membership contract is mandatory");
        membership = _membership;
    }

    /* ERC20Authority */
    function canApprove(address src, address dst, address guy, uint wad)
    public returns (bool)
    {
        return true;
    }

    function canTransfer(address src, address dst, address to, uint wad)
    public returns (bool)
    {
        return true;
    }

    function canTransferFrom(address src, address dst, address from, address to, uint wad)
    public returns (bool)
    {
        return true;
    }

    /* TokenAuthority */
    function canMint(address src, address dst, address guy, uint wad) public returns (bool)
    {
        return (membership.isMember(guy) || whitelist.status(guy)) && !blacklist.status(guy);
    }

    function canBurn(address src, address dst, address guy, uint wad) public returns (bool)
    {
        return canMint(src, dst, guy, wad);
    }
}

contract BoundaryKycRules is BaseRules {
    constructor(
        AddressStatus _blacklist,
        AddressStatus _whitelist,
        MembershipInterface _membership,
        AddressStatus _kyc
    )
    BaseRules(_blacklist, _whitelist, _membership)
    {
        require(_kyc != address(0), "KYC database is mandatory");
        kyc = _kyc;
    }

    /* TokenAuthority */
    function canMint(address src, address dst, address guy, uint wad) public returns (bool)
    {
        return super.canMint(src, dst, guy, wad) && kyc.status(guy);
    }

}

contract FullKycRules is BoundaryKycRules {
    /* ERC20Authority */
    function canApprove(address src, address dst, address guy, uint wad)
    public returns (bool)
    {
        return true;
    }

    function canTransfer(address src, address dst, address to, uint wad)
    public returns (bool)
    {
        return true;
    }

    function canTransferFrom(address src, address dst, address from, address to, uint wad)
    public returns (bool)
    {
        return true;
    }
}
