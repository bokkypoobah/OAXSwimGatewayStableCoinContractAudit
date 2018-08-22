pragma solidity 0.4.23;

import "dappsys.sol";

// DSAuth
import "TokenAuth.sol";

// ERC20Authority, TokenAuthority

contract AddressControlStatus is DSAuth {
    // frozen - customer violated terms of use

    mapping(address => bool) public frozenAddress;

    event FreezeAddress(address indexed guy);
    event UnfreezeAddress(address indexed guy);

    constructor(DSAuthority _authority) public {
        require(
            address(_authority) != address(0),
            "Can not authorize address 0x0"
        );

        setAuthority(_authority);
        setOwner(0x0);
    }

    function freezeAddress(address address_) public auth {
        frozenAddress[address_] = true;
        emit FreezeAddress(address_);
    }

    function unfreezeAddress(address address_) public auth {
        frozenAddress[address_] = false;
        emit UnfreezeAddress(address_);
    }

}


contract KycAmlStatus is DSAuth {
    mapping(address => bool) public kycVerified;

    event KYCVerify(address indexed guy, bool isKycVerified);

    constructor(DSAuthority _authority) public {
        require(
            address(_authority) != address(0),
            "Can not authorize address 0x0"
        );

        setAuthority(_authority);
        setOwner(0x0);
    }

    function isKycVerified(address guy) public view returns (bool) {
        return kycVerified[guy];
    }

    function setKycVerified(address guy, bool _isKycVerified) public auth {
        kycVerified[guy] = _isKycVerified;
        emit KYCVerify(guy, _isKycVerified);
    }
}


contract ControllableKycAmlRule is ERC20Authority, TokenAuthority {
    AddressControlStatus public addressControlStatus;

    constructor(AddressControlStatus addressControlStatus_) public {
        require(
            address(addressControlStatus_) != address(0),
            "AddressControlStatus is mandatory"
        );

        addressControlStatus = addressControlStatus_;

    }

    function canApprove(address /*src*/, address /*dst*/, address guy, uint /*wad*/) public returns (bool) {
        return (!addressControlStatus.frozenAddress(guy));

    }

    function canTransferFrom(address /*src*/, address /*dst*/, address from, address to, uint /*wad*/)
    public returns (bool) {
        return (!addressControlStatus.frozenAddress(from)) && (!addressControlStatus.frozenAddress(to));

    }

    function canTransfer(address src, address dst, address to, uint wad) public returns (bool) {
        return canTransferFrom(src, dst, src, to, wad);

    }

    function canMint(address /*src*/, address /*dst*/, address guy, uint /*wad*/) public returns (bool) {
        return (!addressControlStatus.frozenAddress(guy));

    }

    function canBurn(address /*src*/, address /*dst*/, address guy, uint /*wad*/) public returns (bool) {
        return (!addressControlStatus.frozenAddress(guy));

    }
}


contract NoKycAmlRule is ControllableKycAmlRule {

    constructor(AddressControlStatus addressControlStatus_) ControllableKycAmlRule(addressControlStatus_)
    public {
    }

    function canApprove(address src, address dst, address guy, uint wad) public returns (bool) {
        return super.canApprove(src, dst, guy, wad);
    }

    function canTransferFrom(address src, address dst, address from, address to, uint wad) public returns (bool) {
        return super.canTransferFrom(src, dst, from, to, wad);
    }

    function canTransfer(address src, address dst, address to, uint wad) public returns (bool) {
        return super.canTransfer(src, dst, to, wad);
    }

    function canMint(address src, address dst, address guy, uint wad) public returns (bool) {
        return super.canMint(src, dst, guy, wad);
    }

    function canBurn(address src, address dst, address guy, uint wad) public returns (bool) {
        return super.canBurn(src, dst, guy, wad);
    }
}


contract BoundaryKycAmlRule is NoKycAmlRule {

    KycAmlStatus public kycAmlStatus;

    constructor(
        AddressControlStatus addressControlStatus_,
        KycAmlStatus kycAmlStatus_
    )
    NoKycAmlRule(addressControlStatus_)
    public {
        require(
            address(kycAmlStatus_) != address(0),
            "AddressControlStatus is mandatory"
        );

        kycAmlStatus = kycAmlStatus_;
    }

    function canMint(address src, address dst, address guy, uint wad) public returns (bool) {
        return super.canMint(src, dst, guy, wad) && kycAmlStatus.isKycVerified(guy);
    }

    function canBurn(address src, address dst, address guy, uint wad) public returns (bool) {
        return super.canBurn(src, dst, guy, wad) && kycAmlStatus.isKycVerified(guy);
    }
}


contract FullKycAmlRule is BoundaryKycAmlRule {

    constructor(
        AddressControlStatus addressControlStatus_,
        KycAmlStatus kycAmlStatus_
    )
    BoundaryKycAmlRule(addressControlStatus_, kycAmlStatus_) public {}

    function canTransferFrom(address src, address dst, address from, address to, uint wad) public returns (bool) {
        return super.canTransferFrom(src, dst, from, to, wad) && kycAmlStatus.isKycVerified(from) && kycAmlStatus.isKycVerified(to);
    }

    function canTransfer(address src, address dst, address to, uint wad) public returns (bool) {
        return super.canTransfer(src, dst, to, wad) && canTransferFrom(src, dst, src, to, wad);
    }

}


contract MembershipAuthorityInterface {
    function isMember(address sender) public view returns (bool);
}


contract MembershipWithNoKycAmlRule is DSAuth, NoKycAmlRule {

    MembershipAuthorityInterface public membershipAuthority;
    event LogSetMembershipAuthority(MembershipAuthorityInterface membershipAuthority);

    constructor(
        DSAuthority _authority,
        AddressControlStatus addressControlStatus_,
        address membershipAuthority_
    )
    NoKycAmlRule(addressControlStatus_)
    public {
        require(
            address(_authority) != address(0),
            "DSAuthority is mandatory"
        );
        setMembershipAuthority(membershipAuthority_);
        setAuthority(_authority);
        setOwner(0x0);
    }

    function setMembershipAuthority(address membershipAuthority_) public auth {
        require(
            address(membershipAuthority_) != address(0),
            "MembershipAuthority is mandatory"
        );
        membershipAuthority = MembershipAuthorityInterface(membershipAuthority_);
        emit LogSetMembershipAuthority(membershipAuthority);
    }

    function canMint(address src, address dst, address guy, uint wad) public returns (bool) {
        return super.canMint(src, dst, guy, wad) && membershipAuthority.isMember(guy);
    }

    function canBurn(address src, address dst, address guy, uint wad) public returns (bool) {
        return super.canBurn(src, dst, guy, wad) && membershipAuthority.isMember(guy);
    }
}


contract MembershipWithBoundaryKycAmlRule is DSAuth, BoundaryKycAmlRule {

    MembershipAuthorityInterface public membershipAuthority;
    event LogSetMembershipAuthority(MembershipAuthorityInterface membershipAuthority);

    constructor(
        DSAuthority _authority,
        AddressControlStatus addressControlStatus_,
        KycAmlStatus kycAmlStatus_, address membershipAuthority_
    )
    BoundaryKycAmlRule(addressControlStatus_, kycAmlStatus_)
    public {
        require(
            address(_authority) != address(0),
            "DSAuthority is mandatory"
        );

        setMembershipAuthority(membershipAuthority_);
        setAuthority(_authority);
        setOwner(0x0);
    }

    function setMembershipAuthority(address membershipAuthority_) public auth {
        require(
            address(membershipAuthority_) != address(0),
            "MembershipAuthority is mandatory"
        );
        membershipAuthority = MembershipAuthorityInterface(membershipAuthority_);
        emit LogSetMembershipAuthority(membershipAuthority);
    }

    function canMint(address src, address dst, address guy, uint wad) public returns (bool) {
        return super.canMint(src, dst, guy, wad) && membershipAuthority.isMember(guy);
    }

    function canBurn(address src, address dst, address guy, uint wad) public returns (bool) {
        return super.canBurn(src, dst, guy, wad) && membershipAuthority.isMember(guy);
    }
}

contract MembershipWithFullKycAmlRule is DSAuth, FullKycAmlRule {

    MembershipAuthorityInterface public membershipAuthority;
    event LogSetMembershipAuthority(MembershipAuthorityInterface membershipAuthority);

    constructor(
        DSAuthority _authority,
        AddressControlStatus addressControlStatus_,
        KycAmlStatus kycAmlStatus_, address membershipAuthority_
    )
    FullKycAmlRule(addressControlStatus_, kycAmlStatus_)
    public {
        require(
            address(_authority) != address(0),
            "DSAuthority is mandatory"
        );
        setMembershipAuthority(membershipAuthority_);
        setAuthority(_authority);
        setOwner(0x0);
    }

    function setMembershipAuthority(address membershipAuthority_) public auth {
        require(
            address(membershipAuthority_) != address(0),
            "MembershipAuthority is mandatory"
        );
        membershipAuthority = MembershipAuthorityInterface(membershipAuthority_);
        emit LogSetMembershipAuthority(membershipAuthority);
    }

    function canMint(address src, address dst, address guy, uint wad) public returns (bool) {
        return super.canMint(src, dst, guy, wad) && membershipAuthority.isMember(guy);
    }

    function canBurn(address src, address dst, address guy, uint wad) public returns (bool) {
        return super.canBurn(src, dst, guy, wad) && membershipAuthority.isMember(guy);
    }
}
