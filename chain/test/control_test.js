const {
    expect,
    expectNoAsyncThrow,
    expectThrow,
    toBN,
    solc,
    ganacheWeb3,
} = require('chain-dsl/test/helpers')

const {
    address,
    send,
    call,
} = require('chain-dsl')

const deployer = require('../lib/deployer')
const mint = 'mint(address,uint256)'

describe("Control", function () {
    this.timeout(5000)

    let web3, snaps, accounts,
        gate,
        token,
        kycAmlStatus, boundaryKycAmlRule, fullKycAmlRule,
        DEPLOYER,
        OPERATOR,
        CUSTOMER,
        CUSTOMER1,
        CUSTOMER2,
        AMT

    before('deployment', async () => {
        snaps = []
        web3 = ganacheWeb3()
        ;[
            DEPLOYER,
            OPERATOR,
            CUSTOMER,
            CUSTOMER1,
            CUSTOMER2
        ] = accounts = await web3.eth.getAccounts()

        AMT = 100

        ;({
            gate,
            token,
            boundaryKycAmlRule,
            fullKycAmlRule,
            kycAmlStatus
        } =
            await deployer.base(web3, solc(__dirname, '../solc-input.json'), DEPLOYER, OPERATOR))
    })

    beforeEach(async () => snaps.push(await web3.evm.snapshot()))
    afterEach(async () => web3.evm.revert(snaps.pop()))

    context("System wide control.", async () => {
        it("Operator can toggle two flags to stop/start any activity regarding SWIM including mint, burn, approve and transfer.", async () => {
            await expectNoAsyncThrow(async () => {
                await send(gate, OPERATOR, mint, CUSTOMER, 10)
            })

            expect(await call(token, "balanceOf", CUSTOMER)).eq(10)
            expect(await call(token, "balanceOf", CUSTOMER1)).eq(0)

            await send(gate, OPERATOR, "stop")
            await send(gate, OPERATOR, "stopToken")

            await expectThrow(async () => {
                await send(token, CUSTOMER, "transfer", CUSTOMER1, 1)
            })

            await expectThrow(async () => {
                await send(gate, OPERATOR, mint, CUSTOMER, 10)
            })

            await expectThrow(async () => {
                await send(token, CUSTOMER, "approve", address(gate), 10)
            })

            await send(gate, OPERATOR, "start")
            await send(gate, OPERATOR, "startToken")

            await expectNoAsyncThrow(async () => {
                await send(token, CUSTOMER, "transfer", CUSTOMER1, 1)
                expect(await call(token, "balanceOf", CUSTOMER)).eq(9)
                expect(await call(token, "balanceOf", CUSTOMER1)).eq(1)

                await send(gate, OPERATOR, "mint", CUSTOMER, 10)
                expect(await call(token, "balanceOf", CUSTOMER)).eq(19)

                await send(token, CUSTOMER, "approve", address(gate), 9)
                await send(gate, OPERATOR, "burn", CUSTOMER, 9)
            })

            expect(await call(token, "balanceOf", CUSTOMER)).eq(10)
            expect(await call(token, "balanceOf", CUSTOMER1)).eq(1)

        })
    })

    context.only("Per address control", async () => {
        it("Operator can freeze/unfreeze an address from any action in and out of this address.", async () => {
            await expectNoAsyncThrow(async () => {
                await send(gate, OPERATOR, mint, CUSTOMER, 10)
            })

            expect(await call(token, "balanceOf", CUSTOMER)).eq(10)
            expect(await call(token, "balanceOf", CUSTOMER1)).eq(0)

            await send(gate, OPERATOR, "freezeAddress", CUSTOMER)

            // await expectThrow(async () => {
            //     await send(token, CUSTOMER, "transfer", CUSTOMER1, 1)
            // })

            await expectThrow(async () => {
                await send(gate, OPERATOR, mint, CUSTOMER, 10)
            })

            // await expectThrow(async () => {
            //     await send(token, CUSTOMER, "approve", address(gate), 10)
            // })

            await send(gate, OPERATOR, "unfreezeAddress", CUSTOMER)

            await expectNoAsyncThrow(async () => {
                await send(token, CUSTOMER, "transfer", CUSTOMER1, 1)
                expect(await call(token, "balanceOf", CUSTOMER)).eq(9)
                expect(await call(token, "balanceOf", CUSTOMER1)).eq(1)

                await send(gate, OPERATOR, "mint", CUSTOMER, 10)
                expect(await call(token, "balanceOf", CUSTOMER)).eq(19)

                await send(token, CUSTOMER, "approve", address(gate), 9)
                await send(gate, OPERATOR, "burn", CUSTOMER, 9)
            })

            expect(await call(token, "balanceOf", CUSTOMER)).eq(10)
            expect(await call(token, "balanceOf", CUSTOMER1)).eq(1)
        })
    })
})