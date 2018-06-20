const fs = require('fs')
const {Ganache, solc} = require('chain-dsl/test/helpers')
const {Web3} = require('chain-dsl')
const deployer = require('./lib/deployer')
const args = process.argv.slice(2)
const port = 3000
const hostname = 'localhost'
const chainDataDir = './data'
const outDir = './out'
const truffleMnemonic = 'castle float example cancel hurt victory intact illegal matter asthma assist undo only lock high'

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

        const HDWalletProvider = require("truffle-hdwallet-provider")
        const web3 = new Web3(new HDWalletProvider(truffleMnemonic, "https://api.myetherapi.com/rop", 0)) //options: https://api.myetherapi.com/rop

        const accounts = state.accounts
        const addresses = Object.keys(accounts)
        const [
            DEPLOYER,
            SYSTEM_ADMIN, KYC_OPERATOR, MONEY_OPERATOR,
            MINT_FEE_COLLECTOR, 
            BURN_FEE_COLLECTOR, 
            TRANSFER_FEE_COLLECTOR, 
            NEGATIVE_INTEREST_RATE_COLLECTOR
        ] = addresses

        const block = await web3.eth.getBlockNumber()
        log(`Block Number: ${block}`)
        const balance = await web3.eth.getBalance(DEPLOYER)
        log(`Balance: ${balance}`)

        try {

            const {
                token
            } = await deployer.base(web3, solc(__dirname, './solc-input.json'), DEPLOYER, SYSTEM_ADMIN, KYC_OPERATOR, MONEY_OPERATOR,)
             const {
                gateWithFee
            } = await deployer.deployGateWithFee(web3, solc(__dirname, './solc-input.json'), DEPLOYER, SYSTEM_ADMIN, KYC_OPERATOR, MONEY_OPERATOR, MINT_FEE_COLLECTOR, BURN_FEE_COLLECTOR, TRANSFER_FEE_COLLECTOR, NEGATIVE_INTEREST_RATE_COLLECTOR)

        } catch(e){
            log(e);
        }

        saveContractInterface(token)
        saveContractInterface(gateWithFee)
    }

    log(`\nListening on http://${hostname}:${port}`)
})

const getContractInstances = async () => {

    const {
        KycAmlStatus, NoKycAmlRule, BoundaryKycAmlRule, FullKycAmlRule, MockMembershipAuthority, 
        MembershipRule, GateRoles, DSGuard, FiatToken, TransferFeeController, AddressControlStatus, 
        LimitController, LimitSetting
    } = solc(__dirname, './solc-input.json')

    const kycAmlStatus = new web3.eth.Contract(KycAmlStatus.abi, "")
    const addressControlStatus = new web3.eth.Contract(AddressControlStatus.abi, "")
    const noKycAmlRule = new web3.eth.Contract(NoKycAmlRule.abi, "")
    const boundaryKycAmlRule = new web3.eth.Contract(BoundaryKycAmlRule.abi, "")
    const fullKycAmlRule = new web3.eth.Contract(FullKycAmlRule.abi, "")
    const mockMembershipAuthority = new web3.eth.Contract(MockMembershipAuthority.abi, "")
    const membershipRule = new web3.eth.Contract(MembershipRule.abi, "")
    const fiatTokenGuard = new web3.eth.Contract(DSGuard.abi, "")
    const gateRoles = new web3.eth.Contract(GateRoles.abi, "")
    const token = new web3.eth.Contract(FiatToken.abi, "")
    const transferFeeController = new web3.eth.Contract(TransferFeeController.abi, "")
    const limitController = new web3.eth.Contract(LimitController.abi, "")
    const limitSetting = new web3.eth.Contract(LimitSetting.abi, "")

    return {
        KycAmlStatus, NoKycAmlRule, BoundaryKycAmlRule, FullKycAmlRule, MockMembershipAuthority, 
        MembershipRule, GateRoles, DSGuard, FiatToken, TransferFeeController, AddressControlStatus, 
        LimitController, LimitSetting
    }
}

