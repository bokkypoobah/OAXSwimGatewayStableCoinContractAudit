# solovault

Source file [../../chain/contracts/solovault.sol](../../chain/contracts/solovault.sol).

<br />

<hr />

```javascript
pragma solidity 0.4.23;

import "dappsys.sol";

// auth, erc20, token

contract DSSoloVault is DSAuth {
    ERC20 public token;

    function swap(ERC20 token_) public auth {
        token = token_;
    }

    function push(address dst, uint wad) public auth {
        require(
            token.transfer(dst, wad),
            "Can't push"
        );
    }

    function pull(address src, uint wad) public auth {
        require(
            token.transferFrom(src, this, wad),
            "Can't pull"
        );
    }

    function push(address dst) public {
        push(dst, token.balanceOf(this));
    }

    function pull(address src) public {
        pull(src, token.balanceOf(src));
    }

    function mint(address guy, uint wad) public auth {
        DSToken(token).mint(guy, wad);
    }

    function burn(address guy, uint wad) public auth {
        DSToken(token).burn(guy, wad);
    }

    function mint(uint wad) public auth {
        DSToken(token).mint(wad);
    }

    function burn(uint wad) public auth {
        DSToken(token).burn(wad);
    }

    function burn() public auth {
        DSToken(token).burn(token.balanceOf(this));
    }

    function approve(address guy, uint wad) public returns (bool) {
        return DSToken(token).approve(guy, wad);
    }

    function approve(address guy) public returns (bool) {
        return DSToken(token).approve(guy);
    }
}

```
