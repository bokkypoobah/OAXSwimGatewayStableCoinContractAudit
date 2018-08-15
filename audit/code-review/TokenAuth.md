# TokenAuth

Source file [../../chain/contracts/TokenAuth.sol](../../chain/contracts/TokenAuth.sol).

<br />

<hr />

```javascript
// BK Ok
pragma solidity 0.4.23;

// BK Ok
import "dappsys.sol"; // Uses auth.sol, token.sol

// BK NOTE - Implemented in Kyc:ControllableKycAmlRule
// BK Ok
interface ERC20Authority {
    // BK NOTE - src = msg.sender; dst = contract address
    // BK Next 3 Ok
    function canApprove(address src, address dst, address guy, uint wad) external returns (bool);
    function canTransfer(address src, address dst, address to, uint wad) external returns (bool);
    function canTransferFrom(address src, address dst, address from, address to, uint wad) external returns (bool);
}


// BK NOTE - Inherited by FiatToken
// BK Ok
contract ERC20Auth is DSAuth {
    // BK Ok
    ERC20Authority public erc20Authority;

    // BK NOTE - Used in FiatToken.approve(...)
    // BK Ok
    modifier authApprove(address guy, uint wad) {
        // BK NOTE - Calling Kyc:*.canApprove(...)
        // BK NOTE - Could use `require(...)` instead of `assert(...)` to save gas on error
        // BK Ok
        assert(erc20Authority.canApprove(msg.sender, this, guy, wad));
        // BK Ok
        _;
    }

    // BK NOTE - Used in FiatToken.transfer(...)
    modifier authTransfer(address to, uint wad) {
        // BK NOTE - Calling Kyc:*.canTransfer(...)
        // BK NOTE - Could use `require(...)` instead of `assert(...)` to save gas on error
        // BK Ok
        assert(erc20Authority.canTransfer(msg.sender, this, to, wad));
        // BK Ok
        _;
    }

    // BK NOTE - Used in FiatToken.transferFrom(...)
    modifier authTransferFrom(address from, address to, uint wad) {
        // BK NOTE - Calling Kyc:*.canTransferFrom(...)
        // BK NOTE - Could use `require(...)` instead of `assert(...)` to save gas on error
        // BK Ok
        assert(erc20Authority.canTransferFrom(msg.sender, this, from, to, wad));
        // BK Ok
        _;
    }

    // BK NOTE - tokenGuard.Permit from GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 to FiatToken 'USD' 'USDToken':0xb45408db6a4c5977d6fa0acc5581023882c89268 for setERC20Authority(address) #40502 0x9edad5bc948671c3051af6a9d3f426fed4e7aed1aca8d51a61da3a07f1cc7866
    function setERC20Authority(ERC20Authority _erc20Authority) public auth {
        // BK NOTE - Should log the changes
        // BK Ok
        erc20Authority = _erc20Authority;
    }
}


// BK NOTE - Implemented in Kyc:ControllableKycAmlRule
interface TokenAuthority {
    // BK NOTE - src = msg.sender; dst = contract address
    // BK Next 2 Ok
    function canMint(address src, address dst, address guy, uint wad) external returns (bool);
    function canBurn(address src, address dst, address guy, uint wad) external returns (bool);
}


// BK NOTE - Inherited by FiatToken
contract TokenAuth is DSAuth {
    // BK NOTE - Should make the following public
    // BK Ok
    TokenAuthority tokenAuthority;

    // BK NOTE - Used in FiatToken.mint(...)
    modifier authMint(address guy, uint wad) {
        // BK NOTE - Calling Kyc:*.canMint(...)
        // BK NOTE - Could use `require(...)` instead of `assert(...)` to save gas on error
        // BK Ok
        assert(tokenAuthority.canMint(msg.sender, this, guy, wad));
        // BK Ok
        _;
    }

    // BK NOTE - Used in FiatToken.burn(...)
    modifier authBurn(address guy, uint wad) {
        // BK NOTE - Calling Kyc:*.canBurn(...)
        // BK NOTE - Could use `require(...)` instead of `assert(...)` to save gas on error
        // BK Ok
        assert(tokenAuthority.canBurn(msg.sender, this, guy, wad));
        // BK Ok
        _;
    }

    // BK NOTE - tokenGuard.Permit from GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 to FiatToken 'USD' 'USDToken':0xb45408db6a4c5977d6fa0acc5581023882c89268 for setTokenAuthority(address) #40502 0xc89c3184b0a6a67fd12275a41bab9c61224868c5e6803744c3c0396f99f7ce8d
    function setTokenAuthority(TokenAuthority _tokenAuthority) public auth {
        // BK NOTE - Should log the changes
        // BK Ok
        tokenAuthority = _tokenAuthority;
    }
}

```
