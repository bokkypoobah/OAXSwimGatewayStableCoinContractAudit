const request = require('supertest')

const {
    expect,
    ZERO_ADDR,
    solcJSON,
    ganacheWeb3,
    expectAsyncThrow,
    expectNoAsyncThrow,
    expectThrow,
    toBN,
    solc,
} = require('chain-dsl/test/helpers')

const {
    address,
    wad,
    send,
    call,
    txEvents,
    sendEth
} = require('chain-dsl')

const deployer = require('chain/lib/deployer')

const env = process.env.NODE_ENV || "development"
const config = require('../config.json')[env]
const createApp = require('../lib/app')

describe('App', function () {
    this.slow(500)
    this.timeout(25000);

    let app, web3, accounts, snaps, gate, token,
        DEPLOYER, OPERATOR, CUSTOMER, CUSTOMER1, CUSTOMER2,
        ASSET_GATEWAY = '<uninitialized>'

    const AMT = 999

    before('deployment', async () => {
        snaps = []

        web3 = ganacheWeb3()
        ;[DEPLOYER, OPERATOR, CUSTOMER, CUSTOMER1, CUSTOMER2]
            = accounts = await web3.eth.getAccounts()

        ;({gate, token} = await deployer.base(web3, solc(__dirname, '../../chain/solc-input.json'), DEPLOYER, OPERATOR))

        ASSET_GATEWAY = gate.options.address

    })

    beforeEach(async () => {
        app = await createApp(config, web3, gate, token)
    })

    beforeEach(async () => {
        snaps.push(await web3.evm.snapshot())
    })

    afterEach(async () => {
        await web3.evm.revert(snaps.pop())
    })

    it('works', async () => {
        await request(app)
            .get('/')
            .expect('Content-Type', /html/)
            .expect(200, "Welcome to OAX Backend Web Server")
    })

    it('/deposit-requests', async () => {
        await send(gate, CUSTOMER, 'deposit', AMT)

        await request(app)
            .get('/api/v1/deposit-requests')
            .expect(200)
            .then(response => {
                expect(response.body.data.length).equal(1)
                expect(response.body.data[0].ethereumAddress).equal(CUSTOMER)
                expect(response.body.data[0].amount).equal(AMT.toString(10))
                expect(response.body.data[0].status).equal('DEPOSIT_REQUESTED')
            })
    })

    it('/deposit-requests with multiple fetch', async () => {
        await send(gate, CUSTOMER, 'deposit', AMT)
        await send(gate, CUSTOMER, 'deposit', AMT)
        await send(gate, OPERATOR, 'mint', CUSTOMER, AMT)

        await request(app)
            .get('/api/v1/deposit-requests')
            .expect(200)
            .then(response => {
                expect(response.body.data.length).equal(2)
                expect(response.body.data[0].ethereumAddress).equal(CUSTOMER)
                expect(response.body.data[0].amount).equal(AMT.toString(10))
                expect(response.body.data[0].status).equal('DEPOSIT_REQUESTED')
                expect(response.body.data[1].ethereumAddress).equal(CUSTOMER)
                expect(response.body.data[1].amount).equal(AMT.toString(10))
                expect(response.body.data[1].status).equal('TOKEN_MINTED')
            })
    })

    it('/withdrawal-requests', async () => {
        await send(gate, CUSTOMER, 'withdraw', AMT)

        await request(app)
            .get('/api/v1/withdrawal-requests')
            .expect(200)
            .then(response => {
                expect(response.body.data.length).equal(1)
                expect(response.body.data[0].ethereumAddress).equal(CUSTOMER)
                expect(response.body.data[0].amount).equal(AMT.toString(10))
                expect(response.body.data[0].status).equal('WITHDRAWAL_REQUESTED')
            })
    })

    it('/withdrawal-requests with multiple fetch', async () => {
        await send(gate, CUSTOMER, 'withdraw', AMT)
        await send(gate, CUSTOMER, 'withdraw', AMT)

        await request(app)
            .get('/api/v1/withdrawal-requests')
            .expect(200)
            .then(response => {
                expect(response.body.data.length).equal(2)
                expect(response.body.data[0].ethereumAddress).equal(CUSTOMER)
                expect(response.body.data[0].amount).equal(AMT.toString(10))
                expect(response.body.data[0].status).equal('WITHDRAWAL_REQUESTED')
                expect(response.body.data[1].ethereumAddress).equal(CUSTOMER)
                expect(response.body.data[1].amount).equal(AMT.toString(10))
                expect(response.body.data[1].status).equal('WITHDRAWAL_REQUESTED')
            })

        await send(gate, CUSTOMER, 'withdraw', AMT)
        await request(app)
            .get('/api/v1/withdrawal-requests')
            .expect(200)
            .then(response => {
                expect(response.body.data.length).equal(3)
                expect(response.body.data[0].ethereumAddress).equal(CUSTOMER)
                expect(response.body.data[0].amount).equal(AMT.toString(10))
                expect(response.body.data[0].status).equal('WITHDRAWAL_REQUESTED')
                expect(response.body.data[1].ethereumAddress).equal(CUSTOMER)
                expect(response.body.data[1].amount).equal(AMT.toString(10))
                expect(response.body.data[1].status).equal('WITHDRAWAL_REQUESTED')
                expect(response.body.data[2].ethereumAddress).equal(CUSTOMER)
                expect(response.body.data[2].amount).equal(AMT.toString(10))
                expect(response.body.data[2].status).equal('WITHDRAWAL_REQUESTED')
            })
    })

    it('differentiates deposits and withdrawals', async () => {
        const AMT1 = 100;
        const AMT2 = 400;

        await send(gate, CUSTOMER1, 'deposit', AMT1)
        await send(gate, CUSTOMER1, 'withdraw', AMT1)
        await send(gate, CUSTOMER2, 'deposit', AMT1)
        await send(gate, CUSTOMER2, 'deposit', AMT2)
        await send(gate, OPERATOR, 'mint', CUSTOMER2, AMT2)
        await send(gate, CUSTOMER2, 'deposit', AMT2)
        await send(gate, OPERATOR, 'mint', CUSTOMER2, AMT2)
        await send(gate, CUSTOMER2, 'withdraw', AMT2)
        await send(gate, CUSTOMER2, 'withdraw', AMT2)
        await send(token, CUSTOMER2, 'approve', ASSET_GATEWAY, AMT2)
        await send(gate, CUSTOMER2, 'withdraw', AMT2)
        await send(token, CUSTOMER2, 'approve', ASSET_GATEWAY, AMT2)
        await send(gate, OPERATOR, 'burn', CUSTOMER2, AMT2)

        await request(app)
            .get('/api/v1/deposit-requests')
            .expect(200)
            .then(response => {
                expect(response.body.data.length).equal(4)
                expect(response.body.data[0].ethereumAddress).equal(CUSTOMER1)
                expect(response.body.data[0].amount).equal(AMT1.toString(10))
                expect(response.body.data[0].status).equal('DEPOSIT_REQUESTED')
                expect(response.body.data[0].timestamp).to.be.an('number')
                expect(response.body.data[1].ethereumAddress).equal(CUSTOMER2)
                expect(response.body.data[1].amount).equal(AMT1.toString(10))
                expect(response.body.data[1].status).equal('DEPOSIT_REQUESTED')
                expect(response.body.data[2].ethereumAddress).equal(CUSTOMER2)
                expect(response.body.data[2].amount).equal(AMT2.toString(10))
                expect(response.body.data[2].status).equal('TOKEN_MINTED')
                expect(response.body.data[3].ethereumAddress).equal(CUSTOMER2)
                expect(response.body.data[3].amount).equal(AMT2.toString(10))
                expect(response.body.data[3].status).equal('TOKEN_MINTED')
            })

        await request(app)
            .get('/api/v1/withdrawal-requests')
            .expect(200)
            .then(response => {
                expect(response.body.data.length).equal(4)
                expect(response.body.data[0].ethereumAddress).equal(CUSTOMER1)
                expect(response.body.data[0].amount).equal(AMT1.toString(10))
                expect(response.body.data[0].status).equal('WITHDRAWAL_REQUESTED')
                expect(response.body.data[0].timestamp).to.be.an('number')
                expect(response.body.data[1].ethereumAddress).equal(CUSTOMER2)
                expect(response.body.data[1].amount).equal(AMT2.toString(10))
                expect(response.body.data[1].status).equal('WITHDRAWAL_REQUESTED')
                expect(response.body.data[2].ethereumAddress).equal(CUSTOMER2)
                expect(response.body.data[2].amount).equal(AMT2.toString(10))
                expect(response.body.data[2].status).equal('TOKEN_TRANSFERRED')
                expect(response.body.data[3].ethereumAddress).equal(CUSTOMER2)
                expect(response.body.data[3].amount).equal(AMT2.toString(10))
                expect(response.body.data[3].status).equal('TOKEN_WITHDRAWN')
            })
    })
})
