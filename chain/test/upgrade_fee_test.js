/*
switch from a no fee scheme to a has fee scheme does not break existing balances of the gateway
 */

const {expect, expectThrow} = require('chain-dsl/test/helpers')
const {send, call} = require('chain-dsl')
const deployer = require('../lib/deployer')
const mint = 'mint(address,uint256)'

describe("Upgrade Gate Regarding Fee", function () {
    this.timeout(3000)

    let gate, token

    before('deployment', async () => {
        ;({gate, token} = await deployer.base(web3, contractRegistry,
            DEPLOYER, SYSTEM_ADMIN, KYC_OPERATOR, MONEY_OPERATOR))
    })

    context("Switch between a no fee scheme and a has fee scheme gateway does not break existing balances of the (swim) token.", async () => {
        it("When switched to new gate with fee, old gate should have no control over token.", async () => {
            //on no fee gateway, mint 100 token to customer
            await send(gate, MONEY_OPERATOR, mint, CUSTOMER, 100)
            expect(await call(token, "balanceOf", CUSTOMER)).eq(100)

            //switch to has-fee gate
            //switch step 1, deploy gate with fee
            let {gateWithFee} = await deployer.deployGateWithFee(web3, contractRegistry,
                DEPLOYER, SYSTEM_ADMIN, KYC_OPERATOR, MONEY_OPERATOR, DEPLOYER)
            //switch step 2, pause old gate
            await send(gate, SYSTEM_ADMIN, "stop")

            //check no-fee gate has no control over token any more
            await expectThrow(async () =>
                await send(gate, MONEY_OPERATOR, mint, CUSTOMER, 100)
            )

            expect(await call(token, "balanceOf", CUSTOMER)).eq(100)
        })

        it("When switched to new gate with fee, old gate should have no control over token and the new gate can mint against the token.", async () => {
            //on no fee gateway, mint 100 token to customer
            await send(gate, MONEY_OPERATOR, mint, CUSTOMER, 100)
            expect(await call(token, "balanceOf", CUSTOMER)).eq(100)

            //switch to has-fee gate
            //switch step 1, deploy gate with fee
            let {gateWithFee} = await deployer.deployGateWithFee(web3, contractRegistry, DEPLOYER, SYSTEM_ADMIN, KYC_OPERATOR, MONEY_OPERATOR, DEPLOYER)
            //switch step 2, pause old gate
            await send(gate, SYSTEM_ADMIN, "stop")

            //check no-fee gate has no control over token any more
            await expectThrow(async () =>
                await send(gate, MONEY_OPERATOR, mint, CUSTOMER, 100)
            )

            //check customer balance == 100 on 'new' gateway
            expect(await call(token, "balanceOf", CUSTOMER)).eq(100)

            //mint again 10000 token to customer with 25 fee, check customer balance is 10100, cash mgt wallets gets 25
            await send(gateWithFee, MONEY_OPERATOR, mint, CUSTOMER, 1000)
            expect(await call(token, "balanceOf", CUSTOMER)).eq(1100)
        })
    })

})
