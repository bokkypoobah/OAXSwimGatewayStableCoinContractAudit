const {padLeft} = require('web3-utils')

const DEPOSIT_REQUESTED_STATE = "DEPOSIT_REQUESTED";
const TOKEN_MINTED_STATE = "TOKEN_MINTED";
const WITHDRAWAL_REQUESTED_STATE = "WITHDRAWAL_REQUESTED";
const TOKEN_TRANSFERRED_STATE = "TOKEN_TRANSFERRED";
const TOKEN_WITHDRAWN_STATE = "TOKEN_WITHDRAWN";

const makeState = (ethereumAddress, amount, status, timestamp) => {
    return {ethereumAddress, amount: amount.toString(10), status, timestamp}
}

const EMPTY_ADDRESS = padLeft(0x0, 40);

const distillEvent = ({event, returnValues, blockNumber}) => {
    const essence = Object.assign({}, returnValues)
    essence.NAME = event
    essence.blockNumber = blockNumber
    // Clean up positional arguments for easier debugging
    delete essence[0]
    delete essence[1]
    delete essence[2]
    delete essence[3]
    return essence
}

const allEvents = async (contractInstance) =>
    (await contractInstance.getPastEvents("allEvents", {fromBlock: 0}))
        .map(distillEvent)

const getBlockTimeStamp = (web3, blockNumber) => {
    return new Promise((resolve, reject) => {
        web3.eth.getBlock(blockNumber)
            .then(function (blockInfo) {
                resolve(blockInfo.timestamp)
            })
            .catch(function (err) {
                reject(err)
            })
    })
}

const mapTimestamp = (web3, logs) => {
    let promises = []
    for (let i = 0; i < logs.length; i++) {
        promises.push(new Promise((resolve, reject) => {
                getBlockTimeStamp(web3, logs[i].blockNumber)
                    .then(function (timestamp) {
                        logs[i].timestamp = timestamp
                        resolve(logs[i])
                    })
                    .catch(function (err) {
                        reject(err)
                    })
            }
        ))
    }

    return Promise.all(promises)
}

const processState = async (web3, distilledEvents, ASSET_GATEWAY_ADDRESS) => {
    const logs = distilledEvents

    // console.dir(distilledEvents)

    await mapTimestamp(web3, logs)

    // (depositRequests - minted) + mints
    const depositRequests = logs.filter(ev => ev.NAME === 'DepositRequested')
    const mints = logs.filter(ev => (ev.NAME === 'Transfer') && (ev.src === EMPTY_ADDRESS) && (ev.dst !== EMPTY_ADDRESS))
    let mintsClone = mints.slice(0)
    const withdrawalRequests = logs.filter(ev => ev.NAME === 'WithdrawalRequested')
    const transferredTokens = logs.filter(ev => (ev.NAME === 'Approval') && (ev.guy === ASSET_GATEWAY_ADDRESS) && ev.src !== EMPTY_ADDRESS)
    let transferredTokensClone = transferredTokens.slice(0)
    const withdrawnTokens = logs.filter(ev => ev.NAME === 'Withdrawn')
    let withdrawnTokensClone = withdrawnTokens.slice(0)

    function minted(mintsClone, deposit) {
        for (let i = 0; i < mintsClone.length; i++) {
            let transfer = mintsClone[i]
            if ((transfer.dst === deposit.by) &&
                (transfer.wad === deposit.amount)) {
                mintsClone = mintsClone.splice(i, 1)
                return true
            }
        }

        return false
    }

    function tokenTransferred(transferredTokensClone, withdrawal) {
        for (let j = 0; j < transferredTokensClone.length; j++) {
            let transfer = transferredTokensClone[j]
            if ((transfer.src === withdrawal.from) &&
                (transfer.wad === withdrawal.amount)) {
                transferredTokensClone = transferredTokensClone.splice(j, 1)
                return true
            }
        }

        return false
    }

    function tokenWithdrawn(withdrawnTokensClone, withdrawalTransferred) {
        for (let k = 0; k < withdrawnTokensClone.length; k++) {
            let withdrawn = withdrawnTokensClone[k]
            if (
                (withdrawn.from === withdrawalTransferred.src) &&
                (withdrawn.amount === withdrawalTransferred.wad)
            ) {
                withdrawnTokensClone = withdrawnTokensClone.splice(k, 1)
                return true
            }
        }

        return false
    }

    const pendingDeposits = depositRequests.filter((deposit) => !minted(mintsClone, deposit))
    const pendingWithdrawals = withdrawalRequests.filter((withdrawal) => !tokenTransferred(transferredTokensClone, withdrawal))
    const transferredWithdrawals = transferredTokens.filter((withdrawalTransferred) => !tokenWithdrawn(withdrawnTokensClone, withdrawalTransferred))
    const depositState = ev => {
        return makeState(ev.by, ev.amount, DEPOSIT_REQUESTED_STATE, ev.timestamp)
    }
    const mintState = ev => {
        return makeState(ev.dst, ev.wad, TOKEN_MINTED_STATE, ev.timestamp)
    }
    const withdrawState = ev => {
        return makeState(ev.from, ev.amount, WITHDRAWAL_REQUESTED_STATE, ev.timestamp)
    }
    const transferTokenState = ev => {
        return makeState(ev.src, ev.wad, TOKEN_TRANSFERRED_STATE, ev.timestamp)
    }
    const withdrawnTokenState = ev => {
        return makeState(ev.from, ev.amount, TOKEN_WITHDRAWN_STATE, ev.timestamp)
    }

    return pendingDeposits.map(depositState)
        .concat(mints.map(mintState))
        .concat(pendingWithdrawals.map(withdrawState))
        .concat(transferredWithdrawals.map(transferTokenState))
        .concat(withdrawnTokens.map(withdrawnTokenState))
}

module.exports = (web3, gate, token) => {
    return {
        makeState,
        processState,
        allEvents,

        async depositRequests() {
            const [DEPLOYER, OPERATOR, CUSTOMER, CUSTOMER1, CUSTOMER2]
                = await web3.eth.getAccounts()
            let all = (await allEvents(gate)).concat(await allEvents(token))
            let processed = await processState(web3, all, gate.options.address)
            return processed
                .filter(({status}) => {
                    return [
                        DEPOSIT_REQUESTED_STATE,
                        TOKEN_MINTED_STATE]
                        .includes(status)
                })
        },

        async withdrawalRequests() {
            const [DEPLOYER, OPERATOR, CUSTOMER, CUSTOMER1, CUSTOMER2]
                = await web3.eth.getAccounts()
            let all = (await allEvents(gate)).concat(await allEvents(token))
            let processed = await processState(web3, all, gate.options.address)
            return processed
                .filter(({status}) => {
                    return [
                        WITHDRAWAL_REQUESTED_STATE,
                        TOKEN_TRANSFERRED_STATE,
                        TOKEN_WITHDRAWN_STATE]
                        .includes(status)
                })
        }
    }
}
