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

describe('Chain', function () {
    this.slow(500)
    this.timeout(15000);

    let web3, accounts, snaps, gate, token,
        DEPLOYER,
        OPERATOR,
        CUSTOMER,
        ASSET_GATEWAY

    before('deployment', async () => {
        snaps = []
        web3 = ganacheWeb3()
        ;[
            DEPLOYER,
            OPERATOR,
            CUSTOMER
        ] = accounts = await web3.eth.getAccounts()

        ;({gate, token} = await deployer.base(web3, solc(__dirname, '../../chain/solc-input.json'), DEPLOYER, OPERATOR))

        ASSET_GATEWAY = gate.options.address

    })

    beforeEach(async () => {
        snaps.push(await web3.evm.snapshot())
    })

    afterEach(async () => {
        await web3.evm.revert(snaps.pop())
    })

    it('is integrated', async () => {
        await gate.methods
            ['mint(address,uint256)'](CUSTOMER, toBN(10))
            .send({from: OPERATOR})

        await token.methods
            ['approve(address,uint256)'](ASSET_GATEWAY, toBN(5))
            .send({from: CUSTOMER})

        await gate.methods
            ['burn(address,uint256)'](CUSTOMER, toBN(3))
            .send({from: OPERATOR})

        expect((await gate.getPastEvents('allEvents', {fromBlock: 0}))
            .concat(await token.getPastEvents('allEvents', {fromBlock: 0}))
            .map(({event, returnValues}) => {
                return {event, returnValues}
            }))
            .containSubset([{event: 'Burn'}])
    })
})
