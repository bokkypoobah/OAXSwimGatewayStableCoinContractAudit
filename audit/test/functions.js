// ETH/USD 29 Jun 2018 03:20 AEDT from CMC and ethgasstation.info
var ethPriceUSD = 435.65;
var defaultGasPrice = web3.toWei(2, "gwei");

// -----------------------------------------------------------------------------
// Accounts
// -----------------------------------------------------------------------------
var accounts = [];
var accountNames = {};

addAccount(eth.accounts[0], "Account #0 - Miner");
addAccount(eth.accounts[1], "Account #1 - Deployer");
addAccount(eth.accounts[2], "Account #2 - SysAdmin");
addAccount(eth.accounts[3], "Account #3 - KycOperator");
addAccount(eth.accounts[4], "Account #4 - MoneyOperator");
addAccount(eth.accounts[5], "Account #5 - TransferFeeCollector");
addAccount(eth.accounts[6], "Account #6 - MintFeeCollector");
addAccount(eth.accounts[7], "Account #7 - BurnFeeCollector");
addAccount(eth.accounts[8], "Account #8");
addAccount(eth.accounts[9], "Account #9");
addAccount(eth.accounts[10], "Account #10");
addAccount(eth.accounts[11], "Account #11");

var minerAccount = eth.accounts[0];
var deployer = eth.accounts[1];
var sysAdmin = eth.accounts[2];
var kycOperator = eth.accounts[3];
var moneyOperator = eth.accounts[4];
var transferFeeCollector = eth.accounts[5];
var mintFeeCollector = eth.accounts[6];
var burnFeeCollector = eth.accounts[7];
var account8 = eth.accounts[8];
var account9 = eth.accounts[9];
var account10 = eth.accounts[10];
var account11 = eth.accounts[11];

var baseBlock = eth.blockNumber;

function unlockAccounts(password) {
  for (var i = 0; i < eth.accounts.length && i < accounts.length; i++) {
    personal.unlockAccount(eth.accounts[i], password, 100000);
    if (i > 0 && eth.getBalance(eth.accounts[i]) == 0) {
      personal.sendTransaction({from: eth.accounts[0], to: eth.accounts[i], value: web3.toWei(1000000, "ether")});
    }
  }
  while (txpool.status.pending > 0) {
  }
  baseBlock = eth.blockNumber;
}

function addAccount(account, accountName) {
  accounts.push(account);
  accountNames[account] = accountName;
  addAddressNames(account, accountName);
}


//-----------------------------------------------------------------------------
//Token A Contract
//-----------------------------------------------------------------------------
var tokenAContractAddress = null;
var tokenAContractAbi = null;

function addTokenAContractAddressAndAbi(address, tokenAbi) {
  tokenAContractAddress = address;
  tokenAContractAbi = tokenAbi;
}


//-----------------------------------------------------------------------------
//Token B Contract
//-----------------------------------------------------------------------------
var tokenBContractAddress = null;
var tokenBContractAbi = null;

function addTokenBContractAddressAndAbi(address, tokenAbi) {
  tokenBContractAddress = address;
  tokenBContractAbi = tokenAbi;
}


//-----------------------------------------------------------------------------
//Account ETH and token balances
//-----------------------------------------------------------------------------
function printBalances() {
  var tokenA = tokenAContractAddress == null || tokenAContractAbi == null ? null : web3.eth.contract(tokenAContractAbi).at(tokenAContractAddress);
  var tokenB = tokenBContractAddress == null || tokenBContractAbi == null ? null : web3.eth.contract(tokenBContractAbi).at(tokenBContractAddress);
  var decimalsA = tokenA == null ? 18 : tokenA.decimals();
  var decimalsB = tokenB == null ? 18 : tokenB.decimals();
  var i = 0;
  var totalTokenABalance = new BigNumber(0);
  var totalTokenBBalance = new BigNumber(0);
  console.log("RESULT:  # Account                                             EtherBalanceChange                 (Token A) WETH                  (Token B) DAI Name");
  console.log("RESULT: -- ------------------------------------------ --------------------------- ------------------------------ ------------------------------ ---------------------------");
  accounts.forEach(function(e) {
    var etherBalanceBaseBlock = eth.getBalance(e, baseBlock);
    var etherBalance = web3.fromWei(eth.getBalance(e).minus(etherBalanceBaseBlock), "ether");
    var tokenABalance = tokenA == null ? new BigNumber(0) : tokenA.balanceOf(e).shift(-decimalsA);
    var tokenBBalance = tokenB == null ? new BigNumber(0) : tokenB.balanceOf(e).shift(-decimalsB);
    totalTokenABalance = totalTokenABalance.add(tokenABalance);
    totalTokenBBalance = totalTokenBBalance.add(tokenBBalance);
    console.log("RESULT: " + pad2(i) + " " + e  + " " + pad(etherBalance) + " " +
      padToken(tokenABalance, decimalsA) + " " + padToken(tokenBBalance, decimalsB) + " " + accountNames[e]);
    i++;
  });
  console.log("RESULT: -- ------------------------------------------ --------------------------- ------------------------------ ------------------------------ ---------------------------");
  console.log("RESULT:                                                                           " + padToken(totalTokenABalance, decimalsA) + " " + padToken(totalTokenBBalance, decimalsB) + " Total Token Balances");
  console.log("RESULT: -- ------------------------------------------ --------------------------- ------------------------------ ------------------------------ ---------------------------");
  console.log("RESULT: ");
}

function pad2(s) {
  var o = s.toFixed(0);
  while (o.length < 2) {
    o = " " + o;
  }
  return o;
}

function pad(s) {
  var o = s.toFixed(18);
  while (o.length < 27) {
    o = " " + o;
  }
  return o;
}

function padToken(s, decimals) {
  var o = s.toFixed(decimals);
  var l = parseInt(decimals)+12;
  while (o.length < l) {
    o = " " + o;
  }
  return o;
}


// -----------------------------------------------------------------------------
// Transaction status
// -----------------------------------------------------------------------------
function printTxData(name, txId) {
  var tx = eth.getTransaction(txId);
  var txReceipt = eth.getTransactionReceipt(txId);
  var gasPrice = tx.gasPrice;
  var gasCostETH = tx.gasPrice.mul(txReceipt.gasUsed).div(1e18);
  var gasCostUSD = gasCostETH.mul(ethPriceUSD);
  var block = eth.getBlock(txReceipt.blockNumber);
  console.log("RESULT: " + name + " status=" + txReceipt.status + (txReceipt.status == 0 ? " Failure" : " Success") + " gas=" + tx.gas +
    " gasUsed=" + txReceipt.gasUsed + " costETH=" + gasCostETH + " costUSD=" + gasCostUSD +
    " @ ETH/USD=" + ethPriceUSD + " gasPrice=" + web3.fromWei(gasPrice, "gwei") + " gwei block=" + 
    txReceipt.blockNumber + " txIx=" + tx.transactionIndex + " txId=" + txId +
    " @ " + block.timestamp + " " + new Date(block.timestamp * 1000).toUTCString());
}

function assertEtherBalance(account, expectedBalance) {
  var etherBalance = web3.fromWei(eth.getBalance(account), "ether");
  if (etherBalance == expectedBalance) {
    console.log("RESULT: OK " + account + " has expected balance " + expectedBalance);
  } else {
    console.log("RESULT: FAILURE " + account + " has balance " + etherBalance + " <> expected " + expectedBalance);
  }
}

function failIfTxStatusError(tx, msg) {
  var status = eth.getTransactionReceipt(tx).status;
  if (status == 0) {
    console.log("RESULT: FAIL " + msg);
    return 0;
  } else {
    console.log("RESULT: PASS " + msg);
    return 1;
  }
}

function passIfTxStatusError(tx, msg) {
  var status = eth.getTransactionReceipt(tx).status;
  if (status == 1) {
    console.log("RESULT: FAIL " + msg);
    return 0;
  } else {
    console.log("RESULT: PASS " + msg);
    return 1;
  }
}

function gasEqualsGasUsed(tx) {
  var gas = eth.getTransaction(tx).gas;
  var gasUsed = eth.getTransactionReceipt(tx).gasUsed;
  return (gas == gasUsed);
}

function failIfGasEqualsGasUsed(tx, msg) {
  var gas = eth.getTransaction(tx).gas;
  var gasUsed = eth.getTransactionReceipt(tx).gasUsed;
  if (gas == gasUsed) {
    console.log("RESULT: FAIL " + msg);
    return 0;
  } else {
    console.log("RESULT: PASS " + msg);
    return 1;
  }
}

function passIfGasEqualsGasUsed(tx, msg) {
  var gas = eth.getTransaction(tx).gas;
  var gasUsed = eth.getTransactionReceipt(tx).gasUsed;
  if (gas == gasUsed) {
    console.log("RESULT: PASS " + msg);
    return 1;
  } else {
    console.log("RESULT: FAIL " + msg);
    return 0;
  }
}

function failIfGasEqualsGasUsedOrContractAddressNull(contractAddress, tx, msg) {
  if (contractAddress == null) {
    console.log("RESULT: FAIL " + msg);
    return 0;
  } else {
    var gas = eth.getTransaction(tx).gas;
    var gasUsed = eth.getTransactionReceipt(tx).gasUsed;
    if (gas == gasUsed) {
      console.log("RESULT: FAIL " + msg);
      return 0;
    } else {
      console.log("RESULT: PASS " + msg);
      return 1;
    }
  }
}


//-----------------------------------------------------------------------------
// Wait one block
//-----------------------------------------------------------------------------
function waitOneBlock(oldCurrentBlock) {
  while (eth.blockNumber <= oldCurrentBlock) {
  }
  console.log("RESULT: Waited one block");
  console.log("RESULT: ");
  return eth.blockNumber;
}


//-----------------------------------------------------------------------------
// Pause for {x} seconds
//-----------------------------------------------------------------------------
function pause(message, addSeconds) {
  var time = new Date((parseInt(new Date().getTime()/1000) + addSeconds) * 1000);
  console.log("RESULT: Pausing '" + message + "' for " + addSeconds + "s=" + time + " now=" + new Date());
  while ((new Date()).getTime() <= time.getTime()) {
  }
  console.log("RESULT: Paused '" + message + "' for " + addSeconds + "s=" + time + " now=" + new Date());
  console.log("RESULT: ");
}


//-----------------------------------------------------------------------------
//Wait until some unixTime + additional seconds
//-----------------------------------------------------------------------------
function waitUntil(message, unixTime, addSeconds) {
  var t = parseInt(unixTime) + parseInt(addSeconds) + parseInt(1);
  var time = new Date(t * 1000);
  console.log("RESULT: Waiting until '" + message + "' at " + unixTime + "+" + addSeconds + "s=" + time + " now=" + new Date());
  while ((new Date()).getTime() <= time.getTime()) {
  }
  console.log("RESULT: Waited until '" + message + "' at at " + unixTime + "+" + addSeconds + "s=" + time + " now=" + new Date());
  console.log("RESULT: ");
}


//-----------------------------------------------------------------------------
//Wait until some block
//-----------------------------------------------------------------------------
function waitUntilBlock(message, block, addBlocks) {
  var b = parseInt(block) + parseInt(addBlocks) + parseInt(1);
  console.log("RESULT: Waiting until '" + message + "' #" + block + "+" + addBlocks + "=#" + b + " currentBlock=" + eth.blockNumber);
  while (eth.blockNumber <= b) {
  }
  console.log("RESULT: Waited until '" + message + "' #" + block + "+" + addBlocks + "=#" + b + " currentBlock=" + eth.blockNumber);
  console.log("RESULT: ");
}


//-----------------------------------------------------------------------------
// Token Contract
//-----------------------------------------------------------------------------
var tokenAFromBlock = 0;
function printTokenAContractDetails() {
  console.log("RESULT: tokenAContractAddress=" + tokenAContractAddress);
  if (tokenAContractAddress != null && tokenAContractAbi != null) {
    var contract = eth.contract(tokenAContractAbi).at(tokenAContractAddress);
    var decimals = contract.decimals();
    console.log("RESULT: token.owner=" + contract.owner());
    console.log("RESULT: token.newOwner=" + contract.newOwner());
    console.log("RESULT: token.symbol=" + contract.symbol());
    console.log("RESULT: token.name=" + contract.name());
    console.log("RESULT: token.decimals=" + decimals);
    console.log("RESULT: token.totalSupply=" + contract.totalSupply().shift(-decimals));
    console.log("RESULT: token.initialised=" + contract.initialised());

    var latestBlock = eth.blockNumber;
    var i;

    var approvalEvents = contract.Approval({}, { fromBlock: tokenAFromBlock, toBlock: latestBlock });
    i = 0;
    approvalEvents.watch(function (error, result) {
      console.log("RESULT: Approval " + i++ + " #" + result.blockNumber + " owner=" + result.args.owner +
        " spender=" + result.args.spender + " tokens=" + result.args.tokens.shift(-decimals));
    });
    approvalEvents.stopWatching();

    var transferEvents = contract.Transfer({}, { fromBlock: tokenAFromBlock, toBlock: latestBlock });
    i = 0;
    transferEvents.watch(function (error, result) {
      console.log("RESULT: Transfer " + i++ + " #" + result.blockNumber + ": from=" + result.args.from + " to=" + result.args.to +
        " tokens=" + result.args.tokens.shift(-decimals));
    });
    transferEvents.stopWatching();

    tokenAFromBlock = latestBlock + 1;
  }
}


//-----------------------------------------------------------------------------
// Token Contract
//-----------------------------------------------------------------------------
var tokenBFromBlock = 0;
function printTokenBContractDetails() {
  console.log("RESULT: tokenBContractAddress=" + tokenBContractAddress);
  if (tokenBContractAddress != null && tokenBContractAbi != null) {
    var contract = eth.contract(tokenBContractAbi).at(tokenBContractAddress);
    var decimals = contract.decimals();
    console.log("RESULT: token.owner=" + contract.owner());
    console.log("RESULT: token.newOwner=" + contract.newOwner());
    console.log("RESULT: token.symbol=" + contract.symbol());
    console.log("RESULT: token.name=" + contract.name());
    console.log("RESULT: token.decimals=" + decimals);
    console.log("RESULT: token.totalSupply=" + contract.totalSupply().shift(-decimals));
    console.log("RESULT: token.initialised=" + contract.initialised());

    var latestBlock = eth.blockNumber;
    var i;

    var approvalEvents = contract.Approval({}, { fromBlock: tokenBFromBlock, toBlock: latestBlock });
    i = 0;
    approvalEvents.watch(function (error, result) {
      console.log("RESULT: Approval " + i++ + " #" + result.blockNumber + " owner=" + result.args.owner +
        " spender=" + result.args.spender + " tokens=" + result.args.tokens.shift(-decimals));
    });
    approvalEvents.stopWatching();

    var transferEvents = contract.Transfer({}, { fromBlock: tokenBFromBlock, toBlock: latestBlock });
    i = 0;
    transferEvents.watch(function (error, result) {
      console.log("RESULT: Transfer " + i++ + " #" + result.blockNumber + ": from=" + result.args.from + " to=" + result.args.to +
        " tokens=" + result.args.tokens.shift(-decimals));
    });
    transferEvents.stopWatching();

    tokenBFromBlock = latestBlock + 1;
  }
}


// -----------------------------------------------------------------------------
// TransactionRequest
// -----------------------------------------------------------------------------
var txRequestFromBlock = {};
function displayTxRequestDetails(msg, address, abi) {
  var contract = eth.contract(abi).at(address);
  if (txRequestFromBlock[address] == undefined) {
    txRequestFromBlock[address] = baseBlock;
  }
  var data = contract.requestData();
  var addressValues = data[0];
  var boolValues = data[1];
  var uintValues = data[2];
  var uint8Values = data[3];
  console.log("RESULT: ----- TxRequest '" + msg + "' -----");
  console.log("RESULT: txRequest.address=" + address);
  console.log("RESULT:   claimData.claimedBy=" + addressValues[0]);
  console.log("RESULT:   meta.createdBy=" + addressValues[1]);
  console.log("RESULT:   meta.owner=" + addressValues[2]);
  console.log("RESULT:   paymentData.feeRecipient=" + addressValues[3]);
  console.log("RESULT:   paymentData.bountyBenefactor=" + addressValues[4]);
  console.log("RESULT:   txnData.toAddress=" + addressValues[5]);
  console.log("RESULT:   meta.isCancelled=" + boolValues[0]);
  console.log("RESULT:   meta.wasCalled=" + boolValues[1]);
  console.log("RESULT:   meta.wasSuccessful=" + boolValues[2]);
  console.log("RESULT:   claimData.claimDeposit=" + uintValues[0].shift(-18).toFixed(18) + " " + uintValues[0]);
  console.log("RESULT:   paymentData.fee=" + uintValues[1].shift(-18).toFixed(18) + " " + uintValues[1]);
  console.log("RESULT:   paymentData.feeOwed=" + uintValues[2].shift(-18).toFixed(18) + " " + uintValues[2]);
  console.log("RESULT:   paymentData.bounty=" + uintValues[3].shift(-18).toFixed(18) + " " + uintValues[3]);
  console.log("RESULT:   paymentData.bountyOwed=" + uintValues[4].shift(-18).toFixed(18) + " " + uintValues[4]);
  console.log("RESULT:   schedule.claimWindowSize=" + uintValues[5]);
  console.log("RESULT:   (schedule.firstClaimBlock=" + (uintValues[10] - uintValues[6] - uintValues[5]) + " = freezeStart-claimWindowSize)");
  console.log("RESULT:   schedule.freezePeriod=" + uintValues[6]);
  console.log("RESULT:   (schedule.freezeStart=" + (uintValues[10] - uintValues[6]) + ") = windowStart - freezePeriod");
  console.log("RESULT:   schedule.reservedWindowSize=" + uintValues[7]);
  console.log("RESULT:   (schedule.reservedWindowEnd=" + (parseInt(uintValues[10]) + parseInt(uintValues[7])) + ") = windowStart + reserveWindowSize");
  console.log("RESULT:   schedule.temporalUnit=" + uintValues[8]);
  console.log("RESULT:   schedule.windowSize=" + uintValues[9]);
  console.log("RESULT:   schedule.windowStart=" + uintValues[10]);
  console.log("RESULT:   (schedule.windowEnd=" + (parseInt(uintValues[10]) + parseInt(uintValues[9])) + ") = windowStart + windowSize");
  console.log("RESULT:   txnData.callGas=" + uintValues[11]);
  console.log("RESULT:   txnData.callValue=" + uintValues[12]);
  console.log("RESULT:   txnData.gasPrice=" + uintValues[13].shift(-18).toFixed(18) + " " + uintValues[13]);
  console.log("RESULT:   claimData.requiredDeposit=" + uintValues[14].shift(-18).toFixed(18) + " " + uintValues[14]);
  console.log("RESULT:   claimData.paymentModifier=" + uint8Values[0]);
  console.log("RESULT:   txnData.callData=" + contract.callData());

  var i;
  var latestBlock = eth.blockNumber;

  var abortedEvents = contract.Aborted({}, { fromBlock: txRequestFromBlock[address], toBlock: latestBlock });
  i = 0;
  abortedEvents.watch(function (error, result) {
    console.log("RESULT: txRequest.Aborted " + i++ + " #" + result.blockNumber + " " + JSON.stringify(result.args));
  });
  abortedEvents.stopWatching();

  var cancelledEvents = contract.Cancelled({}, { fromBlock: txRequestFromBlock[address], toBlock: latestBlock });
  i = 0;
  cancelledEvents.watch(function (error, result) {
    console.log("RESULT: txRequest.Cancelled " + i++ + " #" + result.blockNumber + " " + JSON.stringify(result.args));
  });
  cancelledEvents.stopWatching();

  var claimedEvents = contract.Claimed({}, { fromBlock: txRequestFromBlock[address], toBlock: latestBlock });
  i = 0;
  claimedEvents.watch(function (error, result) {
    console.log("RESULT: txRequest.Claimed " + i++ + " #" + result.blockNumber + " " + JSON.stringify(result.args));
  });
  claimedEvents.stopWatching();

  var executedEvents = contract.Executed({}, { fromBlock: txRequestFromBlock[address], toBlock: latestBlock });
  i = 0;
  executedEvents.watch(function (error, result) {
    console.log("RESULT: txRequest.Executed " + i++ + " #" + result.blockNumber + " " + JSON.stringify(result.args));
  });
  executedEvents.stopWatching();

  var logUintEvents = contract.LogUint({}, { fromBlock: txRequestFromBlock[address], toBlock: latestBlock });
  i = 0;
  logUintEvents.watch(function (error, result) {
    console.log("RESULT: txRequest.LogUint " + i++ + " #" + result.blockNumber + " source=" + result.args.source +
      " text=" + result.args.text + " value=" + result.args.value + " " + result.args.value.shift(-18));
  });
  logUintEvents.stopWatching();

  txRequestFromBlock[address] = latestBlock + 1;
}


function roleNames(role) {
  if (role == 1) {
    return "SYSTEM_ADMIN:1";
  } else if (role == 2) {
    return "KYC_OPERATOR:2";
  } else if (role == 3) {
    return "MONEY_OPERATOR:3";
  } else {
    return "UNKNOWN:" + role;
  }
}

// -----------------------------------------------------------------------------
// GateRoles Contract
// -----------------------------------------------------------------------------
var gateRolesContractAddress = null;
var gateRolesContractAbi = null;

function addGateRolesContractAddressAndAbi(address, gateRolesAbi) {
  gateRolesContractAddress = address;
  gateRolesContractAbi = gateRolesAbi;
}

var gateRolesFromBlock = 0;
function printGateRolesContractDetails() {
  if (gateRolesFromBlock == 0) {
    gateRolesFromBlock = baseBlock;
  }
  console.log("RESULT: gateRoles.address=" + getAddressName(gateRolesContractAddress));
  if (gateRolesContractAddress != null && gateRolesContractAbi != null) {
    var contract = eth.contract(gateRolesContractAbi).at(gateRolesContractAddress);
    console.log("RESULT: gateRoles.authority()=" + getAddressName(contract.authority()));
    console.log("RESULT: gateRoles.owner()=" + getAddressName(contract.owner()));
    console.log("RESULT: gateRoles.SYSTEM_ADMIN()=" + roleNames(contract.SYSTEM_ADMIN()));
    console.log("RESULT: gateRoles.KYC_OPERATOR()=" + roleNames(contract.KYC_OPERATOR()));
    console.log("RESULT: gateRoles.MONEY_OPERATOR()=" + roleNames(contract.MONEY_OPERATOR()));

    var latestBlock = eth.blockNumber;
    var i;

    var logSetRootUserEvents = contract.LogSetRootUser({}, { fromBlock: gateRolesFromBlock, toBlock: latestBlock });
    i = 0;
    logSetRootUserEvents.watch(function (error, result) {
      console.log("RESULT: LogSetRootUser " + i++ + " #" + result.blockNumber + " " + JSON.stringify(result.args));
    });
    logSetRootUserEvents.stopWatching();

    var logSetUserRoleEvents = contract.LogSetUserRole({}, { fromBlock: gateRolesFromBlock, toBlock: latestBlock });
    i = 0;
    logSetUserRoleEvents.watch(function (error, result) {
      console.log("RESULT: LogSetUserRole " + i++ + " #" + result.blockNumber + " " + JSON.stringify(result.args));
    });
    logSetUserRoleEvents.stopWatching();

    var logSetPublicCapabilityEvents = contract.LogSetPublicCapability({}, { fromBlock: gateRolesFromBlock, toBlock: latestBlock });
    i = 0;
    logSetPublicCapabilityEvents.watch(function (error, result) {
      console.log("RESULT: LogSetPublicCapability " + i++ + " #" + result.blockNumber + " " + JSON.stringify(result.args));
    });
    logSetPublicCapabilityEvents.stopWatching();

    // event LogSetRoleCapability(address code, bytes32 capabilityRoles, uint8 role, bytes4 sig, bool enabled);
    // LogSetRoleCapability 0 #69101 {"capabilityRoles":"0x0000000000000000000000000000000000000000000000000000000000000008",
    // "code":"0x2e265e894be492bbd5ee7caea0e2ee699aba4d60","enabled":true,"role":"3","sig":"0xa0712d68"}
    var logSetRoleCapabilityEvents = contract.LogSetRoleCapability({}, { fromBlock: gateRolesFromBlock, toBlock: latestBlock });
    i = 0;
    logSetRoleCapabilityEvents.watch(function (error, result) {
      var sig = sigs[result.args.sig.substring(0, 10)];
      if (sig !== undefined) {
        console.log("RESULT: RoleCapability code " + getAddressName(result.args.code) + " capabilityRoles " + result.args.capabilityRoles +
          " for " + sig + " role " + roleNames(result.args.role) + " " + result.args.enabled + " #" + result.blockNumber + " " + result.transactionHash);
      } else {
        console.log("RESULT: LogSetRoleCapability " + i++ + " #" + result.blockNumber + " " + JSON.stringify(result.args));
      }
    });
    logSetRoleCapabilityEvents.stopWatching();

    gateRolesFromBlock = latestBlock + 1;
  }
}


// -----------------------------------------------------------------------------
// TokenGuard Contract
// -----------------------------------------------------------------------------
var tokenGuardContractAddress = null;
var tokenGuardContractAbi = null;

function addTokenGuardContractAddressAndAbi(address, tokenGuardAbi) {
  tokenGuardContractAddress = address;
  tokenGuardContractAbi = tokenGuardAbi;
}

var tokenGuardFromBlock = 0;
function printTokenGuardContractDetails() {
  if (tokenGuardFromBlock == 0) {
    tokenGuardFromBlock = baseBlock;
  }
  console.log("RESULT: tokenGuard.address=" + getAddressName(tokenGuardContractAddress));
  if (tokenGuardContractAddress != null && tokenGuardContractAbi != null) {
    var contract = eth.contract(tokenGuardContractAbi).at(tokenGuardContractAddress);
    console.log("RESULT: tokenGuard.authority()=" + getAddressName(contract.authority()));
    console.log("RESULT: tokenGuard.owner()=" + getAddressName(contract.owner()));

    var latestBlock = eth.blockNumber;
    var i;

    // event LogPermit(
    //     bytes32 indexed src,
    //     bytes32 indexed dst,
    //     bytes32 indexed sig
    // );
    // LogPermit 0 #69104 {"dst":"0x000000000000000000000000c769f95e0e2db8587ae774b3049970b7f2135a3d",
    // "sig":"0x5ac801fe00000000000000000000000000000000000000000000000000000000",
    // "src":"0x0000000000000000000000002e265e894be492bbd5ee7caea0e2ee699aba4d60"}
    var logPermitEvents = contract.LogPermit({}, { fromBlock: tokenGuardFromBlock, toBlock: latestBlock });
    i = 0;
    logPermitEvents.watch(function (error, result) {
      var sig = sigs[result.args.sig.substring(0, 10)];
      var src = "0x" + result.args.src.substring(26);
      var dst = "0x" + result.args.dst.substring(26);
      if (sig !== undefined) {
        console.log("RESULT: Permit from " + getAddressName(src) + " to " + getAddressName(dst) + " for " + sig + " #" + result.blockNumber + " " + result.transactionHash);
      } else {
        console.log("RESULT: LogPermit " + i++ + " #" + result.blockNumber + " " + JSON.stringify(result.args));
      }
    });
    logPermitEvents.stopWatching();

    var logForbidEvents = contract.LogForbid({}, { fromBlock: tokenGuardFromBlock, toBlock: latestBlock });
    i = 0;
    logForbidEvents.watch(function (error, result) {
      console.log("RESULT: LogForbid " + i++ + " #" + result.blockNumber + " " + JSON.stringify(result.args));
    });
    logForbidEvents.stopWatching();

    tokenGuardFromBlock = latestBlock + 1;
  }
}