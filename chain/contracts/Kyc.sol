pragma solidity ^0.4.19;


import "dappsys.sol";


// DSAuth
import "TokenAuth.sol";


// ERC20Authority, TokenAuthority


contract AddressControlStatus is DSAuth {
    mapping (address => bool) public frozenAddress;

    function AddressControlStatus(DSAuthority _authority) public {
        setAuthority(_authority);
        setOwner(0x0);
    }

    function freezeAddress(address address_) public auth {
        frozenAddress[address_] = true;
    }

    function unfreezeAddress(address address_) public auth {
        frozenAddress[address_] = false;
    }

}


contract KycAmlStatus is DSAuth {
    mapping (address => bool) public kycVerified;

    function KycAmlStatus(DSAuthority _authority) public {
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


contract ControllableKycAmlRule is ERC20Authority, TokenAuthority {
    AddressControlStatus addressControlStatus;

    function ControllableKycAmlRule(AddressControlStatus addressControlStatus_) public {
        addressControlStatus = addressControlStatus_;
    }

    function canApprove(address /*src*/, address /*dst*/, address guy, uint /*wad*/) public returns (bool) {
        return (!addressControlStatus.frozenAddress(guy));
    }

    function canTransferFrom(address /*src*/, address /*dst*/, address from, address to, uint /*wad*/) public returns (bool) {
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
    function NoKycAmlRule(AddressControlStatus addressControlStatus_) ControllableKycAmlRule(addressControlStatus_) public {
        addressControlStatus = addressControlStatus_;
    }

    function canApprove(address src, address dst, address guy, uint wad) public returns (bool) {
        return super.canApprove(src, dst, guy, wad) && true;
    }

    function canTransferFrom(address src, address dst, address from, address to, uint wad) public returns (bool) {
        return super.canTransferFrom(src, dst, from, to, wad) && true;
    }

    function canTransfer(address src, address dst, address to, uint wad) public returns (bool) {
        return super.canTransfer(src, dst, to, wad) && true;
    }

    function canMint(address src, address dst, address guy, uint wad) public returns (bool) {
        return super.canMint(src, dst, guy, wad) && true;
    }

    function canBurn(address src, address dst, address guy, uint wad) public returns (bool) {
        return super.canBurn(src, dst, guy, wad) && true;
    }
}


contract BoundaryKycAmlRule is NoKycAmlRule {
    KycAmlStatus kycAmlStatus;

    function BoundaryKycAmlRule(AddressControlStatus addressControlStatus_, KycAmlStatus kycAmlStatus_) NoKycAmlRule(addressControlStatus_) public {
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

    function FullKycAmlRule(AddressControlStatus addressControlStatus_, KycAmlStatus kycAmlStatus_)
    BoundaryKycAmlRule(addressControlStatus_, kycAmlStatus_) public {}

    function canTransferFrom(address src, address dst, address from, address to, uint wad) public returns (bool) {
        return super.canTransferFrom(src, dst, from, to, wad) && kycAmlStatus.isKycVerified(from) && kycAmlStatus.isKycVerified(to);
    }

    function canTransfer(address src, address dst, address to, uint wad) public returns (bool) {
        return super.canTransfer(src, dst, to, wad) && canTransferFrom(src, dst, src, to, wad);
    }
}
