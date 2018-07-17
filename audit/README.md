# OAX Swim Gateway Stable Coin Contract Audit

Commits [b99ddc6](https://github.com/swim-gateway/stable-coin/commit/b99ddc69af6c4f23789a62c331cc51318af709f8).

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
* [ ] [code-review/Multisig.md](code-review/Multisig.md)
  * [ ] contract MultiSigWallet
  * [ ] contract MultiSigWalletFactory is Factory
  * [ ] contract MultiSigWalletFactory is Factory
* [ ] [code-review/TokenAuth.md](code-review/TokenAuth.md)
  * [ ] contract ERC20Authority
  * [ ] contract ERC20Auth is ERC20, DSAuth
  * [ ] contract TokenAuthority
  * [ ] contract TokenAuth is DSAuth
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
