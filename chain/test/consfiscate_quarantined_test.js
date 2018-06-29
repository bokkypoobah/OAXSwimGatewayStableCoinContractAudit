const {
    expect,
    expectThrow,
    expectNoAsyncThrow,
    toBN,
    solc,
    ganacheWeb3,
    ZERO_ADDR,
} = require('chain-dsl/test/helpers')

const {
    address,
    distillEvent,
    txEvents,
    send,
    call,
    balance,
} = require('chain-dsl')

const deploy = require('../lib/deployer')

const mint = 'mint(address,uint256)'
const deposit = 'deposit'
const approve = 'approve'
const transfer = 'transfer'
const transferFrom = 'transferFrom'
const confiscate = 'confiscate(address,uint256)'
const unConfiscate = 'unConfiscate(address,uint256)'
const setConfiscateCollector = 'setConfiscateCollector(address)'
const enableConfiscate = 'enableConfiscate()'
const disableConfiscate = 'disableConfiscate()'

describe.skip("Confiscate and Quarantine", function () {
    this.timeout(30000)

    let web3, snaps, accounts, gate, token, confiscateToken, addressControlStatus,
        DEPLOYER,
        SYSTEM_ADMIN, KYC_OPERATOR, MONEY_OPERATOR,
        CUSTOMER,
        CUSTOMER1,
        CUSTOMER2,
        CONFISCATE_COLLECTOR

    before('deployment', async () => {
        snaps = []
        web3 = ganacheWeb3()
        ;[
            DEPLOYER,
            SYSTEM_ADMIN, KYC_OPERATOR, MONEY_OPERATOR,
            CUSTOMER,
            CUSTOMER1,
            CUSTOMER2,
            CONFISCATE_COLLECTOR
        ] = accounts = await web3.eth.getAccounts()

        ;({gate, token, confiscateToken, addressControlStatus} = await deploy.base(web3, solc(__dirname, '../solc-input.json'), DEPLOYER, SYSTEM_ADMIN, KYC_OPERATOR, MONEY_OPERATOR))
    })

    beforeEach(async () => snaps.push(await web3.evm.snapshot()))
    afterEach(async () => web3.evm.revert(snaps.pop()))

    context("Confiscate.", async () => {
        it('MoneyOperator can confiscate if-and-only-if the address is frozen and function enabled', async() => {
            await send(gate, SYSTEM_ADMIN, enableConfiscate)
            await send(gate, MONEY_OPERATOR, mint, CUSTOMER, 1000)
            await send(addressControlStatus, MONEY_OPERATOR, "freezeAddress", CUSTOMER)
            await send(gate, MONEY_OPERATOR, confiscate, CUSTOMER, 1000)
            expect(await call(token, "balanceOf", CUSTOMER)).eq(0)
            expect(await call(token, "balanceOf", SYSTEM_ADMIN)).eq(1000)   //SYSTEM_ADMIN is QuarantineAddress

        })

        it('Cannot confiscate when the function is turned off', async() => {
            await send(gate, MONEY_OPERATOR, mint, CUSTOMER, 1000)
            await send(addressControlStatus, MONEY_OPERATOR, "freezeAddress", CUSTOMER)
            await expectThrow(async () => {
                await send(gate, MONEY_OPERATOR, confiscate, CUSTOMER, 1000)
            })
            expect(await call(token, "balanceOf", CUSTOMER)).eq(1000)
            expect(await call(token, "balanceOf", SYSTEM_ADMIN)).eq(0)   //SYSTEM_ADMIN is QuarantineAddress
        })

        it('Customer cannot confiscate', async() => {
            await send(gate, SYSTEM_ADMIN, enableConfiscate)
            await send(gate, MONEY_OPERATOR, mint, CUSTOMER, 1000)
            await send(addressControlStatus, MONEY_OPERATOR, "freezeAddress", CUSTOMER)
            await expectThrow(async () => {
                await send(gate, CUSTOMER1, confiscate, CUSTOMER, 1000)
            })
            expect(await call(token, "balanceOf", CUSTOMER)).eq(1000)
            expect(await call(token, "balanceOf", SYSTEM_ADMIN)).eq(0)   //SYSTEM_ADMIN is QuarantineAddress

        })

    })

    context("UnConfiscate.", async () => {
        it('MoneyOperator can unConfiscate if-and-only-if the address is unFrozen and function enabled', async() => {
            await send(gate, SYSTEM_ADMIN, enableConfiscate)
            await send(gate, MONEY_OPERATOR, mint, CUSTOMER, 1000)
            await send(addressControlStatus, MONEY_OPERATOR, "freezeAddress", CUSTOMER)
            await send(gate, MONEY_OPERATOR, confiscate, CUSTOMER, 1000)
            expect(await call(token, "balanceOf", CUSTOMER)).eq(0)
            expect(await call(token, "balanceOf", SYSTEM_ADMIN)).eq(1000)   //SYSTEM_ADMIN is QuarantineAddress

            await send(addressControlStatus, MONEY_OPERATOR, "unfreezeAddress", CUSTOMER)
            await send(gate, MONEY_OPERATOR, unConfiscate, CUSTOMER, 1000)
            expect(await call(token, "balanceOf", CUSTOMER)).eq(1000)
            expect(await call(token, "balanceOf", SYSTEM_ADMIN)).eq(0)   //SYSTEM_ADMIN is QuarantineAddress
        })

        it('Customer cannot unConfiscate', async() => {
            await send(gate, SYSTEM_ADMIN, enableConfiscate)
            await send(gate, MONEY_OPERATOR, mint, CUSTOMER, 1000)
            await send(addressControlStatus, MONEY_OPERATOR, "freezeAddress", CUSTOMER)
            await expectThrow(async () => {
                await send(gate, CUSTOMER1, unConfiscate, CUSTOMER, 1000)
            })
            expect(await call(token, "balanceOf", CUSTOMER)).eq(1000)
            expect(await call(token, "balanceOf", SYSTEM_ADMIN)).eq(0)   //SYSTEM_ADMIN is QuarantineAddress

        })
    })

    context("setConfiscateCollector", async() => {
        it('SystemAdmin can change confiscate address', async() => {
            await send(gate, SYSTEM_ADMIN, enableConfiscate)
            await send(gate, MONEY_OPERATOR, mint, CUSTOMER, 1000)
            await send(addressControlStatus, MONEY_OPERATOR, "freezeAddress", CUSTOMER)
            await send(gate, SYSTEM_ADMIN, setConfiscateCollector, CONFISCATE_COLLECTOR)
            await send(gate, MONEY_OPERATOR, confiscate, CUSTOMER, 1000)
            expect(await call(token, "balanceOf", CUSTOMER)).eq(0)
            expect(await call(token, "balanceOf", SYSTEM_ADMIN)).eq(0)   //SYSTEM_ADMIN is QuarantineAddress
            expect(await call(token, "balanceOf", CONFISCATE_COLLECTOR)).eq(1000)
        })

        it('Customer cannot change confiscate address', async() => {
            await send(gate, SYSTEM_ADMIN, enableConfiscate)
            await send(gate, MONEY_OPERATOR, mint, CUSTOMER, 1000)
            await send(addressControlStatus, MONEY_OPERATOR, "freezeAddress", CUSTOMER)
            await expectThrow(async () => {
                await send(gate, CUSTOMER1, setConfiscateCollector, CONFISCATE_COLLECTOR)
            })
            await send(gate, MONEY_OPERATOR, confiscate, CUSTOMER, 1000)
            expect(await call(token, "balanceOf", CUSTOMER)).eq(0)
            expect(await call(token, "balanceOf", SYSTEM_ADMIN)).eq(1000)   //SYSTEM_ADMIN is QuarantineAddress
            expect(await call(token, "balanceOf", CONFISCATE_COLLECTOR)).eq(0)

        })

    })
})