pragma solidity ^0.4.19;


import "dappsys.sol"; // auth, token, guard
import "TokenAuth.sol"; // ERC20Authority, ERC20Auth, TokenAuthority, TokenAuth


contract FiatToken is DSToken, ERC20Auth, TokenAuth {

    function FiatToken(DSAuthority _authority, bytes32 symbol)
    DSToken(symbol)
    public
    {
        setAuthority(_authority);
        setOwner(0x0);
    }

    function approve(address guy, uint wad)
    public
    authApprove(guy, wad)
    returns (bool) {
        return super.approve(guy, wad);
    }

    function transfer(address to, uint wad)
    public
    authTransfer(to, wad)
    returns (bool) {
        return super.transfer(to, wad);
    }

    function transferFrom(address from, address to, uint wad)
    public
    authTransferFrom(from, to, wad)
    returns (bool) {
        return super.transferFrom(from, to, wad);
    }

    function mint(address guy, uint wad) public authMint(guy, wad) {
        super.mint(guy, wad);
    }

    function burn(address guy, uint wad) public authBurn(guy, wad) {
        super.burn(guy, wad);
    }
}
