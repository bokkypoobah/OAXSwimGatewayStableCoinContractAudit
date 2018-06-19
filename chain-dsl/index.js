const Web3 = require('web3')
const abi = require('web3-eth-abi')
const {toTwosComplement, padLeft} = require('web3-utils')
const retry = require('async-retry')

const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync('swimdb.json')
const db = low(adapter)
// init
db.defaults({ deployedContract: {} }).write()

const ANY = toTwosComplement(-1) // for ds-guard
const bytes32 = (address) => padLeft(address, 64) // for ds-guard
const address = (contract) => contract.options.address
const wad = amount => amount
const sig = (methodSig) => abi.encodeFunctionSignature(methodSig)

const retryOptions = {retries: 0, minTimeout: 180000, onRetry: (err, i) => {
    if (err) {
        console.log(`Retry error #${i}: ${err}`)
    }}
}

const distillEvent = ({event, returnValues}) => {
    const essence = Object.assign({}, returnValues)
    essence.NAME = event
    // Clean up positional arguments for easier debugging
    delete essence[0]
    delete essence[1]
    delete essence[2]
    delete essence[3]
    return essence
}

const arrayWrap = x => Array.isArray(x) ? x : [x]

// Extract event essences from method transaction logs
const txEvents = async (tx) => {
    const eventArrayList = Object.values((await tx).events).map(arrayWrap)
    return [].concat(...eventArrayList).map(distillEvent)
}

const send = async (contract, sender, methodName, ...params) => {
    const method = contract.methods[methodName]
    if (method instanceof Function) {
        let receipt = await retry(async ()=> {
            return method(...params).send({from: sender})
        },retryOptions)

        if(process.env.NODE_ENV='production'){
            //console.log(`Deployed Method [${methodName}] with [${params}] - ${receipt.transactionHash}`)
        }
        return receipt
    } else {
        throw new Error(`${contract.options.name}.${methodName} is undefined`)
    }
}

const callAs = async (contract, sender, methodName, ...params) => {
    const method = contract.methods[methodName]
    if (method instanceof Function) {
        return method(...params).call({from: sender})
    } else {
        throw new Error(`${contract.options.name}.${methodName} is undefined`)
    }
}

const call = async (contract, ...args) => callAs(contract, undefined, ...args)

const create = async (web3, DEPLOYER, Contract, ...arguments) => {

    const block = await web3.eth.getBlock("latest")

    const contractDefaultOptions = {
        from: DEPLOYER, 
        gas: Math.round(block.gasLimit*0.95),
        gasPrice: 0x04a817c800,
        name: Contract.NAME
    }

    if (Contract.evm.bytecode.object === '') {
        throw new Error(`Constructor missing from ${Contract.NAME}; can't deploy.`)
    }

    let contract = await retry(async()=>{
        return new web3.eth.Contract(Contract.abi, contractDefaultOptions)
        .deploy({data: '0x' + Contract.evm.bytecode.object, arguments})
        .send()
        // FIXME https://github.com/ethereum/web3.js/issues/1253 workaround
    }, retryOptions)
     
    if(process.env.NODE_ENV='production'){
        //console.log(`Deployed Contract ${Contract.NAME} - ${contract._address}`)
    }
    contract.setProvider(web3.currentProvider)

    db.set('deployedContract.'+Contract.NAME.toLowerCase(), {
        'address': contract._address
    }).write()

    return contract
}

const balance = async (web3_or_eip20, account) => {
    const eip20 = web3_or_eip20.methods
    const eth = web3_or_eip20.eth
    if (eip20) {
        return eip20.balanceOf(account).call()
    } else if (eth) {
        return eth.getBalance(account)
    } else {
        throw new Error('Expected a web3 client or an EIP20 web3 contract instead of', web3_or_eip20)
    }
}

module.exports = {
    Web3,
    ANY,
    bytes32,
    address,
    wad,
    sig,
    distillEvent,
    txEvents,
    send,
    callAs,
    call,
    create,
    balance
}

// Suppress this warning:
//
//   (node:32521) MaxListenersExceededWarning:
//      Possible EventEmitter memory leak detected.
//      11 data listeners added.
//      Use emitter.setMaxListeners() to increase limit
//
// https://stackoverflow.com/questions/9768444/possible-eventemitter-memory-leak-detected
//
// FIXME This should not be necessary but fix the root cause
// which is probably coming from `ganache-core`
require('events').EventEmitter.defaultMaxListeners = 70
