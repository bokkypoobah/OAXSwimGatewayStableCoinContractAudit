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
    create,
} = require('chain-dsl')

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

    let web3, snaps, accounts,
        gate, kycAmlStatus, boundaryKycAmlRule, fullKycAmlRule, mockMembershipAuthority, membershipRule, token,
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

        ;({gate, token, kycAmlStatus, boundaryKycAmlRule, fullKycAmlRule, mockMembershipAuthority, membershipRule} =
            await deployer.base(web3, solc(__dirname, '../solc-input.json'), DEPLOYER, OPERATOR))
    })

    beforeEach(async () => snaps.push(await web3.evm.snapshot()))
    afterEach(async () => web3.evm.revert(snaps.pop()))

    it("operators can update others' KYC status", async () => {
        await send(kycAmlStatus, OPERATOR, setKycVerified, CUSTOMER, true)
        expect(await call(kycAmlStatus, kycVerified, CUSTOMER)).eql(true)

        await send(kycAmlStatus, OPERATOR, setKycVerified, CUSTOMER, false)
        expect(await call(kycAmlStatus, kycVerified, CUSTOMER)).eql(false)
    })

    it("operators can update their own KYC status", async () => {
        await send(kycAmlStatus, OPERATOR, setKycVerified, OPERATOR, true)
        expect(await call(kycAmlStatus, kycVerified, OPERATOR)).eql(true)

        await send(kycAmlStatus, OPERATOR, setKycVerified, OPERATOR, false)
        expect(await call(kycAmlStatus, kycVerified, OPERATOR)).eql(false)
    })

    it("non-operators can NOT update anyone's KYC status", async () => {
        await expectThrow(async () =>
            send(kycAmlStatus, DEPLOYER, setKycVerified, CUSTOMER, true))
    })

    describe("with no KYC constraints", async () => {

        it("allows deposits FROM any address", async () => {
            await expectNoAsyncThrow(async () => {
                await send(gate, CUSTOMER, deposit, AMT)
                await send(gate, OPERATOR, mint, CUSTOMER, AMT)
            })
        })

        it("allows transfers TO any address", async () => {
            await send(gate, CUSTOMER1, deposit, AMT)
            await send(gate, OPERATOR, mint, CUSTOMER1, AMT)

            await expectNoAsyncThrow(async () => {
                await send(token, CUSTOMER1, transfer, CUSTOMER2, AMT)
            })
        })

        it("allows withdrawal FROM any address", async () => {
            await send(gate, CUSTOMER1, deposit, AMT)
            await send(gate, OPERATOR, mint, CUSTOMER1, AMT)

            await expectNoAsyncThrow(async () => {
                await send(gate, CUSTOMER1, withdraw, AMT)
                await send(token, CUSTOMER1, approve, address(gate), AMT)
                await send(gate, OPERATOR, burn, CUSTOMER1, AMT)
            })
        })
    })

    describe("with boundary KYC", async () => {

        before(async () => {
            await send(gate, OPERATOR, 'setERC20Authority', address(boundaryKycAmlRule))
            await send(gate, OPERATOR, 'setTokenAuthority', address(boundaryKycAmlRule))
        })

        describe("CUSTOMER", async () => {

            it("allows deposits TO KYC verified addresses", async () => {
                await send(kycAmlStatus, OPERATOR, setKycVerified, CUSTOMER, true)

                await expectNoAsyncThrow(async () => {
                    await send(gate, CUSTOMER, deposit, AMT)
                    await send(gate, OPERATOR, mint, CUSTOMER, AMT)
                })
            })

            // FIXME Should deposits really be rejected?
            it.skip("rejects deposits FROM non-KYC verified addresses", async () => {
                await expectThrow(async () =>
                    send(gate, CUSTOMER, deposit, AMT))
            })

            it("allows transfers FROM KYC verified address to arbitrary addresses", async () => {
                await send(kycAmlStatus, OPERATOR, setKycVerified, CUSTOMER1, true)
                await send(gate, CUSTOMER1, deposit, AMT)
                await send(gate, OPERATOR, mint, CUSTOMER1, AMT)

                await expectNoAsyncThrow(async () =>
                    send(token, CUSTOMER1, transfer, CUSTOMER2, AMT))
            })

            it("allows transfers FROM non-KYC verified addresses", async () => {
                await send(kycAmlStatus, OPERATOR, setKycVerified, CUSTOMER1, true)
                await send(gate, CUSTOMER1, deposit, AMT)
                await send(gate, OPERATOR, mint, CUSTOMER1, AMT)
                await send(kycAmlStatus, OPERATOR, setKycVerified, CUSTOMER1, false)

                await expectNoAsyncThrow(async () =>
                    send(token, CUSTOMER1, transfer, CUSTOMER2, AMT))
            })

            it("allows withdrawal FROM any KYC verified address", async () => {
                await send(kycAmlStatus, OPERATOR, setKycVerified, CUSTOMER1, true)
                await send(gate, CUSTOMER1, deposit, AMT)
                await send(gate, OPERATOR, mint, CUSTOMER1, AMT)

                await expectNoAsyncThrow(async () => {
                    await send(gate, CUSTOMER1, withdraw, AMT)
                    await send(token, CUSTOMER1, approve, address(gate), AMT)
                    await send(gate, OPERATOR, burn, CUSTOMER1, AMT)
                })
            })

            it("rejects withdrawal FROM non-KYC verified addresses", async () => {
                await send(kycAmlStatus, OPERATOR, setKycVerified, CUSTOMER1, true)
                await send(gate, CUSTOMER1, deposit, AMT)
                await send(gate, OPERATOR, mint, CUSTOMER1, AMT)
                await send(kycAmlStatus, OPERATOR, setKycVerified, CUSTOMER1, false)

                await expectThrow(async () => {
                    await send(gate, CUSTOMER1, withdraw, AMT)
                    await send(token, CUSTOMER1, transfer, OPERATOR, AMT)
                    await send(gate, OPERATOR, burn, CUSTOMER1, AMT)
                })
            })
        })
    })

    describe("with full KYC", async () => {
        before(async () => {
            await send(gate, OPERATOR, 'setERC20Authority', address(fullKycAmlRule))
            await send(gate, OPERATOR, 'setTokenAuthority', address(fullKycAmlRule))
        })

        describe("CUSTOMER", async () => {

            it("allows minting TO KYC verified addresses", async () => {
                await send(kycAmlStatus, OPERATOR, setKycVerified, CUSTOMER, true)
                await send(gate, CUSTOMER, deposit, AMT)

                await expectNoAsyncThrow(async () => {
                    await send(gate, OPERATOR, mint, CUSTOMER, AMT)
                })
            })

            it("rejects minting TO non-KYC verified addresses", async () => {
                await send(gate, CUSTOMER, deposit, AMT)

                await expectThrow(async () => {
                    await send(gate, OPERATOR, mint, CUSTOMER, AMT)
                })
            })

            // FIXME Should deposits really be rejected?
            it.skip("rejects deposits FROM non-KYC verified addresses", async () => {
                await expectThrow(async () =>
                    send(gate, CUSTOMER, deposit, AMT))
            })

            it("allows transfers BETWEEN KYC verified addresses", async () => {
                await send(kycAmlStatus, OPERATOR, setKycVerified, CUSTOMER1, true)
                await send(gate, CUSTOMER1, deposit, AMT)
                await send(gate, OPERATOR, mint, CUSTOMER1, AMT)

                // Difference from boundary KYC
                await send(kycAmlStatus, OPERATOR, setKycVerified, CUSTOMER2, true)
                await send(kycAmlStatus, OPERATOR, setKycVerified, OPERATOR, true)

                await expectNoAsyncThrow(async () =>
                    send(token, CUSTOMER1, transfer, CUSTOMER2, AMT))
            })

            it("reject transfers FROM non-KYC verified addresses", async () => {
                await send(kycAmlStatus, OPERATOR, setKycVerified, CUSTOMER1, true)
                await send(gate, CUSTOMER1, deposit, AMT)
                await send(gate, OPERATOR, mint, CUSTOMER1, AMT)
                await send(kycAmlStatus, OPERATOR, setKycVerified, CUSTOMER1, false)

                // Difference from boundary KYC
                await send(kycAmlStatus, OPERATOR, setKycVerified, CUSTOMER2, true)

                await expectThrow(async () =>
                    send(token, CUSTOMER1, transfer, CUSTOMER2, AMT))
            })

            // Extra case compared to boundary KYC
            it("reject transfers TO non-KYC verified addresses", async () => {
                await send(kycAmlStatus, OPERATOR, setKycVerified, CUSTOMER1, true)
                await send(gate, CUSTOMER1, deposit, AMT)
                await send(gate, OPERATOR, mint, CUSTOMER1, AMT)

                await expectThrow(async () =>
                    send(token, CUSTOMER1, transfer, CUSTOMER2, AMT))
            })

            it("allows withdrawal FROM any KYC verified address", async () => {
                await send(kycAmlStatus, OPERATOR, setKycVerified, CUSTOMER1, true)
                await send(gate, CUSTOMER1, deposit, AMT)
                await send(gate, OPERATOR, mint, CUSTOMER1, AMT)

                await expectNoAsyncThrow(async () => {
                    await send(gate, CUSTOMER1, withdraw, AMT)
                    await send(token, CUSTOMER1, approve, address(gate), AMT)
                    await send(gate, OPERATOR, burn, CUSTOMER1, AMT)
                })
            })

            it("rejects withdrawal FROM non-KYC verified addresses", async () => {
                await send(kycAmlStatus, OPERATOR, setKycVerified, CUSTOMER1, true)
                await send(gate, CUSTOMER1, deposit, AMT)
                await send(gate, OPERATOR, mint, CUSTOMER1, AMT)
                await send(kycAmlStatus, OPERATOR, setKycVerified, CUSTOMER1, false)

                await expectThrow(async () => {
                    await send(gate, CUSTOMER1, withdraw, AMT)
                    await send(token, CUSTOMER1, approve, address(gate), AMT)
                    await send(gate, OPERATOR, burn, CUSTOMER1, AMT)
                })
            })
        })
    })

    describe("with full KYC and Membership Control", async () => {
        before(async () => {
            await send(gate, OPERATOR, 'setERC20Authority', address(membershipRule))
            await send(gate, OPERATOR, 'setTokenAuthority', address(membershipRule))
        })

        describe("OPERATOR", async () => {

            it("Able to set the address of membership lookup contract \n" + 
                "and Throw when trying mint and burn if the address is not member", async () => {
                const deploy = (...args) => create(web3, DEPLOYER, ...args)
                const {
                    MockMembershipAuthorityFalse
                } = solc(__dirname, '../solc-input.json')
                const mockMembershipAuthorityFalse = await deploy(MockMembershipAuthorityFalse)

                await send(membershipRule, OPERATOR, "setMembershipAuthority", address(mockMembershipAuthorityFalse))
                await send(kycAmlStatus, OPERATOR, setKycVerified, CUSTOMER1, true)
                await send(gate, CUSTOMER1, deposit, AMT)
                await expectThrow(async () => {
                    await send(gate, OPERATOR, mint, CUSTOMER1, AMT)
                })
            })

            it("Able to mint and burn if the address is member", async () => {
                await send(kycAmlStatus, OPERATOR, setKycVerified, CUSTOMER1, true)
                await send(gate, CUSTOMER1, deposit, AMT)
                await send(gate, OPERATOR, mint, CUSTOMER1, AMT)
            })


        })
    })
})
