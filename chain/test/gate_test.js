const {
    expect,
    expectThrow,
    expectNoAsyncThrow,
    toBN,
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
const push = 'push(address,uint256)'
const pull = 'pull(address,uint256)'

describe('Gate', function () {
    this.timeout(100000)

    let gate, token

    before('deployment', async () => {
        ;({gate, token} = await deploy.base(web3, contractRegistry, DEPLOYER, SYSTEM_ADMIN, KYC_OPERATOR, MONEY_OPERATOR))
    })

    context('DEPLOYER', () => {
        it('cannot mint for customer', async () => {
            await expect(send(gate, DEPLOYER, mint, CUSTOMER, 123))
                .to.be.rejected
        })
    })

    context('CUSTOMER', () => {
        async function pendingDeposits(customer) {
            const pastEvents = await gate.getPastEvents('DepositRequested',
                {fromBlock: 0, filter: {by: customer}})
            return pastEvents.map(distillEvent)
        }

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

        it('cannot mint for an MoneyOperator', async () => {
            await expectThrow(async () =>
                send(gate, CUSTOMER, mint, MONEY_OPERATOR, 123))
            await expectThrow(async () =>
                send(token, CUSTOMER, mint, MONEY_OPERATOR, 123))
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
            await send(gate, MONEY_OPERATOR, mintForSelf, 10)
            await send(gate, MONEY_OPERATOR, approve, CUSTOMER, 3)
            await send(token, CUSTOMER, pull, address(gate), 1)
            await send(token, CUSTOMER, pull, address(gate), 2)

            expect(await balance(token, CUSTOMER)).eq(3)
            expect(await balance(token, address(gate))).eq(7)
        })

        it("can not claim control of deposit without approval", async () => {
            await send(gate, MONEY_OPERATOR, mintForSelf, 10)

            await expectThrow(async () =>
                await send(gate, CUSTOMER, pull, address(gate), 1))
        })
    })

    context('MONEY_OPERATOR', () => {
        async function pendingDeposits(customer) {
            let pastEvents = await gate.getPastEvents('DepositRequested',
                {fromBlock: 0})
            return pastEvents.map(distillEvent)
        }

        async function pendingWithdrawals() {
            const withdrawalAndMintTransfers =
                (await token.getPastEvents('Transfer',
                    {fromBlock: 0, filter: {dst: address(gate)}}))
                .map(distillEvent)

            const isTransferByMint = (ev) => ev.src !== ZERO_ADDR
            const withdrawalTransfers = withdrawalAndMintTransfers
                .filter(isTransferByMint)

            const burns =
                (await token.getPastEvents('Burn', {fromBlock: 0}))
                .map(distillEvent)

            const withdrawals =
                (await gate.getPastEvents('Withdrawn', {fromBlock: 0}))
                .map(distillEvent)

            return withdrawalTransfers.concat(burns).concat(withdrawals)
        }

        it('can mint', async () => {
            await send(gate, MONEY_OPERATOR, mint, CUSTOMER, 123)
            expect(await call(token, "balanceOf", CUSTOMER)).eq(123)
        })

        it('can not mint by using token contract', async () => {
            await expectThrow(async () =>
                send(token, MONEY_OPERATOR, mint, CUSTOMER, 123))
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

        it("can mint tokens when received fiat (Note that this process is controlled off chain because receival of fiat is checked off chain.)", async () => {
            const AMT = toBN(10)
            await send(gate, CUSTOMER1, deposit, AMT)

            const events = await txEvents(send(gate, MONEY_OPERATOR, mint, CUSTOMER, AMT))

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

            await send(gate, MONEY_OPERATOR, mint, CUSTOMER1, AMT1)
            await send(gate, MONEY_OPERATOR, mint, CUSTOMER2, AMT2)

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
            await send(gate, MONEY_OPERATOR, mint, CUSTOMER, AMT)
            await send(token, CUSTOMER, approve, address(gate), AMT)
            await send(gate, MONEY_OPERATOR, burn, CUSTOMER, AMT)

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
            await expectThrow(async () => {
                await send(gate, SYSTEM_ADMIN, "stopToken")
            })
            await expectThrow(async () => {
                await send(gate, SYSTEM_ADMIN, "startToken")
            })
            await expectThrow(async () => {
                await send(gate, DEPLOYER, "stopToken")
            })
            await expectThrow(async () => {
                await send(gate, DEPLOYER, "startToken")
            })
        })

        it("SystemAdmin can stop and start token via gate.", async () => {

            await send(gate, MONEY_OPERATOR, mintForSelf, 10)
            await send(gate, MONEY_OPERATOR, approve, CUSTOMER, 3)

            await send(gate, MONEY_OPERATOR, "stopToken")
            await expectThrow(async () => {
                await send(token, CUSTOMER, pull, address(gate), 2)
            })
            await expectThrow(async () => {
                await send(gate, MONEY_OPERATOR, mintForSelf, 10)
            })
            await expectThrow(async () => {
                await send(gate, MONEY_OPERATOR, approve, CUSTOMER, 3)
            })

            await send(gate, MONEY_OPERATOR, "startToken")
            await expectNoAsyncThrow(async () => {
                await send(token, CUSTOMER, pull, address(gate), 2)
            })
        })
    })
})
