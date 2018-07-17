const {expect, ZERO_ADDR} = require('chain-dsl/test/helpers')
const {address, bytes32, send, call, create, sig} = require('chain-dsl')
const set = 'set(address,bool)'
const status = 'status(address)'

describe('AddressStatus', function () {
    this.timeout(8000)

    let DEPLOYER, AUTHORIZED, SOMEONE,
        deploy, AddressStatus, authority, addressStatus

    before('deployment', async () => {
        ;[DEPLOYER, AUTHORIZED, SOMEONE] = accounts
        deploy = (...args) => create(web3, DEPLOYER, ...args)

        ;({DSGuard, AddressStatus} = contractRegistry)

        authority = await deploy(DSGuard)
        addressStatus = await deploy(AddressStatus, address(authority))
        await send(authority, DEPLOYER,
            'permit',
            bytes32(AUTHORIZED),
            bytes32(address(addressStatus)),
            sig(set))
    })

    describe('new', function () {
        it('requires an authority', async () => {
            await expect(deploy(AddressStatus, ZERO_ADDR)).to.be.rejected
        })
    })

    describe('#set', function () {
        it('to true', async () => {
            await expect(call(addressStatus, status, SOMEONE))
                .to.eventually.equal(false)

            await send(addressStatus, AUTHORIZED, set, SOMEONE, true)

            await expect(call(addressStatus, status, SOMEONE))
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
