const {Assertion, expect} = Chai = require('chai')
const Web3 = require('web3')
const {BN, toBN, fromWei, toWei, padLeft} = require('web3-utils')
const Ganache = require("ganache-core")
const _solc = require('solc')
const path = require('path')
const fs = require('fs')

Chai.use(require('chai-subset'))
Chai.use(require('chai-as-promised'))

Assertion.addMethod('eq', function (N) {
    this.assert(toBN(this._obj).eq(toBN(N)),
        'expected #{act} to equal #{exp}',
        'expected #{act} NOT to equal #{exp}',
        N, this._obj)
})

async function expectAsyncThrow(fn, regExp, message) {
    let f = () => {
    };
    try {
        await fn();
    } catch (e) {
        f = () => {
            throw e
        };
    } finally {
        expect(f).to.throw(regExp, message);
    }
}

async function expectNoAsyncThrow(fn, regExp, message) {
    let f = () => {
    };
    try {
        await fn();

    } catch (e) {
        f = () => {
            throw e
        }
    } finally {
        expect(f).to.not.throw(regExp, message);
    }
}

async function expectThrow(fn) {
    /*
     It's similar to `expect( ()=>{throw "Err"} ).to.throw()`
     BUT works with async functions
     AND tailored to catch EVM transaction exceptions
     coming from both web3 0.x and 1.x.

     Usage:

       One-liner / single expression function:

            await expectThrow(async () =>
                 send(gate, DEPLOYER, mint, CUSTOMER, 123))

      This however DOES NOT work:

            await expectThrow(async () => {
                 send(gate, DEPLOYER, mint, CUSTOMER, 123)
             })

      because it does not wait for the promise,
      neither does it return a promise.

      Multi-line function:

            await expectThrow(async () => {
                await send(gate, OPERATOR, mintForSelf, 10)
                return send(gate, OPERATOR, approve, CUSTOMER, 3)
            })

      Eagerly waiting for the promise also works with single and
      multi expression function bodies consistently:

            await expectThrow(async () =>
                 await send(gate, DEPLOYER, mint, CUSTOMER, 123))

      or

            await expectThrow(async () => {
                await send(gate, OPERATOR, mintForSelf, 10)
                await send(gate, OPERATOR, approve, CUSTOMER, 3)
            })
    */
    return await expectAsyncThrow(fn, /invalid opcode|VM Exception/, 'Contract call should fail')
}

const readImportFrom = (dir, file) => {
    const fullPath = path.join(dir, file)
    try {
        const contents = fs.readFileSync(fullPath, 'utf-8')
        return {contents: contents}
    } catch (e) {
        return {error: e}
    }
}

const solcJSON = (cwd, jsonInputPath) => {
    const fullPath = path.resolve(path.join(cwd, jsonInputPath))
    const plan = require(fullPath)
    const contractsDir = path.dirname(fullPath)
    const compiled = JSON.parse(_solc.compileStandardWrapper(JSON.stringify(plan),
        (file) => readImportFrom(contractsDir, file)))
    if (compiled.errors) {
        const msg = ({formattedMessage}) => formattedMessage
        throw new Error('\n' + compiled.errors.map(msg).join('\n'))
    } else {
        return compiled
    }
}

/*
* Convenience layer on top of solc, to allow access to contract
* JSON interfaces and bytecodes compiled from different files
* and graft contract names into the JSON interface for better
* error reporting
* */
const solc = (cwd, jsonInputPath) => {
    const solcOutput = solcJSON(cwd, jsonInputPath)

    // Merge all contracts across all files into one registry
    const contractRegistry = Object.assign(...Object.values(solcOutput.contracts))

    // Preserve contract names in compilation output
    Object.keys(contractRegistry)
        .forEach((name) => contractRegistry[name].NAME = name)

    return contractRegistry
}

const ganacheWeb3 = () => {
    const truffleMnemonic = 'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat'
    const provider = Ganache.provider({
        mnemonic: truffleMnemonic,
        logger: {
            log() {
            }
        }
    })
    const web3 = new Web3(provider)

    // Prepare chain snapshotting
    web3.extend({
        property: 'evm',
        methods: [{
            name: 'snapshot',
            call: 'evm_snapshot',
            params: 0,
            outputFormatter: web3.utils.hexToNumber
        }, {
            name: 'revert',
            call: 'evm_revert',
            params: 1,
            inputFormatter: [web3.utils.numberToHex]
        }, {
            name: 'increaseTime',
            call: 'evm_increaseTime',
            params: 1
        }]
    })

    return web3
}

const logAccounts = (accounts) => {
    [
        DEPLOYER,
        OPERATOR,
        CUSTOMER,
        CUSTOMER1,
        CUSTOMER2
    ] = accounts
    console.log(`
            DEPLOYER:   ${DEPLOYER}
            OPERATOR:   ${OPERATOR}
            CUSTOMER:   ${CUSTOMER}
            CUSTOMER1:  ${CUSTOMER1}
            CUSTOMER2:  ${CUSTOMER2}`)
}

module.exports = {
    expect,
    expectAsyncThrow,
    expectNoAsyncThrow,
    expectThrow,
    ZERO_ADDR: padLeft(0x0, 40),
    BN,
    toBN,
    fromWei,
    toWei,
    padLeft,
    solcJSON,
    solc,
    Ganache,
    ganacheWeb3,
    logAccounts
}
