const {expect} = require('chain-dsl/test/helpers')
const {address, send, call, txEvents} = require('chain-dsl')
const deployer = require('../lib/deployer')
const mint = 'mint(address,uint256)'

describe("Control", function () {
    this.timeout(80000)

    let gate,
        token,
        kyc, boundaryKycRule, fullKycRule,
        blacklist,
        gateRoles

    before('deployment', async () => {
        ;({
            gate,
            token,
            boundaryKycRule,
            fullKycRule,
            kyc,
            blacklist,
            gateRoles,
        } = await deployer.base(web3, contractRegistry, DEPLOYER, SYSTEM_ADMIN, KYC_OPERATOR, MONEY_OPERATOR))
    })

    context("System wide control.", async () => {
        it("Money operator can toggle two flags to stop/start any activity regarding SWIM including mint, burn, approve and transfer.", async () => {
            await send(gate, MONEY_OPERATOR, mint, CUSTOMER, 10)

            expect(await call(token, "balanceOf", CUSTOMER)).eq(10)
            expect(await call(token, "balanceOf", CUSTOMER1)).eq(0)

            await send(gate, MONEY_OPERATOR, "stop")
            await send(gate, MONEY_OPERATOR, "stopToken")

            await expect(send(token, CUSTOMER, "transfer", CUSTOMER1, 1))
                .to.be.rejected

            await expect(send(gate, MONEY_OPERATOR, mint, CUSTOMER, 10))
                .to.be.rejected

            await expect(send(token, CUSTOMER, "approve", address(gate), 10))
                .to.be.rejected

            await send(gate, MONEY_OPERATOR, "start")
            await send(gate, MONEY_OPERATOR, "startToken")

            await send(token, CUSTOMER, "transfer", CUSTOMER1, 1)
            expect(await call(token, "balanceOf", CUSTOMER)).eq(9)
            expect(await call(token, "balanceOf", CUSTOMER1)).eq(1)

            await send(gate, MONEY_OPERATOR, "mint", CUSTOMER, 10)
            expect(await call(token, "balanceOf", CUSTOMER)).eq(19)

            await send(token, CUSTOMER, "approve", address(gate), 9)
            await send(gate, MONEY_OPERATOR, "burn", CUSTOMER, 9)

            expect(await call(token, "balanceOf", CUSTOMER)).eq(10)
            expect(await call(token, "balanceOf", CUSTOMER1)).eq(1)
        })
    })

    context("Per address control", async () => {
        it("MoneyOperator can freeze/unfreeze an address from any action in and out of this address.", async () => {
            await expect(send(gate, MONEY_OPERATOR, mint, CUSTOMER, 10))
                .to.be.fulfilled

            expect(await call(token, "balanceOf", CUSTOMER)).eq(10)
            expect(await call(token, "balanceOf", CUSTOMER1)).eq(0)

            expect(await call(blacklist, "status", CUSTOMER)).eql(false)

            let events = await txEvents(send(blacklist, MONEY_OPERATOR, "set", CUSTOMER, true))

            expect(await call(blacklist, "status", CUSTOMER)).eql(true)

            expect(events).containSubset([{
                NAME: 'LogSetAddressStatus',
                guy: CUSTOMER,
                status: true
            }])

            await expect(send(gate, MONEY_OPERATOR, mint, CUSTOMER, 10))
                .to.be.rejected

            events = await txEvents(send(blacklist, MONEY_OPERATOR, "set", CUSTOMER, false))
            expect(await call(blacklist, "status", CUSTOMER)).eql(false)

            expect(events).containSubset([{
                NAME: 'LogSetAddressStatus',
                guy: CUSTOMER,
                status: null // FIXME To be fixed in https://github.com/ethereum/web3.js/issues/1403
            }])

            await send(token, CUSTOMER, "transfer", CUSTOMER1, 1)
            expect(await call(token, "balanceOf", CUSTOMER)).eq(9)
            expect(await call(token, "balanceOf", CUSTOMER1)).eq(1)

            await send(gate, MONEY_OPERATOR, "mint", CUSTOMER, 10)
            expect(await call(token, "balanceOf", CUSTOMER)).eq(19)

            await send(token, CUSTOMER, "approve", address(gate), 9)
            await send(gate, MONEY_OPERATOR, "burn", CUSTOMER, 9)

            expect(await call(token, "balanceOf", CUSTOMER)).eq(10)
            expect(await call(token, "balanceOf", CUSTOMER1)).eq(1)
        })
    })

    context("Operation authority control", function () {
        it("Initial deployer can add SystemAdmin addresses even after the gate contract is established.", async () => {
            const SYSTEM_ADMIN_ROLE = await call(gateRoles, 'SYSTEM_ADMIN')

            await expect(call(gateRoles, "hasUserRole", CUSTOMER2, SYSTEM_ADMIN_ROLE))
                .to.eventually.become(false)

            await send(gateRoles, DEPLOYER, 'setUserRole', CUSTOMER2, SYSTEM_ADMIN_ROLE, true)

            await expect(call(gateRoles, "hasUserRole", CUSTOMER2, SYSTEM_ADMIN_ROLE))
                .to.eventually.become(true)
        })

        it("Initial deployer can remove current SystemAdmin addresses even after the gate contract is established.", async () => {
            const SYSTEM_ADMIN_ROLE = await call(gateRoles, 'SYSTEM_ADMIN')

            await expect(call(gateRoles, "hasUserRole", SYSTEM_ADMIN, SYSTEM_ADMIN_ROLE))
                .to.eventually.become(true)

            await send(gateRoles, DEPLOYER, 'setUserRole', SYSTEM_ADMIN, SYSTEM_ADMIN_ROLE, false)

            await expect(call(gateRoles, "hasUserRole", SYSTEM_ADMIN, SYSTEM_ADMIN_ROLE))
                .to.eventually.become(false)
        })

        it("Current SystemAdmin can NOT add any address as SystemAdmin.", async () => {
            const SYSTEM_ADMIN_ROLE = await call(gateRoles, 'SYSTEM_ADMIN')

            await expect(call(gateRoles, "hasUserRole", CUSTOMER2, SYSTEM_ADMIN_ROLE))
                .to.eventually.become(false)

            await expect(send(gateRoles, SYSTEM_ADMIN, 'setUserRole', CUSTOMER2, SYSTEM_ADMIN_ROLE, true))
                .to.be.rejected

            await expect(call(gateRoles, "hasUserRole", CUSTOMER2, SYSTEM_ADMIN_ROLE))
                .to.eventually.become(false)
        })
    })
})
