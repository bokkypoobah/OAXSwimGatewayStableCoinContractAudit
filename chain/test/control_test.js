const {
    expect,
    expectNoAsyncThrow,
    expectThrow,
    toBN,
    solc,
    ganacheWeb3,
    ZERO_ADDR
} = require('chain-dsl/test/helpers')

const {
    address,
    send,
    call,
} = require('chain-dsl')

const deployer = require('../lib/deployer')
const mint = 'mint(address,uint256)'

describe("Control", function () {
    this.timeout(8000)

    let web3, snaps, accounts,
        gate,
        token,
        kycAmlStatus, boundaryKycAmlRule, fullKycAmlRule,
        addressControlStatus,
        gateRoles,
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
            kycAmlStatus,
            addressControlStatus,
            gateRoles
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

    context("Per address control", async () => {
        it("Operator can freeze/unfreeze an address from any action in and out of this address.", async () => {
            await expectNoAsyncThrow(async () => {
                await send(gate, OPERATOR, mint, CUSTOMER, 10)
            })

            expect(await call(token, "balanceOf", CUSTOMER)).eq(10)
            expect(await call(token, "balanceOf", CUSTOMER1)).eq(0)

            await send(addressControlStatus, OPERATOR, "freezeAddress", CUSTOMER)

            // await expectThrow(async () => {
            //     await send(token, CUSTOMER, "transfer", CUSTOMER1, 1)
            // })

            await expectThrow(async () => {
                await send(gate, OPERATOR, mint, CUSTOMER, 10)
            })

            // await expectThrow(async () => {
            //     await send(token, CUSTOMER, "approve", address(gate), 10)
            // })

            await send(addressControlStatus, OPERATOR, "unfreezeAddress", CUSTOMER)

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

    context("Operation authority control.", function () {
        it("Initial deployer can add operator addresses even after the gate contract is established.", async () => {
            const OPERATOR_ROLE = await call(gateRoles, 'OPERATOR')
            console.log(typeof OPERATOR_ROLE)
            expect(await call(gateRoles, "hasUserRole", CUSTOMER2, OPERATOR_ROLE)).to.be.false;
            await send(gateRoles, DEPLOYER, 'setUserRole', CUSTOMER2, OPERATOR_ROLE, true)
            expect(await call(gateRoles, "hasUserRole", CUSTOMER2, OPERATOR_ROLE)).to.be.true;
        })

        it("Initial deployer can remove current operator addresses even after the gate contract is established.", async () => {
            const OPERATOR_ROLE = await call(gateRoles, 'OPERATOR')
            console.log(typeof OPERATOR_ROLE)
            expect(await call(gateRoles, "hasUserRole", OPERATOR, OPERATOR_ROLE)).to.be.true;
            await send(gateRoles, DEPLOYER, 'setUserRole', OPERATOR, OPERATOR_ROLE, false)
            expect(await call(gateRoles, "hasUserRole", OPERATOR, OPERATOR_ROLE)).to.be.false;
        })

        it("Current operator can NOT add any address as operator.", async () => {
            const OPERATOR_ROLE = await call(gateRoles, 'OPERATOR')
            console.log(typeof OPERATOR_ROLE)
            expect(await call(gateRoles, "hasUserRole", CUSTOMER2, OPERATOR_ROLE)).to.be.false;
            await expectThrow(async () => {
                await send(gateRoles, OPERATOR, 'setUserRole', CUSTOMER2, OPERATOR_ROLE, true)
            })
            expect(await call(gateRoles, "hasUserRole", CUSTOMER2, OPERATOR_ROLE)).to.be.false;
        })
    })
})