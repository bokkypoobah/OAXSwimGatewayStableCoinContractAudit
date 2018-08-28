const {
    bytes32,
    address,
    wad,
    sig,
    send,
    call,
    create,
    Web3,
    db
} = require('chain-dsl')

const {
    solc,
} = require('chain-dsl/test/helpers')

const {
    AddressStatus, BaseRule, MockOAXMembership, BoundaryKycRule, FullKycRule,
    GateRoles, DSGuard, FiatToken, TransferFeeController,
    LimitController, LimitSetting, GateWithFee
} = solc(__dirname, '../solc-input.json')

const HDWalletProvider = require("truffle-hdwallet-provider")
const config = require('config')
const web3 = new Web3(new HDWalletProvider(config.get('mnemonic'), config.get('remoteNode'), 0, 5)) //options: https://api.myetherapi.com/rop

options = {}

const baseRule = new web3.eth.Contract(BaseRule.abi, db.get('deployedContract.baserule.address').value(), options)
const blacklist = new web3.eth.Contract(AddressStatus.abi, db.get('deployedContract.blacklist.address').value(), options)
const kyc = new web3.eth.Contract(AddressStatus.abi, db.get('deployedContract.kyc.address').value(), options)
const membership = new web3.eth.Contract(MockOAXMembership.abi, db.get('deployedContract.membership.address').value(), options)

const boundaryKycRule = new web3.eth.Contract(BoundaryKycRule.abi, db.get('deployedContract.boundarykycamlrule.address').value(), options)
const fullKycRule = new web3.eth.Contract(FullKycRule.abi, db.get('deployedContract.fullkycamlrule.address').value(), options)

const fiatTokenGuard = new web3.eth.Contract(DSGuard.abi, db.get('deployedContract.dsguard.address').value(), options)
const gateRoles = new web3.eth.Contract(GateRoles.abi, db.get('deployedContract.gateroles.address').value(), options)
const token = new web3.eth.Contract(FiatToken.abi, db.get('deployedContract.fiattoken.address').value(), options)
const transferFeeController = new web3.eth.Contract(TransferFeeController.abi,db.get('deployedContract.transferfeecontroller.address').value(), options)
const limitController = new web3.eth.Contract(LimitController.abi, db.get('deployedContract.limitcontroller.address').value(), options)
const limitSetting = new web3.eth.Contract(LimitSetting.abi, db.get('deployedContract.limitsetting.address').value(), options)
const gateWithFee = new web3.eth.Contract(GateWithFee.abi, db.get('deployedContract.gatewithfee.address').value(), options)

module.exports = {
    gateRoles, fiatTokenGuard, token, transferFeeController, limitController, gateWithFee,
    limitSetting, baseRule, boundaryKycRule, fullKycRule, membership, blacklist, kyc, web3
}
