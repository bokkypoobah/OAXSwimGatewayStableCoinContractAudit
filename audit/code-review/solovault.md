# solovault

Source file [../../chain/contracts/solovault.sol](../../chain/contracts/solovault.sol).

<br />

<hr />

```javascript
// BK Ok
pragma solidity 0.4.23;

// BK Ok
import "dappsys.sol";

// auth, erc20, token

// BK NOTE - Inherited by Gate, then GateWithFee
contract DSSoloVault is DSAuth {
    // BK Ok
    ERC20 public token;

    // BK NOTE - Called by Gate constructor
    // BK Ok
    function swap(ERC20 token_) public auth {
        // BK Ok
        token = token_;
    }


    // BK Ok - Only authorised account can execute
    function push(address dst, uint wad) public auth {
        // BK Ok
        require(
            token.transfer(dst, wad),
            "Can't push"
        );
    }

    // BK Ok - Only authorised account can execute
    function pull(address src, uint wad) public auth {
        // BK Ok
        require(
            token.transferFrom(src, this, wad),
            "Can't pull"
        );
    }

    // BK Ok - Permissioned by call to `push(address, uint)`
    function push(address dst) public {
        // BK Ok
        push(dst, token.balanceOf(this));
    }

    // BK Ok - Permissioned by call to `pull(address, uint)`
    function pull(address src) public {
        // BK Ok
        pull(src, token.balanceOf(src));
    }

    // BK NOTE - gateRoles.RoleCapability code GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 capabilityRoles 0x0000000000000000000000000000000000000000000000000000000000000008 for mint(address,uint256) role MONEY_OPERATOR:3 true #7009 0xd708b2e13f04e2429d20cc060d434e853c4654482d71a5f237ddbae1e852a60f
    // BK NOTE - Overridden and called by Gate.mint(address, uint)
    // BK Ok - Only MONEY_OPERATOR can execute
    function mint(address guy, uint wad) public auth {
        // BK NOTE - tokenGuard.Permit from GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 to FiatToken 'USD' 'USDToken':0xb45408db6a4c5977d6fa0acc5581023882c89268 for mint(address,uint256) #7015 0x1201e6b0b058d2153093251a52af3d820dcd44e1c64d2f17e922436c05b6be02
        // BK Ok
        DSToken(token).mint(guy, wad);
    }

    // BK NOTE - gateRoles.RoleCapability code GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 capabilityRoles 0x0000000000000000000000000000000000000000000000000000000000000008 for burn(address,uint256) role MONEY_OPERATOR:3 true #7009 0x8b504d69c0dd7ded35d6995ca9b7f8f60735e2d799081fac127aa37677ab463a
    // BK NOTE - Overridden and called by Gate.burn(address, uint)
    // BK Ok - Only MONEY_OPERATOR can execute
    function burn(address guy, uint wad) public auth {
        // BK NOTE - tokenGuard.Permit from GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 to FiatToken 'USD' 'USDToken':0xb45408db6a4c5977d6fa0acc5581023882c89268 for burn(address,uint256) #7016 0x67e7a88c77146ff732ad632be35c73b75c41f122d625804564928fb70e34336d
        // BK Ok
        DSToken(token).burn(guy, wad);
    }

    // BK NOTE - Not overridden
    // BK NOTE - gateRoles.RoleCapability code GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 capabilityRoles 0x0000000000000000000000000000000000000000000000000000000000000008 for mint(uint256) role MONEY_OPERATOR:3 true #7009 0x6b105d8226688a8815df3348784ed47c266f2a07fffe7ac925680c6af1677a7a
    // BK Ok - MONEY_OPERATOR can execute
    function mint(uint wad) public auth {
        // BK NOTE - tokenGuard.Permit from GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 to FiatToken 'USD' 'USDToken':0xb45408db6a4c5977d6fa0acc5581023882c89268 for mint(uint256) #7015 0x9c7e6acf4ba38b358009b1675d1e0d4f6e9e0420b5bd04e902b9afca5a54dea7
        // BK Ok
        DSToken(token).mint(wad);
    }

    // BK NOTE - Not overridden
    // BK NOTE - gateRoles.RoleCapability code GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 capabilityRoles 0x0000000000000000000000000000000000000000000000000000000000000008 for burn(uint256) role MONEY_OPERATOR:3 true #7009 0x308f31092fd751bfe3221e25fbb78f7434adb62ddcc8842bebaf31eff2663217
    // BK Ok - MONEY_OPERATOR can execute
    function burn(uint wad) public auth {
        // BK NOTE - tokenGuard.Permit from GateWithFee:0x7f3caaa41b649ae4a478bc2f29b2e81ed6484fe7 to FiatToken 'USD' 'USDToken':0xb45408db6a4c5977d6fa0acc5581023882c89268 for burn(uint256) #7015 0x047d9ff1451f99474e4135131ecd01bffb0e7474325b9345f6fb55b1d894c119
        // BK Ok
        DSToken(token).burn(wad);
    }

    // BK NOTE - Not overridden
    // BK Ok - Not permissioned
    function burn() public auth {
        // BK NOTE - Not permissioned
        // BK Ok
        DSToken(token).burn(token.balanceOf(this));
    }

    // BK NOTE - If GateWithFee has a FiatToken token balance, any KYC-ed account can execute this function and then transfer out this balance
    // BK Ok
    function approve(address guy, uint wad) public returns (bool) {
        // BK Ok
        return DSToken(token).approve(guy, wad);
    }

    // BK NOTE - If GateWithFee has a FiatToken token balance, any KYC-ed account can execute this function and then transfer out this balance
    // BK Ok
    function approve(address guy) public returns (bool) {
        // BK Ok
        return DSToken(token).approve(guy);
    }
}

```
