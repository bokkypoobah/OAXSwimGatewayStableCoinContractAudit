const HDWalletProvider = require("truffle-hdwallet-provider")
const config = require('config')
const {solc} = require('chain-dsl/test/helpers')
const {Web3, wad} = require('chain-dsl')
const deployer = require('./lib/deployerProd')
const args = process.argv.slice(2)

const truffleMnemonic = config.get('mnemonic')

const log = console.log.bind(console)

const logAccounts = (addresses) => {
    log('\nAvailable Account addresses')
    log('===========================')

    addresses.forEach((address, index) => {
        let line = "(" + index + ") " + address
        log(line)
    })
}

const logMnemonic = (hdWalletProvider) => {
    log('\nHD Wallet')
    log('==================')
    log(`Mnemonic:      ${hdWalletProvider.mnemonic}`)
    log(`Base HD Path:  ${hdWalletProvider.wallet_hdpath}{account_index}`)
}

async function main() {
    const nodeUrl = config.get('remoteNode')
    const provider = new HDWalletProvider(truffleMnemonic, nodeUrl)
    logAccounts(provider.addresses)
    logMnemonic(provider)
    const web3 = new Web3(provider)

    const [
        DEPLOYER,
    ] = provider.addresses

    const general = config.get('general')
    const role = config.get('role')
    const collector = config.get('collector')
    const limit = config.get('limit')

    const block = await web3.eth.getBlockNumber()
    log(`Block Number:  ${block}`)
    const balance = await web3.eth.getBalance(DEPLOYER)
    log(`Balance:       ${web3.utils.fromWei(balance,'ether')}`)
    log()

    function compiledContracts() {
        return solc(__dirname, './solc-input.json')
    }

    switch(args[0]) {
        case '--init-contract':
            /**
             * 1) Deploy Initial Contract
             */
            const {
                token
            } = await deployer.initContract(compiledContracts(),
                DEPLOYER, role.SYSTEM_ADMIN,
                general.TOKEN_SYMBOL,
                general.TOKEN_NAME,
                collector.TRANSFER_FEE_COLLECTOR,
                wad(limit.MINT_LIMIT),
                wad(limit.BURN_LIMIT),
                limit.DEFAULT_LIMIT_COUNTER_RESET_TIME_OFFSET,
                limit.DEFAULT_SETTING_DELAY_SECOND
            )

            break;
        case '--init-setting':
            /**
             * 2) Deploy Settings for Initial Contract
             */
            await deployer.initSettings(DEPLOYER, role.SYSTEM_ADMIN, role.KYC_OPERATOR, role.MONEY_OPERATOR)
            break;
        case '--gatewithfee-contract':
            /**
             * 3) Deploy GateWithFee Contract
             */
            const {
                gateWithFee
            } = await deployer.gateWithFeeContract(compiledContracts(),
                DEPLOYER, 
                collector.MINT_FEE_COLLECTOR, 
                collector.BURN_FEE_COLLECTOR, 
            )
            break;
        case '--gatewithfee-setting':
            /**
             * 4) Deploy Settings for GateWithFee Contract
             */
            await deployer.gateWithFeeSetting(
                DEPLOYER, 
                role.SYSTEM_ADMIN
                )
            break;
        case '--transferOwnership':
            /**
             * 5) Transfer the ownership from deployer to super admin 
             */
            await deployer.transferOwnership(
                DEPLOYER,
                role.SYSTEM_ADMIN
                )
            break;
        case '--calldata':
            const contractName = args[1]
            const methodName = args[2]
            log('Call Data')
            log('==================')
            log(await deployer.toCallData(contractName, methodName, ...process.argv.slice(5)))
            break;
        case '--sig':
            const method = args[1]
            log(await web3.eth.abi.encodeFunctionSignature(method))
            break;
        case '--no-deploy':
        default:
            log('\nContracts are not deployed again...')
    }
    return ''
}

main().then(result => {
    log(result)
    process.exit(0)
}).catch(err => {
    console.error(err)
    process.exit(1)
})
