const {
    bytes32,
    address,
    wad,
    sig,
    send,
    call,
    create
} = require('chain-dsl')

let gateRoles
let fiatTokenGuard
let kycAmlStatus
let noKycAmlRule
let boundaryKycAmlRule
let fullKycAmlRule
let token
let transferFeeController

const allowRoleForContract = ([sender, role, contract, method]) =>
    send(gateRoles, sender, 'setRoleCapability',
        role, address(contract), sig(method), true)

const init = async (web3, contractRegistry, DEPLOYER, OPERATOR, FEE_COLLECTOR = null, LIMIT = wad(10000)) => {
    const deploy = (...args) => create(web3, DEPLOYER, ...args)

    const {
        KycAmlStatus,
        NoKycAmlRule,
        BoundaryKycAmlRule,
        FullKycAmlRule,
        GateRoles,
        DSGuard,
        FiatToken,
        TransferFeeController
    } = contractRegistry

    gateRoles = await deploy(GateRoles)
    fiatTokenGuard = await deploy(DSGuard)
    kycAmlStatus = await deploy(KycAmlStatus, address(gateRoles))


    noKycAmlRule = await deploy(NoKycAmlRule)
    boundaryKycAmlRule = await deploy(BoundaryKycAmlRule, address(kycAmlStatus))
    fullKycAmlRule = await deploy(FullKycAmlRule, address(kycAmlStatus))

    transferFeeController = await deploy(TransferFeeController, address(fiatTokenGuard), wad(0), wad(0))

    if (!FEE_COLLECTOR) {
        FEE_COLLECTOR = OPERATOR
    }
    token = await deploy(FiatToken, address(fiatTokenGuard), web3.utils.utf8ToHex('TOKUSD'), FEE_COLLECTOR, address(transferFeeController))


    const OPERATOR_ROLE = await call(gateRoles, 'OPERATOR')
    const roleContractRules = [
        [DEPLOYER, OPERATOR_ROLE, kycAmlStatus, 'setKycVerified(address,bool)']
    ]
    await Promise.all([
        send(gateRoles, DEPLOYER, 'setUserRole', OPERATOR, OPERATOR_ROLE, true),
        ...roleContractRules.map(allowRoleForContract),
    ])

    return {
        kycAmlStatus,
        noKycAmlRule,
        boundaryKycAmlRule,
        fullKycAmlRule,
        fiatTokenGuard,
        gateRoles,
        token,
        transferFeeController
    }
}


const defaultGateOperatorMethods = [
    ['mint(uint256)'],
    ['mint(address,uint256)'],
    ['burn(uint256)'],
    ['burn(address,uint256)'],
    ['start()'],
    ['stop()'],
    ['startToken()'],
    ['stopToken()'],
    ['setERC20Authority(address)'],
    ['setTokenAuthority(address)'],
    ['freezeAddress(address)'],
    ['unfreezeAddress(address)'],
]


const defaultTokenGuardRules = [
    ['setName(bytes32)'],
    ['mint(uint256)'], //need this because it calls mint(address,uint256)
    ['mint(address,uint256)'],
    ['burn(uint256)'],//need this because it calls burn(address,uint256)
    ['burn(address,uint256)'],
    ['setERC20Authority(address)'],
    ['setTokenAuthority(address)'],
    ['start()'],
    ['stop()'],
    ['setTransferFeeCollector(address)'],
    ['setTransferFeeController(address)'],
]

const base = async (web3, contractRegistry, DEPLOYER, OPERATOR, FEE_COLLECTOR = null, LIMIT = wad(10000)) => {
    const deploy = (...args) => create(web3, DEPLOYER, ...args)

    if (!FEE_COLLECTOR) {
        FEE_COLLECTOR = OPERATOR
    }

    await init(web3, contractRegistry, DEPLOYER, OPERATOR, FEE_COLLECTOR, LIMIT)

    const {
        Gate
    } = contractRegistry

    const gate = await deploy(Gate, address(gateRoles), address(token), LIMIT)

    // Allow decoding events emitted by token methods when called from within gate methods
    const tokenEventABIs = token.options.jsonInterface.filter(el => el.type === 'event')
    gate.options.jsonInterface = gate.options.jsonInterface.concat(tokenEventABIs)

    const OPERATOR_ROLE = await call(gateRoles, 'OPERATOR')

    const mapGateOperatorRules = ([methodSig]) => {
        return [DEPLOYER, OPERATOR_ROLE, gate, methodSig]
    }

    const roleContractRules = defaultGateOperatorMethods.map(mapGateOperatorRules)

    const permitFiatTokenGuard = ([src, dst, method]) =>
        send(fiatTokenGuard, DEPLOYER, 'permit',
            bytes32(address(src)), bytes32(address(dst)), sig(method))

    const mapTokenGuardRules = ([methodSig]) => {
        return [gate, token, methodSig]
    }

    const gateAsGuardToOtherContractRules = defaultTokenGuardRules.map(mapTokenGuardRules)

    await Promise.all([
        send(gateRoles, DEPLOYER, 'setUserRole', OPERATOR, OPERATOR_ROLE, true),
        ...roleContractRules.map(allowRoleForContract),
        ...gateAsGuardToOtherContractRules.map(permitFiatTokenGuard),
    ])

    await send(gate, OPERATOR, 'setERC20Authority', address(noKycAmlRule))
    await send(gate, OPERATOR, 'setTokenAuthority', address(noKycAmlRule))

    return {
        kycAmlStatus,
        noKycAmlRule,
        boundaryKycAmlRule,
        fullKycAmlRule,
        fiatTokenGuard,
        gateRoles,
        token,
        gate
    }
}

const deployGateWithFee = async (web3, contractRegistry, DEPLOYER, OPERATOR, FEE_COLLECTOR, LIMIT = wad(10000)) => {
    const deploy = (...args) => create(web3, DEPLOYER, ...args)
    const {
        GateWithFee
    } = contractRegistry

    const gateWithFee = await deploy(GateWithFee, address(gateRoles), address(token), LIMIT, FEE_COLLECTOR, address(transferFeeController))

    // Allow decoding events emitted by token methods when called from within gate methods
    const tokenEventABIs = token.options.jsonInterface.filter(el => el.type === 'event')
    gateWithFee.options.jsonInterface = gateWithFee.options.jsonInterface.concat(tokenEventABIs)

    const OPERATOR_ROLE = await call(gateRoles, 'OPERATOR')

    const mapGateOperatorRules = ([methodSig]) => {
        return [DEPLOYER, OPERATOR_ROLE, gateWithFee, methodSig]
    }

    const gateWithFeeOperatorMethodsRoleRules = [
        ['mintWithFee(address,uint256,uint256)'],
        ['burnWithFee(address,uint256,uint256)'],
        ['setFeeCollector(address)'],
        ['setTransferFeeCollector(address)'],
        ['setTransferFeeController(address)'],
        ['setDefaultTransferFee(uint256,uint256)'],
    ]

    const roleContractRules = defaultGateOperatorMethods.map(mapGateOperatorRules).concat(gateWithFeeOperatorMethodsRoleRules.map(mapGateOperatorRules))


    const permitFiatTokenGuard = ([src, dst, method]) =>
        send(fiatTokenGuard, DEPLOYER, 'permit',
            bytes32(address(src)), bytes32(address(dst)), sig(method))

    const mapTokenGuardRules = ([methodSig]) => {
        return [gateWithFee, token, methodSig]
    }

    const gateWithFeeGuardRules = [
        [gateWithFee, transferFeeController, 'setDefaultTransferFee(uint256,uint256)'],
    ]

    const gateAsGuardToOtherContractRules = defaultTokenGuardRules.map(mapTokenGuardRules).concat(gateWithFeeGuardRules)

    await Promise.all([
        send(gateRoles, DEPLOYER, 'setUserRole', OPERATOR, OPERATOR_ROLE, true),
        ...roleContractRules.map(allowRoleForContract),
        ...gateAsGuardToOtherContractRules.map(permitFiatTokenGuard),
    ])

    await send(gateWithFee, OPERATOR, 'setERC20Authority', address(noKycAmlRule))
    await send(gateWithFee, OPERATOR, 'setTokenAuthority', address(noKycAmlRule))

    return {gateWithFee}
}

module.exports = {
    init,
    base,
    deployGateWithFee
}
