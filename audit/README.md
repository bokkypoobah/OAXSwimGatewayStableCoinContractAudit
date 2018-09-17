# OAX Swim Gateway Stable Coin Contract Audit

## Summary

[OAX](http://oax.org/) has developed a set of smart contracts for their swim gateway stable coins.

Bok Consulting Pty Ltd was commissioned to perform an audit on these Ethereum smart contracts.

This audit has been conducted on the source code from [swim-gateway/stable-coin master-gitlab branch](https://github.com/swim-gateway/stable-coin/tree/master-gitlab) in commits [75cc80c](https://github.com/swim-gateway/stable-coin/commit/75cc80c5d494625d3e7262756973ec0394dfcf11), [a53dce5](https://github.com/swim-gateway/stable-coin/commit/a53dce5fb53f2ff4461d15c2e3450faf0a9b61ac) and [daa965a](https://github.com/swim-gateway/stable-coin/commit/daa965ad77e41629d6389879e120e68eb34c3593).

Changes made after the first round of audits are in commit [a57697c](https://github.com/swim-gateway/stable-coin/commit/a57697cd1b1131b198a7d755ad33e613a4b8cff1).

No potential vulnerabilities have been identified in the smart contracts.

<br />

<hr />

## Table Of Contents

* [Summary](#summary)
* [Recommendations](#recommendations)
* [Potential Vulnerabilities](#potential-vulnerabilities)
* [Scope](#scope)
* [Risks](#risks)
* [Testing](#testing)
* [Code Review](#code-review)

<br />

<hr />

## Recommendations

* [x] ~~**MEDIUM IMPORTANCE**~~ See [Notes - GateWithFee Approve And TransferFrom](#gatewithfee-approve-and-transferfrom) below
  * [x] Alex has responded that *GateWithFee* will not hold any *FiatToken* token balance. I have added a new recommendation to add `auth` for both `approve(...)` functions
* [x] ~~**MEDIUM IMPORTANCE**~~ See [Notes - GateWithFee Fee Accounting](#gatewithfee-fee-accounting) below
  * [x] Kirsten has responded that the fee account flows will be accounted for in OAX's accounting reconciliation
* [x] **MEDIUM IMPORTANCE** *DSRoles* (implemented in *GateRoles*) and *DSGuard* (implemented *FiatTokenGuard*) are two permissioning modules for these set of contracts, and are critical to the security of these set of contracts. While the *DSGuard* permission setting functions log events, the *DSRoles* permission setting functions do not. Search for `// BK NOTE` in [test/modifiedContracts/dappsys.sol](test/modifiedContracts/dappsys.sol) for the an example of the events that should be added to *DSRoles* to provide more visibility into the state of the permissioning
  * [x] Added in [daa965a](https://github.com/swim-gateway/stable-coin/commit/daa965ad77e41629d6389879e120e68eb34c3593)
* [x] **MEDIUM IMPORTANCE** For the token total supply and movements to be transparently tracked on blockchain explorers, `emit Transfer(address(0), guy, wad)` should be added to  `FiatToken.mint(...)` and `emit Transfer(guy, address(0), wad)` should be added to `FiatToken.burn(...)`
  * [x] Added in [daa965a](https://github.com/swim-gateway/stable-coin/commit/daa965ad77e41629d6389879e120e68eb34c3593)
* [x] **LOW IMPORTANCE** `Gate.mint(...)` currently logs an `emit Transfer(0x0, guy, wad);` event, but this is not required for this non-token contract as it should be tracked on the *FiatToken* contract. Consider renaming to `Deposited(guy, wad)`
  * [x] Updated in [daa965a](https://github.com/swim-gateway/stable-coin/commit/daa965ad77e41629d6389879e120e68eb34c3593)
* [x] **LOW IMPORTANCE** In *DSToken*, `name()` and `symbol()` are defined as *bytes32* instead of *string* as specified in the [ERC20 token standard](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20.md). There are other token contracts using *bytes32* and they are operating without problems in the blockchain explorers
  * [x] Developer and auditor agreed that no action is required
* [x] **LOW IMPORTANCE** Remove the duplicate *MultiSigWalletFactory* from the bottom of [../chain/contracts/Multisig.sol](../chain/contracts/Multisig.sol)
  * [x] Fixed in [daa965a](https://github.com/swim-gateway/stable-coin/commit/daa965ad77e41629d6389879e120e68eb34c3593)
* [x] **LOW IMPORTANCE** Please note that [../chain/contracts/Multisig.sol](../chain/contracts/Multisig.sol) does not include the *Factory* contract that is required for *MultiSigWalletFactory*
  * [x] Fixed in [daa965a](https://github.com/swim-gateway/stable-coin/commit/daa965ad77e41629d6389879e120e68eb34c3593)
* [x] **LOW IMPORTANCE** Add event to log calls to `TransferFeeController.setDefaultTransferFee(...)`
  * [x] Added in [daa965a](https://github.com/swim-gateway/stable-coin/commit/daa965ad77e41629d6389879e120e68eb34c3593)
* [x] **LOW IMPORTANCE** `GateWithFee.transferFeeController` is not used
  * [x] Removed in [daa965a](https://github.com/swim-gateway/stable-coin/commit/daa965ad77e41629d6389879e120e68eb34c3593)
* [x] **LOW IMPORTANCE** Consider logging events for `FiatToken.setTransferFeeCollector(...)` and `FiatToken.setTransferFeeController(...)`
  * [x] Added in [daa965a](https://github.com/swim-gateway/stable-coin/commit/daa965ad77e41629d6389879e120e68eb34c3593)
* [x] **LOW IMPORTANCE** Consider logging events for `TokenAuth:ERC20Auth.setERC20Authority(...)` and `TokenAuth:TokenAuth.setTokenAuthority(...)`
  * [x] Updated in [daa965a](https://github.com/swim-gateway/stable-coin/commit/daa965ad77e41629d6389879e120e68eb34c3593)
* [x] **LOW IMPORTANCE** Consider making `TokenAuth:TokenAuth.tokenAuthority` public for traceability
  * [x] Updated in [daa965a](https://github.com/swim-gateway/stable-coin/commit/daa965ad77e41629d6389879e120e68eb34c3593)
* [x] **LOW IMPORTANCE** Consider making `LimitController.limitSetting` public for traceability
  * [x] Updated in [daa965a](https://github.com/swim-gateway/stable-coin/commit/daa965ad77e41629d6389879e120e68eb34c3593)
* [ ] **LOW IMPORTANCE** Could use `require(...)` instead of `assert(...)` in *TokenAuth:ERC20Auth.\*(...)* and *TokenAuth:TokenAuth.\*(...)* to save on gas when errored
  * [x] Updated in [daa965a](https://github.com/swim-gateway/stable-coin/commit/daa965ad77e41629d6389879e120e68eb34c3593)
* [x] **LOW IMPORTANCE** Could use `require(...)` instead of `assert(...)` in `LimitController.resetLimit()` to save on gas when errored
  * [x] Updated in [daa965a](https://github.com/swim-gateway/stable-coin/commit/daa965ad77e41629d6389879e120e68eb34c3593)
* [ ] **LOW IMPORTANCE** Could use `require(...)` instead of `assert(...)` in *LimitSetting* to save on gas when errored
* [ ] **LOW IMPORTANCE** In *LimitSetting*, overloading the events `AdjustMintLimitRequested(...)` and `AdjustBurnLimitRequested(...)` makes it difficult to retrieve the events with JavaScript
* [ ] **LOW IMPORTANCE** In `LimitSetting.getDefaultDelayHours()`, instead of using the magic number, use 30 days or a named constant
* [ ] **LOW IMPORTANCE** In `LimitSetting.setSettingDefaultDelayHours(...)`, consider adding a check that the `_hours` is a reasonable number
* [ ] **LOW IMPORTANCE** In the *LimitSetting* constructor, `_defaultLimitCounterResetTimeffset` should be named `_defaultLimitCounterResetTimeOffset`
* [ ] **LOW IMPORTANCE** In *LimitSetting*, \*DefaultDelayHours\* sometimes refers to *hours* and sometimes *seconds*. Consider renaming to remove ambiguity
* [x] **LOW IMPORTANCE** See [Notes - GateWithFee Approve And TransferFrom](#gatewithfee-approve-and-transferfrom) below - add the `auth` permissioning to both the `DSSoloVault.approve(...)` functions, just to be sure that it will not be used by unauthorised accounts
  * [x] Added in [daa965a](https://github.com/swim-gateway/stable-coin/commit/daa965ad77e41629d6389879e120e68eb34c3593)

<br />

[code-review/Kyc.md](code-review/Kyc.md) is not longer used from [a57697c](https://github.com/swim-gateway/stable-coin/commit/a57697cd1b1131b198a7d755ad33e613a4b8cff1)

* [ ] ~~**LOW IMPORTANCE** Consider logging events for `Kyc:MembershipWithNoKycAmlRule.setMembershipAuthority(...)`, `Kyc:MembershipWithBoundaryKycAmlRule.setMembershipAuthority(...)` and `Kyc:MembershipWithFullKycAmlRule.setMembershipAuthority(...)`~~
* [ ] ~~**LOW IMPORTANCE** Set `Kyc:ControllableKycAmlRule.addressControlStatus` to *public*~~
* [ ] ~~**LOW IMPORTANCE** Set `Kyc:BoundaryKycAmlRule.kycAmlStatus` to *public*~~
* [ ] ~~**LOW IMPORTANCE** Consider making `Kyc:ControllableKycAmlRule.addressControlStatus` public for traceability~~
* [ ] ~~**LOW IMPORTANCE** Consider making `Kyc:BoundaryKycAmlRule.kycAmlStatus` public for traceability~~
* [ ] ~~**LOW IMPORTANCE** Consider making `Kyc:MembershipWithNoKycAmlRule.membershipAuthority`, `Kyc:MembershipWithBoundaryKycAmlRule.membershipAuthority` and `Kyc:MembershipWithFullKycAmlRule.membershipAuthority` public for traceability~~
* [ ] ~~**LOW IMPORTANCE** In *Kyc:NoKycAmlRule*, the `& true` statement is redundant~~

<br />

<hr />

## Notes

### GateWithFee Approve And TransferFrom

~~**MEDIUM IMPORTANCE**~~ If the *GateWithFee* contract has a *FiatToken* token balance, any KYC-ed user account can execute `approve(address,uint)` or `approve(address)`, and then execute `FiatToken.transferFrom(...)` this token balance to the user's account. However, the *MONEY_OPERATOR* can freeze the user's account.

* [x] Alex has responded that *GateWithFee* will not hold any *FiatToken* token balance. I have added a new recommendation to add `auth` for both `approve(...)` functions

<br />

### GateWithFee Fee Accounting

**NOTE** Reference `GateWithFee.mint(...)` - If there is a deposit of 1 dollar, with a 1 dollar fee, the token issuing entity will receive 2 dollars of which 1 dollar will go into a trust account and 1 dollar will go into a fee account. 2 tokens will be issued in the FiatToken contract, and backing this is the 1 dollar deposited into the trust account. The maths will not work out unless the entity's fee account balance is also reflected in the FiatToken contract balances. This also applies to the `GateWithFee.burn(...)` function.

* [x] Kirsten has responded that the fee account flows will be accounted for in OAX's accounting reconciliation

<br />

<hr />

## Potential Vulnerabilities

No potential vulnerabilities have been identified in the smart contracts.

<br />

<hr />

## Scope

This audit is into the technical aspects of the OAX swim gateway stable coin smart contracts. The primary aim of this audit is to ensure that funds
stored in these contracts are not easily attacked or stolen by third parties. The secondary aim of this audit is to
ensure the coded algorithms work as expected. This audit does not guarantee that that the code is bugfree, but intends to
highlight any areas of weaknesses.

<br />

<hr />

## Risks

The permissioning for the execution of functions for this set of contracts is dependent on *DSRoles* (implemented in *GateRoles*) and *DSGuard* (implemented *FiatTokenGuard*). 

<br />

<hr />

## Testing

Details of the testing environment can be found in [test](test).

[../chain/index.js](../chain/index.js) and [../chain/lib/deployerProd.js](../chain/lib/deployerProd.js) were used as a guide for the security model used with this set of contracts.

The following functions were tested using the script [test/01_test1.sh](test/01_test1.sh) with the summary results saved
in [test/test1results.txt](test/test1results.txt) and the detailed output saved in [test/test1output.txt](test/test1output.txt):

* [x] Group #1 deployment
  * [x] `GateRoles()`
  * [x] `FiatTokenGuard()`
* [x] Group #2 deployment
  * [x] `KycAmlStatus(GateRoles)`
  * [x] `AddressControlStatus(GateRoles)`
  * [x] `TransferFeeController(GateRoles, 0, 0)`
  * [x] `LimitSetting(GateRoles, {mint limit}, {burn limit}, ...)`
* [x] Group #3 deployment
  * [x] `NoKycAmlRule(AddressControlStatus)`
  * [x] `BoundaryKycAmlRule(AddressControlStatus, KycAmlStatus)`
  * [x] `FullKycAmlRule(AddressControlStatus, KycAmlStatus)`
  * [x] `MockMembershipAuthority()`
  * [x] `MembershipWithBoundaryKycAmlRule(GateRoles, AddressControlStatus, KycAmlStatus, MockMembershipAuthority)`
  * [x] `LimitController(FiatTokenGuard, LimitSetting)`
  * [x] `FiatToken(FiatTokenGuard, {symbol}, {name}, {transferFeeCollector}, TransferFeeController)`
* [x] Set User Roles
  * [x] `GateRoles([sysAdmin=SYSTEM_ADMIN_ROLE(1), kycOperator=KYC_OPERATOR_ROLE(2), moneyOperator=MONEY_OPERATOR_ROLE(3)])`
* [x] Set Roles Rules #1
  * [x] `GateRoles.setRoleCapability(KYC_OPERATOR_ROLE, KycAmlStatus, sig("setKycVerified(address,bool)"))`
  * [x] `GateRoles.setRoleCapability(MONEY_OPERATOR_ROLE, AddressControlStatus, sig("freezeAddress(address)"))`
  * [x] `GateRoles.setRoleCapability(MONEY_OPERATOR_ROLE, AddressControlStatus, sig("unfreezeAddress(address)"))`
  * [x] `GateRoles.setRoleCapability(SYSTEM_ADMIN_ROLE, LimitSetting, sig("setSettingDefaultDelayHours(uint256)"))`
  * [x] `GateRoles.setRoleCapability(SYSTEM_ADMIN_ROLE, LimitSetting, sig("setLimitCounterResetTimeOffset(int256)"))`
  * [x] `GateRoles.setRoleCapability(SYSTEM_ADMIN_ROLE, LimitSetting, sig("setDefaultMintDailyLimit(uint256)"))`
  * [x] `GateRoles.setRoleCapability(SYSTEM_ADMIN_ROLE, LimitSetting, sig("setDefaultBurnDailyLimit(uint256)"))`
  * [x] `GateRoles.setRoleCapability(SYSTEM_ADMIN_ROLE, LimitSetting, sig("setCustomMintDailyLimit(address,uint256)"))`
  * [x] `GateRoles.setRoleCapability(SYSTEM_ADMIN_ROLE, LimitSetting, sig("setCustomBurnDailyLimit(address,uint256)"))`
  * [x] `GateRoles.setRoleCapability(SYSTEM_ADMIN_ROLE, transferFeeController, sig("setDefaultTransferFee(uint256,uint256)"))`
  * [x] `GateRoles.setRoleCapability(SYSTEM_ADMIN_ROLE, membershipWithBoundaryKycAmlRule, sig("setMembershipAuthority(address)"))`
* [x] Group #4 deployment
  * [x] `GateWithFee(GateRoles, FiatToken, LimitController, {mintFeeCollector}, {burnFeeCollector}, TransferFeeController)`
* [x] Set Roles Rules #2
  * [x] `GateRoles.setRoleCapability(MONEY_OPERATOR_ROLE, GateWithFee, sig("mint(uint256)"))`
  * [x] `GateRoles.setRoleCapability(MONEY_OPERATOR_ROLE, GateWithFee, sig("mint(address,uint256)"))`
  * [x] `GateRoles.setRoleCapability(MONEY_OPERATOR_ROLE, GateWithFee, sig("burn(uint256)"))`
  * [x] `GateRoles.setRoleCapability(MONEY_OPERATOR_ROLE, GateWithFee, sig("burn(address,uint256)"))`
  * [x] `GateRoles.setRoleCapability(MONEY_OPERATOR_ROLE, GateWithFee, sig("start()"))`
  * [x] `GateRoles.setRoleCapability(MONEY_OPERATOR_ROLE, GateWithFee, sig("stop()"))`
  * [x] `GateRoles.setRoleCapability(MONEY_OPERATOR_ROLE, GateWithFee, sig("startToken()"))`
  * [x] `GateRoles.setRoleCapability(MONEY_OPERATOR_ROLE, GateWithFee, sig("stopToken()"))`
  * [x] `GateRoles.setRoleCapability(SYSTEM_ADMIN_ROLE, GateWithFee, sig("setERC20Authority(address)"))`
  * [x] `GateRoles.setRoleCapability(SYSTEM_ADMIN_ROLE, GateWithFee, sig("setTokenAuthority(address)"))`
  * [x] `GateRoles.setRoleCapability(SYSTEM_ADMIN_ROLE, GateWithFee, sig("setLimitController(address)"))`
  * [x] `GateRoles.setRoleCapability(MONEY_OPERATOR_ROLE, GateWithFee, sig("mintWithFee(address,uint256,uint256)"))`
  * [x] `GateRoles.setRoleCapability(MONEY_OPERATOR_ROLE, GateWithFee, sig("burnWithFee(address,uint256,uint256)"))`
  * [x] `GateRoles.setRoleCapability(SYSTEM_ADMIN_ROLE, GateWithFee, sig("setFeeCollector(address)"))`
  * [x] `GateRoles.setRoleCapability(SYSTEM_ADMIN_ROLE, GateWithFee, sig("setTransferFeeCollector(address)"))`
  * [x] `GateRoles.setRoleCapability(SYSTEM_ADMIN_ROLE, GateWithFee, sig("setTransferFeeController(address)"))`
  * [x] `GateRoles.setRoleCapability(SYSTEM_ADMIN_ROLE, GateWithFee, sig("setMintFeeCollector(address)"))`
  * [x] `GateRoles.setRoleCapability(SYSTEM_ADMIN_ROLE, GateWithFee, sig("setBurnFeeCollector(address)"))`
* [x] Set Guard Rules #1
  * [x] `FiatToken.permit(GateWithFee, FiatToken, sig("setName(bytes32)"))`
  * [x] `FiatToken.permit(GateWithFee, FiatToken, sig("mint(uint256)"))`
  * [x] `FiatToken.permit(GateWithFee, FiatToken, sig("mint(address,uint256)"))`
  * [x] `FiatToken.permit(GateWithFee, FiatToken, sig("burn(uint256)"))`
  * [x] `FiatToken.permit(GateWithFee, FiatToken, sig("burn(address,uint256)"))`
  * [x] `FiatToken.permit(GateWithFee, FiatToken, sig("setERC20Authority(address)"))`
  * [x] `FiatToken.permit(GateWithFee, FiatToken, sig("setTokenAuthority(address)"))`
  * [x] `FiatToken.permit(GateWithFee, FiatToken, sig("start()"))`
  * [x] `FiatToken.permit(GateWithFee, FiatToken, sig("stop()"))`
  * [x] `FiatToken.permit(GateWithFee, FiatToken, sig("setTransferFeeCollector(address)"))`
  * [x] `FiatToken.permit(GateWithFee, FiatToken, sig("setTransferFeeController(address)"))`
  * [x] `FiatToken.permit(GateWithFee, LimitController, sig("bumpMintLimitCounter(uint256)"))`
  * [x] `FiatToken.permit(GateWithFee, LimitController, sig("bumpBurnLimitCounter(uint256)"))`

<br />

<hr />

## Code Review

* [x] [code-review/FiatToken.md](code-review/FiatToken.md)
  * [x] contract FiatToken is DSToken, ERC20Auth, TokenAuth
* [x] [code-review/Gate.md](code-review/Gate.md)
  * [x] contract Gate is DSSoloVault, ERC20Events, DSMath, DSStop
* [x] [code-review/GateRoles.md](code-review/GateRoles.md)
  * [x] contract GateRoles is DSRoles
* [x] [code-review/GateWithFee.md](code-review/GateWithFee.md)
  * [x] contract GateWithFee is Gate
* [x] ~~[code-review/Kyc.md](code-review/Kyc.md)~~ **NOT USED FROM [a57697c](https://github.com/swim-gateway/stable-coin/commit/a57697cd1b1131b198a7d755ad33e613a4b8cff1)**
  * [x] ~~contract AddressControlStatus is DSAuth~~
  * [x] ~~contract KycAmlStatus is DSAuth~~
  * [x] ~~contract ControllableKycAmlRule is ERC20Authority, TokenAuthority~~
  * [x] ~~contract NoKycAmlRule is ControllableKycAmlRule~~
  * [x] ~~contract BoundaryKycAmlRule is NoKycAmlRule~~
  * [x] ~~contract FullKycAmlRule is BoundaryKycAmlRule~~
  * [x] ~~contract MembershipAuthorityInterface~~
  * [x] ~~contract MembershipWithNoKycAmlRule is DSAuth, NoKycAmlRule~~
  * [x] ~~contract MembershipWithBoundaryKycAmlRule is DSAuth, BoundaryKycAmlRule~~
  * [x] ~~contract MembershipWithFullKycAmlRule is DSAuth, FullKycAmlRule~~
* [x] [code-review/LimitController.md](code-review/LimitController.md)
  * [x] contract LimitController is DSMath, DSStop
* [x] [code-review/LimitSetting.md](code-review/LimitSetting.md)
  * [x] contract LimitSetting is DSAuth, DSStop
* [x] [code-review/TokenAuth.md](code-review/TokenAuth.md)
  * [x] interface ERC20Authority
  * [x] contract ERC20Auth is DSAuth
  * [x] interface TokenAuthority
  * [x] contract TokenAuth is DSAuth
* [x] [code-review/TransferFeeController.md](code-review/TransferFeeController.md)
  * [x] contract TransferFeeController is TransferFeeControllerInterface, DSMath, DSAuth
* [x] [code-review/TransferFeeControllerInterface.md](code-review/TransferFeeControllerInterface.md)
  * [x] contract TransferFeeControllerInterface
* [x] [code-review/dappsys.md](code-review/dappsys.md)
  * [x] contract DSMath
  * [x] contract ERC20Events
  * [x] contract ERC20 is ERC20Events
  * [x] contract DSAuthority
  * [x] contract DSAuthEvents
  * [x] contract DSAuth is DSAuthEvents
  * [x] contract DSNote
  * [x] contract DSStop is DSNote, DSAuth
  * [x] contract DSGuardEvents
  * [x] contract DSGuard is DSAuth, DSAuthority, DSGuardEvents
  * [x] contract DSGuardFactory
  * [x] contract DSRoles is DSAuth, DSAuthority
  * [x] contract DSTokenBase is ERC20, DSMath
  * [x] contract DSToken is DSTokenBase(0), DSStop
  * contract DSMultiVault is DSAuth **(Not used in these contracts)**
  * contract DSVault is DSMultiVault **(Not used in these contracts)**
  * contract DSExec **(Not used in these contracts)**
  * [x] contract DSThing is DSAuth, DSNote, DSMath **(Not used in these contracts)**
* [x] [code-review/solovault.md](code-review/solovault.md)
  * [x] contract DSSoloVault is DSAuth

<br />

### Outside Scope

As documented in [../README.md#new-simpler-contracts](../README.md#new-simpler-contracts), the following contracts are still being developed:

* [code-review/AddressStatus.md](code-review/AddressStatus.md)
  * contract AddressStatus is DSAuth
* [code-review/Membership.md](code-review/Membership.md)
  * interface MembershipInterface
  * contract MockOAXMembership is AddressStatus, MembershipInterface
* [code-review/TokenRules.md](code-review/TokenRules.md)
  * contract BaseRules is ERC20Authority, TokenAuthority
  * contract BoundaryKycRules is BaseRules
  * contract FullKycRules is BoundaryKycRules

The Gnosis Multisig wallet smart contract is outside the scope of this audit, but there is a duplicated contract in the source code:

* [x] [../chain/contracts/Multisig.sol](../chain/contracts/Multisig.sol) - This is the Gnosis MultiSigWallet.sol and MultiSigWalletFactory.sol but the factory is included twice
  * [x] In commit [daa965a](https://github.com/swim-gateway/stable-coin/commit/daa965ad77e41629d6389879e120e68eb34c3593), the code has been moved to [../chain/contracts/vendors/MultiSigWallet.sol](../chain/contracts/vendors/MultiSigWallet.sol) and is the same as [https://github.com/gnosis/MultiSigWallet/blob/e1b25e8632ca28e9e9e09c81bd20bf33fdb405ce/contracts/MultiSigWallet.sol](https://github.com/gnosis/MultiSigWallet/blob/e1b25e8632ca28e9e9e09c81bd20bf33fdb405ce/contracts/MultiSigWallet.sol) with some differences in the whitespace characters

<br />

<br />

(c) BokkyPooBah / Bok Consulting Pty Ltd for OAX - Sep 11 2018. Done with assistance from [Adrian Guerrera](https://github.com/apguerrera). The MIT Licence.