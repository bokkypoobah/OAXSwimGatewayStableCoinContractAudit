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
    txEvents
} = require('chain-dsl')

const deployer = require('../lib/deployer')

const newGroup = 'newGroup(address[],uint256,uint256)'
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

describe.skip("Multisig", function () {
    this.timeout(10000)

    let web3, snaps, accounts,
        gate, kycAmlStatus, boundaryKycAmlRule, fullKycAmlRule, gateRoles, addressControlStatus,
        mockMembershipAuthority, membershipRule, token, dsGroupFactory,
        DEPLOYER,
        SYSTEM_ADMIN, KYC_OPERATOR, MONEY_OPERATOR,
        SYSTEM_ADMIN1, MONEY_OPERATOR1,
        SYSTEM_ADMIN2, MONEY_OPERATOR2,
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
            SYSTEM_ADMIN1, MONEY_OPERATOR1,
            SYSTEM_ADMIN2, MONEY_OPERATOR2,
            CUSTOMER,
            CUSTOMER1,
            CUSTOMER2
        ] = accounts = await web3.eth.getAccounts()

        AMT = 100
        MONEY_OPERATOR_GROUP = [MONEY_OPERATOR1, MONEY_OPERATOR2]
        QUORUM = 2
        WINDOW = 86400


        ;({gate, addressControlStatus, gateRoles, token, kycAmlStatus, boundaryKycAmlRule, fullKycAmlRule, mockMembershipAuthority, membershipRule, dsGroupFactory} =
            await deployer.base(web3, solc(__dirname, '../solc-input.json'), DEPLOYER, SYSTEM_ADMIN, KYC_OPERATOR, MONEY_OPERATOR))
        
    })

    beforeEach(async () => snaps.push(await web3.evm.snapshot()))
    afterEach(async () => web3.evm.revert(snaps.pop()))

    it("Able to deploy new multisig wallet using factory", async () => {
        let dsGroup = await send(dsGroupFactory, DEPLOYER, newGroup, MONEY_OPERATOR_GROUP, QUORUM, WINDOW)        
        expect(dsGroup.events[0].address).eq('0x82D50AD3C1091866E258Fd0f1a7cC9674609D254')
    })

    it("Able to freeze address from multisig", async () => {
        const MONEY_OPERATOR_ROLE = await call(gateRoles, 'MONEY_OPERATOR')
        const {dsGroup} = await deployer.deployMultisig(web3, solc(__dirname, '../solc-input.json'), DEPLOYER, MONEY_OPERATOR_GROUP, QUORUM, WINDOW)

        // verify dsGroup info
        expect(await call(dsGroup, "isMember", MONEY_OPERATOR1)).eql(true)
        expect(await call(dsGroup, "isMember", MONEY_OPERATOR2)).eql(true)
        expect(await call(dsGroup, "isMember", CUSTOMER)).eql(false)

        // grant permission to new multisig address
        await send(gateRoles, DEPLOYER, 'setUserRole', address(dsGroup), MONEY_OPERATOR_ROLE, true)
        
        // M1 send freezeAddress proposal
        const calldata = addressControlStatus.methods.freezeAddress(CUSTOMER).encodeABI()
        const events = await txEvents(send(dsGroup, MONEY_OPERATOR1, 'propose', address(addressControlStatus), calldata, 0))

        expect(events).containSubset([{
            NAME: 'Proposed',
            id: "1",
            calldata: calldata
        }])

        // M2 confirm freezeAddress proposal
        await send(dsGroup, MONEY_OPERATOR1, 'confirm', 1)
        await send(dsGroup, MONEY_OPERATOR2, 'confirm', 1)

        // M1 trigger freezeAddress proposal
        await send(dsGroup, MONEY_OPERATOR1, 'trigger', 1)

        // Check CUSTOMER balance
        expect(await call(addressControlStatus, "frozenAddress", CUSTOMER1)).eql(false)
        expect(await call(addressControlStatus, "frozenAddress", CUSTOMER)).eql(true)
    })



})
