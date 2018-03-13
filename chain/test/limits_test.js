const {
    expect,
    expectAsyncThrow,
    expectNoAsyncThrow,
    expectThrow,
    toBN,
    solc,
    ganacheWeb3,
} = require('chain-dsl/test/helpers')

const {
    address,
    wad,
    send,
    call,
} = require('chain-dsl')

const deployer = require('../lib/deployer')

const mint = 'mint(address,uint256)'
const withdraw = 'withdraw'
const burn = 'burn(address,uint256)'
const deposit = 'deposit'
const approve = 'approve'
const transfer = 'transfer'
const transferFrom = 'transferFrom'
const lastLimitResetTime = 'lastLimitResetTime'

function hours(hrs) {
    return hrs * 1000 * 60 * 60
}

describe("Limits:", function () {
    let web3, snaps, accounts, gate, token,
        DEPLOYER,
        OPERATOR,
        CUSTOMER,
        MIN_AMT,
        AMT,
        DEFAULT_DAILY_LIMIT

    before('deployment', async () => {
        snaps = []
        web3 = ganacheWeb3()
        ;[
            DEPLOYER,
            OPERATOR,
            CUSTOMER,
        ] = accounts = await web3.eth.getAccounts()

        MIN_AMT = wad(1)
        AMT = wad(100)
        DEFAULT_DAILY_LIMIT = wad(10000)

        ;({gate, token} = await deployer.base(web3, solc(__dirname, '../solc-input.json'),
            DEPLOYER,
            OPERATOR,
            DEFAULT_DAILY_LIMIT))
    })

    beforeEach(async () => snaps.push(await web3.evm.snapshot()))
    afterEach(async () => web3.evm.revert(snaps.pop()))

    it('Can never mint more than the daily mint limit at once', async () => {
        web3.evm.increaseTime(hours(2 * 24))
        await expectThrow(async () =>
            send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_LIMIT + 1))
    })

    it('Can not mint more than daily limit in same day', async () => {
        const moreThanADay = hours((1 + 2) * 24)
        web3.evm.increaseTime(moreThanADay)
        await expectNoAsyncThrow(async () =>
            send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_LIMIT))
        await expectThrow(async () =>
            send(gate, OPERATOR, mint, CUSTOMER, MIN_AMT))
    })

    it('Mint/burn counter is 0 after deployments', async () => {
        const limitCounter = await call(gate, 'limitCounter')
        expect(limitCounter).to.eq(0)
    })

    it('Resets on 00:00 UTC', async () => {
        const time = await call(gate, lastLimitResetTime)
        expect(time | 0).to.be.above(0)
        expect(time % (24 * 60 * 60)).to.equal(0)
    })

    it('Limits are guaranteed to reset after 24h', async function () {
        const moreThanADay = hours((1 + 2) * 24)
        web3.evm.increaseTime(moreThanADay)
        await expectNoAsyncThrow(async () =>
            send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_LIMIT))
        web3.evm.increaseTime(hours(24))
        await expectNoAsyncThrow(async () =>
            send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_LIMIT))
    })

    it('Apply to burning at once', async function () {
        await send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_LIMIT)
        web3.evm.increaseTime(hours(24))
        await send(gate, OPERATOR, mint, CUSTOMER, MIN_AMT)
        await send(token, CUSTOMER, transfer, OPERATOR, DEFAULT_DAILY_LIMIT + MIN_AMT)
        web3.evm.increaseTime(hours(24))
        await expectThrow(async () =>
            send(gate, OPERATOR, burn, CUSTOMER, DEFAULT_DAILY_LIMIT + MIN_AMT))
    })

    it('Apply to burning and minting within a day', async function () {
        await send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_LIMIT)
        web3.evm.increaseTime(hours(24))
        await send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_LIMIT)
        await send(token, CUSTOMER, transfer, OPERATOR, MIN_AMT)
        await expectThrow(async () =>
            send(gate, OPERATOR, burn, CUSTOMER, MIN_AMT))
    })
})
