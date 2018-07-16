const {
    expect,
    solc,
    ganacheWeb3,
    ZERO_ADDR
} = require('chain-dsl/test/helpers')

const {
    address,
    bytes32,
    send,
    call,
    create,
    sig
} = require('chain-dsl')

const set = 'set(address,bool)'

describe('AddressStatus', function () {
    this.timeout(8000)

    let web3, snaps, DEPLOYER, AUTHORIZED, SOMEONE,
        deploy, AddressStatus, authority, addressStatus

    before('deployment', async () => {
        snaps = []
        web3 = ganacheWeb3()
        ;[DEPLOYER, AUTHORIZED, SOMEONE] = await web3.eth.getAccounts()
        deploy = (...args) => create(web3, DEPLOYER, ...args)

        ;({DSGuard, AddressStatus} = solc(__dirname, '../solc-input.json'))

        authority = await deploy(DSGuard)
        addressStatus = await deploy(AddressStatus, address(authority))
        await send(authority, DEPLOYER,
            'permit',
            bytes32(AUTHORIZED),
            bytes32(address(addressStatus)),
            sig(set))
    })

    beforeEach(async () => snaps.push(await web3.evm.snapshot()))
    afterEach(async () => web3.evm.revert(snaps.pop()))

    describe('new', function () {
        it('requires an authority', async () => {
            await expect(deploy(AddressStatus, ZERO_ADDR)).to.be.rejected
        })
    })

    describe('#set', function () {
        it('to true', async () => {
            await expect(call(addressStatus, 'status', SOMEONE))
                .to.eventually.equal(false)

            await send(addressStatus, AUTHORIZED, set, SOMEONE, true)

            await expect(call(addressStatus, 'status', SOMEONE))
                .to.eventually.equal(true)
        })

        it('is unauthorized for DEPLOYER', async () => {
            await expect(send(addressStatus, DEPLOYER, set, SOMEONE, true))
                .to.be.rejected
        })

        it('fails for unauthorized caller', async () => {
            await expect(send(addressStatus, SOMEONE, set, SOMEONE, true))
                .to.be.rejected
        })
    })
})
