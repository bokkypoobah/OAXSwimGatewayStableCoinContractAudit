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
    txEvents
} = require('chain-dsl')

const deployer = require('../lib/deployer')

describe("Gate with Mint, Burn and Transfer Fee", function () {
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


    it("Operator can change fee collector address.", async () => {
        await send(gateWithFee, OPERATOR, "setFeeCollector", OPERATOR)
        expect(await call(gateWithFee, "feeCollector")).eq(OPERATOR)
    })

    context("Mint with dynamic fee", async () => {
        it("When a customer request to mint 10000 tokens and the fee is 25, \n" +
            "10000 tokens goes to the customer's wallet, \n" +
            "and 25 tokens goes to the fee collector's wallet. \n" +
            "(Assume the gate actually collects 10025 fiat from the customer.)", async () => {
            await send(gateWithFee, OPERATOR, "mintWithFee", CUSTOMER1, 10000, 25)
            expect(await call(token, "balanceOf", CUSTOMER1)).eq(10000)
            expect(await call(token, "balanceOf", FEE_COLLECTOR)).eq(25)
        })
        it("0 fee is allowed", async () => {
            await send(gateWithFee, OPERATOR, "mintWithFee", CUSTOMER1, 10000, 0)
            expect(await call(token, "balanceOf", CUSTOMER1)).eq(10000)
            expect(await call(token, "balanceOf", FEE_COLLECTOR)).eq(0)
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
        it("0 fee is allowed", async () => {
            await send(gateWithFee, OPERATOR, "mintWithFee", CUSTOMER1, 10000, 25)
            expect(await call(token, "balanceOf", CUSTOMER1)).eq(10000)
            expect(await call(token, "balanceOf", FEE_COLLECTOR)).eq(25)
            await send(token, CUSTOMER1, "approve", address(gateWithFee), 10000)
            await send(gateWithFee, OPERATOR, "burnWithFee", CUSTOMER1, 10000, 0)
            expect(await call(token, "balanceOf", CUSTOMER1)).eq(0)
            expect(await call(token, "balanceOf", FEE_COLLECTOR)).eq(25)
        })
    })

    context("Transfer with dynamic fee", async () => {
        it("When abs=0, bps=25, fee for wad = 10000 is 25", async () => {
            await send(gateWithFee, OPERATOR, "setTransferFee", 0, 25);
            expect(await call(token, "transferFeeAbs")).eq(0)
            expect(await call(token, "transferFeeBps")).eq(25)
            expect(await call(token, "calculateTransferFee", 10000)).eq(25 * (1));
        })

        it("When abs=1, bps=25, fee for wad = 10000 is 26", async () => {
            await send(gateWithFee, OPERATOR, "setTransferFee", 1, 25);
            expect(await call(token, "transferFeeAbs")).eq(1)
            expect(await call(token, "transferFeeBps")).eq(25)
            expect(await call(token, "calculateTransferFee", 10000)).eq(26 * (1));
        })

        it("When abs=1, bps=25, fee for wad = 9116 is 24", async () => {
            await send(gateWithFee, OPERATOR, "setTransferFee", 1, 25);
            expect(await call(token, "transferFeeAbs")).eq(1)
            expect(await call(token, "transferFeeBps")).eq(25)
            expect(await call(token, "calculateTransferFee", 9999)).eq(26 * (1));
            expect(await call(token, "calculateTransferFee", 9998)).eq(26 * (1));
            expect(await call(token, "calculateTransferFee", 9997)).eq(26 * (1));
            expect(await call(token, "calculateTransferFee", 9996)).eq(26 * (1));
            expect(await call(token, "calculateTransferFee", 9116)).eq(24 * (1));
        })

        it("When a customer transfers 10000 tokens to customer_two and the fee is 25 (0+25bps), \n" +
            "10000 tokens come off from the customer's wallet, \n" +
            "9975 tokens goes to customer_two, \n" +
            "and 25 tokens goes to the fee collector's wallet.", async () => {
            await send(gateWithFee, OPERATOR, "setTransferFee", 0, 25);
            expect(await call(token, "transferFeeAbs")).eq(0)
            expect(await call(token, "transferFeeBps")).eq(25)

            await send(gateWithFee, OPERATOR, "mintWithFee", CUSTOMER1, 10000, 25)
            expect(await call(token, "balanceOf", CUSTOMER1)).eq(10000)

            await send(token, CUSTOMER1, "transfer", CUSTOMER2, 10000)
            expect(await call(token, "balanceOf", CUSTOMER1)).eq(0)
            expect(await call(token, "balanceOf", CUSTOMER2)).eq(9975)
            expect(await call(token, "balanceOf", FEE_COLLECTOR)).eq(25)
            expect(await call(token, "balanceOf", OPERATOR)).eq(25)
        })
    })

    context("Mint, Burn and Transfer all have fees.", async () => {
        it("Mint, Burn and Transfer fees don't duplicate.", async () => {
            await send(gateWithFee, OPERATOR, "setTransferFee", 0, 25);
            expect(await call(token, "transferFeeAbs")).eq(0)
            expect(await call(token, "transferFeeBps")).eq(25)

            await send(gateWithFee, OPERATOR, "mintWithFee", CUSTOMER1, 10000, 25)
            expect(await call(token, "balanceOf", CUSTOMER1)).eq(10000)

            await send(token, CUSTOMER1, "transfer", CUSTOMER2, 5000)
            expect(await call(token, "balanceOf", OPERATOR)).eq(13)

            await send(token, CUSTOMER1, "approve", address(gateWithFee), 5000)
            await send(gateWithFee, OPERATOR, "burnWithFee", CUSTOMER1, 5000, 25)
            expect(await call(token, "balanceOf", CUSTOMER1)).eq(0)
            expect(await call(token, "balanceOf", FEE_COLLECTOR)).eq(50)
            expect(await call(token, "balanceOf", OPERATOR)).eq(13) //token fee collector is operator
        })

    })

})