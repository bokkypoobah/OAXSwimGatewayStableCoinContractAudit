const {solc, ganacheWeb3} = require('chain-dsl/test/helpers')

// Silence console debug
console.debug = x => undefined

global.snaps = []
global.web3 = ganacheWeb3()
global.contractRegistry = solc(__dirname, '../solc-input.json')
global.accounts = []

before('deployment', async () => {
    global.accounts = await web3.eth.getAccounts()

    const accountNames = [
        'DEPLOYER',
        'SYSTEM_ADMIN',
        'KYC_OPERATOR',
        'MONEY_OPERATOR',
        'CUSTOMER',
        'CUSTOMER1',
        'CUSTOMER2',
        'SOMEONE',
        'SOMEONE_ELSE',
    ]
    accountNames.forEach((accountName, i) => {
        global[accountName] = global.accounts[i]
    })
})

beforeEach(async () => snaps.push(await web3.evm.snapshot()))
afterEach(async () => web3.evm.revert(snaps.pop()))
