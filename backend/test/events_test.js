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

const createEventHandler = require('../lib/services/blockchain-event-handler')


// Symbolic smart contract method names for the `tx` function
const deposit = 'deposit'
const mint = 'mint'
const withdraw = 'withdraw'
const transfer = 'push'
const burnFrom = 'burn'

describe('Events', function () {
    this.slow(500)
    this.timeout(15000);
    let web3, accounts, snaps, gate, makeState, processState, allEvents, token,
        DEPLOYER, OPERATOR, CUSTOMER, CUSTOMER1, CUSTOMER2,
        ASSET_GATEWAY = '<uninitialized>'

    const AMT = 999
    const AMT1 = 111
    const AMT2 = 222

    before('deployment', async () => {
        snaps = []

        web3 = ganacheWeb3()
        ;[DEPLOYER, OPERATOR, CUSTOMER, CUSTOMER1, CUSTOMER2]
            = accounts = await web3.eth.getAccounts()


        ;({gate, token} = await deployer.base(web3, solc(__dirname, '../../chain/solc-input.json'), DEPLOYER, OPERATOR))

        ;({makeState, processState, allEvents} = createEventHandler(web3, gate, token))

        ASSET_GATEWAY = gate.options.address
    })

    beforeEach(async () => {
        snaps.push(await web3.evm.snapshot())
    })

    afterEach(async () => {
        await web3.evm.revert(snaps.pop())
    })

    // after(() => logAccounts(accounts))

    describe('method', () => {
        describe('deposit', () => {
            it('emits DepositRequested', async () => {
                const states = await txEvents(send(gate, CUSTOMER, deposit, AMT))
                expect(states[0].NAME).eql('DepositRequested')
                expect(states[0].by).eql(CUSTOMER)
                expect(states[0].amount).eql(AMT.toString(10))
            })
        })

        describe('mintFor', () => {
            it('emits one Mint event and one Transfer event', async () => {
                const states = await txEvents(send(gate, OPERATOR, mint, CUSTOMER, AMT));
                // console.dir(states)
                expect(states[0].NAME).eql('Mint')
                expect(states[0].guy).eql(CUSTOMER)
                expect(states[0].wad).eql(AMT.toString(10))
                expect(states[1].NAME).eql('Transfer')
                expect(states[1].src).eql(ZERO_ADDR)
                expect(states[1].dst).eql(CUSTOMER)
                expect(states[1].wad).eql(AMT.toString(10))
            })
        })

        describe('withdraw', () => {
            it('emits WithdrawalRequested', async () => {
                const states = await txEvents(send(gate, CUSTOMER, withdraw, AMT));

                expect(states[0].NAME).eql('WithdrawalRequested')
                expect(states[0].from).eql(CUSTOMER)
                expect(states[0].amount).eql(AMT.toString(10))
            })
        })

        describe('transfer', () => {
            it('emits Transfer', async () => {
                const states = await txEvents(send(token, OPERATOR, transfer, CUSTOMER, 0));

                expect(states[0].NAME).eql('Transfer')
                expect(states[0].src).eql(OPERATOR)
                expect(states[0].dst).eql(CUSTOMER)
                expect(states[0].wad).eql((0).toString(10))
            })
        })

        describe('burn', () => {
            it('emits Burn and `Withdrawn`', async () => {
                const states = await txEvents(send(gate, OPERATOR, burnFrom, CUSTOMER, 0));
                expect(states[0].NAME).eql('Burn')
                expect(states[0].guy).eql(CUSTOMER)
                expect(states[0].wad).eql((0).toString(10))
                expect(states[1].NAME).eql('Withdrawn')
                expect(states[1].from).eql(CUSTOMER)
                expect(states[1].amount).eql((0).toString(10))
            })
        })
    })

    context("Operator", () => {
        it('can see pending deposits for one customer', async () => {
            await send(gate, CUSTOMER, deposit, AMT)

            const all = (await allEvents(gate)).concat(await allEvents(token))
            const states = await processState(web3, all, ASSET_GATEWAY)

            expect(states.length).equal(1)
            const firstState = makeState(CUSTOMER, AMT, 'DEPOSIT_REQUESTED');
            expect(states[0]).to.have.deep.property('ethereumAddress', firstState.ethereumAddress)
            expect(states[0]).to.have.deep.property('amount', firstState.amount)
            expect(states[0]).to.have.deep.property('status', firstState.status)
        })

        it('can see minted deposits for one customer', async () => {
            await send(gate, CUSTOMER, deposit, AMT)
            await send(gate, OPERATOR, mint, CUSTOMER, AMT)

            const states = await processState(web3, (await allEvents(gate)).concat(await allEvents(token)), ASSET_GATEWAY)

            expect(states.length).equal(1)

            const firstState = makeState(CUSTOMER, AMT, 'TOKEN_MINTED')
            expect(states[0]).to.have.deep.property('ethereumAddress', firstState.ethereumAddress)
            expect(states[0]).to.have.deep.property('amount', firstState.amount)
            expect(states[0]).to.have.deep.property('status', firstState.status)
        })

        it('can see both requested and minted deposits for one customer', async () => {
            await send(gate, CUSTOMER, deposit, AMT1)
            await send(gate, CUSTOMER, deposit, AMT2)
            await send(gate, CUSTOMER, deposit, AMT2)
            await send(gate, OPERATOR, mint, CUSTOMER, AMT2)

            const states = await processState(web3, (await allEvents(gate)).concat(await allEvents(token)), ASSET_GATEWAY)

            expect(states.length).equal(3)

            let nextState = makeState(CUSTOMER, AMT1, 'DEPOSIT_REQUESTED')
            expect(states[0]).to.have.deep.property('ethereumAddress', nextState.ethereumAddress)
            expect(states[0]).to.have.deep.property('amount', nextState.amount)
            expect(states[0]).to.have.deep.property('status', nextState.status)
            nextState = makeState(CUSTOMER, AMT2, 'DEPOSIT_REQUESTED')
            expect(states[1]).to.have.deep.property('ethereumAddress', nextState.ethereumAddress)
            expect(states[1]).to.have.deep.property('amount', nextState.amount)
            expect(states[1]).to.have.deep.property('status', nextState.status)
            nextState = makeState(CUSTOMER, AMT2, 'TOKEN_MINTED')
            expect(states[2]).to.have.deep.property('ethereumAddress', nextState.ethereumAddress)
            expect(states[2]).to.have.deep.property('amount', nextState.amount)
            expect(states[2]).to.have.deep.property('status', nextState.status)

        })

        it('can see pending deposits for multiple customers', async () => {
            await send(gate, CUSTOMER1, deposit, AMT1)
            await send(gate, CUSTOMER2, deposit, AMT2)

            const states = await processState(web3, (await allEvents(gate)).concat(await allEvents(token)), ASSET_GATEWAY)

            expect(states.length).equal(2)
            let nextState = makeState(CUSTOMER1, AMT1, 'DEPOSIT_REQUESTED')
            expect(states[0]).to.have.deep.property('ethereumAddress', nextState.ethereumAddress)
            expect(states[0]).to.have.deep.property('amount', nextState.amount)
            expect(states[0]).to.have.deep.property('status', nextState.status)
            nextState = makeState(CUSTOMER2, AMT2, 'DEPOSIT_REQUESTED')
            expect(states[1]).to.have.deep.property('ethereumAddress', nextState.ethereumAddress)
            expect(states[1]).to.have.deep.property('amount', nextState.amount)
            expect(states[1]).to.have.deep.property('status', nextState.status)

        })

        it('can see both pending and minted deposits for multiple customers', async () => {
            await send(gate, CUSTOMER1, deposit, AMT1)
            await send(gate, CUSTOMER2, deposit, AMT2)
            await send(gate, CUSTOMER2, deposit, AMT1)
            await send(gate, OPERATOR, mint, CUSTOMER2, AMT2)

            const states = await processState(web3, (await allEvents(gate)).concat(await allEvents(token)), ASSET_GATEWAY)

            expect(states.length).equal(3)

            let nextState = makeState(CUSTOMER1, AMT1, 'DEPOSIT_REQUESTED')
            expect(states[0]).to.have.deep.property('ethereumAddress', nextState.ethereumAddress)
            expect(states[0]).to.have.deep.property('amount', nextState.amount)
            expect(states[0]).to.have.deep.property('status', nextState.status)
            nextState = makeState(CUSTOMER2, AMT1, 'DEPOSIT_REQUESTED')
            expect(states[1]).to.have.deep.property('ethereumAddress', nextState.ethereumAddress)
            expect(states[1]).to.have.deep.property('amount', nextState.amount)
            expect(states[1]).to.have.deep.property('status', nextState.status)
            nextState = makeState(CUSTOMER2, AMT2, 'TOKEN_MINTED')
            expect(states[2]).to.have.deep.property('ethereumAddress', nextState.ethereumAddress)
            expect(states[2]).to.have.deep.property('amount', nextState.amount)
            expect(states[2]).to.have.deep.property('status', nextState.status)

        })

        it('can see withdrawal request', async () => {
            await send(gate, CUSTOMER, withdraw, AMT)

            const states = await processState(web3, (await allEvents(gate)).concat(await allEvents(token)), ASSET_GATEWAY)

            expect(states.length).equal(1)
            let nextState = makeState(CUSTOMER, AMT, 'WITHDRAWAL_REQUESTED')
            expect(states[0]).to.have.deep.property('ethereumAddress', nextState.ethereumAddress)
            expect(states[0]).to.have.deep.property('amount', nextState.amount)
            expect(states[0]).to.have.deep.property('status', nextState.status)

        })

        it('can see both deposits and requested withdrawals for one user', async () => {
            await send(gate, CUSTOMER1, deposit, AMT1)
            await send(gate, CUSTOMER1, withdraw, AMT1)
            await send(gate, CUSTOMER1, withdraw, AMT1)

            const states = await processState(web3, (await allEvents(gate)).concat(await allEvents(token)), ASSET_GATEWAY)

            expect(states.length).equal(3)


            let nextState = makeState(CUSTOMER1, AMT1, 'DEPOSIT_REQUESTED')
            expect(states[0]).to.have.deep.property('ethereumAddress', nextState.ethereumAddress)
            expect(states[0]).to.have.deep.property('amount', nextState.amount)
            expect(states[0]).to.have.deep.property('status', nextState.status)
            nextState = makeState(CUSTOMER1, AMT1, 'WITHDRAWAL_REQUESTED')
            expect(states[1]).to.have.deep.property('ethereumAddress', nextState.ethereumAddress)
            expect(states[1]).to.have.deep.property('amount', nextState.amount)
            expect(states[1]).to.have.deep.property('status', nextState.status)
            nextState = makeState(CUSTOMER1, AMT1, 'WITHDRAWAL_REQUESTED')
            expect(states[2]).to.have.deep.property('ethereumAddress', nextState.ethereumAddress)
            expect(states[2]).to.have.deep.property('amount', nextState.amount)
            expect(states[2]).to.have.deep.property('status', nextState.status)

        })

        it('can see both deposits and requested withdrawals for multiple user', async () => {
            await send(gate, CUSTOMER1, deposit, AMT1)
            await send(gate, CUSTOMER1, withdraw, AMT1)
            await send(gate, CUSTOMER2, deposit, AMT1)
            await send(gate, CUSTOMER2, deposit, AMT2)
            await send(gate, OPERATOR, mint, CUSTOMER2, AMT2)
            await send(gate, CUSTOMER2, deposit, AMT2)
            await send(gate, OPERATOR, mint, CUSTOMER2, AMT2)
            await send(gate, CUSTOMER2, withdraw, AMT2)
            await send(gate, CUSTOMER2, withdraw, AMT2)
            await send(token, CUSTOMER2, "approve", gate.options.address, AMT2)
            await send(gate, CUSTOMER2, withdraw, AMT2)
            await send(token, CUSTOMER2, "approve", gate.options.address, AMT2)
            await send(gate, OPERATOR, burnFrom, CUSTOMER2, AMT2)
            const all = (await allEvents(gate)).concat(await allEvents(token))
            const states = await processState(web3, all, ASSET_GATEWAY)

            // expect(states.length).equal(8)
            let nextState = makeState(CUSTOMER1, AMT1, 'DEPOSIT_REQUESTED')
            expect(states[0]).to.have.deep.property('ethereumAddress', nextState.ethereumAddress)
            expect(states[0]).to.have.deep.property('amount', nextState.amount)
            expect(states[0]).to.have.deep.property('status', nextState.status)

            nextState = makeState(CUSTOMER2, AMT1, 'DEPOSIT_REQUESTED')
            expect(states[1]).to.have.deep.property('ethereumAddress', nextState.ethereumAddress)
            expect(states[1]).to.have.deep.property('amount', nextState.amount)
            expect(states[1]).to.have.deep.property('status', nextState.status)

            nextState = makeState(CUSTOMER2, AMT2, 'TOKEN_MINTED')
            expect(states[2]).to.have.deep.property('ethereumAddress', nextState.ethereumAddress)
            expect(states[2]).to.have.deep.property('amount', nextState.amount)
            expect(states[2]).to.have.deep.property('status', nextState.status)


            nextState = makeState(CUSTOMER2, AMT2, 'TOKEN_MINTED')
            expect(states[3]).to.have.deep.property('ethereumAddress', nextState.ethereumAddress)
            expect(states[3]).to.have.deep.property('amount', nextState.amount)
            expect(states[3]).to.have.deep.property('status', nextState.status)

            nextState = makeState(CUSTOMER1, AMT1, 'WITHDRAWAL_REQUESTED')
            expect(states[4]).to.have.deep.property('ethereumAddress', nextState.ethereumAddress)
            expect(states[4]).to.have.deep.property('amount', nextState.amount)
            expect(states[4]).to.have.deep.property('status', nextState.status)

            nextState = makeState(CUSTOMER2, AMT2, 'WITHDRAWAL_REQUESTED')
            expect(states[5]).to.have.deep.property('ethereumAddress', nextState.ethereumAddress)
            expect(states[5]).to.have.deep.property('amount', nextState.amount)
            expect(states[5]).to.have.deep.property('status', nextState.status)

            nextState = makeState(CUSTOMER2, AMT2, 'TOKEN_TRANSFERRED')
            expect(states[6]).to.have.deep.property('ethereumAddress', nextState.ethereumAddress)
            expect(states[6]).to.have.deep.property('amount', nextState.amount)
            expect(states[6]).to.have.deep.property('status', nextState.status)

            nextState = makeState(CUSTOMER2, AMT2, 'TOKEN_WITHDRAWN')
            expect(states[7]).to.have.deep.property('ethereumAddress', nextState.ethereumAddress)
            expect(states[7]).to.have.deep.property('amount', nextState.amount)
            expect(states[7]).to.have.deep.property('status', nextState.status)

        })
    })
})
