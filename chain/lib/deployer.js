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
let addressControlStatus
let noKycAmlRule
let boundaryKycAmlRule
let fullKycAmlRule
let token
let transferFeeController
let limitController

const allowRoleForContract = ([sender, role, contract, method]) =>
    send(gateRoles, sender, 'setRoleCapability',
        role, address(contract), sig(method), true)

const init = async (web3, contractRegistry, DEPLOYER, OPERATOR,
                    FEE_COLLECTOR = null,
                    MINT_LIMIT = wad(10000),
                    BURN_LIMIT = wad(10000),
) => {
    const deploy = (...args) => create(web3, DEPLOYER, ...args)

    const {
        KycAmlStatus,
        NoKycAmlRule,
        BoundaryKycAmlRule,
        FullKycAmlRule,
        GateRoles,
        DSGuard,
        FiatToken,
        TransferFeeController,
        AddressControlStatus,
        LimitController
    } = contractRegistry

    gateRoles = await deploy(GateRoles)
    fiatTokenGuard = await deploy(DSGuard)
    kycAmlStatus = await deploy(KycAmlStatus, address(gateRoles))
    addressControlStatus = await deploy(AddressControlStatus, address(gateRoles))


    noKycAmlRule = await deploy(NoKycAmlRule, address(addressControlStatus))
    boundaryKycAmlRule = await deploy(BoundaryKycAmlRule, address(addressControlStatus), address(kycAmlStatus))
    fullKycAmlRule = await deploy(FullKycAmlRule, address(addressControlStatus), address(kycAmlStatus))

    transferFeeController = await deploy(TransferFeeController, address(fiatTokenGuard), wad(0), wad(0))
    limitController = await deploy(LimitController, address(fiatTokenGuard), MINT_LIMIT, BURN_LIMIT)

    if (!FEE_COLLECTOR) {
        FEE_COLLECTOR = OPERATOR
    }
    token = await deploy(FiatToken, address(fiatTokenGuard), web3.utils.utf8ToHex('TOKUSD'), FEE_COLLECTOR, address(transferFeeController))


    const OPERATOR_ROLE = await call(gateRoles, 'OPERATOR')

    const roleContractRules = [
        [DEPLOYER, OPERATOR_ROLE, kycAmlStatus, 'setKycVerified(address,bool)'],
        [DEPLOYER, OPERATOR_ROLE, addressControlStatus, 'freezeAddress(address)'],
        [DEPLOYER, OPERATOR_ROLE, addressControlStatus, 'unfreezeAddress(address)']
    ]

    await Promise.all([
        send(gateRoles, DEPLOYER, 'setUserRole', OPERATOR, OPERATOR_ROLE, true),
        ...roleContractRules.map(allowRoleForContract),
    ])

    return {
        kycAmlStatus,
        addressControlStatus,
        noKycAmlRule,
        boundaryKycAmlRule,
        fullKycAmlRule,
        fiatTokenGuard,
        gateRoles,
        token,
        transferFeeController,
        limitController
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
    ['setLimitController(address)'],
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

const base = async (web3,
                    contractRegistry,
                    DEPLOYER,
                    OPERATOR,
                    FEE_COLLECTOR = null,
                    MINT_LIMIT = wad(10000),
                    BURN_LIMIT = wad(10000),
) => {
    const deploy = (...args) => create(web3, DEPLOYER, ...args)

    if (!FEE_COLLECTOR) {
        FEE_COLLECTOR = OPERATOR
    }

    await init(web3, contractRegistry, DEPLOYER, OPERATOR, FEE_COLLECTOR, MINT_LIMIT, BURN_LIMIT)

    const {
        Gate
    } = contractRegistry

    const gate = await deploy(Gate, address(gateRoles), address(token), address(limitController))

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

    const gateGuardRules = [
        [gate, limitController, 'bumpMintLimit(uint256)'],
        [gate, limitController, 'bumpBurnLimit(uint256)'],
    ]
    const gateAsGuardToOtherContractRules = defaultTokenGuardRules.map(mapTokenGuardRules).concat(gateGuardRules)

    await Promise.all([
        send(gateRoles, DEPLOYER, 'setUserRole', OPERATOR, OPERATOR_ROLE, true),
        ...roleContractRules.map(allowRoleForContract),
        ...gateAsGuardToOtherContractRules.map(permitFiatTokenGuard),
    ])

    await send(gate, OPERATOR, 'setERC20Authority', address(noKycAmlRule))
    await send(gate, OPERATOR, 'setTokenAuthority', address(noKycAmlRule))

    return {
        kycAmlStatus,
        addressControlStatus,
        noKycAmlRule,
        boundaryKycAmlRule,
        fullKycAmlRule,
        fiatTokenGuard,
        gateRoles,
        token,
        gate,
        limitController
    }
}

const deployGateWithFee = async (web3, contractRegistry, DEPLOYER, OPERATOR, FEE_COLLECTOR) => {
    const deploy = (...args) => create(web3, DEPLOYER, ...args)
    const {
        GateWithFee
    } = contractRegistry

    const gateWithFee = await deploy(GateWithFee, address(gateRoles), address(token), address(limitController), FEE_COLLECTOR, address(transferFeeController))

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
        ['requestInterestPayment(address,uint256)'],
        ['processInterestPayment(address,uint256)'],
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
        [gateWithFee, limitController, 'bumpMintLimit(uint256)'],
        [gateWithFee, limitController, 'bumpBurnLimit(uint256)'],
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
