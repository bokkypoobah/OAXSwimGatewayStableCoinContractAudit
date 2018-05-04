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

describe.only("Limits:", function () {
    this.timeout(8000)

    let web3, snaps, accounts, gate, token, limitController,
        DEPLOYER,
        OPERATOR,
        CUSTOMER,
        MIN_AMT,
        AMT,
        DEFAULT_DAILY_MINT_LIMIT,
        DEFAULT_DAILY_BURN_LIMIT

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
        DEFAULT_DAILY_MINT_LIMIT = wad(10000)
        DEFAULT_DAILY_BURN_LIMIT = wad(20000)

        ;({gate, token, limitController} = await deployer.base(
            web3,
            solc(__dirname, '../solc-input.json'),
            DEPLOYER,
            OPERATOR,
            OPERATOR,
            DEFAULT_DAILY_MINT_LIMIT,
            DEFAULT_DAILY_BURN_LIMIT
        ))
    })

    beforeEach(async () => snaps.push(await web3.evm.snapshot()))
    afterEach(async () => web3.evm.revert(snaps.pop()))

    context.only("Limits Enforcement -", async () => {

        it('Can never mint more than the daily mint limit at once', async () => {
            web3.evm.increaseTime(hours(2 * 24))
            await expectThrow(async () =>
                await send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT + 1))
        })

        it('Can not mint more than daily mint limit in same day', async () => {
            const moreThanADay = hours((1 + 2) * 24)
            web3.evm.increaseTime(moreThanADay)
            await expectNoAsyncThrow(async () =>
                send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT - 1))
        })

        it('Can never burn more than the daily burn limit at once', async () => {
            //prepare balance
            send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT - 1)
            web3.evm.increaseTime(hours(2 * 24))
            send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT - 1)

            send(token, CUSTOMER, approve, address(gate), DEFAULT_DAILY_BURN_LIMIT)
            await expectThrow(async () =>
                send(gate, OPERATOR, burn, CUSTOMER, DEFAULT_DAILY_BURN_LIMIT + 1))
        })

        it('Can not burn more than daily burn limit in same day', async () => {
            //prepare balance
            await send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT - 1)
            web3.evm.increaseTime(hours(2 * 24))
            await send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT - 1)
            web3.evm.increaseTime(hours(2 * 24))
            await send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT - 1)
            web3.evm.increaseTime(hours(2 * 24))
            await send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT - 1)

            const moreThanADay = hours((1 + 2) * 24)
            await web3.evm.increaseTime(moreThanADay)

            await send(token, CUSTOMER, approve, address(gate), DEFAULT_DAILY_BURN_LIMIT)
            await expectNoAsyncThrow(async () =>
                await send(gate, OPERATOR, burn, CUSTOMER, DEFAULT_DAILY_BURN_LIMIT - 1))
        })

        it('Mint/burn counter is 0 after deployments', async () => {
            const mintLimitCounter = await call(limitController, 'mintLimitCounter')
            expect(mintLimitCounter).to.eq(0)
            const burnLimitCounter = await call(limitController, 'burnLimitCounter')
            expect(burnLimitCounter).to.eq(0)
        })

        it('Resets on 00:00 UTC (TODO timezone pending to be changed according to business decision)', async () => {
            const time = await call(limitController, lastLimitResetTime)
            expect(time | 0).to.be.above(0)
            expect(time % (24 * 60 * 60)).to.equal(0)
        })

        it('Limits are guaranteed to reset after 24h', async function () {
            const moreThanADay = hours((1 + 2) * 24)

            web3.evm.increaseTime(moreThanADay)

            await expectNoAsyncThrow(async () =>
                send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT))

            web3.evm.increaseTime(moreThanADay)

            await expectNoAsyncThrow(async () =>
                send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT))

            web3.evm.increaseTime(moreThanADay)

            await expectNoAsyncThrow(async () =>
                send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT))

            web3.evm.increaseTime(hours(24))

            await expectNoAsyncThrow(async () =>
                send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT))

            send(token, CUSTOMER, approve, address(gate), DEFAULT_DAILY_BURN_LIMIT)
            await expectNoAsyncThrow(async () =>
                send(gate, OPERATOR, burn, CUSTOMER, DEFAULT_DAILY_BURN_LIMIT))

            web3.evm.increaseTime(hours(24))

            send(token, CUSTOMER, approve, address(gate), DEFAULT_DAILY_BURN_LIMIT)
            await expectNoAsyncThrow(async () =>
                send(gate, OPERATOR, burn, CUSTOMER, DEFAULT_DAILY_BURN_LIMIT))
        })
    })

    context("Limits Configuration - ", async () => {
        it('Limits logic is upgrade-able.', async () => {

        })

        it('For each ethereum address\'s point of view, there is one minting limit and another burning limit.', async () => {
            //expect getMintLimit(address)>=0
            //expect getBurnLimit(address)>=0
            //expect getMintLimit(address)!=getBurnLimit(address)
        })


        it('Only authorised ethereum addresses can change limits configuration.', async () => {

        })
        it('Unauthorised ethereum addresses can NEVER change limits configuration.', async () => {

        })

        it('Limits configuration change takes effect after 24 hours.', async () => {

        })
        it('Limits configuration change does NOT work within 24 hours of change.', async () => {

        })

        it('Only authorised ethereum addresses can configure customised limits for each ethereum address. Rest of the ethereum wallets would use default limits.', async () => {

        })
        it('Unauthorised ethereum addresses can NEVER configure customised limits for any ethereum address.', async () => {

        })
        it('Ethereum wallets without customised limits shall respect default limits.', async () => {

        })
    })
})
