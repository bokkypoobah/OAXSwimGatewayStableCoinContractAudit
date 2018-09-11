pragma solidity 0.4.23;

import "dappsys.sol";
import "TokenAuth.sol";
import "AddressStatus.sol";
import "Membership.sol";

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
    public returns (bool)
    {
        return !blacklist.status(guy);
    }

    function canTransferFrom(address /*src*/, address /*dst*/, address from, address to, uint /*wad*/)
    public returns (bool)
    {
        return !blacklist.status(from) && !blacklist.status(to);
    }

    function canTransfer(address src, address dst, address to, uint wad)
    public returns (bool)
    {
        return canTransferFrom(src, dst, src, to, wad);
    }

    /* TokenAuthority */
    function canMint(address /*src*/, address /*dst*/, address guy, uint /*wad*/) public returns (bool)
    {
        return !blacklist.status(guy);
    }

    function canBurn(address src, address dst, address guy, uint wad) public returns (bool)
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
    function canMint(address src, address dst, address guy, uint wad) public returns (bool)
    {
        return super.canMint(src, dst, guy, wad) && kyc.status(guy) && membership.isMember(guy);
    }

    function canBurn(address src, address dst, address guy, uint wad) public returns (bool)
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
    public returns (bool)
    {
        return super.canTransferFrom(src, dst, from, to, wad) && kyc.status(from) && kyc.status(to);
    }

    function canTransfer(address src, address dst, address to, uint wad)
    public returns (bool)
    {
        return super.canTransfer(src, dst, to, wad) && canTransferFrom(src, dst, src, to, wad);
    }
}
