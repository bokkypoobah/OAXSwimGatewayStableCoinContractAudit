# OAX Swim Gateway Stable Coin Contract Audit

Status: Work in progress

Commits from [swim-gateway/stable-coin master-gitlab branch](https://github.com/swim-gateway/stable-coin/tree/master-gitlab) in commits [75cc80c](https://github.com/swim-gateway/stable-coin/commit/75cc80c5d494625d3e7262756973ec0394dfcf11) and [a53dce5](https://github.com/swim-gateway/stable-coin/commit/a53dce5fb53f2ff4461d15c2e3450faf0a9b61ac). Additionally, the pull request #1 [https://github.com/swim-gateway/stable-coin/pull/1/commits/daa965ad77e41629d6389879e120e68eb34c3593](https://github.com/swim-gateway/stable-coin/pull/1/commits/daa965ad77e41629d6389879e120e68eb34c3593) was merged into this branch.

<br />

<hr />

## Code Review

* [ ] [code-review/AddressStatus.md](code-review/AddressStatus.md)
  * [ ] contract AddressStatus is DSAuth
* [ ] [code-review/FiatToken.md](code-review/FiatToken.md)
  * [ ] contract FiatToken is DSToken, ERC20Auth, TokenAuth
* [ ] [code-review/Gate.md](code-review/Gate.md)
  * [ ] contract Gate is DSSoloVault, ERC20Events, DSMath, DSStop
* [ ] [code-review/GateRoles.md](code-review/GateRoles.md)
  * [ ] contract GateRoles is DSRoles
* [ ] [code-review/GateWithFee.md](code-review/GateWithFee.md)
  * [ ] contract GateWithFee is Gate
* [ ] [code-review/Kyc.md](code-review/Kyc.md)
  * [ ] contract AddressControlStatus is DSAuth
  * [ ] contract KycAmlStatus is DSAuth
  * [ ] contract ControllableKycAmlRule is ERC20Authority, TokenAuthority
  * [ ] contract NoKycAmlRule is ControllableKycAmlRule
  * [ ] contract BoundaryKycAmlRule is NoKycAmlRule
  * [ ] contract FullKycAmlRule is BoundaryKycAmlRule
  * [ ] contract MembershipAuthorityInterface
  * [ ] contract MembershipWithNoKycAmlRule is DSAuth, NoKycAmlRule
  * [ ] contract MembershipWithBoundaryKycAmlRule is DSAuth, BoundaryKycAmlRule
  * [ ] contract MembershipWithFullKycAmlRule is DSAuth, FullKycAmlRule
* [ ] [code-review/LimitController.md](code-review/LimitController.md)
  * [ ] contract LimitController is DSMath, DSStop
* [ ] [code-review/LimitSetting.md](code-review/LimitSetting.md)
  * [ ] contract LimitSetting is DSAuth, DSStop
* [ ] [code-review/Membership.md](code-review/Membership.md)
  * [ ] interface MembershipInterface
  * [ ] contract MockOAXMembership is AddressStatus, MembershipInterface
* [ ] [code-review/TokenAuth.md](code-review/TokenAuth.md)
  * [ ] interface ERC20Authority
  * [ ] contract ERC20Auth is DSAuth
  * [ ] interface TokenAuthority
  * [ ] contract TokenAuth is DSAuth
* [ ] [code-review/TokenRules.md](code-review/TokenRules.md)
  * [ ] contract BaseRules is ERC20Authority, TokenAuthority
  * [ ] contract BoundaryKycRules is BaseRules
  * [ ] contract FullKycRules is BoundaryKycRules
* [ ] [code-review/TransferFeeController.md](code-review/TransferFeeController.md)
  * [ ] contract TransferFeeController is TransferFeeControllerInterface, DSMath, DSAuth
* [ ] [code-review/TransferFeeControllerInterface.md](code-review/TransferFeeControllerInterface.md)
  * [ ] contract TransferFeeControllerInterface
* [ ] [code-review/dappsys.md](code-review/dappsys.md)
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
  * [ ] contract DSRoles is DSAuth, DSAuthority
  * [ ] contract DSTokenBase is ERC20, DSMath
  * [ ] contract DSToken is DSTokenBase(0), DSStop
  * [ ] contract DSMultiVault is DSAuth
  * [ ] contract DSVault is DSMultiVault
  * [ ] contract DSExec
  * [x] contract DSThing is DSAuth, DSNote, DSMath
* [ ] [code-review/solovault.md](code-review/solovault.md)
  * [ ] contract DSSoloVault is DSAuth

<br />

### Outside Scope

* [../../chain/contracts/Multisig.sol](../../chain/contracts/Multisig.sol) - **NOTE** *MultiSigWalletFactory* is included twice in this file