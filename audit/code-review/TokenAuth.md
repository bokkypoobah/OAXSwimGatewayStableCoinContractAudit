# TokenAuth

Source file [../../chain/contracts/TokenAuth.sol](../../chain/contracts/TokenAuth.sol).

<br />

<hr />

```solidity
// BK Ok
// BK Ok
pragma solidity 0.4.23;

// BK Ok
import "dappsys.sol"; // Uses auth.sol, token.sol

// BK NOTE - Implemented in TokenRules:BaseRule -> TokenRules:BoundaryKycRule and TokenRules:FullKycRule
// BK Ok
interface ERC20Authority {
    // BK NOTE - src = msg.sender; dst = contract address
    // BK Next 3 Ok
    function canApprove(address src, address dst, address guy, uint wad) external view returns (bool);
    function canTransfer(address src, address dst, address to, uint wad) external view returns (bool);
    function canTransferFrom(address src, address dst, address from, address to, uint wad) external view returns (bool);
}


// BK NOTE - Inherited by FiatToken
// BK Ok
contract ERC20Auth is DSAuth {
    // BK Ok
    ERC20Authority public erc20Authority;

    // BK Ok - Event
    event LogSetERC20Authority(ERC20Authority erc20Authority);

    // BK NOTE - Used in FiatToken.approve(...)
    // BK Ok
    modifier authApprove(address guy, uint wad) {
        // BK NOTE - Calling TokenRules:BaseRule.canApprove(...)
        // BK Ok
        require(
            erc20Authority.canApprove(msg.sender, this, guy, wad),
            "Message sender is not authorized to use approve function"
        );
        // BK Ok
        _;
    }

    // BK NOTE - Used in FiatToken.transfer(...)
    modifier authTransfer(address to, uint wad) {
        // BK NOTE - Calling TokenRules:BaseRule.canTransfer(...) and TokenRules:FullKycRule.canTransfer(...)
        // BK Ok
        require(
            erc20Authority.canTransfer(msg.sender, this, to, wad),
            "Message sender is not authorized to use transfer function"
        );
        // BK Ok
        _;
    }

    // BK NOTE - Used in FiatToken.transferFrom(...)
    modifier authTransferFrom(address from, address to, uint wad) {
        // BK NOTE - Calling TokenRules:BaseRule.canTransferFrom(...) and TokenRules:FullKycRule.canTransferFrom(...)
        // BK Ok
        require(
            erc20Authority.canTransferFrom(msg.sender, this, from, to, wad),
            "Message sender is not authorized to use transferFrom function"
        );
        // BK Ok
        _;
    }

    // BK NOTE - tokenGuard.Permit from GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 to FiatToken 'USD' 'USDToken':0xb45408db6a4c5977d6fa0acc5581023882c89268 for setERC20Authority(address) #40502 0x9edad5bc948671c3051af6a9d3f426fed4e7aed1aca8d51a61da3a07f1cc7866
    function setERC20Authority(ERC20Authority _erc20Authority) public auth {
        // BK Ok
        erc20Authority = _erc20Authority;
        // BK Ok - Log event
        emit LogSetERC20Authority(erc20Authority);
    }
}


// BK NOTE - Implemented in TokenRules:BaseRule -> TokenRules:BoundaryKycRule and TokenRules:FullKycRule
interface TokenAuthority {
    // BK NOTE - src = msg.sender; dst = contract address
    // BK Next 2 Ok
    function canMint(address src, address dst, address guy, uint wad) external view returns (bool);
    function canBurn(address src, address dst, address guy, uint wad) external view returns (bool);
}


// BK NOTE - Inherited by FiatToken
// BK Ok
contract TokenAuth is DSAuth {
    // BK NOTE - Should make the following public
    // BK Ok
    TokenAuthority public tokenAuthority;

    // BK Ok - Event
    event LogSetTokenAuthority(TokenAuthority tokenAuthority);

    // BK NOTE - Used in FiatToken.mint(...)
    modifier authMint(address guy, uint wad) {
        // BK NOTE - Calling TokenRules:BaseRule.canMint(...) and TokenRules:BoundaryKycRule.canMint(...)
        // BK Ok
        require(
            tokenAuthority.canMint(msg.sender, this, guy, wad),
            "Message sender is not authorized to use mint function"
        );
        _;
    }

    // BK NOTE - Used in FiatToken.burn(...)
    modifier authBurn(address guy, uint wad) {
        // BK NOTE - Calling TokenRules:BaseRule.canBurn(...) and TokenRules:BoundaryKycRule.canBurn(...)
        // BK Ok
        require(
            tokenAuthority.canBurn(msg.sender, this, guy, wad),
            "Message sender is not authorized to use burn function"
        );
        _;
    }

    // BK NOTE - tokenGuard.Permit from GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 to FiatToken 'USD' 'USDToken':0xb45408db6a4c5977d6fa0acc5581023882c89268 for setTokenAuthority(address) #40502 0xc89c3184b0a6a67fd12275a41bab9c61224868c5e6803744c3c0396f99f7ce8d
    function setTokenAuthority(TokenAuthority _tokenAuthority) public auth {
        // BK Ok
        tokenAuthority = _tokenAuthority;
        // BK Ok - Log event
        emit LogSetTokenAuthority(tokenAuthority);
    }
}

```
