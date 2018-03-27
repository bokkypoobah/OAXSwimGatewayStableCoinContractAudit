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
            kycAmlStatus
        } =
            await deployer.base(web3, solc(__dirname, '../solc-input.json'), DEPLOYER, OPERATOR))
    })

    beforeEach(async () => snaps.push(await web3.evm.snapshot()))
    afterEach(async () => web3.evm.revert(snaps.pop()))

    context("Switch between different kyc policies gateways does not break existing balances of the (swim) token.", async () => {
        it("When switched from no kyc gate to boundary kyc gate, old gate should have no control over token.", async () => {
            //on no fee gateway, mint 100 token to customer
            await send(gate, OPERATOR, mint, CUSTOMER, 100)
            expect(await call(token, "balanceOf", CUSTOMER)).eq(100)

            //switch to has-fee gate
            //switch step 1, deploy gate with fee
            let {gateWithFee} = await deployer.deployGateWithFee(web3, solc(__dirname, '../solc-input.json'), DEPLOYER, OPERATOR, DEPLOYER)
            //switch step 2, pause old gate
            await send(gate, OPERATOR, "stop")

            //check no-fee gate has no control over token any more
            await expectThrow(async () =>
                await send(gate, OPERATOR, mint, CUSTOMER, 100)
            )

            expect(await call(token, "balanceOf", CUSTOMER)).eq(100)
        })

        it("When switched to new gate with fee, old gate should have no control over token and the new gate can mint against the token.", async () => {
            //on no fee gateway, mint 100 token to customer
            await send(gate, OPERATOR, mint, CUSTOMER, 100)
            expect(await call(token, "balanceOf", CUSTOMER)).eq(100)

            //switch to has-fee gate
            //switch step 1, deploy gate with boundary kyc
            await send(gate, OPERATOR, 'setERC20Authority', address(boundaryKycAmlRule))
            await send(gate, OPERATOR, 'setTokenAuthority', address(boundaryKycAmlRule))

            //check customer balance == 100 on 'new' gateway
            expect(await call(token, "balanceOf", CUSTOMER)).eq(100)

            await expectThrow(async () => {
                await send(gate, OPERATOR, mint, CUSTOMER, 1000)
            })

            await send(kycAmlStatus, OPERATOR, "setKycVerified", CUSTOMER, true)
            await send(gate, OPERATOR, mint, CUSTOMER, 1000)
            expect(await call(token, "balanceOf", CUSTOMER)).eq(1100)
        })
    })

})