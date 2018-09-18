# TokenRules

Source file [../../chain/contracts/TokenRules.sol](../../chain/contracts/TokenRules.sol).

<br />

<hr />

```solidity
// BK Ok
pragma solidity 0.4.23;

// BK NOTE - Membership.sol contains MockOAXMembership that is used for testing
// BK Next 4 Ok
import "dappsys.sol";
import "TokenAuth.sol";
import "AddressStatus.sol";
import "Membership.sol";

// BK NOTE - Consider setting canApprove(...), canTransferFrom(...), canTransfer(...), canMint(...) and canBurn(...) as view functions

// BK Ok
contract BaseRule is ERC20Authority, TokenAuthority {
    // BK Ok
    AddressStatus public blacklist;

    // BK Ok - Constructor
    constructor(
        AddressStatus _blacklist
    ) public {
        // BK Ok
        require(_blacklist != address(0), "Blacklist contract is mandatory");
     // BK Ok
        blacklist = _blacklist;
    }

    /* ERC20Authority */
    // BK Ok
    function canApprove(address /*src*/, address /*dst*/, address guy, uint /*wad*/)
    public returns (bool)
    {
        // BK Ok
        return !blacklist.status(guy);
    }

    // BK NOTE - Can be made into a view function
    // BK Ok
    function canTransferFrom(address /*src*/, address /*dst*/, address from, address to, uint /*wad*/)
    public returns (bool)
    {
        // BK Ok
        return !blacklist.status(from) && !blacklist.status(to);
    }

    // BK Ok
    function canTransfer(address src, address dst, address to, uint wad)
    public returns (bool)
    {
        // BK Ok
        return canTransferFrom(src, dst, src, to, wad);
    }

    /* TokenAuthority */
    // BK Ok
    function canMint(address /*src*/, address /*dst*/, address guy, uint /*wad*/) public returns (bool)
    {
        // BK Ok
        return !blacklist.status(guy);
    }

    // BK Ok
    function canBurn(address src, address dst, address guy, uint wad) public returns (bool)
    {
        // BK Ok
        return canMint(src, dst, guy, wad);
    }

}

// BK Ok
contract BoundaryKycRule is BaseRule {

    // BK Ok
    AddressStatus public kyc;
    // BK Ok
    MembershipInterface public membership;

    // BK Ok - Constructor
    constructor(
        AddressStatus _blacklist,
        AddressStatus _kyc,
        MembershipInterface _membership
    )
    public
    BaseRule(_blacklist)
    {
        // BK Ok
        require(_kyc != address(0), "KYC contract is mandatory");
        // BK Ok
        require(_membership != address(0), "Membership contract is mandatory");
        // BK Ok
        kyc = _kyc;
        // BK Ok
        membership = _membership;
    }

    /* TokenAuthority */
    // BK Ok
    function canMint(address src, address dst, address guy, uint wad) public returns (bool)
    {
        // BK Ok
        return super.canMint(src, dst, guy, wad) && kyc.status(guy) && membership.isMember(guy);
    }

    // BK Ok
    function canBurn(address src, address dst, address guy, uint wad) public returns (bool)
    {
        // BK Ok
        return super.canBurn(src, dst, guy, wad) && kyc.status(guy) && membership.isMember(guy);
    }

}

// BK Ok
contract FullKycRule is BoundaryKycRule {

    // BK Ok - Constructor
    constructor(
        AddressStatus _blacklist,
        AddressStatus _kyc,
        MembershipInterface _membership
    )
    BoundaryKycRule(_blacklist, _kyc, _membership)
    public
    {
        // BK NOTE The following 2 checks are already done in BoundaryKycRule
        // BK Ok
        require(_kyc != address(0), "KYC contract is mandatory");
        require(_membership != address(0), "Membership contract is mandatory");
        // BK Ok
        kyc = _kyc;
        // BK Ok
        membership = _membership;
    }

    /* ERC20Authority */
    // BK Ok
    function canTransferFrom(address src, address dst, address from, address to, uint wad)
    public returns (bool)
    {
        // BK Ok
        return super.canTransferFrom(src, dst, from, to, wad) && kyc.status(from) && kyc.status(to);
    }

    // BK Ok
    function canTransfer(address src, address dst, address to, uint wad)
    public returns (bool)
    {
        // BK Ok
        return super.canTransfer(src, dst, to, wad) && canTransferFrom(src, dst, src, to, wad);
    }
}

```
