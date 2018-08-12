# OAX Swim Gateway Stable Coin Contract Audit

Status: Work in progress

## Summary

[OAX](http://oax.org/) has developed a set of smart contracts for their swim gateway stable coins.

Bok Consulting Pty Ltd was commissioned to perform an audit on these Ethereum smart contracts.

This audit has been conducted on the source code from [swim-gateway/stable-coin master-gitlab branch](https://github.com/swim-gateway/stable-coin/tree/master-gitlab) in commits [75cc80c](https://github.com/swim-gateway/stable-coin/commit/75cc80c5d494625d3e7262756973ec0394dfcf11) and [a53dce5](https://github.com/swim-gateway/stable-coin/commit/a53dce5fb53f2ff4461d15c2e3450faf0a9b61ac). Additionally, the pull request #1 [https://github.com/swim-gateway/stable-coin/pull/1/commits/daa965ad77e41629d6389879e120e68eb34c3593](https://github.com/swim-gateway/stable-coin/pull/1/commits/daa965ad77e41629d6389879e120e68eb34c3593) was merged into this branch.

**TODO** Check that no potential vulnerabilities have been identified in the smart contracts.

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

* [ ] **MEDIUM IMPORTANCE** Add something like `event SetUserRole(address indexed who, bytes32 indexed userRoles);` to *DSRoles* and log this event using `emit SetUserRole(who, _user_roles[who]);` in `DARoles.setUserRole(...)`. This is so any changes to the user roles can be detected. See [test/modifiedContracts/dappsys.sol#L284-L285](test/modifiedContracts/dappsys.sol#L284-L285) and [test/modifiedContracts/dappsys.sol#L365-L366](test/modifiedContracts/dappsys.sol#L365-L366). Any changes can be detected like [https://github.com/bokkypoobah/OAXSwimGatewayStableCoinContractAudit/blob/e80189b42bd24f83fae73b90c635d48d0fbd9f71/audit/test/test1results.txt#L175-L177](https://github.com/bokkypoobah/OAXSwimGatewayStableCoinContractAudit/blob/e80189b42bd24f83fae73b90c635d48d0fbd9f71/audit/test/test1results.txt#L175-L177) using code like [https://github.com/bokkypoobah/OAXSwimGatewayStableCoinContractAudit/blob/e80189b42bd24f83fae73b90c635d48d0fbd9f71/audit/test/functions.js#L483-L488](https://github.com/bokkypoobah/OAXSwimGatewayStableCoinContractAudit/blob/e80189b42bd24f83fae73b90c635d48d0fbd9f71/audit/test/functions.js#L483-L488)
* [ ] **MEDIUM IMPORTANCE** Add similar code to *DSRoles* to track changes to the 4 mapping data structures
* [ ] **MEDIUM IMPORTANCE** Add `emit Transfer(address(0), guy, wad)` to `FiatToken.mint(...)`
* [ ] **MEDIUM IMPORTANCE** Add `emit Transfer(guy, address(0), wad)` to `FiatToken.burn(...)`
* [ ] **MEDIUM IMPORTANCE** Remove the duplicate *MultiSigWalletFactory* from the bottom of [../chain/contracts/Multisig.sol](../chain/contracts/Multisig.sol)
* [ ] **LOW IMPORTANCE** Add event to log calls to `TransferFeeController.setDefaultTransferFee(...)`
* [ ] **LOW IMPORTANCE** Set `Kyc:ControllableKycAmlRule.addressControlStatus` to *public*
* [ ] **LOW IMPORTANCE** Set `Kyc:BoundaryKycAmlRule.kycAmlStatus` to *public*

<br />

<hr />

## Potential Vulnerabilities

**TODO** Check that no potential vulnerabilities have been identified in the smart contracts.

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

**TODO**

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

* [../chain/contracts/Multisig.sol](../chain/contracts/Multisig.sol) - This is the Gnosis MultiSigWallet.sol and MultiSigWalletFactory.sol but the factory is included twice

  [../chain/contracts/Multisig.sol](../chain/contracts/Multisig.sol) has been compared to [https://github.com/gnosis/MultiSigWallet/blob/e1b25e8632ca28e9e9e09c81bd20bf33fdb405ce/contracts/MultiSigWallet.sol](https://github.com/gnosis/MultiSigWallet/blob/e1b25e8632ca28e9e9e09c81bd20bf33fdb405ce/contracts/MultiSigWallet.sol) with the following results:

      $ diff MultiSigWallet.sol ../../chain/contracts/Multisig.sol 
      1,2c1
      < pragma solidity ^0.4.15;
      < 
      ---
      > pragma solidity 0.4.23;
      393a393,431
      > /// @title Multisignature wallet factory - Allows creation of multisig wallet.
      > /// @author Stefan George - <stefan.george@consensys.net>
      > contract MultiSigWalletFactory is Factory {
      > 
      >     /*
      >      * Public functions
      >      */
      >     /// @dev Allows verified creation of multisignature wallet.
      >     /// @param _owners List of initial owners.
      >     /// @param _required Number of required confirmations.
      >     /// @return Returns wallet address.
      >     function create(address[] _owners, uint _required)
      >         public
      >         returns (address wallet)
      >     {
      >         wallet = new MultiSigWallet(_owners, _required);
      >         register(wallet);
      >     }
      > }
      > 
      > /// @title Multisignature wallet factory - Allows creation of multisig wallet.
      > /// @author Stefan George - <stefan.george@consensys.net>
      > contract MultiSigWalletFactory is Factory {
      > 
      >     /*
      >      * Public functions
      >      */
      >     /// @dev Allows verified creation of multisignature wallet.
      >     /// @param _owners List of initial owners.
      >     /// @param _required Number of required confirmations.
      >     /// @return Returns wallet address.
      >     function create(address[] _owners, uint _required)
      >         public
      >         returns (address wallet)
      >     {
      >         wallet = new MultiSigWallet(_owners, _required);
      >         register(wallet);
      >      }
      > }

  Here is the last section of the comparison of [../chain/contracts/Multisig.sol](../chain/contracts/Multisig.sol) to [https://github.com/gnosis/MultiSigWallet/blob/e1b25e8632ca28e9e9e09c81bd20bf33fdb405ce/contracts/MultiSigWalletFactory.sol](https://github.com/gnosis/MultiSigWallet/blob/e1b25e8632ca28e9e9e09c81bd20bf33fdb405ce/contracts/MultiSigWalletFactory.sol):

                                                                      >                _transactionIds = new uint[](to - from);
                                                                      >                for (i=from; i<to; i++)
                                                                      >                    _transactionIds[i - from] = transactionIdsTemp[i]
                                                                      >            }
                                                                      >        }
        
        /// @title Multisignature wallet factory - Allows creation of        /// @title Multisignature wallet factory - Allows creation of
        /// @author Stefan George - <stefan.george@consensys.net>        /// @author Stefan George - <stefan.george@consensys.net>
        contract MultiSigWalletFactory is Factory {                        contract MultiSigWalletFactory is Factory {
        
            /*                                                                    /*
             * Public functions                                                     * Public functions
             */                                                                     */
            /// @dev Allows verified creation of multisignature walle            /// @dev Allows verified creation of multisignature walle
            /// @param _owners List of initial owners.                            /// @param _owners List of initial owners.
            /// @param _required Number of required confirmations.            /// @param _required Number of required confirmations.
            /// @return Returns wallet address.                                    /// @return Returns wallet address.
            function create(address[] _owners, uint _required)                    function create(address[] _owners, uint _required)
                public                                                                public
                returns (address wallet)                                        returns (address wallet)
            {                                                                    {
                wallet = new MultiSigWallet(_owners, _required);                wallet = new MultiSigWallet(_owners, _required);
                register(wallet);                                                register(wallet);
            }                                                                    }
        }                                                                }
        
                                                                      >        /// @title Multisignature wallet factory - Allows creation of
                                                                      >        /// @author Stefan George - <stefan.george@consensys.net>
                                                                      >        contract MultiSigWalletFactory is Factory {
                                                                      >
                                                                      >            /*
                                                                      >             * Public functions
                                                                      >             */
                                                                      >            /// @dev Allows verified creation of multisignature walle
                                                                      >            /// @param _owners List of initial owners.
                                                                      >            /// @param _required Number of required confirmations.
                                                                      >            /// @return Returns wallet address.
                                                                      >            function create(address[] _owners, uint _required)
                                                                      >                public
                                                                      >                returns (address wallet)
                                                                      >            {
                                                                      >                wallet = new MultiSigWallet(_owners, _required);
                                                                      >                register(wallet);
                                                                      >            }
                                                                      >        }

<br />

<br />

(c) BokkyPooBah / Bok Consulting Pty Ltd for OAX - Aug 13 2018. The MIT Licence.