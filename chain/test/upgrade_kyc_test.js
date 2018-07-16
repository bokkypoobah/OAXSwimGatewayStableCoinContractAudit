/*
switch btw no/boundary/full kyc schemes does not break existing balances of the gateway
 */

const {expect} = require('chain-dsl/test/helpers')
const {address, send, call} = require('chain-dsl')
const deployer = require('../lib/deployer')
const mint = 'mint(address,uint256)'

describe("Upgrade Gate Regarding Kyc", function () {
    this.timeout(3000)

    let gate,
        token,
        kycAmlStatus, boundaryKycAmlRule, fullKycAmlRule

    before('deployment', async () => {
        ;({
            gate,
            token,
            boundaryKycAmlRule,
            fullKycAmlRule,
            kycAmlStatus
        } = await deployer.base(web3, contractRegistry,
            DEPLOYER, SYSTEM_ADMIN, KYC_OPERATOR, MONEY_OPERATOR))
    })

    context("Switch between different kyc policies gateways does not break existing balances of the (swim) token.", async () => {

        it("When a gate's kyc policy change from no_key to boundary kyc, " +
            "non kyc verified users are free to transfer but cannot mint until their are marked kyc verified;" +
            "when the gate is further upgraded to full_kyc," +
            "non kyc verified users could neither transfer nor burn until their are marked kyc verified.", async () => {
            //on no fee gateway, mint 100 token to customer
            await send(gate, MONEY_OPERATOR, mint, CUSTOMER, 100)
            expect(await call(token, "balanceOf", CUSTOMER)).eq(100)

            //switch to has-fee gate
            //switch step 1, deploy gate with boundary kyc
            await send(gate, SYSTEM_ADMIN, 'setERC20Authority', address(boundaryKycAmlRule))
            await send(gate, SYSTEM_ADMIN, 'setTokenAuthority', address(boundaryKycAmlRule))


            await send(token, CUSTOMER, "transfer", CUSTOMER2, 10)
            expect(await call(token, "balanceOf", CUSTOMER)).eq(90)
            expect(await call(token, "balanceOf", CUSTOMER2)).eq(10)

            await expect(send(gate, MONEY_OPERATOR, mint, CUSTOMER, 1000))
                .to.be.rejected

            await send(kycAmlStatus, KYC_OPERATOR, "setKycVerified", CUSTOMER, true)
            await send(gate, MONEY_OPERATOR, mint, CUSTOMER, 1000)
            expect(await call(token, "balanceOf", CUSTOMER)).eq(1090)
            expect(await call(token, "balanceOf", CUSTOMER2)).eq(10)

            await send(gate, SYSTEM_ADMIN, 'setERC20Authority', address(fullKycAmlRule))
            await send(gate, SYSTEM_ADMIN, 'setTokenAuthority', address(fullKycAmlRule))

            await expect(send(token, CUSTOMER, "transfer", CUSTOMER2, 10))
                .to.be.rejected

            await expect(send(token, CUSTOMER2, "transfer", CUSTOMER, 10))
                .to.be.rejected


            await send(token, CUSTOMER2, "approve", address(gate), 10)
            await expect(send(gate, MONEY_OPERATOR, "burn", CUSTOMER2, 10))
                .to.be.rejected


            await send(kycAmlStatus, KYC_OPERATOR, "setKycVerified", CUSTOMER2, true)
            await send(token, CUSTOMER2, "transfer", CUSTOMER, 10)
            await send(token, CUSTOMER, "transfer", CUSTOMER2, 10)
            expect(await call(token, "balanceOf", CUSTOMER2)).eq(10)

            await send(gate, MONEY_OPERATOR, "burn", CUSTOMER2, 4)
            expect(await call(token, "balanceOf", CUSTOMER2)).eq(6)
        })
    })
})
