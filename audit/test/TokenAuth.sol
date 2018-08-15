pragma solidity 0.4.23;

import "dappsys.sol"; // Uses auth.sol, token.sol

interface ERC20Authority {
    function canApprove(address src, address dst, address guy, uint wad) external returns (bool);
    function canTransfer(address src, address dst, address to, uint wad) external returns (bool);
    function canTransferFrom(address src, address dst, address from, address to, uint wad) external returns (bool);
}


contract ERC20Auth is DSAuth {
    ERC20Authority public erc20Authority;

    modifier authApprove(address guy, uint wad) {
        assert(erc20Authority.canApprove(msg.sender, this, guy, wad));
        _;
    }

    modifier authTransfer(address to, uint wad) {
        assert(erc20Authority.canTransfer(msg.sender, this, to, wad));
        _;
    }

    modifier authTransferFrom(address from, address to, uint wad) {
        assert(erc20Authority.canTransferFrom(msg.sender, this, from, to, wad));
        _;
    }

    function setERC20Authority(ERC20Authority _erc20Authority) public auth {
        erc20Authority = _erc20Authority;
    }
}


interface TokenAuthority {
    function canMint(address src, address dst, address guy, uint wad) external returns (bool);
    function canBurn(address src, address dst, address guy, uint wad) external returns (bool);
}


contract TokenAuth is DSAuth {
    TokenAuthority public tokenAuthority;

    modifier authMint(address guy, uint wad) {
        assert(tokenAuthority.canMint(msg.sender, this, guy, wad));
        _;
    }

    modifier authBurn(address guy, uint wad) {
        assert(tokenAuthority.canBurn(msg.sender, this, guy, wad));
        _;
    }

    function setTokenAuthority(TokenAuthority _tokenAuthority) public auth {
        tokenAuthority = _tokenAuthority;
    }
}
