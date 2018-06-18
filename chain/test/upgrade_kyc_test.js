/*
switch btw no/boundary/full kyc schemes does not break existing balances of the gateway
 */

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

describe("Upgrade Gate Regarding Kyc", function () {
    this.timeout(50000)

    let web3, snaps, accounts,
        gate,
        token,
        kycAmlStatus, boundaryKycAmlRule, fullKycAmlRule,
        DEPLOYER,
        SYSTEM_ADMIN, KYC_OPERATOR, MONEY_OPERATOR,
        CUSTOMER,
        CUSTOMER1,
        CUSTOMER2,
        AMT

    before('deployment', async () => {
        snaps = []
        web3 = ganacheWeb3()
        ;[
            DEPLOYER,
            SYSTEM_ADMIN, KYC_OPERATOR, MONEY_OPERATOR,
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
            await deployer.base(web3, solc(__dirname, '../solc-input.json'), DEPLOYER, SYSTEM_ADMIN, KYC_OPERATOR, MONEY_OPERATOR))
    })

    beforeEach(async () => snaps.push(await web3.evm.snapshot()))
    afterEach(async () => web3.evm.revert(snaps.pop()))

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

            await expectThrow(async () => {
                await send(gate, MONEY_OPERATOR, mint, CUSTOMER, 1000)
            })

            await send(kycAmlStatus, KYC_OPERATOR, "setKycVerified", CUSTOMER, true)
            await send(gate, MONEY_OPERATOR, mint, CUSTOMER, 1000)
            expect(await call(token, "balanceOf", CUSTOMER)).eq(1090)
            expect(await call(token, "balanceOf", CUSTOMER2)).eq(10)

            await send(gate, SYSTEM_ADMIN, 'setERC20Authority', address(fullKycAmlRule))
            await send(gate, SYSTEM_ADMIN, 'setTokenAuthority', address(fullKycAmlRule))

            await expectThrow(async () => {
                await send(token, CUSTOMER, "transfer", CUSTOMER2, 10)
                await send(token, CUSTOMER2, "transfer", CUSTOMER, 10)
            })

            await send(token, CUSTOMER2, "approve", address(gate), 10)
            await expectThrow(async () => {
                await send(gate, MONEY_OPERATOR, "burn", CUSTOMER2, 10)
            })

            await send(kycAmlStatus, KYC_OPERATOR, "setKycVerified", CUSTOMER2, true)
            await send(token, CUSTOMER2, "transfer", CUSTOMER, 10)
            await send(token, CUSTOMER, "transfer", CUSTOMER2, 10)
            expect(await call(token, "balanceOf", CUSTOMER2)).eq(10)

            await send(gate, MONEY_OPERATOR, "burn", CUSTOMER2, 4)
            expect(await call(token, "balanceOf", CUSTOMER2)).eq(6)
        })
    })

})