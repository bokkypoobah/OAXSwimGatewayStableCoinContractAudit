const {
    expect,
    toBN,
    fromWei,
    toWei,
    solc,
    ganacheWeb3,
    expectThrow,
    expectNoAsyncThrow,
} = require('chain-dsl/test/helpers')

const {
    address,
    send,
    call,
    balance,
    bytes32,
    sig,
} = require('chain-dsl')

const deploy = require('../lib/deployer')

describe('Deployment', function () {
    this.timeout(10000)

    let web3, snaps, accounts, DEPLOYER, OPERATOR, CUSTOMER, token, fiatTokenGuard

    before('deployment', async () => {
        snaps = []
        web3 = ganacheWeb3()
        ;[
            DEPLOYER,
            OPERATOR,
            CUSTOMER
        ] = accounts = await web3.eth.getAccounts()

        ;({token, fiatTokenGuard} = await deploy.base(web3, solc(__dirname, '../solc-input.json'), DEPLOYER, OPERATOR))
    })

    beforeEach(async () => snaps.push(await web3.evm.snapshot()))
    afterEach(async () => web3.evm.revert(snaps.pop()))

    it('Gate is deployed', async () => {
        const symbol = web3.utils.hexToUtf8((await token.methods.symbol().call()))
        expect(symbol).equal('TOKUSD')
    })

    const MAX_COST = 500 /* USD */;
    it(`does NOT cost more than ${MAX_COST} USD for the deployer`, async () => {
        // Source: https://coinmarketcap.com/currencies/ethereum/
        const USD_PER_ETH = toBN(1378) //use All Time High price to gauge
        const initial = toWei(toBN(100 /* ether */))
        const current = await balance(web3, DEPLOYER)
        const spent = initial.sub(toBN(current))
        const deploymentCost = (fromWei(spent)) * USD_PER_ETH
        console.log(`        (deployment cost: ${deploymentCost} USD)`)
        expect(deploymentCost).to.be.below(MAX_COST)
    })

    it("Only deployer can control DSGuard.", async () => {
        await expectThrow(async () =>
            send(fiatTokenGuard, CUSTOMER, "permit",
                bytes32((CUSTOMER)), bytes32(address(token)), sig("mint")))
        await expectNoAsyncThrow(async () =>
            send(fiatTokenGuard, DEPLOYER, "permit",
                bytes32((CUSTOMER)), bytes32(address(token)), sig("mint")))
    })
})
