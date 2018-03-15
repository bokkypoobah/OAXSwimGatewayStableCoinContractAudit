/*
switch from a no fee scheme to a has fee scheme does not break existing balances of the gateway
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

describe("Upgrade Fee", function () {
    this.timeout(5000)

    let web3, snaps, accounts,
        gate, kycAmlStatus, boundaryKycAmlRule, fullKycAmlRule, token,
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

        ;({gate, token} =
            await deployer.base(web3, solc(__dirname, '../solc-input.json'), DEPLOYER, OPERATOR))
    })

    beforeEach(async () => snaps.push(await web3.evm.snapshot()))
    afterEach(async () => web3.evm.revert(snaps.pop()))

    context("Switch between a no fee scheme and a has fee scheme gateway does not break existing balances of the gateway.", async () => {
        it("", async () => {
            //on no fee gateway, mint 100 token to customer
            await send(gate, OPERATOR, mint, CUSTOMER, 100)
            expect(await call(token, "balanceOf", CUSTOMER)).eq(100)

            //switch to has-fee gate

            //check customer balance == 100 on 'new' gateway

            //mint again 10000 token to customer with 25 fee, check customer balance is 10100, cash mgt wallets gets 25
            expect(true).to.be.true;
        })
    })

})