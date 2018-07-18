# Stable coin smart contract design rationale

## Definitions


### Smart contract *state*

Smart contracts can store *data*, in their associated smart contract *storage*.
This the shape of the data in this storage is described via *fields* in the
smart contract code. The **state** of a smart contract is the value of all
the fields of a smart contract *at a given time*.


### Smart contract *method*

Smart contracts define *functions*. These functions can read or write the
the storage of the smart contract. In Object Oriented Programming terminology,
functions which has implicit access to some data, other than their parameters
are called **methods**.


### *read-only method*

Methods which can not modify, but only read the contract state are marked
with the `view` (or `constant`)
[function modifier](https://solidity.readthedocs.io/en/v0.4.24/miscellaneous.html#modifiers).

Methods which can not even read the contract state, but only use their
parameters to compute their return value are marked with the `pure` function
modifier.

While the term *pure function* makes sense, *pure method*, *view methods*
or *constant methods* have no clear meaning.

For both clarity and contrast with the *operations* defined below,
we will refer to methods which has a *view* or *constant* modifier
as **read-only methods**.


### Smart contract *operation*

There is no established term in the industry however for contrasting
read-only methods with methods which *write into* aka *mutate* the
smart contract state.

We will refer to such methods as **operations**.


### *Transacting* an operation

The code describing a method can be *run* or *executed* in 2 ways:

1. *call*ing the method
1. *sending* an ethereum *transaction* which calls the method

Again, there is no established, concise name for the 2nd action,
so we will refer to it as **transacting an operation**.

Operations can also be just *called*, to check whether they would
fail when they are transacted. While there is no guarrantee that
they will succeed, we can tell if they would fail, without spending
ether on a transaction.

It's not very useful to transact read-only methods, since they
will leave the state of the smart contract intact and there is
no way to access their return value.

Because of that *transacting a method* is not a great expression,
since it can refer to *read-only* methods, which are rather useless
to transact as we have just established.



## General principles and guidelines

### Upgradeability

One of the big questions in smart contract design is ensuring the evolution
and extensibility of the system of smart contracts.

This question is closely related to permission control too.

Defining permissions though reduces the degree of decentralization.

To have flexibility in the security area, we decided to adopt the
[`DSAuth`](http://dappsys.readthedocs.io/en/latest/ds_auth.html)
smart contract pattern from the
[dappsys](http://dappsys.readthedocs.io/en/latest/index.html)
library.

The other tactic for ensuring upgradability is the use of indirect
method calls via a (potentially changable) smart contract field which points
to the address another smart contract.

For example the `Gate` contract, which is the virtual equivalent of the
physical entrance a fiat gateway company, has a `token` address, which
specifies which `FiatToken` should it be the gatekeeper for.



### The concept of an `owner`

Most smart contract examples assume that there is a very privileged `owner`
who is by default the deployer of the contract. In those example you can
see 2 types of smart contract methods, simple `public` ones and the ones
which are restriced by the `onlyowner` modifier.

From a social perspective, we think it's safer to permanently drop the
privileges of the deployer and always apply some more fine-grained permission
control to smart contract methods.

As a result you can see the following repeating pattern:

```
constructor(DSAuthority _authority) public {
    require(
        address(_authority) != address(0),
        "Authority is mandatory"
    );

    setAuthority(_authority);
    setOwner(0x0);
}
```

This ensures that we won't accidentally deploy a contract without an
authority contract and leave it unprotected.

Consequently the owner privileges are dropped with `setOwner(0x0)`.



## Token authorization

### `ERC20Auth` & `ERC20Authority`

While the `DSAuth` system is very flexible and powerful, it can only grant
or reject operations based on 3 parameters:

1. the transaction sender
1. the receiving smart contract
1. the method being called

For token contracts however, there is the
[EIP20 standard](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20.md),
which define only 3 operations:

* `transfer(to, value)`
* `transferFrom(from, to, value)`
* `approve(spender, value)`

Having these operations standardized, allows us to apply the
`DSAuth:auth` modifier + `DSAuthority#canCall` method pattern
to implement such authorzation logic, which depends also on the
parameters to these functions.

The result is an `ERC20Authority` interface with 3 boolean authorization
functions:

* `canTransfer(src, dst, to, wad)`
* `canTransferFrom(src, dst, from, to, wad)`
* `canApprove(src, dst, guy, wad)`

Contracts implementing this interface are named as `*Rules`, to avoid
confusion with the more generic, less fine-grained `DSAuthority` contracts.

_See: TokenAuth.sol: `BaseRules`, `BoundaryKycRules`, `FullKycRules`_

After having a contract with the token authorization rules, we can plug it
into a token contract (eg. `FiatToken.sol:FiatToken`) via the
`TokenAuth.sol:ERC20Auth` mixin and apply its `authTransfer`,
`authTransferFrom`, `authApprove` modifiers on the corresponding EIP20
operations.

### `TokenAuth` & `TokenAuthority`

While it's not an official standard, it's a common practice to define
`mint` and `burn` operations which control the `totalSupply` of a token.

Obviously it's a very sensitive operation, because it affects the economics
of a token, hence it's desirable to apply restrictions on the `mint` & `burn`
operations.

Extending the `ERC20Auth` approach, we have also defined `authMint`/`authBurn`
modifiers which consult the `canMint`/`canBurn` methods in a `TokenAuthority`
implementation, eg. `TokenRules.sol:BoundaryKycRules`.

### `setERC20Authority` & `setTokenAuthority`

Tokens enforcing restrictions on their transfer/approve/mint/burn operations
allow switching their token rule contracts with the `set{ERC20,Token}Authority`
operation.

This means the regular `DSAuthority` rules should govern who is allowed to
call these rule changing methods.

Currently the transfer/approve and the mint/burn operations are allowed to
be controlled by two different rule contract, but for the sake of simplicity
both rule sets are implemented in the same contract (eg. `FullKycRules`)
and the same contract is plugged in as an `erc20Authority` and a `tokenAuthority`.
non-atomically, allowing for a transient state, which might be undesirable.

FIXME Explore the consequences of merging the the ERC20 and Token authorities.



## `AddressStatus` for defining authorization

After creating custom implementations for KYC/AML, asset freezing for
compliance, whitelisting for specific jurisdictions and OAX membership checks,
a patterns has crystalized.

All this functionality can be implemented as a database contract, which
provides an address lookup for a logical value.

While it's more descriptive call the lookup functions in a domain specific way,
in a smart contract context, it's less risky to use a common, generic but well
tested implementation.



#### Draft notes
