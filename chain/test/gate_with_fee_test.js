const {expect} = require('chain-dsl/test/helpers')
const {address, send, call, wad, create, txEvents} = require('chain-dsl')
const deployer = require('../lib/deployer')

describe("Gate with Mint, Burn and Transfer Fee", function () {
    this.timeout(3000)

    let gateWithFee,
        token,
        transferFeeController,
        DEPLOYER,
        SYSTEM_ADMIN, KYC_OPERATOR, MONEY_OPERATOR,
        CUSTOMER1,
        CUSTOMER2

    before('deployment', async () => {
            ;[
                DEPLOYER,
                SYSTEM_ADMIN, KYC_OPERATOR, MONEY_OPERATOR,
                CUSTOMER1,
                CUSTOMER2,
                TRANSFER_FEE_COLLECTOR,
                MINT_FEE_COLLECTOR,
                BURN_FEE_COLLECTOR
            ] = accounts

            ;({token, transferFeeController} =
                await deployer.init(web3, contractRegistry, DEPLOYER, SYSTEM_ADMIN, KYC_OPERATOR, MONEY_OPERATOR, null, wad(100000)))

            ;({gateWithFee} =
                await deployer.deployGateWithFee(web3, contractRegistry, DEPLOYER, SYSTEM_ADMIN, KYC_OPERATOR, MONEY_OPERATOR, MINT_FEE_COLLECTOR, BURN_FEE_COLLECTOR))
        }
    )

    it("SystemAdmin can change fee collector addresses.", async () => {
        //mint
        await send(gateWithFee, SYSTEM_ADMIN, "setMintFeeCollector", SYSTEM_ADMIN)
        expect(await call(gateWithFee, "mintFeeCollector")).eq(SYSTEM_ADMIN)
        //burn
        await send(gateWithFee, SYSTEM_ADMIN, "setBurnFeeCollector", SYSTEM_ADMIN)
        expect(await call(gateWithFee, "burnFeeCollector")).eq(SYSTEM_ADMIN)
        //transfer
        let eventResult = await send(gateWithFee, SYSTEM_ADMIN, "setTransferFeeCollector", SYSTEM_ADMIN)
        expect(await call(token, "transferFeeCollector")).eq(SYSTEM_ADMIN)

        //test event
        let events = await txEvents(eventResult)
        expect(events).containSubset([
            {NAME: 'LogSetTransferFeeCollector', feeCollector: SYSTEM_ADMIN},
        ])

    })

    context("Mint with dynamic fee", async () => {
        it("When a customer request to mint 10000 tokens and the fee is 25, " +
            "10000 tokens goes to the customer's wallet, " +
            "and 25 tokens goes to the fee collector's wallet. " +
            "(Assume the gate actually collects 10025 fiat from the customer.)", async () => {
            await send(gateWithFee, MONEY_OPERATOR, "mintWithFee", CUSTOMER1, 10000, 25)
            expect(await call(token, "balanceOf", CUSTOMER1)).eq(10000)
            expect(await call(token, "balanceOf", MINT_FEE_COLLECTOR)).eq(25)
        })
        it("0 fee is allowed", async () => {
            await send(gateWithFee, MONEY_OPERATOR, "mintWithFee", CUSTOMER1, 10000, 0)
            expect(await call(token, "balanceOf", CUSTOMER1)).eq(10000)
            expect(await call(token, "balanceOf", MINT_FEE_COLLECTOR)).eq(0)
        })
    })

    context("Burn with dynamic fee", async () => {
        it("When a customer request to burn 10000 tokens and the fee is 25, " +
            "10000 tokens come off from the customer's wallet, " +
            "9975 tokens get burnt, " +
            "and 25 tokens goes to the fee collector's wallet. " +
            "(Assume the gate actually sends 9975 fiat to the customer.)", async () => {
            await send(gateWithFee, MONEY_OPERATOR, "mintWithFee", CUSTOMER1, 10000, 25)
            expect(await call(token, "balanceOf", CUSTOMER1)).eq(10000)
            expect(await call(token, "balanceOf", MINT_FEE_COLLECTOR)).eq(25)
            await send(token, CUSTOMER1, "approve", address(gateWithFee), 10000)
            await send(gateWithFee, MONEY_OPERATOR, "burnWithFee", CUSTOMER1, 10000, 25)
            expect(await call(token, "balanceOf", CUSTOMER1)).eq(0)
            expect(await call(token, "balanceOf", BURN_FEE_COLLECTOR)).eq(25)
        })
        it("Burn more than one can afford is not allowed.", async () => {
            await send(gateWithFee, MONEY_OPERATOR, "mintWithFee", CUSTOMER1, 10000, 25)
            expect(await call(token, "balanceOf", CUSTOMER1)).eq(10000)
            expect(await call(token, "balanceOf", MINT_FEE_COLLECTOR)).eq(25)
            //no checking on approve
            await send(token, CUSTOMER1, "approve", address(gateWithFee), 10001)
            await expect(send(gateWithFee, MONEY_OPERATOR, "burnWithFee", CUSTOMER1, 10001, 25)
            ).to.be.rejected
        })
        it("0 fee is allowed", async () => {
            await send(gateWithFee, MONEY_OPERATOR, "mintWithFee", CUSTOMER1, 10000, 25)
            expect(await call(token, "balanceOf", CUSTOMER1)).eq(10000)
            expect(await call(token, "balanceOf", MINT_FEE_COLLECTOR)).eq(25)
            await send(token, CUSTOMER1, "approve", address(gateWithFee), 10000)
            await send(gateWithFee, MONEY_OPERATOR, "burnWithFee", CUSTOMER1, 10000, 0)
            expect(await call(token, "balanceOf", CUSTOMER1)).eq(0)
            expect(await call(token, "balanceOf", BURN_FEE_COLLECTOR)).eq(0)
        })
    })

    context("Transfer with dynamic fee", async () => {
        it("Should have event logs", async ()=> {
            let result = await send(transferFeeController, SYSTEM_ADMIN, "setDefaultTransferFee", 0, 10)

            let events = await txEvents(result)
            expect(events).containSubset([
                {
                    "defaultTransferFeeAbs": "0",
                    "defaultTransferFeeBps": "10",
                    "NAME": "LogSetDefaultTransferFee"
                }
            ])
        })

        it("When absolute_fee=0, basis_point_fee=10, fee for amount ( = 10000) is 10", async () => {
            await send(transferFeeController, SYSTEM_ADMIN, "setDefaultTransferFee", 0, 10)

            expect(await call(transferFeeController, "defaultTransferFeeAbs")).eq(0)
            expect(await call(transferFeeController, "defaultTransferFeeBps")).eq(10)
            expect(await call(transferFeeController, "calculateTransferFee", null, null, 10000)).eq(10 * (1))
        })

        it("When absolute_fee=1, basis_point_fee=10, fee for amount ( = 10000) is 11", async () => {
            await send(transferFeeController, SYSTEM_ADMIN, "setDefaultTransferFee", 1, 10);
            expect(await call(transferFeeController, "defaultTransferFeeAbs")).eq(1)
            expect(await call(transferFeeController, "defaultTransferFeeBps")).eq(10)
            expect(await call(transferFeeController, "calculateTransferFee", null, null, 10000)).eq(11 * (1));
        })

        it("When absolute_fee=1, basis_point_fee=25, fee for amount ( = 9116) is 10", async () => {
            await send(transferFeeController, SYSTEM_ADMIN, "setDefaultTransferFee", 1, 10);
            expect(await call(transferFeeController, "defaultTransferFeeAbs")).eq(1)
            expect(await call(transferFeeController, "defaultTransferFeeBps")).eq(10)
            expect(await call(transferFeeController, "calculateTransferFee", null, null, 9999)).eq(11 * (1));
            expect(await call(transferFeeController, "calculateTransferFee", null, null, 9998)).eq(11 * (1));
            expect(await call(transferFeeController, "calculateTransferFee", null, null, 9997)).eq(11 * (1));
            expect(await call(transferFeeController, "calculateTransferFee", null, null, 9996)).eq(11 * (1));
            expect(await call(transferFeeController, "calculateTransferFee", null, null, 9116)).eq(10 * (1));
        })

        it("Should throw if exceed 10 bps", async () => {
            await expect(send(transferFeeController, DEPLOYER, "setDefaultTransferFee", 0, 10)
            ).to.be.rejected
            await expect(send(transferFeeController, SYSTEM_ADMIN, "setDefaultTransferFee", 0, 11)
            ).to.be.rejected
        })

        it("When a customer transfers 10000 tokens to customer_two and the fee is 25 (0+25bps), " +
            "10000 tokens come off from the customer's wallet, " +
            "9975 tokens goes to customer_two, " +
            "and 25 tokens goes to the fee collector's wallet.", async () => {
            await send(transferFeeController, SYSTEM_ADMIN, "setDefaultTransferFee", 0, 10);
            expect(await call(transferFeeController, "defaultTransferFeeAbs")).eq(0)
            expect(await call(transferFeeController, "defaultTransferFeeBps")).eq(10)

            await send(gateWithFee, MONEY_OPERATOR, "mintWithFee", CUSTOMER1, 10000, 25)
            expect(await call(token, "balanceOf", CUSTOMER1)).eq(10000)

            await send(gateWithFee, SYSTEM_ADMIN, "setTransferFeeCollector", TRANSFER_FEE_COLLECTOR)
            await send(token, CUSTOMER1, "transfer", CUSTOMER2, 10000)
            expect(await call(token, "balanceOf", CUSTOMER1)).eq(0)
            expect(await call(token, "balanceOf", CUSTOMER2)).eq(9990)
            expect(await call(token, "balanceOf", TRANSFER_FEE_COLLECTOR)).eq(10)
        })

        it("Gate can change transfer fee collector.", async () => {
            await expect(send(gateWithFee, CUSTOMER1, "setTransferFeeCollector", CUSTOMER2))
                .to.be.rejected

            await send(gateWithFee, SYSTEM_ADMIN, "setTransferFeeCollector", CUSTOMER2);
            expect(await call(token, "transferFeeCollector")).eq(CUSTOMER2)
        })

        it("Gate can change transfer fee controller.", async () => {
            const deploy = (...args) => create(web3, DEPLOYER, ...args)
            const {MockTransferFeeController} = contractRegistry
            const mockTransferFeeController = await deploy(MockTransferFeeController)

            await expect(send(gateWithFee, CUSTOMER1, "setTransferFeeController", address(mockTransferFeeController))
            ).to.be.rejected

            let eventResult = await send(gateWithFee, SYSTEM_ADMIN, "setTransferFeeController", address(mockTransferFeeController));
            expect(await call(token, "transferFeeController")).eq(address(mockTransferFeeController))
            expect(await call(mockTransferFeeController, "calculateTransferFee", null, null, 9116)).eq(10);

            //test event
            let events = await txEvents(eventResult)
            expect(events).containSubset([
                {NAME: 'LogSetTransferFeeController', transferFeeController: address(mockTransferFeeController)},
            ])

            await send(transferFeeController, SYSTEM_ADMIN, "setDefaultTransferFee", 0, 10);
            expect(await call(transferFeeController, "defaultTransferFeeAbs")).eq(0)
            expect(await call(transferFeeController, "defaultTransferFeeBps")).eq(10)

            await send(gateWithFee, MONEY_OPERATOR, "mintWithFee", CUSTOMER1, 10000, 25)
            expect(await call(token, "balanceOf", CUSTOMER1)).eq(10000)
            expect(await call(token, "balanceOf", MINT_FEE_COLLECTOR)).eq(25)

            await send(gateWithFee, SYSTEM_ADMIN, "setTransferFeeCollector", TRANSFER_FEE_COLLECTOR)
            await send(token, CUSTOMER1, "transfer", CUSTOMER2, 10000)
            expect(await call(token, "balanceOf", CUSTOMER1)).eq(0)
            expect(await call(token, "balanceOf", CUSTOMER2)).eq(9990)
            expect(await call(token, "balanceOf", TRANSFER_FEE_COLLECTOR)).eq(10)
            //expect(await call(token, "balanceOf", SYSTEM_ADMIN)).eq(10) //SYSTEM_ADMIN is transfer fee collector
        })
    })

    context("Mint, Burn and Transfer all have fees.", async () => {
        it("Normal customer can not set transfer fees.", async () => {
            await expect(send(transferFeeController, CUSTOMER1,
                "setDefaultTransferFee", 0, 25)
            ).to.be.rejected
        })

        it("Mint, Burn and Transfer fees don't duplicate.", async () => {
            await send(transferFeeController, SYSTEM_ADMIN, "setDefaultTransferFee", 0, 10);
            await send(gateWithFee, SYSTEM_ADMIN, "setTransferFeeCollector", TRANSFER_FEE_COLLECTOR);
            expect(await call(transferFeeController, "defaultTransferFeeAbs")).eq(0)
            expect(await call(transferFeeController, "defaultTransferFeeBps")).eq(10)

            await send(gateWithFee, MONEY_OPERATOR, "mintWithFee", CUSTOMER1, 10000, 25)
            expect(await call(token, "balanceOf", CUSTOMER1)).eq(10000)
            expect(await call(token, "balanceOf", MINT_FEE_COLLECTOR)).eq(25)

            await send(token, CUSTOMER1, "transfer", CUSTOMER2, 5000)
            expect(await call(token, "balanceOf", TRANSFER_FEE_COLLECTOR)).eq(5)

            await send(token, CUSTOMER1, "approve", address(gateWithFee), 5000)
            await send(gateWithFee, MONEY_OPERATOR, "burnWithFee", CUSTOMER1, 5000, 25)
            expect(await call(token, "balanceOf", CUSTOMER1)).eq(0)
            expect(await call(token, "balanceOf", BURN_FEE_COLLECTOR)).eq(25)
        })
    })
})
