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
    wad,
} = require('chain-dsl')

const deployer = require('../lib/deployer')

describe("Gate with Mint and Burn Fee (TODO Transfer Fee)", function () {
    this.timeout(7000)

    let web3, snaps, accounts,
        gateWithFee, kycAmlStatus, boundaryKycAmlRule, fullKycAmlRule, token,
        DEPLOYER,
        OPERATOR,
        FEE_COLLECTOR,
        CUSTOMER1,
        CUSTOMER2,
        AMT

    before('deployment', async () => {
            snaps = []
            web3 = ganacheWeb3()
            ;[
                DEPLOYER,
                OPERATOR,
                FEE_COLLECTOR,
                CUSTOMER1,
                CUSTOMER2
            ] = accounts = await web3.eth.getAccounts()

            AMT = 100

            ;({token} =
                await deployer.init(web3, solc(__dirname, '../solc-input.json'), DEPLOYER, OPERATOR))

            ;({gateWithFee} =
                await deployer.deployGateWithFee(web3, solc(__dirname, '../solc-input.json'), DEPLOYER, OPERATOR, FEE_COLLECTOR, wad(100000)))
        }
    )

    beforeEach(async () => snaps.push(await web3.evm.snapshot()))
    afterEach(async () => web3.evm.revert(snaps.pop()))

    context("Mint with dynamic fee", async () => {
        it("When a customer request to mint 10000 tokens and the fee is 25, \n" +
            "10000 tokens goes to the customer's wallet, \n" +
            "and 25 tokens goes to the fee collector's wallet. \n" +
            "(Assume the gate actually collects 10025 fiat from the customer.)", async () => {
            await send(gateWithFee, OPERATOR, "mintWithFee", CUSTOMER1, 10000, 25)
            expect(await call(token, "balanceOf", CUSTOMER1)).eq(10000)
            expect(await call(token, "balanceOf", FEE_COLLECTOR)).eq(25)
        })
    })

    context("Burn with dynamic fee", async () => {
        it("When a customer request to burn 10000 tokens and the fee is 25, \n" +
            "10000 tokens come off from the customer's wallet, \n" +
            "9975 tokens get burnt, \n" +
            "and 25 tokens goes to the fee collector's wallet. \n" +
            "(Assume the gate actually sends 9975 fiat to the customer.)", async () => {
            await send(gateWithFee, OPERATOR, "mintWithFee", CUSTOMER1, 10000, 25)
            expect(await call(token, "balanceOf", CUSTOMER1)).eq(10000)
            expect(await call(token, "balanceOf", FEE_COLLECTOR)).eq(25)
            await send(token, CUSTOMER1, "approve", address(gateWithFee), 10000)
            await send(gateWithFee, OPERATOR, "burnWithFee", CUSTOMER1, 10000, 25)
            expect(await call(token, "balanceOf", CUSTOMER1)).eq(0)
            expect(await call(token, "balanceOf", FEE_COLLECTOR)).eq(50)
        })
        it("Burn more than one can afford is not allowed.", async () => {
            await send(gateWithFee, OPERATOR, "mintWithFee", CUSTOMER1, 10000, 25)
            expect(await call(token, "balanceOf", CUSTOMER1)).eq(10000)
            expect(await call(token, "balanceOf", FEE_COLLECTOR)).eq(25)
            //no checking on approve
            await send(token, CUSTOMER1, "approve", address(gateWithFee), 10001)
            await expectThrow(async () => {
                await send(gateWithFee, OPERATOR, "burnWithFee", CUSTOMER1, 10001, 25)
            })

        })
    })

})