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
rsync -rp $SOURCEDIR/* . --exclude=Multisig.sol --exclude=test/
# Copy modified contracts if any files exist
find ./modifiedContracts -type f -name \* -exec cp {} . \;

# --- Modify parameters ---
# `perl -pi -e "s/START_DATE \= 1525132800.*$/START_DATE \= $START_DATE; \/\/ $START_DATE_S/" $CROWDSALESOL`
# `perl -pi -e "s/endDate \= 1527811200;.*$/endDate \= $END_DATE; \/\/ $END_DATE_S/" $CROWDSALESOL`
# `perl -pi -e "s/contracts\///" *.sol`

# DIFFS1=`diff -r -x '*.js' -x '*.json' -x '*.txt' -x 'testchain' -x '*.md' $SOURCEDIR .`
# echo "--- Differences $SOURCEDIR/$REQUESTFACTORYSOL $REQUESTFACTORYSOL ---" | tee -a $TEST1OUTPUT
# echo "$DIFFS1" | tee -a $TEST1OUTPUT

solc_0.4.23 --version | tee -a $TEST1OUTPUT

echo "var gateRolesOutput=`solc_0.4.23 --allow-paths . --optimize --pretty-json --combined-json abi,bin,interface $GATEROLESSOL`;" > $GATEROLESJS
echo "var dappsysOutput=`solc_0.4.23 --allow-paths . --optimize --pretty-json --combined-json abi,bin,interface $DAPPSYSSOL`;" > $DAPPSYSJS
echo "var kycOutput=`solc_0.4.23 --allow-paths . --optimize --pretty-json --combined-json abi,bin,interface $KYCSOL`;" > $KYCJS

geth --verbosity 3 attach $GETHATTACHPOINT << EOF | tee -a $TEST1OUTPUT
loadScript("$GATEROLESJS");
loadScript("$DAPPSYSJS");
loadScript("$KYCJS");
loadScript("functions.js");

var gateRolesAbi = JSON.parse(gateRolesOutput.contracts["$GATEROLESSOL:GateRoles"].abi);
var gateRolesBin = "0x" + gateRolesOutput.contracts["$GATEROLESSOL:GateRoles"].bin;
var fiatTokenGuardAbi = JSON.parse(dappsysOutput.contracts["$DAPPSYSSOL:DSGuard"].abi);
var fiatTokenGuardBin = "0x" + dappsysOutput.contracts["$DAPPSYSSOL:DSGuard"].bin;
var kycAmlStatusAbi = JSON.parse(kycOutput.contracts["$KYCSOL:KycAmlStatus"].abi);
var kycAmlStatusBin = "0x" + kycOutput.contracts["$KYCSOL:KycAmlStatus"].bin;
var addressControlStatusAbi = JSON.parse(kycOutput.contracts["$KYCSOL:AddressControlStatus"].abi);
var addressControlStatusBin = "0x" + kycOutput.contracts["$KYCSOL:AddressControlStatus"].bin;

// console.log("DATA: gateRolesAbi=" + JSON.stringify(gateRolesAbi));
// console.log("DATA: gateRolesBin=" + JSON.stringify(gateRolesBin));
// console.log("DATA: fiatTokenGuardAbi=" + JSON.stringify(fiatTokenGuardAbi));
// console.log("DATA: fiatTokenGuardBin=" + JSON.stringify(fiatTokenGuardBin));
// console.log("DATA: kycAmlStatusAbi=" + JSON.stringify(kycAmlStatusAbi));
// console.log("DATA: kycAmlStatusBin=" + JSON.stringify(kycAmlStatusBin));
console.log("DATA: addressControlStatusAbi=" + JSON.stringify(addressControlStatusAbi));
console.log("DATA: addressControlStatusBin=" + JSON.stringify(addressControlStatusBin));


unlockAccounts("$PASSWORD");
printBalances();
console.log("RESULT: ");


// -----------------------------------------------------------------------------
var deployGateRolesMessage = "Deploy GateRoles & FiatTokenGuard";
// -----------------------------------------------------------------------------
console.log("RESULT: ---------- " + deployGateRolesMessage + " ----------");
var gateRolesContract = web3.eth.contract(gateRolesAbi);
var gateRolesTx = null;
var gateRolesAddress = null;
var gateRoles = gateRolesContract.new({from: contractOwnerAccount, data: gateRolesBin, gas: 6000000, gasPrice: defaultGasPrice},
  function(e, contract) {
    if (!e) {
      if (!contract.address) {
        gateRolesTx = contract.transactionHash;
      } else {
        gateRolesAddress = contract.address;
        addAccount(gateRolesAddress, "GateRoles");
        console.log("DATA: gateRolesAddress=\"" + gateRolesAddress + "\";");
      }
    }
  }
);
var fiatTokenGuardContract = web3.eth.contract(fiatTokenGuardAbi);
var fiatTokenGuardTx = null;
var fiatTokenGuardAddress = null;
var fiatTokenGuard = fiatTokenGuardContract.new({from: contractOwnerAccount, data: fiatTokenGuardBin, gas: 6000000, gasPrice: defaultGasPrice},
  function(e, contract) {
    if (!e) {
      if (!contract.address) {
        fiatTokenGuardTx = contract.transactionHash;
      } else {
        fiatTokenGuardAddress = contract.address;
        addAccount(fiatTokenGuardAddress, "FiatTokenGuard");
        console.log("DATA: fiatTokenGuardAddress=\"" + fiatTokenGuardAddress + "\";");
      }
    }
  }
);
while (txpool.status.pending > 0) {
}
printBalances();
failIfTxStatusError(gateRolesTx, deployGateRolesMessage + " - GateRoles");
failIfTxStatusError(fiatTokenGuardTx, deployGateRolesMessage + " - FiatTokenGuard");
printTxData("gateRolesTx", gateRolesTx);
printTxData("fiatTokenGuardTx", fiatTokenGuardTx);
console.log("RESULT: ");


// -----------------------------------------------------------------------------
var deployKycAmlStatusMessage = "Deploy KycAmlStatus & AddressControlStatus";
// -----------------------------------------------------------------------------
console.log("RESULT: ---------- " + deployKycAmlStatusMessage + " ----------");
var kycAmlStatusContract = web3.eth.contract(kycAmlStatusAbi);
var kycAmlStatusTx = null;
var kycAmlStatusAddress = null;
var kycAmlStatus = kycAmlStatusContract.new(gateRolesAddress, {from: contractOwnerAccount, data: kycAmlStatusBin, gas: 6000000, gasPrice: defaultGasPrice},
  function(e, contract) {
    if (!e) {
      if (!contract.address) {
        kycAmlStatusTx = contract.transactionHash;
      } else {
        kycAmlStatusAddress = contract.address;
        addAccount(kycAmlStatusAddress, "KycAmlStatus");
        console.log("DATA: kycAmlStatusAddress=\"" + kycAmlStatusAddress + "\";");
      }
    }
  }
);
var addressControlStatusContract = web3.eth.contract(addressControlStatusAbi);
var addressControlStatusTx = null;
var addressControlStatusAddress = null;
var addressControlStatus = addressControlStatusContract.new(gateRolesAddress, {from: contractOwnerAccount, data: addressControlStatusBin, gas: 6000000, gasPrice: defaultGasPrice},
  function(e, contract) {
    if (!e) {
      if (!contract.address) {
        addressControlStatusTx = contract.transactionHash;
      } else {
        addressControlStatusAddress = contract.address;
        addAccount(addressControlStatusAddress, "AddressControlStatus");
        console.log("DATA: addressControlStatusAddress=\"" + addressControlStatusAddress + "\";");
      }
    }
  }
);
while (txpool.status.pending > 0) {
}
printBalances();
failIfTxStatusError(kycAmlStatusTx, deployKycAmlStatusMessage + " - KycAmlStatus");
failIfTxStatusError(addressControlStatusTx, deployKycAmlStatusMessage + " - AddressControlStatus");
printTxData("kycAmlStatusTx", kycAmlStatusTx);
printTxData("addressControlStatusTx", addressControlStatusTx);
console.log("RESULT: ");


exit;

// -----------------------------------------------------------------------------
var deployLibs1Message = "Deploy Libraries #1";
// -----------------------------------------------------------------------------
console.log("RESULT: ---------- " + deployLibs1Message + " ----------");
var mathLibContract = web3.eth.contract(mathLibAbi);
// console.log(JSON.stringify(mathLibContract));
var mathLibTx = null;
var mathLibAddress = null;
var mathLib = mathLibContract.new({from: contractOwnerAccount, data: mathLibBin, gas: 6000000, gasPrice: defaultGasPrice},
  function(e, contract) {
    if (!e) {
      if (!contract.address) {
        mathLibTx = contract.transactionHash;
      } else {
        mathLibAddress = contract.address;
        addAccount(mathLibAddress, "MathLib");
        console.log("DATA: mathLibAddress=\"" + mathLibAddress + "\";");
      }
    }
  }
);
var paymentLibContract = web3.eth.contract(paymentLibAbi);
// console.log(JSON.stringify(paymentLibContract));
var paymentLibTx = null;
var paymentLibAddress = null;
var paymentLib = paymentLibContract.new({from: contractOwnerAccount, data: paymentLibBin, gas: 6000000, gasPrice: defaultGasPrice},
  function(e, contract) {
    if (!e) {
      if (!contract.address) {
        paymentLibTx = contract.transactionHash;
      } else {
        paymentLibAddress = contract.address;
        addAccount(paymentLibAddress, "PaymentLib");
        console.log("DATA: paymentLibAddress=\"" + paymentLibAddress + "\";");
      }
    }
  }
);
var requestScheduleLibContract = web3.eth.contract(requestScheduleLibAbi);
// console.log(JSON.stringify(requestScheduleLibContract));
var requestScheduleLibTx = null;
var requestScheduleLibAddress = null;
var requestScheduleLib = requestScheduleLibContract.new({from: contractOwnerAccount, data: requestScheduleLibBin, gas: 6000000, gasPrice: defaultGasPrice},
  function(e, contract) {
    if (!e) {
      if (!contract.address) {
        requestScheduleLibTx = contract.transactionHash;
      } else {
        requestScheduleLibAddress = contract.address;
        addAccount(requestScheduleLibAddress, "RequestScheduleLib");
        console.log("DATA: requestScheduleLibAddress=\"" + requestScheduleLibAddress + "\";");
      }
    }
  }
);
var iterToolsContract = web3.eth.contract(iterToolsAbi);
// console.log(JSON.stringify(iterToolsContract));
var iterToolsTx = null;
var iterToolsAddress = null;
var iterTools = iterToolsContract.new({from: contractOwnerAccount, data: iterToolsBin, gas: 6000000, gasPrice: defaultGasPrice},
  function(e, contract) {
    if (!e) {
      if (!contract.address) {
        iterToolsTx = contract.transactionHash;
      } else {
        iterToolsAddress = contract.address;
        addAccount(iterToolsAddress, "IterTools");
        console.log("DATA: iterToolsAddress=\"" + iterToolsAddress + "\";");
      }
    }
  }
);
while (txpool.status.pending > 0) {
}
printBalances();
failIfTxStatusError(mathLibTx, deployLibs1Message + " - MathLib");
failIfTxStatusError(paymentLibTx, deployLibs1Message + " - PaymentLib");
failIfTxStatusError(requestScheduleLibTx, deployLibs1Message + " - RequestScheduleLib");
failIfTxStatusError(iterToolsTx, deployLibs1Message + " - IterTools");
printTxData("mathLibTx", mathLibTx);
printTxData("paymentLibTx", paymentLibTx);
printTxData("requestScheduleLibTx", requestScheduleLibTx);
printTxData("iterToolsTx", iterToolsTx);
// printTokenContractDetails();
console.log("RESULT: ");


// -----------------------------------------------------------------------------
var deployLibs2Message = "Deploy Libraries #2";
// -----------------------------------------------------------------------------
console.log("RESULT: ---------- " + deployLibs2Message + " ----------");
var requestLibContract = web3.eth.contract(requestLibAbi);
// console.log(JSON.stringify(requestLibContract));
// console.log("RESULT: old='" + requestLibBin + "'");
var newRequestLibBin = requestLibBin.replace(/__Library\/MathLib.sol:MathLib___________/g, mathLibAddress.substring(2, 42)).replace(/__Library\/PaymentLib.sol:PaymentLib_____/g, paymentLibAddress.substring(2, 42)).replace(/__Library\/RequestScheduleLib.sol:Reque__/g, requestScheduleLibAddress.substring(2, 42));
// console.log("RESULT: new='" + newRequestLibBin + "'");
var requestLibTx = null;
var requestLibAddress = null;
var requestLib = requestLibContract.new({from: contractOwnerAccount, data: newRequestLibBin, gas: 6000000, gasPrice: defaultGasPrice},
  function(e, contract) {
    if (!e) {
      if (!contract.address) {
        requestLibTx = contract.transactionHash;
      } else {
        requestLibAddress = contract.address;
        addAccount(requestLibAddress, "RequestLib");
        console.log("DATA: requestLibAddress=\"" + requestLibAddress + "\";");
      }
    }
  }
);
while (txpool.status.pending > 0) {
}
printBalances();
failIfTxStatusError(requestLibTx, deployLibs2Message + " - RequestLib");
printTxData("requestLibTx", requestLibTx);
console.log("RESULT: ");


// -----------------------------------------------------------------------------
var deployTransactionRequestCoreMessage = "Deploy TransactionRequestCore";
// -----------------------------------------------------------------------------
console.log("RESULT: ---------- " + deployTransactionRequestCoreMessage + " ----------");
var transactionRequestCoreContract = web3.eth.contract(transactionRequestCoreAbi);
// console.log(JSON.stringify(transactionRequestCoreContract));
// console.log("RESULT: old='" + transactionRequestCoreBin + "'");
var newTransactionRequestCoreBin = transactionRequestCoreBin.replace(/__Library\/RequestLib.sol:RequestLib_____/g, requestLibAddress.substring(2, 42));
// console.log("RESULT: new='" + newTransactionRequestCoreBin + "'");
var transactionRequestCoreTx = null;
var transactionRequestCoreAddress = null;
var transactionRequestCore = transactionRequestCoreContract.new({from: contractOwnerAccount, data: newTransactionRequestCoreBin, gas: 6000000, gasPrice: defaultGasPrice},
  function(e, contract) {
    if (!e) {
      if (!contract.address) {
        transactionRequestCoreTx = contract.transactionHash;
      } else {
        transactionRequestCoreAddress = contract.address;
        addAccount(transactionRequestCoreAddress, "TransactionRequestCore");
        console.log("DATA: transactionRequestCoreAddress=\"" + transactionRequestCoreAddress + "\";");
      }
    }
  }
);
while (txpool.status.pending > 0) {
}
printBalances();
failIfTxStatusError(transactionRequestCoreTx, deployTransactionRequestCoreMessage + " - TransactionRequestCore");
printTxData("transactionRequestCoreTx", transactionRequestCoreTx);
console.log("RESULT: ");


// -----------------------------------------------------------------------------
var deployRequestFactoryMessage = "Deploy RequestFactory";
// -----------------------------------------------------------------------------
console.log("RESULT: ---------- " + deployRequestFactoryMessage + " ----------");
var requestFactoryContract = web3.eth.contract(requestFactoryAbi);
// console.log(JSON.stringify(requestFactoryContract));
// console.log("RESULT: old='" + requestFactoryBin + "'");
var newRequestFactoryBin = requestFactoryBin.replace(/__Library\/RequestLib.sol:RequestLib_____/g, requestLibAddress.substring(2, 42)).replace(/__IterTools.sol:IterTools_______________/g, iterToolsAddress.substring(2, 42));
// console.log("RESULT: new='" + newRequestFactoryBin + "'");
var requestFactoryTx = null;
var requestFactoryAddress = null;
var requestFactory = requestFactoryContract.new(transactionRequestCoreAddress, {from: contractOwnerAccount, data: newRequestFactoryBin, gas: 6000000, gasPrice: defaultGasPrice},
  function(e, contract) {
    if (!e) {
      if (!contract.address) {
        requestFactoryTx = contract.transactionHash;
      } else {
        requestFactoryAddress = contract.address;
        addAccount(requestFactoryAddress, "RequestFactory");
        addRequestFactoryContractAddressAndAbi(requestFactoryAddress, requestFactoryAbi);
        console.log("DATA: requestFactoryAddress=\"" + requestFactoryAddress + "\";");
      }
    }
  }
);
while (txpool.status.pending > 0) {
}
printBalances();
failIfTxStatusError(requestFactoryTx, deployRequestFactoryMessage + " - RequestFactory");
printTxData("requestFactoryTx", requestFactoryTx);
console.log("RESULT: ");


// -----------------------------------------------------------------------------
var deploySchedulersMessage = "Deploy Schedulers";
// -----------------------------------------------------------------------------
console.log("RESULT: ---------- " + deploySchedulersMessage + " ----------");
var blockSchedulerContract = web3.eth.contract(blockSchedulerAbi);
// console.log(JSON.stringify(blockSchedulerContract));
// console.log("RESULT: old='" + blockSchedulerBin + "'");
var newBlockSchedulerBin = blockSchedulerBin.replace(/__Library\/RequestLib.sol:RequestLib_____/g, requestLibAddress.substring(2, 42)).replace(/__Library\/PaymentLib.sol:PaymentLib_____/g, paymentLibAddress.substring(2, 42));
// console.log("RESULT: new='" + newBlockSchedulerBin + "'");
var blockSchedulerTx = null;
var blockSchedulerAddress = null;
var blockScheduler = blockSchedulerContract.new(requestFactoryAddress, feeRecipient, {from: contractOwnerAccount, data: newBlockSchedulerBin, gas: 6000000, gasPrice: defaultGasPrice},
  function(e, contract) {
    if (!e) {
      if (!contract.address) {
        blockSchedulerTx = contract.transactionHash;
      } else {
        blockSchedulerAddress = contract.address;
        addAccount(blockSchedulerAddress, "BlockScheduler");
        console.log("DATA: blockSchedulerAddress=\"" + blockSchedulerAddress+ "\";");
      }
    }
  }
);
var timestampSchedulerContract = web3.eth.contract(timestampSchedulerAbi);
// console.log(JSON.stringify(timestampSchedulerContract));
// console.log("RESULT: old='" + timestampSchedulerBin + "'");
var newTimestampSchedulerBin = timestampSchedulerBin.replace(/__Library\/RequestLib.sol:RequestLib_____/g, requestLibAddress.substring(2, 42)).replace(/__Library\/PaymentLib.sol:PaymentLib_____/g, paymentLibAddress.substring(2, 42));
// console.log("RESULT: new='" + newTimestampSchedulerBin + "'");
var timestampSchedulerTx = null;
var timestampSchedulerAddress = null;
var timestampScheduler = timestampSchedulerContract.new(requestFactoryAddress, feeRecipient, {from: contractOwnerAccount, data: newTimestampSchedulerBin, gas: 6000000, gasPrice: defaultGasPrice},
  function(e, contract) {
    if (!e) {
      if (!contract.address) {
        timestampSchedulerTx = contract.transactionHash;
      } else {
        timestampSchedulerAddress = contract.address;
        addAccount(timestampSchedulerAddress, "TimestampScheduler");
        console.log("DATA: timestampSchedulerAddress=\"" + timestampSchedulerAddress+ "\";");
      }
    }
  }
);
while (txpool.status.pending > 0) {
}
printBalances();
failIfTxStatusError(blockSchedulerTx, deploySchedulersMessage + " - BlockScheduler");
failIfTxStatusError(timestampSchedulerTx, deploySchedulersMessage + " - TimestampScheduler");
printTxData("blockSchedulerTx", blockSchedulerTx);
printTxData("timestampSchedulerTx", timestampSchedulerTx);
console.log("RESULT: ");


// -----------------------------------------------------------------------------
var delayedPaymentMessage = "Schedule Delayed Payment";
var numBlocks = 20;
var value = new BigNumber(10).shift(18);
// -----------------------------------------------------------------------------
console.log("RESULT: ---------- " + delayedPaymentMessage + " ----------");
var delayedPaymentContract = web3.eth.contract(delayedPaymentAbi);
// console.log(JSON.stringify(delayedPaymentContract));
var delayedPaymentTx = null;
var delayedPaymentAddress = null;
var delayedPayment = delayedPaymentContract.new(blockSchedulerAddress, numBlocks, paymentRecipient, {from: scheduleCreator, data: delayedPaymentBin, value: value, gas: 6000000, gasPrice: defaultGasPrice},
  function(e, contract) {
    if (!e) {
      if (!contract.address) {
        delayedPaymentTx = contract.transactionHash;
      } else {
        delayedPaymentAddress = contract.address;
        addAccount(delayedPaymentAddress, "DelayedPayment");
        console.log("DATA: delayedPaymentAddress=\"" + delayedPaymentAddress+ "\";");
        console.log("DATA: var delayedPaymentAbi=" + JSON.stringify(delayedPaymentAbi) + ";");
        console.log("DATA: var delayedPayment=eth.contract(delayedPaymentAbi).at(delayedPaymentAddress);");
      }
    }
  }
);
while (txpool.status.pending > 0) {
}
console.log("RESULT: delayedPayment.scheduledTransaction=" + delayedPayment.scheduledTransaction());
var delayedPaymentRequestAddress = getRequestFactoryListing();
console.log("DATA: delayedPaymentRequestAddress=\"" + delayedPaymentRequestAddress + "\";");
addAccount(delayedPaymentRequestAddress, "DelayedPaymentRequest");
console.log("DATA: var transactionRequestCoreAbi=" + JSON.stringify(transactionRequestCoreAbi) + ";");
console.log("DATA: var delayedPaymentRequest=eth.contract(transactionRequestCoreAbi).at(delayedPaymentRequestAddress);");
printBalances();
failIfTxStatusError(delayedPaymentTx, delayedPaymentMessage);
printTxData("delayedPaymentTx", delayedPaymentTx);
printRequestFactoryContractDetails();
console.log("RESULT: ");


// -----------------------------------------------------------------------------
var claim1Message = "Claim Delayed Payment";
var stake = new BigNumber(0.1).shift(18);
// -----------------------------------------------------------------------------
console.log("RESULT: ---------- " + claim1Message + " ----------");
var delayedPaymentTxRequest = eth.contract(transactionRequestCoreAbi).at(delayedPayment.scheduledTransaction());
var claim1_1Tx = delayedPaymentTxRequest.claim({from: executor, value: stake, gas: 400000, gasPrice: defaultGasPrice});
while (txpool.status.pending > 0) {
}
printBalances();
failIfTxStatusError(claim1_1Tx, claim1Message);
printTxData("claim1_1Tx", claim1_1Tx);
displayTxRequestDetails(claim1Message, delayedPayment.scheduledTransaction(), transactionRequestCoreAbi);
console.log("RESULT: ");


waitUntilBlock("Wait to execute", eth.getTransaction(delayedPaymentTx).blockNumber, numBlocks);


// -----------------------------------------------------------------------------
var execute1Message = "Execute Delayed Payment";
var gasPrice = web3.toWei(20, "gwei");
// -----------------------------------------------------------------------------
console.log("RESULT: ---------- " + execute1Message + " ----------");
var execute1_1Tx = delayedPaymentTxRequest.execute({from: executor, gas: 400000, gasPrice: gasPrice});
while (txpool.status.pending > 0) {
}
printBalances();
failIfTxStatusError(execute1_1Tx, execute1Message);
printTxData("execute1_1Tx", execute1_1Tx);
displayTxRequestDetails(execute1Message, delayedPayment.scheduledTransaction(), transactionRequestCoreAbi);
console.log("RESULT: ");


// -----------------------------------------------------------------------------
var sendOwnerEther1Message = "Send Owner Ethers";
// -----------------------------------------------------------------------------
console.log("RESULT: ---------- " + sendOwnerEther1Message + " ----------");
var sendOwnerEther1_1Tx = delayedPaymentTxRequest.sendOwnerEther(scheduleCreator, {from: scheduleCreator, gas: 400000, gasPrice: defaultGasPrice});
while (txpool.status.pending > 0) {
}
printBalances();
failIfTxStatusError(sendOwnerEther1_1Tx, sendOwnerEther1Message);
printTxData("sendOwnerEther1_1Tx", sendOwnerEther1_1Tx);
displayTxRequestDetails(sendOwnerEther1Message, delayedPayment.scheduledTransaction(), transactionRequestCoreAbi);
console.log("RESULT: ");


EOF
grep "DATA: " $TEST1OUTPUT | sed "s/DATA: //" > $DEPLOYMENTDATA
cat $DEPLOYMENTDATA
grep "RESULT: " $TEST1OUTPUT | sed "s/RESULT: //" > $TEST1RESULTS
cat $TEST1RESULTS