const {
    expect,
    expectThrow,
    expectNoAsyncThrow,
    toBN,
    solc,
    ganacheWeb3,
    ZERO_ADDR,
} = require('chain-dsl/test/helpers')

const {
    address,
    distillEvent,
    txEvents,
    send,
    call,
    balance,
} = require('chain-dsl')

const deploy = require('../lib/deployer')

const mint = 'mint(address,uint256)'
const mintForSelf = 'mint(uint256)'
const burn = 'burn(address,uint256)'
const deposit = 'deposit'
const approve = 'approve'
const transfer = 'transfer'
const transferFrom = 'transferFrom'
const push = 'push(address,uint256)'
const pull = 'pull(address,uint256)'

describe('Gate', () => {
    let web3, snaps, accounts, gate, token,
        DEPLOYER,
        OPERATOR,
        CUSTOMER,
        CUSTOMER1,
        CUSTOMER2

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

        ;({gate, token} = await deploy.base(web3, solc(__dirname, '../solc-input.json'), DEPLOYER, OPERATOR))
    })

    beforeEach(async () => snaps.push(await web3.evm.snapshot()))
    afterEach(async () => web3.evm.revert(snaps.pop()))

    context('DEPLOYER', () => {
        it('cannot mint for customer', async () => {
            await expectThrow(async () =>
                send(gate, DEPLOYER, mint, CUSTOMER, 123))
        })
    })

    context('CUSTOMER', () => {
        const pendingDeposits = async (customer) =>
            gate.getPastEvents('DepositRequested',
                {fromBlock: 0, filter: {by: customer}})
                .map(distillEvent)

        it('cannot mint for themselves', async () => {
            await expectThrow(async () =>
                send(gate, CUSTOMER, mint, CUSTOMER, 123))
            await expectThrow(async () =>
                send(token, CUSTOMER, mint, CUSTOMER, 123))
            await expectThrow(async () =>
                send(token, CUSTOMER, "mint", 123))
        })

        it('cannot mint for others', async () => {
            await expectThrow(async () =>
                send(gate, CUSTOMER1, mint, CUSTOMER2, 123))
            await expectThrow(async () =>
                send(token, CUSTOMER1, mint, CUSTOMER2, 123))
        })

        it('cannot mint for an operator', async () => {
            await expectThrow(async () =>
                send(gate, CUSTOMER, mint, OPERATOR, 123))
            await expectThrow(async () =>
                send(token, CUSTOMER, mint, OPERATOR, 123))
        })

        it('cannot burn for themselves', async () => {
            await expectThrow(async () =>
                send(gate, CUSTOMER, burn, CUSTOMER, 123))
            await expectThrow(async () =>
                send(token, CUSTOMER, burn, CUSTOMER, 123))
        })

        it("can request a deposit on chain i.e. indicate intention of minting on chain", async () => {
            const AMT = toBN(10)

            const events = await txEvents(send(gate, CUSTOMER, deposit, AMT))

            expect(events).containSubset([{
                NAME: 'DepositRequested',
                by: CUSTOMER,
                amount: AMT.toString(10)
            }])
        })

        it("can list her deposits, but not others'", async () => {
            // FIXME On the chain anyone can see deposits
            const AMT_C1_1 = toBN(10)
            const AMT_C1_2 = toBN(20)
            const AMT_C2_1 = toBN(30)
            await send(gate, CUSTOMER1, deposit, AMT_C1_1)
            await send(gate, CUSTOMER1, deposit, AMT_C1_2)
            await send(gate, CUSTOMER2, deposit, AMT_C2_1)

            const deposits = await pendingDeposits(CUSTOMER1)

            expect(deposits).containSubset([{
                NAME: 'DepositRequested',
                by: CUSTOMER1,
                amount: AMT_C1_1.toString(10)
            }, {
                NAME: 'DepositRequested',
                by: CUSTOMER1,
                amount: AMT_C1_2.toString(10)
            }])

            expect(deposits).not.containSubset([{
                NAME: 'DepositRequested',
                by: CUSTOMER2,
                amount: AMT_C2_1.toString(10)
            }])
        })

        it("can claim control of deposit if approved", async () => {
            await send(gate, OPERATOR, mintForSelf, 10)
            await send(gate, OPERATOR, approve, CUSTOMER, 3)
            await send(token, CUSTOMER, pull, address(gate), 1)
            await send(token, CUSTOMER, pull, address(gate), 2)

            expect(await balance(token, CUSTOMER)).eq(3)
            expect(await balance(token, address(gate))).eq(7)
        })

        it("can not claim control of deposit without approval", async () => {
            await send(gate, OPERATOR, mintForSelf, 10)

            await expectThrow(async () =>
                await send(gate, CUSTOMER, pull, address(gate), 1))
        })
    })

    context('OPERATOR', () => {
        const pendingDeposits = async (customer) =>
            gate.getPastEvents('DepositRequested', {fromBlock: 0})
                .map(distillEvent)

        const pendingWithdrawals = async () => {
            const withdrawalAndMintTransfers =
                await token.getPastEvents('Transfer',
                    {
                        fromBlock: 0,
                        filter: {dst: address(gate)}
                    })
                    .map(distillEvent)
            const isTransferByMint = (ev) => ev.src !== ZERO_ADDR
            const withdrawalTransfers = withdrawalAndMintTransfers.filter(isTransferByMint)

            const burns =
                await token.getPastEvents('Burn', {fromBlock: 0})
                    .map(distillEvent)

            const withdrawals =
                await gate.getPastEvents('Withdrawn', {fromBlock: 0})
                    .map(distillEvent)

            return withdrawalTransfers.concat(burns).concat(withdrawals)
        }

        it('can mint', async () => {
            await send(gate, OPERATOR, mint, CUSTOMER, 123)
            expect(await call(token, "balanceOf", CUSTOMER)).eq(123)
        })

        it('is the only actor who can mint', async () => {
            await expectThrow(async () =>
                send(gate, CUSTOMER, mint, CUSTOMER, 123))
        })

        it("can list pending deposits", async () => {
            const AMT1 = toBN(10)
            const AMT2 = toBN(20)

            await send(gate, CUSTOMER1, deposit, AMT1)
            await send(gate, CUSTOMER2, deposit, AMT2)

            const deposits = await pendingDeposits()

            expect(deposits).containSubset([
                {NAME: 'DepositRequested', by: CUSTOMER1, amount: AMT1.toString(10)},
                {NAME: 'DepositRequested', by: CUSTOMER2, amount: AMT2.toString(10)}
            ])
        })

        it("can mint tokens when received fiat", async () => {
            const AMT = toBN(10)
            await send(gate, CUSTOMER1, deposit, AMT)

            const events = await txEvents(send(gate, OPERATOR, mint, CUSTOMER, AMT))

            expect(events).containSubset([
                {NAME: 'Mint', guy: CUSTOMER, wad: AMT.toString(10)},
                {NAME: 'Transfer', src: ZERO_ADDR, dst: CUSTOMER, wad: AMT.toString(10)}
            ])
        })

        it("can list pending withdrawals", async () => {
            const AMT1 = toBN(10)
            const AMT2 = toBN(20)

            await send(gate, CUSTOMER1, deposit, AMT1)
            await send(gate, CUSTOMER2, deposit, AMT2)

            await send(gate, OPERATOR, mint, CUSTOMER1, AMT1)
            await send(gate, OPERATOR, mint, CUSTOMER2, AMT2)

            await send(token, CUSTOMER1, push, address(gate), AMT1)
            await send(token, CUSTOMER2, push, address(gate), AMT2)

            const withdrawals = await pendingWithdrawals()

            expect(withdrawals).containSubset([
                {NAME: 'Transfer', src: CUSTOMER1, dst: address(gate), wad: AMT1.toString(10)},
                {NAME: 'Transfer', src: CUSTOMER2, dst: address(gate), wad: AMT2.toString(10)}
            ])
        })

        it("can burn tokens", async () => {
            const AMT = toBN(10)
            await send(gate, CUSTOMER, deposit, AMT)
            await send(gate, OPERATOR, mint, CUSTOMER, AMT)
            await send(token, CUSTOMER, approve, address(gate), AMT)
            await send(gate, OPERATOR, burn, CUSTOMER, AMT)

            const withdrawals = await pendingWithdrawals()

            expect(withdrawals).containSubset([
                {NAME: 'Burn', guy: CUSTOMER, wad: AMT.toString(10)},
                {NAME: 'Withdrawn', from: CUSTOMER, amount: AMT.toString(10)}
            ])
        })
    })

    context("Controls", () => {
        it("Normal customer can't stop nor start token via gate.", async () => {
            await expectThrow(async () => {
                await send(gate, CUSTOMER1, "stopToken")
            })
            await expectThrow(async () => {
                await send(gate, CUSTOMER1, "startToken")
            })
        })

        it("Operator can stop and start token via gate.", async () => {

            await send(gate, OPERATOR, mintForSelf, 10)
            await send(gate, OPERATOR, approve, CUSTOMER, 3)

            await send(gate, OPERATOR, "stopToken")
            await expectThrow(async () => {
                await send(token, CUSTOMER, pull, address(gate), 2)
            })
            await expectThrow(async () => {
                await send(gate, OPERATOR, mintForSelf, 10)
            })
            await expectThrow(async () => {
                await send(gate, OPERATOR, approve, CUSTOMER, 3)
            })

            await send(gate, OPERATOR, "startToken")
            await expectNoAsyncThrow(async () => {
                await send(token, CUSTOMER, pull, address(gate), 2)
            })
        })
    })
})
