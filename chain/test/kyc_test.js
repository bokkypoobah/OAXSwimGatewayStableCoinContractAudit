const {expect, expectNoAsyncThrow, expectThrow} = require('chain-dsl/test/helpers')
const {address, send, call, create, txEvents} = require('chain-dsl')
const deployer = require('../lib/deployer')

const mint = 'mint(address,uint256)'
const mintForSelf = 'mint(uint256)'
const withdraw = 'withdraw'
const burn = 'burn(address,uint256)'
const deposit = 'deposit'
const approve = 'approve'
const transfer = 'transfer'
const transferFrom = 'transferFrom'
const setKycVerified = 'setKycVerified'
const kycVerified = 'kycVerified'

describe("Asset Gateway", function () {
    this.timeout(10000)

    let gate, kycAmlStatus, boundaryKycAmlRule, fullKycAmlRule, mockMembershipAuthority, membershipWithBoundaryKycAmlRule, token,
        AMT

    before('deployment', async () => {
        AMT = 100

        ;({gate, token, kycAmlStatus, boundaryKycAmlRule, fullKycAmlRule, mockMembershipAuthority, membershipWithBoundaryKycAmlRule} =
            await deployer.base(web3, contractRegistry, DEPLOYER, SYSTEM_ADMIN, KYC_OPERATOR, MONEY_OPERATOR))
    })

    it("operators can update others' KYC status", async () => {
        let events = await txEvents(send(kycAmlStatus, KYC_OPERATOR, setKycVerified, CUSTOMER, true))
        expect(await call(kycAmlStatus, kycVerified, CUSTOMER)).eql(true)

        expect(events).containSubset([{
            'NAME': 'KYCVerify',
            'guy': CUSTOMER,
            'isKycVerified': true
        }])

        let events2 = await txEvents(send(kycAmlStatus, KYC_OPERATOR, setKycVerified, CUSTOMER, false))
        expect(await call(kycAmlStatus, kycVerified, CUSTOMER)).eql(false)

        expect(events2).containSubset([{
            'NAME': 'KYCVerify',
            'guy': CUSTOMER,
            'isKycVerified': null // To be fixed in https://github.com/ethereum/web3.js/pull/1627
        }])
    })

    it("operators can update their own KYC status", async () => {
        await send(kycAmlStatus, KYC_OPERATOR, setKycVerified, KYC_OPERATOR, true)
        expect(await call(kycAmlStatus, kycVerified, KYC_OPERATOR)).eql(true)

        await send(kycAmlStatus, KYC_OPERATOR, setKycVerified, KYC_OPERATOR, false)
        expect(await call(kycAmlStatus, kycVerified, KYC_OPERATOR)).eql(false)
    })

    it("non-operators can NOT update anyone's KYC status", async () => {
        await expectThrow(async () =>
            send(kycAmlStatus, DEPLOYER, setKycVerified, CUSTOMER, true))
    })

    describe("with no KYC constraints", async () => {

        it("allows deposits FROM any address", async () => {
            await expectNoAsyncThrow(async () => {
                await send(gate, CUSTOMER, deposit, AMT)
                await send(gate, MONEY_OPERATOR, mint, CUSTOMER, AMT)
            })
        })

        it("allows transfers TO any address", async () => {
            await send(gate, CUSTOMER1, deposit, AMT)
            await send(gate, MONEY_OPERATOR, mint, CUSTOMER1, AMT)

            await expectNoAsyncThrow(async () => {
                await send(token, CUSTOMER1, transfer, CUSTOMER2, AMT)
            })
        })

        it("allows withdrawal FROM any address", async () => {
            await send(gate, CUSTOMER1, deposit, AMT)
            await send(gate, MONEY_OPERATOR, mint, CUSTOMER1, AMT)

            await expectNoAsyncThrow(async () => {
                await send(gate, CUSTOMER1, withdraw, AMT)
                await send(token, CUSTOMER1, approve, address(gate), AMT)
                await send(gate, MONEY_OPERATOR, burn, CUSTOMER1, AMT)
            })
        })
    })

    describe("with boundary KYC", async () => {

        before(async () => {
            await send(gate, SYSTEM_ADMIN, 'setERC20Authority', address(boundaryKycAmlRule))
            await send(gate, SYSTEM_ADMIN, 'setTokenAuthority', address(boundaryKycAmlRule))
        })

        describe("CUSTOMER", async () => {

            it("allows deposits TO KYC verified addresses", async () => {
                await send(kycAmlStatus, KYC_OPERATOR, setKycVerified, CUSTOMER, true)

                await expectNoAsyncThrow(async () => {
                    await send(gate, CUSTOMER, deposit, AMT)
                    await send(gate, MONEY_OPERATOR, mint, CUSTOMER, AMT)
                })
            })

            it("allows transfers FROM KYC verified address to arbitrary addresses", async () => {
                await send(kycAmlStatus, KYC_OPERATOR, setKycVerified, CUSTOMER1, true)
                await send(gate, CUSTOMER1, deposit, AMT)
                await send(gate, MONEY_OPERATOR, mint, CUSTOMER1, AMT)

                await expectNoAsyncThrow(async () =>
                    send(token, CUSTOMER1, transfer, CUSTOMER2, AMT))
            })

            it("allows transfers FROM non-KYC verified addresses", async () => {
                await send(kycAmlStatus, KYC_OPERATOR, setKycVerified, CUSTOMER1, true)
                await send(gate, CUSTOMER1, deposit, AMT)
                await send(gate, MONEY_OPERATOR, mint, CUSTOMER1, AMT)
                await send(kycAmlStatus, KYC_OPERATOR, setKycVerified, CUSTOMER1, false)

                await expectNoAsyncThrow(async () =>
                    send(token, CUSTOMER1, transfer, CUSTOMER2, AMT))
            })

            it("allows withdrawal FROM any KYC verified address", async () => {
                await send(kycAmlStatus, KYC_OPERATOR, setKycVerified, CUSTOMER1, true)
                await send(gate, CUSTOMER1, deposit, AMT)
                await send(gate, MONEY_OPERATOR, mint, CUSTOMER1, AMT)

                await expectNoAsyncThrow(async () => {
                    await send(gate, CUSTOMER1, withdraw, AMT)
                    await send(token, CUSTOMER1, approve, address(gate), AMT)
                    await send(gate, MONEY_OPERATOR, burn, CUSTOMER1, AMT)
                })
            })

            it("rejects withdrawal FROM non-KYC verified addresses", async () => {
                await send(kycAmlStatus, KYC_OPERATOR, setKycVerified, CUSTOMER1, true)
                await send(gate, CUSTOMER1, deposit, AMT)
                await send(gate, MONEY_OPERATOR, mint, CUSTOMER1, AMT)
                await send(kycAmlStatus, KYC_OPERATOR, setKycVerified, CUSTOMER1, false)

                await expectThrow(async () => {
                    await send(gate, CUSTOMER1, withdraw, AMT)
                    await send(token, CUSTOMER1, transfer, MONEY_OPERATOR, AMT)
                    await send(gate, MONEY_OPERATOR, burn, CUSTOMER1, AMT)
                })
            })
        })
    })

    describe("with full KYC", async () => {
        before(async () => {
            await send(gate, SYSTEM_ADMIN, 'setERC20Authority', address(fullKycAmlRule))
            await send(gate, SYSTEM_ADMIN, 'setTokenAuthority', address(fullKycAmlRule))
        })

        describe("CUSTOMER", async () => {

            it("allows minting TO KYC verified addresses", async () => {
                await send(kycAmlStatus, KYC_OPERATOR, setKycVerified, CUSTOMER, true)
                await send(gate, CUSTOMER, deposit, AMT)

                await expectNoAsyncThrow(async () => {
                    await send(gate, MONEY_OPERATOR, mint, CUSTOMER, AMT)
                })
            })

            it("rejects minting TO non-KYC verified addresses", async () => {
                await send(gate, CUSTOMER, deposit, AMT)

                await expectThrow(async () => {
                    await send(gate, MONEY_OPERATOR, mint, CUSTOMER, AMT)
                })
            })

            it("allows transfers BETWEEN KYC verified addresses", async () => {
                await send(kycAmlStatus, KYC_OPERATOR, setKycVerified, CUSTOMER1, true)
                await send(gate, CUSTOMER1, deposit, AMT)
                await send(gate, MONEY_OPERATOR, mint, CUSTOMER1, AMT)

                // Difference from boundary KYC
                await send(kycAmlStatus, KYC_OPERATOR, setKycVerified, CUSTOMER2, true)
                await send(kycAmlStatus, KYC_OPERATOR, setKycVerified, KYC_OPERATOR, true)

                await expectNoAsyncThrow(async () =>
                    send(token, CUSTOMER1, transfer, CUSTOMER2, AMT))
            })

            it("reject transfers FROM non-KYC verified addresses", async () => {
                await send(kycAmlStatus, KYC_OPERATOR, setKycVerified, CUSTOMER1, true)
                await send(gate, CUSTOMER1, deposit, AMT)
                await send(gate, MONEY_OPERATOR, mint, CUSTOMER1, AMT)
                await send(kycAmlStatus, KYC_OPERATOR, setKycVerified, CUSTOMER1, false)

                // Difference from boundary KYC
                await send(kycAmlStatus, KYC_OPERATOR, setKycVerified, CUSTOMER2, true)

                await expectThrow(async () =>
                    send(token, CUSTOMER1, transfer, CUSTOMER2, AMT))
            })

            // Extra case compared to boundary KYC
            it("reject transfers TO non-KYC verified addresses", async () => {
                await send(kycAmlStatus, KYC_OPERATOR, setKycVerified, CUSTOMER1, true)
                await send(gate, CUSTOMER1, deposit, AMT)
                await send(gate, MONEY_OPERATOR, mint, CUSTOMER1, AMT)

                await expectThrow(async () =>
                    send(token, CUSTOMER1, transfer, CUSTOMER2, AMT))
            })

            it("allows withdrawal FROM any KYC verified address", async () => {
                await send(kycAmlStatus, KYC_OPERATOR, setKycVerified, CUSTOMER1, true)
                await send(gate, CUSTOMER1, deposit, AMT)
                await send(gate, MONEY_OPERATOR, mint, CUSTOMER1, AMT)

                await expectNoAsyncThrow(async () => {
                    await send(gate, CUSTOMER1, withdraw, AMT)
                    await send(token, CUSTOMER1, approve, address(gate), AMT)
                    await send(gate, MONEY_OPERATOR, burn, CUSTOMER1, AMT)
                })
            })

            it("rejects withdrawal FROM non-KYC verified addresses", async () => {
                await send(kycAmlStatus, KYC_OPERATOR, setKycVerified, CUSTOMER1, true)
                await send(gate, CUSTOMER1, deposit, AMT)
                await send(gate, MONEY_OPERATOR, mint, CUSTOMER1, AMT)
                await send(kycAmlStatus, KYC_OPERATOR, setKycVerified, CUSTOMER1, false)

                await expectThrow(async () => {
                    await send(gate, CUSTOMER1, withdraw, AMT)
                    await send(token, CUSTOMER1, approve, address(gate), AMT)
                    await send(gate, MONEY_OPERATOR, burn, CUSTOMER1, AMT)
                })
            })
        })
    })

    describe("with full KYC and Membership Control", async () => {
        before(async () => {
            await send(gate, SYSTEM_ADMIN, 'setERC20Authority', address(membershipWithBoundaryKycAmlRule))
            await send(gate, SYSTEM_ADMIN, 'setTokenAuthority', address(membershipWithBoundaryKycAmlRule))
        })

        describe("SystemAdmin", async () => {

            it("Able to set the address of membership lookup contract " +
                "and Throw when trying mint and burn if the address is not member", async () => {
                const deploy = (...args) => create(web3, DEPLOYER, ...args)
                const {MockMembershipAuthorityFalse} = contractRegistry
                const mockMembershipAuthorityFalse = await deploy(MockMembershipAuthorityFalse)

                await send(membershipWithBoundaryKycAmlRule, SYSTEM_ADMIN, "setMembershipAuthority", address(mockMembershipAuthorityFalse))
                await send(kycAmlStatus, KYC_OPERATOR, setKycVerified, CUSTOMER1, true)
                await send(gate, CUSTOMER1, deposit, AMT)
                await expectThrow(async () => {
                    await send(gate, MONEY_OPERATOR, mint, CUSTOMER1, AMT)
                })
            })

            it("Able to mint and burn and transfer if the address is member", async () => {
                await send(kycAmlStatus, KYC_OPERATOR, setKycVerified, CUSTOMER1, true)
                await send(gate, CUSTOMER1, deposit, AMT)
                await send(gate, MONEY_OPERATOR, mint, CUSTOMER1, AMT)
                await send(token, CUSTOMER1, transfer, CUSTOMER2, AMT)
            })


        })
    })
})
