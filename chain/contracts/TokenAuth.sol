pragma solidity 0.4.23;

import "dappsys.sol"; // Uses auth.sol, token.sol

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
        assert(tokenAuthority.canMint(msg.sender, this, guy, wad));
        _;
    }

    modifier authBurn(address guy, uint wad) {
        assert(tokenAuthority.canBurn(msg.sender, this, guy, wad));
        _;
    }

    function setTokenAuthority(TokenAuthority _tokenAuthority) public auth {
        tokenAuthority = _tokenAuthority;
        emit LogSetTokenAuthority(tokenAuthority);
    }
}
