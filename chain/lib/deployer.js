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
let mockMembershipAuthortiy
let membershipWithBoundaryKycAmlRule
let token
let transferFeeController
let limitController
let limitSetting
let dsGroupFactory

const allowRoleForContract = ([sender, role, contract, method]) => {
    send(gateRoles, sender, 'setRoleCapability', role, address(contract), sig(method), true)
}
    

const init = async (web3, contractRegistry, DEPLOYER, SYSTEM_ADMIN, KYC_OPERATOR, MONEY_OPERATOR,
                    FEE_COLLECTOR = null,
                    MINT_LIMIT = wad(10000),
                    BURN_LIMIT = wad(10000),
                    DEFAULT_LIMIT_COUNTER_RESET_TIME_OFFSET = 0,
                    DEFAULT_SETTING_DELAY_HOURS = 0
) => {
    const deploy = (...args) => create(web3, DEPLOYER, ...args)

    const {
        KycAmlStatus,
        NoKycAmlRule,
        BoundaryKycAmlRule,
        FullKycAmlRule,
        MockMembershipAuthority,
        MembershipWithBoundaryKycAmlRule,
        GateRoles,
        DSGuard,
        FiatToken,
        TransferFeeController,
        AddressControlStatus,
        LimitController,
        LimitSetting,
        DSGroupFactory
    } = contractRegistry

    gateRoles = await deploy(GateRoles)
    fiatTokenGuard = await deploy(DSGuard)

    kycAmlStatus = await deploy(KycAmlStatus, address(gateRoles))
    addressControlStatus = await deploy(AddressControlStatus, address(gateRoles))
    transferFeeController = await deploy(TransferFeeController, address(gateRoles), wad(0), wad(0))
    limitSetting = await deploy(LimitSetting, address(gateRoles), MINT_LIMIT, BURN_LIMIT, DEFAULT_LIMIT_COUNTER_RESET_TIME_OFFSET, DEFAULT_SETTING_DELAY_HOURS)

    noKycAmlRule = await deploy(NoKycAmlRule, address(addressControlStatus))
    boundaryKycAmlRule = await deploy(BoundaryKycAmlRule, address(addressControlStatus), address(kycAmlStatus))
    fullKycAmlRule = await deploy(FullKycAmlRule, address(addressControlStatus), address(kycAmlStatus))
    mockMembershipAuthority = await deploy(MockMembershipAuthority)
    membershipWithBoundaryKycAmlRule = await deploy(MembershipWithBoundaryKycAmlRule, address(gateRoles), address(addressControlStatus), address(kycAmlStatus), address(mockMembershipAuthority))
    limitController = await deploy(LimitController, address(fiatTokenGuard), address(limitSetting))

    if (!FEE_COLLECTOR) {
        FEE_COLLECTOR = SYSTEM_ADMIN
    }

    token = await deploy(
        FiatToken,
        address(fiatTokenGuard),
        web3.utils.utf8ToHex('TOKUSD'),
        web3.utils.utf8ToHex('USD Token'),
        FEE_COLLECTOR,
        address(transferFeeController)
    )

    const SYSTEM_ADMIN_ROLE = await call(gateRoles, 'SYSTEM_ADMIN')
    const KYC_OPERATOR_ROLE = await call(gateRoles, 'KYC_OPERATOR')
    const MONEY_OPERATOR_ROLE = await call(gateRoles, 'MONEY_OPERATOR')

    const roleContractRules = [
        [DEPLOYER, KYC_OPERATOR_ROLE, kycAmlStatus, 'setKycVerified(address,bool)'],
        [DEPLOYER, MONEY_OPERATOR_ROLE, addressControlStatus, 'freezeAddress(address)'],
        [DEPLOYER, MONEY_OPERATOR_ROLE, addressControlStatus, 'unfreezeAddress(address)'],
        [DEPLOYER, SYSTEM_ADMIN_ROLE, limitSetting, 'setSettingDefaultDelayHours(uint256)'],
        [DEPLOYER, SYSTEM_ADMIN_ROLE, limitSetting, 'setLimitCounterResetTimeOffset(int256)'],
        [DEPLOYER, SYSTEM_ADMIN_ROLE, limitSetting, 'setDefaultMintDailyLimit(uint256)'],
        [DEPLOYER, SYSTEM_ADMIN_ROLE, limitSetting, 'setDefaultBurnDailyLimit(uint256)'],
        [DEPLOYER, SYSTEM_ADMIN_ROLE, limitSetting, 'setCustomMintDailyLimit(address,uint256)'],
        [DEPLOYER, SYSTEM_ADMIN_ROLE, limitSetting, 'setCustomBurnDailyLimit(address,uint256)'],
        [DEPLOYER, SYSTEM_ADMIN_ROLE, transferFeeController, 'setDefaultTransferFee(uint256,uint256)'],
        [DEPLOYER, SYSTEM_ADMIN_ROLE, membershipWithBoundaryKycAmlRule, 'setMembershipAuthority(address)'],
    ]

    await send(gateRoles, DEPLOYER, 'setUserRole', SYSTEM_ADMIN, SYSTEM_ADMIN_ROLE, true)
    await send(gateRoles, DEPLOYER, 'setUserRole', KYC_OPERATOR, KYC_OPERATOR_ROLE, true)
    await send(gateRoles, DEPLOYER, 'setUserRole', MONEY_OPERATOR, MONEY_OPERATOR_ROLE, true)

    for (let [sender, role, contract, method] of roleContractRules) {
        await send(gateRoles, sender, 'setRoleCapability', role, address(contract), sig(method), true)
    }
    // Development
    // await Promise.all([
    //     send(gateRoles, DEPLOYER, 'setUserRole', OPERATOR, OPERATOR_ROLE, true),
    //     ...roleContractRules.map(allowRoleForContract),
    // ])

    return {
        kycAmlStatus,
        addressControlStatus,
        noKycAmlRule,
        boundaryKycAmlRule,
        fullKycAmlRule,
        mockMembershipAuthority,
        membershipWithBoundaryKycAmlRule,
        fiatTokenGuard,
        gateRoles,
        token,
        transferFeeController,
        limitController,
        limitSetting,
        dsGroupFactory
    }
}

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
    ['setTransferFeeController(address)']
]

const base = async (web3,
                    contractRegistry,
                    DEPLOYER,
                    SYSTEM_ADMIN, KYC_OPERATOR, MONEY_OPERATOR,
                    FEE_COLLECTOR = null,
                    MINT_LIMIT = wad(10000),
                    BURN_LIMIT = wad(10000),
) => {
    const deploy = (...args) => create(web3, DEPLOYER, ...args)

    if (!FEE_COLLECTOR) {
        FEE_COLLECTOR = SYSTEM_ADMIN
    }

    await init(web3, contractRegistry, DEPLOYER, SYSTEM_ADMIN, KYC_OPERATOR, MONEY_OPERATOR, FEE_COLLECTOR, MINT_LIMIT, BURN_LIMIT)

    const {
        Gate
    } = contractRegistry

    const gate = await deploy(Gate, address(gateRoles), address(token), address(limitController))

    // Allow decoding events emitted by token methods when called from within gate methods
    const tokenEventABIs = token.options.jsonInterface.filter(el => el.type === 'event')
    gate.options.jsonInterface = gate.options.jsonInterface.concat(tokenEventABIs)

    const SYSTEM_ADMIN_ROLE = await call(gateRoles, 'SYSTEM_ADMIN')
    const KYC_OPERATOR_ROLE = await call(gateRoles, 'KYC_OPERATOR')
    const MONEY_OPERATOR_ROLE = await call(gateRoles, 'MONEY_OPERATOR')

    const defaultGateOperatorMethods = [
        [MONEY_OPERATOR_ROLE, 'mint(uint256)'],
        [MONEY_OPERATOR_ROLE, 'mint(address,uint256)'],
        [MONEY_OPERATOR_ROLE, 'burn(uint256)'],
        [MONEY_OPERATOR_ROLE, 'burn(address,uint256)'],
        [MONEY_OPERATOR_ROLE, 'start()'],
        [MONEY_OPERATOR_ROLE, 'stop()'],
        [MONEY_OPERATOR_ROLE, 'startToken()'],
        [MONEY_OPERATOR_ROLE, 'stopToken()'],
        [SYSTEM_ADMIN_ROLE, 'setERC20Authority(address)'],
        [SYSTEM_ADMIN_ROLE, 'setTokenAuthority(address)'],
        [SYSTEM_ADMIN_ROLE, 'setLimitController(address)']
    ]

    const mapGateOperatorRules = ([role, methodSig]) => {
        return [DEPLOYER, role, gate, methodSig]
    }

    const roleContractRules = defaultGateOperatorMethods.map(mapGateOperatorRules)

    const permitFiatTokenGuard = ([src, dst, method]) =>{
        send(fiatTokenGuard, DEPLOYER, 'permit', bytes32(address(src)), bytes32(address(dst)), sig(method))
    }
        

    const mapTokenGuardRules = ([methodSig]) => {
        return [gate, token, methodSig]
    }

    const gateGuardRules = [
        [gate, limitController, 'bumpMintLimitCounter(uint256)'],
        [gate, limitController, 'bumpBurnLimitCounter(uint256)'],
    ]
    const gateAsGuardToOtherContractRules = defaultTokenGuardRules.map(mapTokenGuardRules).concat(gateGuardRules)

    await send(gateRoles, DEPLOYER, 'setUserRole', SYSTEM_ADMIN, SYSTEM_ADMIN_ROLE, true)
    await send(gateRoles, DEPLOYER, 'setUserRole', KYC_OPERATOR, KYC_OPERATOR_ROLE, true)
    await send(gateRoles, DEPLOYER, 'setUserRole', MONEY_OPERATOR, MONEY_OPERATOR_ROLE, true)    
    for(let [sender, role, contract, method] of roleContractRules){
        await send(gateRoles, sender, 'setRoleCapability', role, address(contract), sig(method), true)
    }
    for(let [src, dst, method] of gateAsGuardToOtherContractRules){
        await send(fiatTokenGuard, DEPLOYER, 'permit', bytes32(address(src)), bytes32(address(dst)), sig(method))
    }

    await send(gate, SYSTEM_ADMIN, 'setERC20Authority', address(noKycAmlRule))
    await send(gate, SYSTEM_ADMIN, 'setTokenAuthority', address(noKycAmlRule))

    return {
        kycAmlStatus,
        addressControlStatus,
        noKycAmlRule,
        boundaryKycAmlRule,
        fullKycAmlRule,
        mockMembershipAuthortiy,
        membershipWithBoundaryKycAmlRule,
        fiatTokenGuard,
        gateRoles,
        token,
        gate,
        limitController,
        limitSetting,
        dsGroupFactory,
    }
}

const deployGateWithFee = async (web3, contractRegistry, DEPLOYER, SYSTEM_ADMIN, KYC_OPERATOR, MONEY_OPERATOR, MINT_FEE_COLLECTOR, BURN_FEE_COLLECTOR) => {
    const deploy = (...args) => create(web3, DEPLOYER, ...args)
    const {
        GateWithFee
    } = contractRegistry

    const gateWithFee = await deploy(GateWithFee, address(gateRoles), address(token), address(limitController), MINT_FEE_COLLECTOR, BURN_FEE_COLLECTOR, address(transferFeeController))

    // Allow decoding events emitted by token methods when called from within gate methods
    const tokenEventABIs = token.options.jsonInterface.filter(el => el.type === 'event')
    gateWithFee.options.jsonInterface = gateWithFee.options.jsonInterface.concat(tokenEventABIs)

    const SYSTEM_ADMIN_ROLE = await call(gateRoles, 'SYSTEM_ADMIN')
    const KYC_OPERATOR_ROLE = await call(gateRoles, 'KYC_OPERATOR')
    const MONEY_OPERATOR_ROLE = await call(gateRoles, 'MONEY_OPERATOR')

    const mapGateOperatorRules = ([role, methodSig]) => {
        return [DEPLOYER, role, gateWithFee, methodSig]
    }

    const defaultGateOperatorMethods = [
        [MONEY_OPERATOR_ROLE, 'mint(uint256)'],
        [MONEY_OPERATOR_ROLE, 'mint(address,uint256)'],
        [MONEY_OPERATOR_ROLE, 'burn(uint256)'],
        [MONEY_OPERATOR_ROLE, 'burn(address,uint256)'],
        [SYSTEM_ADMIN_ROLE, 'start()'],
        [SYSTEM_ADMIN_ROLE, 'stop()'],
        [SYSTEM_ADMIN_ROLE, 'startToken()'],
        [SYSTEM_ADMIN_ROLE, 'stopToken()'],
        [SYSTEM_ADMIN_ROLE, 'setERC20Authority(address)'],
        [SYSTEM_ADMIN_ROLE, 'setTokenAuthority(address)'],
        [SYSTEM_ADMIN_ROLE, 'setLimitController(address)']
    ]

    const gateWithFeeOperatorMethodsRoleRules = [
        [MONEY_OPERATOR_ROLE, 'mintWithFee(address,uint256,uint256)'],
        [MONEY_OPERATOR_ROLE, 'burnWithFee(address,uint256,uint256)'],
        [SYSTEM_ADMIN_ROLE, 'setFeeCollector(address)'],
        [SYSTEM_ADMIN_ROLE, 'setTransferFeeCollector(address)'],
        [SYSTEM_ADMIN_ROLE, 'setTransferFeeController(address)'],
        [SYSTEM_ADMIN_ROLE, 'setMintFeeCollector(address)'],
        [SYSTEM_ADMIN_ROLE, 'setBurnFeeCollector(address)'],

        
    ]

    const roleContractRules = defaultGateOperatorMethods.map(mapGateOperatorRules).concat(gateWithFeeOperatorMethodsRoleRules.map(mapGateOperatorRules))


    const permitFiatTokenGuard = ([src, dst, method]) =>
        send(fiatTokenGuard, DEPLOYER, 'permit',
            bytes32(address(src)), bytes32(address(dst)), sig(method))

    const mapTokenGuardRules = ([methodSig]) => {
        return [gateWithFee, token, methodSig]
    }

    const gateWithFeeGuardRules = [
        [gateWithFee, limitController, 'bumpMintLimitCounter(uint256)'],
        [gateWithFee, limitController, 'bumpBurnLimitCounter(uint256)'],
    ]

    const gateAsGuardToOtherContractRules = defaultTokenGuardRules.map(mapTokenGuardRules).concat(gateWithFeeGuardRules)

    await send(gateRoles, DEPLOYER, 'setUserRole', SYSTEM_ADMIN, SYSTEM_ADMIN_ROLE, true)
    await send(gateRoles, DEPLOYER, 'setUserRole', KYC_OPERATOR, KYC_OPERATOR_ROLE, true)
    await send(gateRoles, DEPLOYER, 'setUserRole', MONEY_OPERATOR, MONEY_OPERATOR_ROLE, true)
    for(let [sender, role, contract, method] of roleContractRules){
        await send(gateRoles, sender, 'setRoleCapability', role, address(contract), sig(method), true)
    }
    for(let [src, dst, method] of gateAsGuardToOtherContractRules){
        await send(fiatTokenGuard, DEPLOYER, 'permit', bytes32(address(src)), bytes32(address(dst)), sig(method))
    }

    await send(gateWithFee, SYSTEM_ADMIN, 'setERC20Authority', address(noKycAmlRule))
    await send(gateWithFee, SYSTEM_ADMIN, 'setTokenAuthority', address(noKycAmlRule))

    return {gateWithFee}
}

module.exports = {
    init,
    base,
    deployGateWithFee
}
