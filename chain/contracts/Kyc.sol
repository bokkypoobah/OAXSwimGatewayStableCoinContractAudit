pragma solidity ^0.4.19;


import "dappsys.sol";


// DSAuth
import "TokenAuth.sol";


// ERC20Authority, TokenAuthority


contract KycAmlStatus is DSAuth {
    mapping (address => bool) public kycVerified;

    function KycAmlStatus(DSAuthority _authority)
    public
    {
        setAuthority(_authority);
        setOwner(0x0);
    }

    function isKycVerified(address guy) public view returns (bool) {
        return kycVerified[guy];
    }

    function setKycVerified(address guy, bool _isKycVerified) public auth {
        kycVerified[guy] = _isKycVerified;
    }
}


contract KycAmlRule is ERC20Authority, TokenAuthority {
}


contract NoKycAmlRule is KycAmlRule {

    function canApprove(address /*src*/, address /*dst*/, address /*guy*/, uint /*wad*/) public returns (bool) {
        return true;
    }

    function canTransfer(address /*src*/, address /*dst*/, address /*to*/, uint /*wad*/) public returns (bool) {
        return true;
    }

    function canTransferFrom(address /*src*/, address /*dst*/, address /*from*/, address /*to*/, uint /*wad*/) public returns (bool) {
        return true;
    }

    function canMint(address /*src*/, address /*dst*/, address /*guy*/, uint /*wad*/) public returns (bool) {
        return true;
    }

    function canBurn(address /*src*/, address /*dst*/, address /*guy*/, uint /*wad*/) public returns (bool) {
        return true;
    }
}


contract BoundaryKycAmlRule is NoKycAmlRule {
    KycAmlStatus kycAmlStatus;

    function BoundaryKycAmlRule(KycAmlStatus kycAmlStatus_) public {
        kycAmlStatus = kycAmlStatus_;
    }

    function canMint(address /*src*/, address /*dst*/, address guy, uint /*wad*/) public returns (bool) {
        return kycAmlStatus.isKycVerified(guy);
    }

    function canBurn(address /*src*/, address /*dst*/, address guy, uint /*wad*/) public returns (bool) {
        return kycAmlStatus.isKycVerified(guy);
    }
}


contract FullKycAmlRule is BoundaryKycAmlRule {

    function FullKycAmlRule(KycAmlStatus kycAmlStatus_) BoundaryKycAmlRule(kycAmlStatus_) public {
    }

    function canTransfer(address src, address dst, address to, uint wad) public returns (bool) {
        return canTransferFrom(src, dst, src, to, wad);
    }

    function canTransferFrom(address /*src*/, address /*dst*/, address from, address to, uint /*wad*/) public returns (bool) {
        return kycAmlStatus.isKycVerified(from) && kycAmlStatus.isKycVerified(to);
    }
}
