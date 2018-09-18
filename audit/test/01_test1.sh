#!/bin/bash
# ----------------------------------------------------------------------------------------------
# Testing the smart contract
#
# Enjoy. (c) BokkyPooBah / Bok Consulting Pty Ltd 2017. The MIT Licence.
# ----------------------------------------------------------------------------------------------

source settings
echo "---------- Settings ----------" | tee $TEST1OUTPUT
cat ./settings | tee -a $TEST1OUTPUT
echo "" | tee -a $TEST1OUTPUT

CURRENTTIME=`date +%s`
CURRENTTIMES=`perl -le "print scalar localtime $CURRENTTIME"`
START_DATE=`echo "$CURRENTTIME+45" | bc`
START_DATE_S=`perl -le "print scalar localtime $START_DATE"`
END_DATE=`echo "$CURRENTTIME+60*2" | bc`
END_DATE_S=`perl -le "print scalar localtime $END_DATE"`

printf "CURRENTTIME               = '$CURRENTTIME' '$CURRENTTIMES'\n" | tee -a $TEST1OUTPUT
printf "START_DATE                = '$START_DATE' '$START_DATE_S'\n" | tee -a $TEST1OUTPUT
printf "END_DATE                  = '$END_DATE' '$END_DATE_S'\n" | tee -a $TEST1OUTPUT

# Make copy of SOL file ---
# rsync -rp $SOURCEDIR/* . --exclude=Multisig.sol --exclude=test/
rsync -rp $SOURCEDIR/* . --exclude=Multisig.sol
# Copy modified contracts if any files exist
find ./modifiedContracts -type f -name \* -exec cp {} . \;


# --- Modify parameters ---
`perl -pi -e "s/uint256 private defaultDelayTime;/uint256 public defaultDelayTime;/" LimitSetting.sol`
`perl -pi -e "s/uint256 private defaultDelayTimeBuffer;/uint256 public defaultDelayTimeBuffer;/" LimitSetting.sol`
`perl -pi -e "s/uint256 private lastDefaultDelaySettingResetTime;/uint256 public lastDefaultDelaySettingResetTime;/" LimitSetting.sol`
`perl -pi -e "s/uint256 private defaultMintDailyLimit;/uint256 public defaultMintDailyLimit;/" LimitSetting.sol`
`perl -pi -e "s/uint256 private defaultBurnDailyLimit;/uint256 public defaultBurnDailyLimit;/" LimitSetting.sol`
`perl -pi -e "s/uint256 private defaultMintDailyLimitBuffer;/uint256 public defaultMintDailyLimitBuffer;/" LimitSetting.sol`
`perl -pi -e "s/uint256 private defaultBurnDailyLimitBuffer;/uint256 public defaultBurnDailyLimitBuffer;/" LimitSetting.sol`

DIFFS1=`diff -r -x '*.js' -x '*.json' -x '*.txt' -x 'testchain' -x '*.md -x' -x '*.sh' -x 'settings' -x 'modifiedContracts' $SOURCEDIR .`
echo "--- Differences $SOURCEDIR/*.sol *.sol ---" | tee -a $TEST1OUTPUT
echo "$DIFFS1" | tee -a $TEST1OUTPUT


solc_0.4.23 --version | tee -a $TEST1OUTPUT

echo "var addressStatusOutput=`solc_0.4.23 --allow-paths . --optimize --pretty-json --combined-json abi,bin,interface $ADDRESSSTATUSSOL`;" > $ADDRESSSTATUSJS
echo "var gateRolesOutput=`solc_0.4.23 --allow-paths . --optimize --pretty-json --combined-json abi,bin,interface $GATEROLESSOL`;" > $GATEROLESJS
echo "var dappsysOutput=`solc_0.4.23 --allow-paths . --optimize --pretty-json --combined-json abi,bin,interface $DAPPSYSSOL`;" > $DAPPSYSJS
echo "var tokenRulesOutput=`solc_0.4.23 --allow-paths . --optimize --pretty-json --combined-json abi,bin,interface $TOKENRULESSOL`;" > $TOKENRULESJS
echo "var transferFeeControllerOutput=`solc_0.4.23 --allow-paths . --optimize --pretty-json --combined-json abi,bin,interface $TRANSFERFEECONTROLLERSOL`;" > $TRANSFERFEECONTROLLERJS
echo "var limitSettingOutput=`solc_0.4.23 --allow-paths . --optimize --pretty-json --combined-json abi,bin,interface $LIMITSETTINGSOL`;" > $LIMITSETTINGJS
echo "var membershipOutput=`solc_0.4.23 --allow-paths . --optimize --pretty-json --combined-json abi,bin,interface $MEMBERSHIPSOL`;" > $MEMBERSHIPJS
echo "var limitControllerOutput=`solc_0.4.23 --allow-paths . --optimize --pretty-json --combined-json abi,bin,interface $LIMITCONTROLLERSOL`;" > $LIMITCONTROLLERJS
echo "var fiatTokenOutput=`solc_0.4.23 --allow-paths . --optimize --pretty-json --combined-json abi,bin,interface $FIATTOKENSOL`;" > $FIATTOKENJS
echo "var gateWithFeeOutput=`solc_0.4.23 --allow-paths . --optimize --pretty-json --combined-json abi,bin,interface $GATEWITHFEESOL`;" > $GATEWITHFEEJS

geth --verbosity 3 attach $GETHATTACHPOINT << EOF | tee -a $TEST1OUTPUT
loadScript("$ADDRESSSTATUSJS");
loadScript("$GATEROLESJS");
loadScript("$DAPPSYSJS");
loadScript("$TOKENRULESJS");
loadScript("$TRANSFERFEECONTROLLERJS");
loadScript("$LIMITSETTINGJS");
loadScript("$MEMBERSHIPJS");
loadScript("$LIMITCONTROLLERJS");
loadScript("$FIATTOKENJS");
loadScript("$GATEWITHFEEJS");
loadScript("lookups.js");
loadScript("functions.js");


var addressStatusAbi = JSON.parse(addressStatusOutput.contracts["$ADDRESSSTATUSSOL:AddressStatus"].abi);
var addressStatusBin = "0x" + addressStatusOutput.contracts["$ADDRESSSTATUSSOL:AddressStatus"].bin;
var gateRolesAbi = JSON.parse(gateRolesOutput.contracts["$GATEROLESSOL:GateRoles"].abi);
var gateRolesBin = "0x" + gateRolesOutput.contracts["$GATEROLESSOL:GateRoles"].bin;
var fiatTokenGuardAbi = JSON.parse(dappsysOutput.contracts["$DAPPSYSSOL:DSGuard"].abi);
var fiatTokenGuardBin = "0x" + dappsysOutput.contracts["$DAPPSYSSOL:DSGuard"].bin;
var transferFeeControllerAbi = JSON.parse(transferFeeControllerOutput.contracts["$TRANSFERFEECONTROLLERSOL:TransferFeeController"].abi);
var transferFeeControllerBin = "0x" + transferFeeControllerOutput.contracts["$TRANSFERFEECONTROLLERSOL:TransferFeeController"].bin;
var limitSettingAbi = JSON.parse(limitSettingOutput.contracts["$LIMITSETTINGSOL:LimitSetting"].abi);
var limitSettingBin = "0x" + limitSettingOutput.contracts["$LIMITSETTINGSOL:LimitSetting"].bin;
var baseRuleAbi = JSON.parse(tokenRulesOutput.contracts["$TOKENRULESSOL:BaseRule"].abi);
var baseRuleBin = "0x" + tokenRulesOutput.contracts["$TOKENRULESSOL:BaseRule"].bin;
var boundaryKycRuleAbi = JSON.parse(tokenRulesOutput.contracts["$TOKENRULESSOL:BoundaryKycRule"].abi);
var boundaryKycRuleBin = "0x" + tokenRulesOutput.contracts["$TOKENRULESSOL:BoundaryKycRule"].bin;
var fullKycRuleAbi = JSON.parse(tokenRulesOutput.contracts["$TOKENRULESSOL:FullKycRule"].abi);
var fullKycRuleBin = "0x" + tokenRulesOutput.contracts["$TOKENRULESSOL:FullKycRule"].bin;
var mockMembershipAbi = JSON.parse(membershipOutput.contracts["$MEMBERSHIPSOL:MockOAXMembership"].abi);
var mockMembershipBin = "0x" + membershipOutput.contracts["$MEMBERSHIPSOL:MockOAXMembership"].bin;
var limitControllerAbi = JSON.parse(limitControllerOutput.contracts["$LIMITCONTROLLERSOL:LimitController"].abi);
var limitControllerBin = "0x" + limitControllerOutput.contracts["$LIMITCONTROLLERSOL:LimitController"].bin;
var fiatTokenAbi = JSON.parse(fiatTokenOutput.contracts["$FIATTOKENSOL:FiatToken"].abi);
var fiatTokenBin = "0x" + fiatTokenOutput.contracts["$FIATTOKENSOL:FiatToken"].bin;
var gateWithFeeAbi = JSON.parse(gateWithFeeOutput.contracts["$GATEWITHFEESOL:GateWithFee"].abi);
var gateWithFeeBin = "0x" + gateWithFeeOutput.contracts["$GATEWITHFEESOL:GateWithFee"].bin;

// console.log("DATA: addressStatusAbi=" + JSON.stringify(addressStatusAbi));
// console.log("DATA: addressStatusBin=" + JSON.stringify(addressStatusBin));
// console.log("DATA: gateRolesAbi=" + JSON.stringify(gateRolesAbi));
// console.log("DATA: gateRolesBin=" + JSON.stringify(gateRolesBin));
// console.log("DATA: fiatTokenGuardAbi=" + JSON.stringify(fiatTokenGuardAbi));
// console.log("DATA: fiatTokenGuardBin=" + JSON.stringify(fiatTokenGuardBin));
// console.log("DATA: transferFeeControllerAbi=" + JSON.stringify(transferFeeControllerAbi));
// console.log("DATA: transferFeeControllerBin=" + JSON.stringify(transferFeeControllerBin));
// console.log("DATA: limitSettingAbi=" + JSON.stringify(limitSettingAbi));
// console.log("DATA: limitSettingBin=" + JSON.stringify(limitSettingBin));
// console.log("DATA: baseRuleAbi=" + JSON.stringify(baseRuleAbi));
// console.log("DATA: baseRuleBin=" + JSON.stringify(baseRuleBin));
// console.log("DATA: boundaryKycRuleAbi=" + JSON.stringify(boundaryKycRuleAbi));
// console.log("DATA: boundaryKycRuleBin=" + JSON.stringify(boundaryKycRuleBin));
// console.log("DATA: fullKycRuleAbi=" + JSON.stringify(fullKycRuleAbi));
// console.log("DATA: fullKycRuleBin=" + JSON.stringify(fullKycRuleBin));
// console.log("DATA: mockMembershipAbi=" + JSON.stringify(mockMembershipAbi));
// console.log("DATA: mockMembershipBin=" + JSON.stringify(mockMembershipBin));
// console.log("DATA: limitControllerAbi=" + JSON.stringify(limitControllerAbi));
// console.log("DATA: limitControllerBin=" + JSON.stringify(limitControllerBin));
// console.log("DATA: fiatTokenAbi=" + JSON.stringify(fiatTokenAbi));
// console.log("DATA: fiatTokenBin=" + JSON.stringify(fiatTokenBin));
// console.log("DATA: gateWithFeeAbi=" + JSON.stringify(gateWithFeeAbi));
// console.log("DATA: gateWithFeeBin=" + JSON.stringify(gateWithFeeBin));


unlockAccounts("$PASSWORD");
printBalances();
console.log("RESULT: ");


// -----------------------------------------------------------------------------
var deployGroup1Message = "Deploy Group #1";
// -----------------------------------------------------------------------------
console.log("RESULT: ---------- " + deployGroup1Message + " ----------");
var gateRolesContract = web3.eth.contract(gateRolesAbi);
var gateRolesTx = null;
var gateRolesAddress = null;
var gateRoles = gateRolesContract.new({from: deployer, data: gateRolesBin, gas: 2000000, gasPrice: defaultGasPrice},
  function(e, contract) {
    if (!e) {
      if (!contract.address) {
        gateRolesTx = contract.transactionHash;
      } else {
        gateRolesAddress = contract.address;
        addAccount(gateRolesAddress, "GateRoles");
        addGateRolesContractAddressAndAbi(gateRolesAddress, gateRolesAbi);
        console.log("DATA: var gateRolesAddress=\"" + gateRolesAddress + "\";");
        console.log("DATA: var gateRolesAbi=" + JSON.stringify(gateRolesAbi) + ";");
        console.log("DATA: var gateRoles=eth.contract(gateRolesAbi).at(gateRolesAddress);");
      }
    }
  }
);
var fiatTokenGuardContract = web3.eth.contract(fiatTokenGuardAbi);
var fiatTokenGuardTx = null;
var fiatTokenGuardAddress = null;
var fiatTokenGuard = fiatTokenGuardContract.new({from: deployer, data: fiatTokenGuardBin, gas: 2000000, gasPrice: defaultGasPrice},
  function(e, contract) {
    if (!e) {
      if (!contract.address) {
        fiatTokenGuardTx = contract.transactionHash;
      } else {
        fiatTokenGuardAddress = contract.address;
        addAccount(fiatTokenGuardAddress, "FiatTokenGuard");
        addTokenGuardContractAddressAndAbi(fiatTokenGuardAddress, fiatTokenGuardAbi);
        console.log("DATA: var fiatTokenGuardAddress=\"" + fiatTokenGuardAddress + "\";");
        console.log("DATA: var fiatTokenGuardAbi=" + JSON.stringify(fiatTokenGuardAbi) + ";");
        console.log("DATA: var fiatTokenGuard=eth.contract(fiatTokenGuardAbi).at(fiatTokenGuardAddress);");
      }
    }
  }
);
while (txpool.status.pending > 0) {
}
printBalances();
failIfTxStatusError(gateRolesTx, deployGroup1Message + " - GateRoles");
failIfTxStatusError(fiatTokenGuardTx, deployGroup1Message + " - FiatTokenGuard");
printTxData("gateRolesTx", gateRolesTx);
printTxData("fiatTokenGuardTx", fiatTokenGuardTx);
printGateRolesContractDetails();
printTokenGuardContractDetails();
console.log("RESULT: ");


// -----------------------------------------------------------------------------
var deployGroup2Message = "Deploy Group #2";
// -----------------------------------------------------------------------------
console.log("RESULT: ---------- " + deployGroup2Message + " ----------");
var blacklistContract = web3.eth.contract(addressStatusAbi);
var blacklistTx = null;
var blacklistAddress = null;
var blacklist = blacklistContract.new(gateRolesAddress, {from: deployer, data: addressStatusBin, gas: 2000000, gasPrice: defaultGasPrice},
  function(e, contract) {
    if (!e) {
      if (!contract.address) {
        blacklistTx = contract.transactionHash;
      } else {
        blacklistAddress = contract.address;
        addAccount(blacklistAddress, "Blacklist(AddressStatus)");
        addBlacklistContractAddressAndAbi(blacklistAddress, addressStatusAbi);
        console.log("DATA: var blacklistAddress=\"" + blacklistAddress + "\";");
        console.log("DATA: var blacklistAbi=" + JSON.stringify(addressStatusAbi) + ";");
        console.log("DATA: var blacklist=eth.contract(blacklistAbi).at(blacklistAddress);");
      }
    }
  }
);
var kycContract = web3.eth.contract(addressStatusAbi);
var kycTx = null;
var kycAddress = null;
var kyc = kycContract.new(gateRolesAddress, {from: deployer, data: addressStatusBin, gas: 2000000, gasPrice: defaultGasPrice},
  function(e, contract) {
    if (!e) {
      if (!contract.address) {
        kycTx = contract.transactionHash;
      } else {
        kycAddress = contract.address;
        addAccount(kycAddress, "Kyc(AddressStatus)");
        addKycContractAddressAndAbi(kycAddress, addressStatusAbi);
        console.log("DATA: var kycAddress=\"" + kycAddress + "\";");
        console.log("DATA: var kycAbi=" + JSON.stringify(addressStatusAbi) + ";");
        console.log("DATA: var kyc=eth.contract(kycAbi).at(kycAddress);");
      }
    }
  }
);
var mockMembershipContract = web3.eth.contract(mockMembershipAbi);
var mockMembershipTx = null;
var mockMembershipAddress = null;
var mockMembership = mockMembershipContract.new(gateRolesAddress,{from: deployer, data: mockMembershipBin, gas: 2000000, gasPrice: defaultGasPrice},
  function(e, contract) {
    if (!e) {
      if (!contract.address) {
        mockMembershipTx = contract.transactionHash;
      } else {
        mockMembershipAddress = contract.address;
        addAccount(mockMembershipAddress, "MockMembership");
        addMockMembershipContractAddressAndAbi(mockMembershipAddress, mockMembershipAbi);
        console.log("DATA: mockMembershipAddress=\"" + mockMembershipAddress + "\";");
        console.log("DATA: var mockMembershipAddress=\"" + mockMembershipAddress + "\";");
        console.log("DATA: var mockMembershipAbi=" + JSON.stringify(mockMembershipAbi) + ";");
        console.log("DATA: var mockMembership=eth.contract(mockMembershipAbi).at(mockMembershipAddress);");
      }
    }
  }
);
var transferFeeControllerContract = web3.eth.contract(transferFeeControllerAbi);
var transferFeeControllerTx = null;
var transferFeeControllerAddress = null;
var transferFeeController = transferFeeControllerContract.new(gateRolesAddress, 0, 0, {from: deployer, data: transferFeeControllerBin, gas: 2000000, gasPrice: defaultGasPrice},
  function(e, contract) {
    if (!e) {
      if (!contract.address) {
        transferFeeControllerTx = contract.transactionHash;
      } else {
        transferFeeControllerAddress = contract.address;
        addAccount(transferFeeControllerAddress, "TransferFeeController");
        addTransferFeeControllerContractAddressAndAbi(transferFeeControllerAddress, transferFeeControllerAbi);
        console.log("DATA: var transferFeeControllerAddress=\"" + transferFeeControllerAddress + "\";");
        console.log("DATA: var transferFeeControllerAbi=" + JSON.stringify(transferFeeControllerAbi) + ";");
        console.log("DATA: var transferFeeController=eth.contract(transferFeeControllerAbi).at(transferFeeControllerAddress);");
      }
    }
  }
);
var limitSettingContract = web3.eth.contract(limitSettingAbi);
var limitSettingTx = null;
var limitSettingAddress = null;
var limitSetting = limitSettingContract.new(gateRolesAddress, $MINT_LIMIT, $BURN_LIMIT, $DEFAULT_LIMIT_COUNTER_RESET_TIME_OFFSET, $DEFAULT_SETTING_DELAY_HOURS, {from: deployer, data: limitSettingBin, gas: 2000000, gasPrice: defaultGasPrice},
  function(e, contract) {
    if (!e) {
      if (!contract.address) {
        limitSettingTx = contract.transactionHash;
      } else {
        limitSettingAddress = contract.address;
        addAccount(limitSettingAddress, "LimitSetting");
        addLimitSettingContractAddressAndAbi(limitSettingAddress, limitSettingAbi);
        console.log("DATA: var limitSettingAddress=\"" + limitSettingAddress + "\";");
        console.log("DATA: var limitSettingAbi=" + JSON.stringify(limitSettingAbi) + ";");
        console.log("DATA: var limitSetting=eth.contract(limitSettingAbi).at(limitSettingAddress);");
      }
    }
  }
);
while (txpool.status.pending > 0) {
}
printBalances();
failIfTxStatusError(blacklistTx, deployGroup2Message + " - Blacklist(AddressStatus)");
failIfTxStatusError(kycTx, deployGroup2Message + " - Kyc(AddressStatus)");
failIfTxStatusError(mockMembershipTx, deployGroup2Message + " - MockMembership");
failIfTxStatusError(transferFeeControllerTx, deployGroup2Message + " - TransferFeeController");
failIfTxStatusError(limitSettingTx, deployGroup2Message + " - LimitSetting");
printTxData("blacklistTx", blacklistTx);
printTxData("kycTx", kycTx);
printTxData("mockMembershipTx", mockMembershipTx);
printTxData("transferFeeControllerTx", transferFeeControllerTx);
printTxData("limitSettingTx", limitSettingTx);
printBlacklistContractDetails();
printKycContractDetails();
printMockMembershipContractDetails();
printTransferFeeControllerContractDetails();
printLimitSettingContractDetails();
console.log("RESULT: ");


// -----------------------------------------------------------------------------
var deployGroup3Message = "Deploy Group #3";
// -----------------------------------------------------------------------------
console.log("RESULT: ---------- " + deployGroup3Message + " ----------");
var baseRuleContract = web3.eth.contract(baseRuleAbi);
var baseRuleTx = null;
var baseRuleAddress = null;
var baseRule = baseRuleContract.new(blacklistAddress, {from: deployer, data: baseRuleBin, gas: 2000000, gasPrice: defaultGasPrice},
  function(e, contract) {
    if (!e) {
      if (!contract.address) {
        baseRuleTx = contract.transactionHash;
      } else {
        baseRuleAddress = contract.address;
        addAccount(baseRuleAddress, "BaseRule");
        addBaseRuleContractAddressAndAbi(baseRuleAddress, baseRuleAbi);
        console.log("DATA: var baseRuleAddress=\"" + baseRuleAddress + "\";");
        console.log("DATA: var baseRuleAbi=" + JSON.stringify(baseRuleAbi) + ";");
        console.log("DATA: var baseRule=eth.contract(baseRuleAbi).at(baseRuleAddress);");
      }
    }
  }
);
var boundaryKycRuleContract = web3.eth.contract(boundaryKycRuleAbi);
var boundaryKycRuleTx = null;
var boundaryKycRuleAddress = null;
var boundaryKycRule = boundaryKycRuleContract.new(blacklistAddress, kycAddress, mockMembershipAddress, {from: deployer, data: boundaryKycRuleBin, gas: 2000000, gasPrice: defaultGasPrice},
  function(e, contract) {
    if (!e) {
      if (!contract.address) {
        boundaryKycRuleTx = contract.transactionHash;
      } else {
        boundaryKycRuleAddress = contract.address;
        addAccount(boundaryKycRuleAddress, "BoundaryKycRule");
        addBoundaryKycRuleContractAddressAndAbi(boundaryKycRuleAddress, boundaryKycRuleAbi);
        console.log("DATA: var boundaryKycRuleAddress=\"" + boundaryKycRuleAddress + "\";");
        console.log("DATA: var boundaryKycRuleAbi=" + JSON.stringify(boundaryKycRuleAbi) + ";");
        console.log("DATA: var boundaryKycRule=eth.contract(boundaryKycRuleAbi).at(boundaryKycRuleAddress);");
      }
    }
  }
);
var fullKycRuleContract = web3.eth.contract(fullKycRuleAbi);
var fullKycRuleTx = null;
var fullKycRuleAddress = null;
var fullKycRule = fullKycRuleContract.new(blacklistAddress, kycAddress, mockMembershipAddress, {from: deployer, data: fullKycRuleBin, gas: 2000000, gasPrice: defaultGasPrice},
  function(e, contract) {
    if (!e) {
      if (!contract.address) {
        fullKycRuleTx = contract.transactionHash;
      } else {
        fullKycRuleAddress = contract.address;
        addAccount(fullKycRuleAddress, "FullKycRule");
        addFullKycRuleContractAddressAndAbi(fullKycRuleAddress, fullKycRuleAbi);
        console.log("DATA: var fullKycRuleAddress=\"" + fullKycRuleAddress + "\";");
        console.log("DATA: var fullKycRuleAbi=" + JSON.stringify(fullKycRuleAbi) + ";");
        console.log("DATA: var fullKycRule=eth.contract(fullKycRuleAbi).at(fullKycRuleAddress);");
      }
    }
  }
);
var limitControllerContract = web3.eth.contract(limitControllerAbi);
var limitControllerTx = null;
var limitControllerAddress = null;
var limitController = limitControllerContract.new(fiatTokenGuardAddress, limitSettingAddress, {from: deployer, data: limitControllerBin, gas: 2000000, gasPrice: defaultGasPrice},
  function(e, contract) {
    if (!e) {
      if (!contract.address) {
        limitControllerTx = contract.transactionHash;
      } else {
        limitControllerAddress = contract.address;
        addAccount(limitControllerAddress, "LimitController");
        addLimitControllerContractAddressAndAbi(limitControllerAddress, limitControllerAbi);
        console.log("DATA: var limitControllerAddress=\"" + limitControllerAddress + "\";");
        console.log("DATA: var limitControllerAbi=" + JSON.stringify(limitControllerAbi) + ";");
        console.log("DATA: var limitController=eth.contract(limitControllerAbi).at(limitControllerAddress);");
      }
    }
  }
);
var fiatTokenContract = web3.eth.contract(fiatTokenAbi);
var fiatTokenTx = null;
var fiatTokenAddress = null;
var fiatToken = fiatTokenContract.new(fiatTokenGuardAddress, "USD", "USDToken", transferFeeCollector, transferFeeControllerAddress, {from: deployer, data: fiatTokenBin, gas: 2000000, gasPrice: defaultGasPrice},
  function(e, contract) {
    if (!e) {
      if (!contract.address) {
        fiatTokenTx = contract.transactionHash;
      } else {
        fiatTokenAddress = contract.address;
        addAccount(fiatTokenAddress, "FiatToken '" + web3.toUtf8(fiatToken.symbol()) + "' '" + web3.toUtf8(fiatToken.name()) + "'");
        addTokenAContractAddressAndAbi(fiatTokenAddress, fiatTokenAbi);
        console.log("DATA: var fiatTokenAddress=\"" + fiatTokenAddress + "\";");
        console.log("DATA: var fiatTokenAbi=" + JSON.stringify(fiatTokenAbi) + ";");
        console.log("DATA: var fiatToken=eth.contract(fiatTokenAbi).at(fiatTokenAddress);");
      }
    }
  }
);
while (txpool.status.pending > 0) {
}
printBalances();
failIfTxStatusError(baseRuleTx, deployGroup3Message + " - BaseRule");
failIfTxStatusError(boundaryKycRuleTx, deployGroup3Message + " - BoundaryKycRule");
failIfTxStatusError(fullKycRuleTx, deployGroup3Message + " - FullKycRule");
failIfTxStatusError(limitControllerTx, deployGroup3Message + " - LimitController");
failIfTxStatusError(fiatTokenTx, deployGroup3Message + " - FiatToken");
printTxData("baseRuleTx", baseRuleTx);
printTxData("boundaryKycRuleTx", boundaryKycRuleTx);
printTxData("fullKycRuleTx", fullKycRuleTx);
printTxData("limitControllerTx", limitControllerTx);
printTxData("fiatTokenTx", fiatTokenTx);
printBaseRuleContractDetails();
printBoundaryKycRuleContractDetails();
printFullKycRuleContractDetails();
printLimitControllerContractDetails();
printTokenAContractDetails();
console.log("RESULT: ");


// -----------------------------------------------------------------------------
var setUserRoles1Message = "Set User Roles";
var SYSTEM_ADMIN_ROLE = gateRoles.SYSTEM_ADMIN();
var KYC_OPERATOR_ROLE = gateRoles.KYC_OPERATOR();
var MONEY_OPERATOR_ROLE = gateRoles.MONEY_OPERATOR();
// -----------------------------------------------------------------------------
console.log("RESULT: ---------- " + setUserRoles1Message + " ----------");
var setUserRoles1_1Tx = gateRoles.setUserRole(sysAdmin, SYSTEM_ADMIN_ROLE, true, {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setUserRoles1_2Tx = gateRoles.setUserRole(kycOperator, KYC_OPERATOR_ROLE, true, {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setUserRoles1_3Tx = gateRoles.setUserRole(moneyOperator, MONEY_OPERATOR_ROLE, true, {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
while (txpool.status.pending > 0) {
}
printBalances();
failIfTxStatusError(setUserRoles1_1Tx, setUserRoles1Message + " - setUserRole(sysAdmin, SYSTEM_ADMIN_ROLE, true)");
failIfTxStatusError(setUserRoles1_2Tx, setUserRoles1Message + " - setUserRole(kycOperator, KYC_OPERATOR_ROLE, true)");
failIfTxStatusError(setUserRoles1_3Tx, setUserRoles1Message + " - setUserRole(moneyOperator, MONEY_OPERATOR_ROLE, true)");
printTxData("setUserRoles1_1Tx", setUserRoles1_1Tx);
printTxData("setUserRoles1_2Tx", setUserRoles1_2Tx);
printTxData("setUserRoles1_3Tx", setUserRoles1_3Tx);
printGateRolesContractDetails();
console.log("RESULT: ");


// -----------------------------------------------------------------------------
var setRoleRules1Message = "Set Roles Rules #1";
// -----------------------------------------------------------------------------
console.log("RESULT: ---------- " + setRoleRules1Message + " ----------");
var setRoleRules1_1Tx = gateRoles.setRoleCapability(KYC_OPERATOR_ROLE, kycAddress, web3.sha3("set(address,bool)").substring(0, 10), true, {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setRoleRules1_2Tx = gateRoles.setRoleCapability(MONEY_OPERATOR_ROLE, blacklistAddress, web3.sha3("set(address,bool)").substring(0, 10), true, {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setRoleRules1_3Tx = gateRoles.setRoleCapability(SYSTEM_ADMIN_ROLE, limitSettingAddress, web3.sha3("setDefaultDelayHours(uint256)").substring(0, 10), true, {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setRoleRules1_4Tx = gateRoles.setRoleCapability(SYSTEM_ADMIN_ROLE, limitSettingAddress, web3.sha3("setLimitCounterResetTimeOffset(int256)").substring(0, 10), true, {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setRoleRules1_5Tx = gateRoles.setRoleCapability(SYSTEM_ADMIN_ROLE, limitSettingAddress, web3.sha3("setDefaultMintDailyLimit(uint256)").substring(0, 10), true, {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setRoleRules1_6Tx = gateRoles.setRoleCapability(SYSTEM_ADMIN_ROLE, limitSettingAddress, web3.sha3("setDefaultBurnDailyLimit(uint256)").substring(0, 10), true, {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setRoleRules1_7Tx = gateRoles.setRoleCapability(SYSTEM_ADMIN_ROLE, limitSettingAddress, web3.sha3("setCustomMintDailyLimit(address,uint256)").substring(0, 10), true, {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setRoleRules1_8Tx = gateRoles.setRoleCapability(SYSTEM_ADMIN_ROLE, limitSettingAddress, web3.sha3("setCustomBurnDailyLimit(address,uint256)").substring(0, 10), true, {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setRoleRules1_9Tx = gateRoles.setRoleCapability(SYSTEM_ADMIN_ROLE, transferFeeControllerAddress, web3.sha3("setDefaultTransferFee(uint256,uint256)").substring(0, 10), true, {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
while (txpool.status.pending > 0) {
}
printBalances();
failIfTxStatusError(setRoleRules1_1Tx, setRoleRules1Message + " - setRoleCapability(KYC_OPERATOR_ROLE, kyc, web3.sha3(\"set(address,bool)\").substring(0, 10), true)");
failIfTxStatusError(setRoleRules1_2Tx, setRoleRules1Message + " - setRoleCapability(MONEY_OPERATOR_ROLE, blacklist, web3.sha3(\"set(address,bool)\").substring(0, 10), true");
failIfTxStatusError(setRoleRules1_3Tx, setRoleRules1Message + " - setRoleCapability(SYSTEM_ADMIN_ROLE, limitSettingAddress, web3.sha3(\"setDefaultDelayHours(uint256)\").substring(0, 10), true)");
failIfTxStatusError(setRoleRules1_4Tx, setRoleRules1Message + " - setRoleCapability(SYSTEM_ADMIN_ROLE, limitSettingAddress, web3.sha3(\"setLimitCounterResetTimeOffset(int256)\").substring(0, 10), true)");
failIfTxStatusError(setRoleRules1_5Tx, setRoleRules1Message + " - setRoleCapability(SYSTEM_ADMIN_ROLE, limitSettingAddress, web3.sha3(\"setDefaultMintDailyLimit(uint256)\").substring(0, 10), true)");
failIfTxStatusError(setRoleRules1_6Tx, setRoleRules1Message + " - setRoleCapability(SYSTEM_ADMIN_ROLE, limitSettingAddress, web3.sha3(\"setDefaultBurnDailyLimit(uint256)\").substring(0, 10), true)");
failIfTxStatusError(setRoleRules1_7Tx, setRoleRules1Message + " - setRoleCapability(SYSTEM_ADMIN_ROLE, limitSettingAddress, web3.sha3(\"setCustomMintDailyLimit(address,uint256)\").substring(0, 10), true)");
failIfTxStatusError(setRoleRules1_8Tx, setRoleRules1Message + " - setRoleCapability(SYSTEM_ADMIN_ROLE, limitSettingAddress, web3.sha3(\"setCustomBurnDailyLimit(address,uint256)\").substring(0, 10), true)");
failIfTxStatusError(setRoleRules1_9Tx, setRoleRules1Message + " - setRoleCapability(SYSTEM_ADMIN_ROLE, transferFeeControllerAddress, web3.sha3(\"setDefaultTransferFee(uint256,uint256)\").substring(0, 10), true)");
printTxData("setRoleRules1_1Tx", setRoleRules1_1Tx);
printTxData("setRoleRules1_2Tx", setRoleRules1_2Tx);
printTxData("setRoleRules1_3Tx", setRoleRules1_3Tx);
printTxData("setRoleRules1_4Tx", setRoleRules1_4Tx);
printTxData("setRoleRules1_5Tx", setRoleRules1_5Tx);
printTxData("setRoleRules1_6Tx", setRoleRules1_6Tx);
printTxData("setRoleRules1_7Tx", setRoleRules1_6Tx);
printTxData("setRoleRules1_8Tx", setRoleRules1_8Tx);
printTxData("setRoleRules1_9Tx", setRoleRules1_9Tx);
printGateRolesContractDetails();
console.log("RESULT: ");


// -----------------------------------------------------------------------------
var deployGroup4Message = "Deploy Group #4";
// -----------------------------------------------------------------------------
console.log("RESULT: ---------- " + deployGroup2Message + " ----------");
var gateWithFeeContract = web3.eth.contract(gateWithFeeAbi);
var gateWithFeeTx = null;
var gateWithFeeAddress = null;
var gateWithFee = gateWithFeeContract.new(gateRolesAddress, fiatTokenAddress, limitControllerAddress, mintFeeCollector, burnFeeCollector, {from: deployer, data: gateWithFeeBin, gas: 4000000, gasPrice: defaultGasPrice},
  function(e, contract) {
    if (!e) {
      if (!contract.address) {
        gateWithFeeTx = contract.transactionHash;
      } else {
        gateWithFeeAddress = contract.address;
        addAccount(gateWithFeeAddress, "GateWithFee");
        addGateWithFeeContractAddressAndAbi(gateWithFeeAddress, gateWithFeeAbi);
        console.log("DATA: var gateWithFeeAddress=\"" + gateWithFeeAddress + "\";");
        console.log("DATA: var gateWithFeeAbi=" + JSON.stringify(gateWithFeeAbi) + ";");
        console.log("DATA: var gateWithFee=eth.contract(gateWithFeeAbi).at(gateWithFeeAddress);");
      }
    }
  }
);
while (txpool.status.pending > 0) {
}
printBalances();
failIfTxStatusError(gateWithFeeTx, deployGroup4Message + " - GateWithFee");
printTxData("gateWithFeeTx", gateWithFeeTx);
printGateWithFeeContractDetails();
console.log("RESULT: ");


// -----------------------------------------------------------------------------
var setRoleRules2Message = "Set Roles Rules #2";
// -----------------------------------------------------------------------------
console.log("RESULT: ---------- " + setRoleRules2Message + " ----------");
var setRoleRules2_1Tx = gateRoles.setRoleCapability(MONEY_OPERATOR_ROLE, gateWithFeeAddress, web3.sha3("mint(uint256)").substring(0, 10), true, {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setRoleRules2_2Tx = gateRoles.setRoleCapability(MONEY_OPERATOR_ROLE, gateWithFeeAddress, web3.sha3("mint(address,uint256)").substring(0, 10), true, {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setRoleRules2_3Tx = gateRoles.setRoleCapability(MONEY_OPERATOR_ROLE, gateWithFeeAddress, web3.sha3("burn(uint256)").substring(0, 10), true, {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setRoleRules2_4Tx = gateRoles.setRoleCapability(MONEY_OPERATOR_ROLE, gateWithFeeAddress, web3.sha3("burn(address,uint256)").substring(0, 10), true, {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setRoleRules2_5Tx = gateRoles.setRoleCapability(MONEY_OPERATOR_ROLE, gateWithFeeAddress, web3.sha3("start()").substring(0, 10), true, {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setRoleRules2_6Tx = gateRoles.setRoleCapability(MONEY_OPERATOR_ROLE, gateWithFeeAddress, web3.sha3("stop()").substring(0, 10), true, {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setRoleRules2_7Tx = gateRoles.setRoleCapability(MONEY_OPERATOR_ROLE, gateWithFeeAddress, web3.sha3("startToken()").substring(0, 10), true, {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setRoleRules2_8Tx = gateRoles.setRoleCapability(MONEY_OPERATOR_ROLE, gateWithFeeAddress, web3.sha3("stopToken()").substring(0, 10), true, {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setRoleRules2_9Tx = gateRoles.setRoleCapability(SYSTEM_ADMIN_ROLE, gateWithFeeAddress, web3.sha3("setERC20Authority(address)").substring(0, 10), true, {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setRoleRules2_10Tx = gateRoles.setRoleCapability(SYSTEM_ADMIN_ROLE, gateWithFeeAddress, web3.sha3("setTokenAuthority(address)").substring(0, 10), true, {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setRoleRules2_11Tx = gateRoles.setRoleCapability(SYSTEM_ADMIN_ROLE, gateWithFeeAddress, web3.sha3("setLimitController(address)").substring(0, 10), true, {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setRoleRules2_12Tx = gateRoles.setRoleCapability(MONEY_OPERATOR_ROLE, gateWithFeeAddress, web3.sha3("mintWithFee(address,uint256,uint256)").substring(0, 10), true, {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setRoleRules2_13Tx = gateRoles.setRoleCapability(MONEY_OPERATOR_ROLE, gateWithFeeAddress, web3.sha3("burnWithFee(address,uint256,uint256)").substring(0, 10), true, {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setRoleRules2_14Tx = gateRoles.setRoleCapability(SYSTEM_ADMIN_ROLE, gateWithFeeAddress, web3.sha3("setFeeCollector(address)").substring(0, 10), true, {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setRoleRules2_15Tx = gateRoles.setRoleCapability(SYSTEM_ADMIN_ROLE, gateWithFeeAddress, web3.sha3("setTransferFeeCollector(address)").substring(0, 10), true, {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setRoleRules2_16Tx = gateRoles.setRoleCapability(SYSTEM_ADMIN_ROLE, gateWithFeeAddress, web3.sha3("setTransferFeeController(address)").substring(0, 10), true, {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setRoleRules2_17Tx = gateRoles.setRoleCapability(SYSTEM_ADMIN_ROLE, gateWithFeeAddress, web3.sha3("setMintFeeCollector(address)").substring(0, 10), true, {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setRoleRules2_18Tx = gateRoles.setRoleCapability(SYSTEM_ADMIN_ROLE, gateWithFeeAddress, web3.sha3("setBurnFeeCollector(address)").substring(0, 10), true, {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
while (txpool.status.pending > 0) {
}
printBalances();
failIfTxStatusError(setRoleRules2_1Tx, setRoleRules2Message + " - setRoleCapability(MONEY_OPERATOR_ROLE, gateWithFeeAddress, web3.sha3(\"mint(uint256)\").substring(0, 10), true)");
failIfTxStatusError(setRoleRules2_2Tx, setRoleRules2Message + " - setRoleCapability(MONEY_OPERATOR_ROLE, gateWithFeeAddress, web3.sha3(\"mint(address,uint256)\").substring(0, 10), true");
failIfTxStatusError(setRoleRules2_3Tx, setRoleRules2Message + " - setRoleCapability(MONEY_OPERATOR_ROLE, gateWithFeeAddress, web3.sha3(\"burn(uint256)\").substring(0, 10), true)");
failIfTxStatusError(setRoleRules2_4Tx, setRoleRules2Message + " - setRoleCapability(MONEY_OPERATOR_ROLE, gateWithFeeAddress, web3.sha3(\"burn(address,uint256)\").substring(0, 10), true)");
failIfTxStatusError(setRoleRules2_5Tx, setRoleRules2Message + " - setRoleCapability(MONEY_OPERATOR_ROLE, gateWithFeeAddress, web3.sha3(\"start()\").substring(0, 10), true)");
failIfTxStatusError(setRoleRules2_6Tx, setRoleRules2Message + " - setRoleCapability(MONEY_OPERATOR_ROLE, gateWithFeeAddress, web3.sha3(\"stop()\").substring(0, 10), true)");
failIfTxStatusError(setRoleRules2_7Tx, setRoleRules2Message + " - setRoleCapability(MONEY_OPERATOR_ROLE, gateWithFeeAddress, web3.sha3(\"startToken()\").substring(0, 10), true)");
failIfTxStatusError(setRoleRules2_8Tx, setRoleRules2Message + " - setRoleCapability(MONEY_OPERATOR_ROLE, gateWithFeeAddress, web3.sha3(\"stopToken()\").substring(0, 10), true)");
failIfTxStatusError(setRoleRules2_9Tx, setRoleRules2Message + " - setRoleCapability(SYSTEM_ADMIN_ROLE, gateWithFeeAddress, web3.sha3(\"setERC20Authority(address)\").substring(0, 10), true)");
failIfTxStatusError(setRoleRules2_10Tx, setRoleRules2Message + " - setRoleCapability(SYSTEM_ADMIN_ROLE, gateWithFeeAddress, web3.sha3(\"setTokenAuthority(address)\").substring(0, 10), true)");
failIfTxStatusError(setRoleRules2_11Tx, setRoleRules2Message + " - setRoleCapability(SYSTEM_ADMIN_ROLE, gateWithFeeAddress, web3.sha3(\"setLimitController(address)\").substring(0, 10), true)");
failIfTxStatusError(setRoleRules2_12Tx, setRoleRules2Message + " - setRoleCapability(MONEY_OPERATOR_ROLE, gateWithFeeAddress, web3.sha3(\"mintWithFee(address,uint256,uint256)\").substring(0, 10), true)");
failIfTxStatusError(setRoleRules2_13Tx, setRoleRules2Message + " - setRoleCapability(MONEY_OPERATOR_ROLE, gateWithFeeAddress, web3.sha3(\"burnWithFee(address,uint256,uint256)\").substring(0, 10), true)");
failIfTxStatusError(setRoleRules2_14Tx, setRoleRules2Message + " - setRoleCapability(SYSTEM_ADMIN_ROLE, gateWithFeeAddress, web3.sha3(\"setFeeCollector(address)\").substring(0, 10), true)");
failIfTxStatusError(setRoleRules2_15Tx, setRoleRules2Message + " - setRoleCapability(SYSTEM_ADMIN_ROLE, gateWithFeeAddress, web3.sha3(\"setTransferFeeCollector(address)\").substring(0, 10), true)");
failIfTxStatusError(setRoleRules2_16Tx, setRoleRules2Message + " - setRoleCapability(SYSTEM_ADMIN_ROLE, gateWithFeeAddress, web3.sha3(\"setTransferFeeController(address)\").substring(0, 10), true)");
failIfTxStatusError(setRoleRules2_17Tx, setRoleRules2Message + " - setRoleCapability(SYSTEM_ADMIN_ROLE, gateWithFeeAddress, web3.sha3(\"setMintFeeCollector(address)\").substring(0, 10), true)");
failIfTxStatusError(setRoleRules2_18Tx, setRoleRules2Message + " - setRoleCapability(SYSTEM_ADMIN_ROLE, gateWithFeeAddress, web3.sha3(\"setBurnFeeCollector(address)\").substring(0, 10), true)");
printTxData("setRoleRules2_1Tx", setRoleRules2_1Tx);
printTxData("setRoleRules2_2Tx", setRoleRules2_2Tx);
printTxData("setRoleRules2_3Tx", setRoleRules2_3Tx);
printTxData("setRoleRules2_4Tx", setRoleRules2_4Tx);
printTxData("setRoleRules2_5Tx", setRoleRules2_5Tx);
printTxData("setRoleRules2_6Tx", setRoleRules2_6Tx);
printTxData("setRoleRules2_7Tx", setRoleRules2_6Tx);
printTxData("setRoleRules2_8Tx", setRoleRules2_8Tx);
printTxData("setRoleRules2_9Tx", setRoleRules2_9Tx);
printTxData("setRoleRules2_10Tx", setRoleRules2_10Tx);
printTxData("setRoleRules2_11Tx", setRoleRules2_11Tx);
printTxData("setRoleRules2_12Tx", setRoleRules2_11Tx);
printTxData("setRoleRules2_13Tx", setRoleRules2_11Tx);
printTxData("setRoleRules2_14Tx", setRoleRules2_11Tx);
printTxData("setRoleRules2_15Tx", setRoleRules2_11Tx);
printTxData("setRoleRules2_16Tx", setRoleRules2_11Tx);
printTxData("setRoleRules2_17Tx", setRoleRules2_11Tx);
printTxData("setRoleRules2_18Tx", setRoleRules2_11Tx);
printGateRolesContractDetails();
console.log("RESULT: ");


// -----------------------------------------------------------------------------
var setGuardRules1Message = "Set Guard Rules #1";
// -----------------------------------------------------------------------------
console.log("RESULT: ---------- " + setGuardRules1Message + " ----------");
var setGuardRules1_1Tx = fiatTokenGuard.permit(gateWithFeeAddress, fiatTokenAddress, web3.sha3("setName(bytes32)").substring(0, 10), {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setGuardRules1_2Tx = fiatTokenGuard.permit(gateWithFeeAddress, fiatTokenAddress, web3.sha3("mint(uint256)").substring(0, 10), {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setGuardRules1_3Tx = fiatTokenGuard.permit(gateWithFeeAddress, fiatTokenAddress, web3.sha3("mint(address,uint256)").substring(0, 10), {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setGuardRules1_4Tx = fiatTokenGuard.permit(gateWithFeeAddress, fiatTokenAddress, web3.sha3("burn(uint256)").substring(0, 10), {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setGuardRules1_5Tx = fiatTokenGuard.permit(gateWithFeeAddress, fiatTokenAddress, web3.sha3("burn(address,uint256)").substring(0, 10), {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setGuardRules1_6Tx = fiatTokenGuard.permit(gateWithFeeAddress, fiatTokenAddress, web3.sha3("setERC20Authority(address)").substring(0, 10), {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setGuardRules1_7Tx = fiatTokenGuard.permit(gateWithFeeAddress, fiatTokenAddress, web3.sha3("setTokenAuthority(address)").substring(0, 10), {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setGuardRules1_8Tx = fiatTokenGuard.permit(gateWithFeeAddress, fiatTokenAddress, web3.sha3("start()").substring(0, 10), {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setGuardRules1_9Tx = fiatTokenGuard.permit(gateWithFeeAddress, fiatTokenAddress, web3.sha3("stop()").substring(0, 10), {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setGuardRules1_10Tx = fiatTokenGuard.permit(gateWithFeeAddress, fiatTokenAddress, web3.sha3("setTransferFeeCollector(address)").substring(0, 10), {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setGuardRules1_11Tx = fiatTokenGuard.permit(gateWithFeeAddress, fiatTokenAddress, web3.sha3("setTransferFeeController(address)").substring(0, 10), {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setGuardRules1_12Tx = fiatTokenGuard.permit(gateWithFeeAddress, limitControllerAddress, web3.sha3("bumpMintLimitCounter(uint256)").substring(0, 10), {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
var setGuardRules1_13Tx = fiatTokenGuard.permit(gateWithFeeAddress, limitControllerAddress, web3.sha3("bumpBurnLimitCounter(uint256)").substring(0, 10), {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
while (txpool.status.pending > 0) {
}
printBalances();
failIfTxStatusError(setGuardRules1_1Tx, setGuardRules1Message + " - permit(gateWithFeeAddress, fiatTokenAddress, web3.sha3(\"setName(bytes32)\").substring(0, 10), true)");
failIfTxStatusError(setGuardRules1_2Tx, setGuardRules1Message + " - permit(gateWithFeeAddress, fiatTokenAddress, web3.sha3(\"mint(uint256)\").substring(0, 10), true");
failIfTxStatusError(setGuardRules1_3Tx, setGuardRules1Message + " - permit(gateWithFeeAddress, fiatTokenAddress, web3.sha3(\"mint(address,uint256)\").substring(0, 10), true)");
failIfTxStatusError(setGuardRules1_4Tx, setGuardRules1Message + " - permit(gateWithFeeAddress, fiatTokenAddress, web3.sha3(\"burn(uint256)\").substring(0, 10), true)");
failIfTxStatusError(setGuardRules1_5Tx, setGuardRules1Message + " - permit(gateWithFeeAddress, fiatTokenAddress, web3.sha3(\"burn(address,uint256)\").substring(0, 10), true)");
failIfTxStatusError(setGuardRules1_6Tx, setGuardRules1Message + " - permit(gateWithFeeAddress, fiatTokenAddress, web3.sha3(\"setERC20Authority(address)\").substring(0, 10), true)");
failIfTxStatusError(setGuardRules1_7Tx, setGuardRules1Message + " - permit(gateWithFeeAddress, fiatTokenAddress, web3.sha3(\"setTokenAuthority(address)\").substring(0, 10), true)");
failIfTxStatusError(setGuardRules1_8Tx, setGuardRules1Message + " - permit(gateWithFeeAddress, fiatTokenAddress, web3.sha3(\"start()\").substring(0, 10), true)");
failIfTxStatusError(setGuardRules1_9Tx, setGuardRules1Message + " - permit(gateWithFeeAddress, fiatTokenAddress, web3.sha3(\"stop()\").substring(0, 10), true)");
failIfTxStatusError(setGuardRules1_10Tx, setGuardRules1Message + " - permit(gateWithFeeAddress, fiatTokenAddress, web3.sha3(\"setTransferFeeCollector(address)\").substring(0, 10), true)");
failIfTxStatusError(setGuardRules1_11Tx, setGuardRules1Message + " - permit(gateWithFeeAddress, fiatTokenAddress, web3.sha3(\"setTransferFeeController(address)\").substring(0, 10), true)");
failIfTxStatusError(setGuardRules1_12Tx, setGuardRules1Message + " - permit(gateWithFeeAddress, limitControllerAddress, web3.sha3(\"bumpMintLimitCounter(uint256)\").substring(0, 10), true)");
failIfTxStatusError(setGuardRules1_13Tx, setGuardRules1Message + " - permit(gateWithFeeAddress, limitControllerAddress, web3.sha3(\"bumpBurnLimitCounter(uint256)\").substring(0, 10), true)");
printTxData("setGuardRules1_1Tx", setGuardRules1_1Tx);
printTxData("setGuardRules1_2Tx", setGuardRules1_2Tx);
printTxData("setGuardRules1_3Tx", setGuardRules1_3Tx);
printTxData("setGuardRules1_4Tx", setGuardRules1_4Tx);
printTxData("setGuardRules1_5Tx", setGuardRules1_5Tx);
printTxData("setGuardRules1_6Tx", setGuardRules1_6Tx);
printTxData("setGuardRules1_7Tx", setGuardRules1_6Tx);
printTxData("setGuardRules1_8Tx", setGuardRules1_8Tx);
printTxData("setGuardRules1_9Tx", setGuardRules1_9Tx);
printTxData("setGuardRules1_10Tx", setGuardRules1_10Tx);
printTxData("setGuardRules1_11Tx", setGuardRules1_11Tx);
printTxData("setGuardRules1_12Tx", setGuardRules1_11Tx);
printTxData("setGuardRules1_13Tx", setGuardRules1_11Tx);
printTokenGuardContractDetails();
console.log("RESULT: ");


// -----------------------------------------------------------------------------
var transferOwnership11Message = "Transfer Ownership #1";
// -----------------------------------------------------------------------------
console.log("RESULT: ---------- " + transferOwnership11Message + " ----------");
var transferOwnership11_1Tx = gateRoles.setOwner(sysAdmin, {from: deployer, gas: 400000, gasPrice: defaultGasPrice});
while (txpool.status.pending > 0) {
}
printBalances();
failIfTxStatusError(transferOwnership11_1Tx, transferOwnership11Message + " - gateRoles.setOwner(sysAdmin)");
printTxData("transferOwnership11_1Tx", transferOwnership11_1Tx);
printGateRolesContractDetails();
console.log("RESULT: ");


// -----------------------------------------------------------------------------
var setGateWithFeeTokenAuth1Message = "Set GateWithFee TokenAuth";
// -----------------------------------------------------------------------------
console.log("RESULT: ---------- " + transferOwnership11Message + " ----------");
var setGateWithFeeTokenAuth1_1Tx = gateWithFee.setERC20Authority(fullKycRuleAddress, {from: sysAdmin, gas: 400000, gasPrice: defaultGasPrice});
var setGateWithFeeTokenAuth1_2Tx = gateWithFee.setTokenAuthority(fullKycRuleAddress, {from: sysAdmin, gas: 400000, gasPrice: defaultGasPrice});
while (txpool.status.pending > 0) {
}
printBalances();
failIfTxStatusError(setGateWithFeeTokenAuth1_1Tx, setGateWithFeeTokenAuth1Message + " - gateWithFee.setERC20Authority(fullKycRule)");
failIfTxStatusError(setGateWithFeeTokenAuth1_2Tx, setGateWithFeeTokenAuth1Message + " - gateWithFee.setTokenAuthority(fullKycRule)");
printTxData("setGateWithFeeTokenAuth1_1Tx", setGateWithFeeTokenAuth1_1Tx);
printTxData("setGateWithFeeTokenAuth1_2Tx", setGateWithFeeTokenAuth1_2Tx);
printGateWithFeeContractDetails();
printTokenAContractDetails();
console.log("RESULT: ");


EOF
grep "DATA: " $TEST1OUTPUT | sed "s/DATA: //" > $DEPLOYMENTDATA
cat $DEPLOYMENTDATA
grep "RESULT: " $TEST1OUTPUT | sed "s/RESULT: //" > $TEST1RESULTS
cat $TEST1RESULTS