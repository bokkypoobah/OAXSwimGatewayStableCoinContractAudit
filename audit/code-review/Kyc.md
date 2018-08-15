# Kyc

Source file [../../chain/contracts/Kyc.sol](../../chain/contracts/Kyc.sol).

<br />

<hr />

```javascript
// BK Ok
pragma solidity 0.4.23;

// BK Ok
import "dappsys.sol";

// DSAuth
// BK Ok
import "TokenAuth.sol";

// ERC20Authority, TokenAuthority

// BK NOTE - addressControlStatus.address=AddressControlStatus:0xdbf468de0962819bd951bf829d821a8ba436907a
// BK NOTE - addressControlStatus.authority=GateRoles:0xbfffb78bbb3a27d78857021d162b64c577626b62
// BK NOTE - addressControlStatus.owner=0x0000000000000000000000000000000000000000
// BK Ok
contract AddressControlStatus is DSAuth {
    // frozen - customer violated terms of use

    // BK Ok
    mapping(address => bool) public frozenAddress;

    // BK Next 2 Ok - Events
    event FreezeAddress(address indexed guy);
    event UnfreezeAddress(address indexed guy);

    // BK Ok - Constructor
    constructor(DSAuthority _authority) public {
        // BK Ok
        require(
            address(_authority) != address(0),
            "Can not authorize address 0x0"
        );

        // BK Next 2 Ok
        setAuthority(_authority);
        setOwner(0x0);
    }

    // BK NOTE - gateRoles.RoleCapability code AddressControlStatus:0xdbf468de0962819bd951bf829d821a8ba436907a capabilityRoles 0x0000000000000000000000000000000000000000000000000000000000000008 for freezeAddress(address) role MONEY_OPERATOR:3 true #7000 0xe62dd3c30cc67b9a37bb8270deec25fbe4b21923c65b7548f280f554b2f98230
    // BK Ok - Only MONEY_OPERATOR can execute
    function freezeAddress(address address_) public auth {
        // BK Ok
        frozenAddress[address_] = true;
        // BK Ok - Log event
        emit FreezeAddress(address_);
    }

    // BK NOTE - gateRoles.RoleCapability code AddressControlStatus:0xdbf468de0962819bd951bf829d821a8ba436907a capabilityRoles 0x0000000000000000000000000000000000000000000000000000000000000008 for unfreezeAddress(address) role MONEY_OPERATOR:3 true #7000 0x139fb624d5ce8d2f57e94f6afeb7c4e1bc34e871b7c5df59f4ea1f8bb3b74d04
    // BK Ok - Only MONEY_OPERATOR can execute
    function unfreezeAddress(address address_) public auth {
        // BK Ok
        frozenAddress[address_] = false;
        // BK Ok - Log event
        emit UnfreezeAddress(address_);
    }

}


// BK NOTE - kycAmlStatus.address=KycAmlStatus:0x491ef36b192b3fcd85b7b6a6cf9b94384b0360a6
// BK NOTE - kycAmlStatus.authority=GateRoles:0xbfffb78bbb3a27d78857021d162b64c577626b62
// BK NOTE - kycAmlStatus.owner=0x0000000000000000000000000000000000000000
// BK Ok
contract KycAmlStatus is DSAuth {
    // BK Ok
    mapping(address => bool) public kycVerified;

    // BK Ok - Event
    event KYCVerify(address indexed guy, bool isKycVerified);

    // BK Ok - Constructor
    constructor(DSAuthority _authority) public {
        // BK Ok
        require(
            address(_authority) != address(0),
            "Can not authorize address 0x0"
        );

        // BK Next 2 Ok
        setAuthority(_authority);
        setOwner(0x0);
    }

    // BK Ok - View function
    function isKycVerified(address guy) public view returns (bool) {
        // BK Ok
        return kycVerified[guy];
    }

    // BK NOTE - gateRoles.RoleCapability code KycAmlStatus:0x491ef36b192b3fcd85b7b6a6cf9b94384b0360a6 capabilityRoles 0x0000000000000000000000000000000000000000000000000000000000000004 for setKycVerified(address,bool) role KYC_OPERATOR:2 true #7000 0xa91a80fd31c307055554ad21606e48f1bbe8a998955748f429bc2822c384b8b3
    // BK Ok - Only KYC_OPERATOR can execute
    function setKycVerified(address guy, bool _isKycVerified) public auth {
        // BK Ok
        kycVerified[guy] = _isKycVerified;
        // BK Ok - Log event
        emit KYCVerify(guy, _isKycVerified);
    }
}


// BK Ok
contract ControllableKycAmlRule is ERC20Authority, TokenAuthority {
    // BK NOTE - Consider making the following public for traceability
    // BK Ok
    AddressControlStatus addressControlStatus;

    // BK Ok - Constructor
    constructor(AddressControlStatus addressControlStatus_) public {
        // BK Ok
        require(
            address(addressControlStatus_) != address(0),
            "AddressControlStatus is mandatory"
        );

        // BK Ok
        addressControlStatus = addressControlStatus_;

    }

    // BK Ok
    function canApprove(address /*src*/, address /*dst*/, address guy, uint /*wad*/) public returns (bool) {
        // BK Ok
        return (!addressControlStatus.frozenAddress(guy));

    }

    // BK Ok
    function canTransferFrom(address /*src*/, address /*dst*/, address from, address to, uint /*wad*/)
    public returns (bool) {
        // BK Ok
        return (!addressControlStatus.frozenAddress(from)) && (!addressControlStatus.frozenAddress(to));

    }

    // BK Ok
    function canTransfer(address src, address dst, address to, uint wad) public returns (bool) {
        // BK Ok
        return canTransferFrom(src, dst, src, to, wad);

    }

    // BK Ok
    function canMint(address /*src*/, address /*dst*/, address guy, uint /*wad*/) public returns (bool) {
        // BK Ok
        return (!addressControlStatus.frozenAddress(guy));

    }

    // BK Ok
    function canBurn(address /*src*/, address /*dst*/, address guy, uint /*wad*/) public returns (bool) {
        // BK Ok
        return (!addressControlStatus.frozenAddress(guy));

    }
}


// BK NOTE - The functions below have `& true` that is redundant
// BK Ok
contract NoKycAmlRule is ControllableKycAmlRule {

    // BK Ok - Constructor
    constructor(AddressControlStatus addressControlStatus_) ControllableKycAmlRule(addressControlStatus_)
    public {
    }

    // BK Ok
    function canApprove(address src, address dst, address guy, uint wad) public returns (bool) {
        // BK Ok
        return super.canApprove(src, dst, guy, wad) && true;
    }

    // BK Ok
    function canTransferFrom(address src, address dst, address from, address to, uint wad) public returns (bool) {
        // BK Ok
        return super.canTransferFrom(src, dst, from, to, wad) && true;
    }

    // BK Ok
    function canTransfer(address src, address dst, address to, uint wad) public returns (bool) {
        // BK Ok
        return super.canTransfer(src, dst, to, wad) && true;
    }

    // BK Ok
    function canMint(address src, address dst, address guy, uint wad) public returns (bool) {
        // BK Ok
        return super.canMint(src, dst, guy, wad) && true;
    }

    // BK Ok
    function canBurn(address src, address dst, address guy, uint wad) public returns (bool) {
        // BK Ok
        return super.canBurn(src, dst, guy, wad) && true;
    }
}


// BK Ok
contract BoundaryKycAmlRule is NoKycAmlRule {

    // BK NOTE - Consider making the following public for traceability
    // BK Ok
    KycAmlStatus kycAmlStatus;

    // BK Ok - Constructor
    constructor(
        AddressControlStatus addressControlStatus_,
        KycAmlStatus kycAmlStatus_
    )
    NoKycAmlRule(addressControlStatus_)
    public {
        // BK Ok
        require(
            address(kycAmlStatus_) != address(0),
            "AddressControlStatus is mandatory"
        );

        // BK Ok
        kycAmlStatus = kycAmlStatus_;
    }

    // BK Ok
    function canMint(address src, address dst, address guy, uint wad) public returns (bool) {
        // BK Ok
        return super.canMint(src, dst, guy, wad) && kycAmlStatus.isKycVerified(guy);
    }

    // BK Ok
    function canBurn(address src, address dst, address guy, uint wad) public returns (bool) {
        // BK Ok
        return super.canBurn(src, dst, guy, wad) && kycAmlStatus.isKycVerified(guy);
    }
}


// BK Ok
contract FullKycAmlRule is BoundaryKycAmlRule {

    // BK Ok - Constructor
    constructor(
        AddressControlStatus addressControlStatus_,
        KycAmlStatus kycAmlStatus_
    )
    BoundaryKycAmlRule(addressControlStatus_, kycAmlStatus_) public {}

    // BK Ok
    function canTransferFrom(address src, address dst, address from, address to, uint wad) public returns (bool) {
        // BK Ok
        return super.canTransferFrom(src, dst, from, to, wad) && kycAmlStatus.isKycVerified(from) && kycAmlStatus.isKycVerified(to);
    }

    // BK Ok
    function canTransfer(address src, address dst, address to, uint wad) public returns (bool) {
        // BK Ok
        return super.canTransfer(src, dst, to, wad) && canTransferFrom(src, dst, src, to, wad);
    }

}


// BK Ok
contract MembershipAuthorityInterface {
    // BK Ok
    function isMember(address sender) public view returns (bool);
}


// BK Ok
contract MembershipWithNoKycAmlRule is DSAuth, NoKycAmlRule {

    // BK NOTE - Consider making the following public for traceability
    // BK Ok
    MembershipAuthorityInterface membershipAuthority;

    // BK Ok - Constructor
    constructor(
        DSAuthority _authority,
        AddressControlStatus addressControlStatus_,
        address membershipAuthority_
    )
    NoKycAmlRule(addressControlStatus_)
    public {
        // BK Ok
        require(
            address(_authority) != address(0),
            "DSAuthority is mandatory"
        );
        // BK Ok
        setMembershipAuthority(membershipAuthority_);
        // BK Next 2 Ok
        setAuthority(_authority);
        setOwner(0x0);
    }

    // BK NOTE - For similar contracts - gateRoles.RoleCapability code MembershipWithBoundaryKycAmlRule:0x55b719a0e96274ffbeba102686c24c6fda2370d1 capabilityRoles 0x0000000000000000000000000000000000000000000000000000000000000002 for setMembershipAuthority(address) role SYSTEM_ADMIN:1 true #7000 0xdbf8b29460a963053129655bb8a554c08923655130a84db9db822459eee0c670
    // BK Ok - Only SYSTEM_ADMIN can execute
    function setMembershipAuthority(address membershipAuthority_) public auth {
        // BK Ok
        require(
            address(membershipAuthority_) != address(0),
            "MembershipAuthority is mandatory"
        );
        // BK NOTE - Consider logging the change
        // BK Ok
        membershipAuthority = MembershipAuthorityInterface(membershipAuthority_);
    }

    // BK Ok
    function canMint(address src, address dst, address guy, uint wad) public returns (bool) {
        // BK Ok
        return super.canMint(src, dst, guy, wad) && membershipAuthority.isMember(guy);
    }

    // BK Ok
    function canBurn(address src, address dst, address guy, uint wad) public returns (bool) {
        // BK Ok
        return super.canBurn(src, dst, guy, wad) && membershipAuthority.isMember(guy);
    }
}


// BK Ok
contract MembershipWithBoundaryKycAmlRule is DSAuth, BoundaryKycAmlRule {

    // BK NOTE - Consider making the following public for traceability
    // BK Ok
    MembershipAuthorityInterface membershipAuthority;

    // BK Ok - Constructor
    constructor(
        DSAuthority _authority,
        AddressControlStatus addressControlStatus_,
        KycAmlStatus kycAmlStatus_, address membershipAuthority_
    )
    BoundaryKycAmlRule(addressControlStatus_, kycAmlStatus_)
    public {
        // BK Ok
        require(
            address(_authority) != address(0),
            "DSAuthority is mandatory"
        );

        // BK Ok
        setMembershipAuthority(membershipAuthority_);
        // BK Next 2 Ok
        setAuthority(_authority);
        setOwner(0x0);
    }

    // BK NOTE - For similar contracts - gateRoles.RoleCapability code MembershipWithBoundaryKycAmlRule:0x55b719a0e96274ffbeba102686c24c6fda2370d1 capabilityRoles 0x0000000000000000000000000000000000000000000000000000000000000002 for setMembershipAuthority(address) role SYSTEM_ADMIN:1 true #7000 0xdbf8b29460a963053129655bb8a554c08923655130a84db9db822459eee0c670
    function setMembershipAuthority(address membershipAuthority_) public auth {
        // BK Ok
        require(
            address(membershipAuthority_) != address(0),
            "MembershipAuthority is mandatory"
        );
        // BK NOTE - Consider logging the change
        // BK Ok
        membershipAuthority = MembershipAuthorityInterface(membershipAuthority_);
    }

    // BK Ok
    function canMint(address src, address dst, address guy, uint wad) public returns (bool) {
        // BK Ok
        return super.canMint(src, dst, guy, wad) && membershipAuthority.isMember(guy);
    }

    // BK Ok
    function canBurn(address src, address dst, address guy, uint wad) public returns (bool) {
        // BK Ok
        return super.canBurn(src, dst, guy, wad) && membershipAuthority.isMember(guy);
    }
}

// BK Ok
contract MembershipWithFullKycAmlRule is DSAuth, FullKycAmlRule {

    // BK NOTE - Consider making the following public for traceability
    // BK Ok
    MembershipAuthorityInterface membershipAuthority;

    // BK Ok - Constructor
    constructor(
        DSAuthority _authority,
        AddressControlStatus addressControlStatus_,
        KycAmlStatus kycAmlStatus_, address membershipAuthority_
    )
    FullKycAmlRule(addressControlStatus_, kycAmlStatus_)
    public {
        // BK Ok
        require(
            address(_authority) != address(0),
            "DSAuthority is mandatory"
        );
        // BK Ok
        setMembershipAuthority(membershipAuthority_);
        // BK Next 2 Ok
        setAuthority(_authority);
        setOwner(0x0);
    }

    // BK NOTE - For similar contracts - gateRoles.RoleCapability code MembershipWithBoundaryKycAmlRule:0x55b719a0e96274ffbeba102686c24c6fda2370d1 capabilityRoles 0x0000000000000000000000000000000000000000000000000000000000000002 for setMembershipAuthority(address) role SYSTEM_ADMIN:1 true #7000 0xdbf8b29460a963053129655bb8a554c08923655130a84db9db822459eee0c670
    function setMembershipAuthority(address membershipAuthority_) public auth {
        require(
            address(membershipAuthority_) != address(0),
            "MembershipAuthority is mandatory"
        );
        // BK NOTE - Consider logging the change
        // BK Ok
        membershipAuthority = MembershipAuthorityInterface(membershipAuthority_);
    }

    // BK Ok
    function canMint(address src, address dst, address guy, uint wad) public returns (bool) {
        // BK Ok
        return super.canMint(src, dst, guy, wad) && membershipAuthority.isMember(guy);
    }

    // BK Ok
    function canBurn(address src, address dst, address guy, uint wad) public returns (bool) {
        // BK Ok
        return super.canBurn(src, dst, guy, wad) && membershipAuthority.isMember(guy);
    }
}

```
