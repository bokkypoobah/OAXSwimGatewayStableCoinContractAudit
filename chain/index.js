const fs = require('fs')
const {Ganache, solc} = require('chain-dsl/test/helpers')
const {Web3} = require('chain-dsl')
const deployer = require('./lib/deployer')

const args = process.argv.slice(2)
const port = 8545
const hostname = 'localhost'
const chainDataDir = './data'
const outDir = './out'
const truffleMnemonic = 'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat'

const log = console.log
const mkdir = (dir) => fs.existsSync(dir) || fs.mkdirSync(dir)

// Transplanted from
//   https://github.com/trufflesuite/ganache-cli/blob/0203931ccbf3ae53f654c6ebde314112eb6b5117/cli.js#L155-L172
const logAccounts = (state) => {
    log('\nAvailable Accounts')
    log('==================')

    const accounts = state.accounts
    const addresses = Object.keys(accounts)

    addresses.forEach((address, index) => {
        let line = "(" + index + ") " + address
        if (state.isUnlocked(address) === false) line += " 🔒"
        log(line)
    })
}

const logMnemonic = (state) => {
    log('\nHD Wallet')
    log('==================')
    log(`Mnemonic:      ${state.mnemonic}`)
    log(`Base HD Path:  ${state.wallet_hdpath}{account_index}`)
}

const saveContractInterface = ({options}) => {
    const {name, address} = options
    fs.writeFileSync(`${outDir}/${name}.json`, JSON.stringify(options, null, 4), 'utf-8')
    log(address, `— ${name} address`)
}

process.on('uncaughtException', (err) => {
    log(err.stack)
    process.exit(1)
})

process.on("SIGINT", () => {
    server.close((err) => {
        if (err) log(err.stack || err)
        process.exit()
    })
})

mkdir(chainDataDir)
mkdir(outDir)

const server = Ganache.server({
    mnemonic: truffleMnemonic,
    db_path: chainDataDir
})

server.listen(port, hostname, async (err, result) => {
    if (err) return log(err)
    const state = result ? result : server.provider.manager.state
    logAccounts(state)
    logMnemonic(state)

    if (args[0] === '--no-deploy') {
        log('\nContracts are not deployed again...')
    } else {
        log('\nCompiling and deploying contracts...')

        const web3 = new Web3(server.provider)

        const [
            DEPLOYER,
            OPERATOR
        ] = await web3.eth.getAccounts()

        const {
            gate,
            token,
            accessControl
        } = await deployer.base(web3, solc(__dirname, './solc-input.json'), DEPLOYER, OPERATOR)

        saveContractInterface(gate)
        saveContractInterface(token)
        saveContractInterface(accessControl)
    }

    log(`\nListening on http://${hostname}:${port}`)
})
