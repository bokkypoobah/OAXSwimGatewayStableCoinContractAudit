const {
    expect,
    solc,
    ganacheWeb3,
} = require('chain-dsl/test/helpers')

const {
    address,
    txEvents,
    send,
    call
} = require('chain-dsl')

const deployer = require('../lib/deployer')

describe.skip('Explorations', () => {
    let web3, accounts, snaps, gate, token,
        DEPLOYER,
        OPERATOR,
        CUSTOMER

    before('deployment', async () => {
        snaps = []
        web3 = ganacheWeb3()
        ;[
            DEPLOYER,
            OPERATOR,
            CUSTOMER
        ] = accounts = await web3.eth.getAccounts()

        ;({gate, token} = await deployer.base(web3, solc(__dirname, '../solc-input.json'), DEPLOYER, OPERATOR))
    })

    beforeEach(async () => snaps.push(await web3.evm.snapshot()))
    afterEach(async () => web3.evm.revert(snaps.pop()))

    it('works', async () => {
        expect(address(gate)).to.exist
        expect(address(token)).to.exist
    })
})
