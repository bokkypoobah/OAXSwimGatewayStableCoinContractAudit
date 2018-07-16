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
    KycAmlStatus, NoKycAmlRule, BoundaryKycAmlRule, FullKycAmlRule, MockMembershipAuthority, 
    MembershipWithBoundaryKycAmlRule, GateRoles, DSGuard, FiatToken, TransferFeeController, AddressControlStatus, 
    LimitController, LimitSetting, GateWithFee
} = solc(__dirname, '../solc-input.json')

const HDWalletProvider = require("truffle-hdwallet-provider")
const config = require('config')
const web3 = new Web3(new HDWalletProvider(config.get('mnemonic'), config.get('remoteNode'), 0, 5)) //options: https://api.myetherapi.com/rop

options = {
    //from: '0xf383f78a4e3ad64b39b345fead3a91dc4033a9fa'
}

const kycAmlStatus = new web3.eth.Contract(KycAmlStatus.abi, db.get('deployedContract.kycamlstatus.address').value(), options)
const addressControlStatus = new web3.eth.Contract(AddressControlStatus.abi, db.get('deployedContract.addresscontrolstatus.address').value(), options)
const noKycAmlRule = new web3.eth.Contract(NoKycAmlRule.abi, db.get('deployedContract.nokycamlrule.address').value(), options)
const boundaryKycAmlRule = new web3.eth.Contract(BoundaryKycAmlRule.abi, db.get('deployedContract.boundarykycamlrule.address').value(), options)
const fullKycAmlRule = new web3.eth.Contract(FullKycAmlRule.abi, db.get('deployedContract.fullkycamlrule.address').value(), options)
const mockMembershipAuthority = new web3.eth.Contract(MockMembershipAuthority.abi, db.get('deployedContract.mockmembershipauthority.address').value(), options)
const membershipWithBoundaryKycAmlRule = new web3.eth.Contract(MembershipWithBoundaryKycAmlRule.abi, db.get('deployedContract.membershipwithboundarykycamlrule.address').value(), options)
const fiatTokenGuard = new web3.eth.Contract(DSGuard.abi, db.get('deployedContract.dsguard.address').value(), options)
const gateRoles = new web3.eth.Contract(GateRoles.abi, db.get('deployedContract.gateroles.address').value(), options)
const token = new web3.eth.Contract(FiatToken.abi, db.get('deployedContract.fiattoken.address').value(), options)
const transferFeeController = new web3.eth.Contract(TransferFeeController.abi,db.get('deployedContract.transferfeecontroller.address').value(), options)
const limitController = new web3.eth.Contract(LimitController.abi, db.get('deployedContract.limitcontroller.address').value(), options)
const limitSetting = new web3.eth.Contract(LimitSetting.abi, db.get('deployedContract.limitsetting.address').value(), options)
const gateWithFee = new web3.eth.Contract(GateWithFee.abi, db.get('deployedContract.gatewithfee.address').value(), options)

module.exports = {
    kycAmlStatus, addressControlStatus, noKycAmlRule, boundaryKycAmlRule, fullKycAmlRule, 
    mockMembershipAuthority, membershipWithBoundaryKycAmlRule, fiatTokenGuard, gateRoles, token, transferFeeController, 
    limitController, limitSetting, gateWithFee, web3
}
