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
let membershipRule
let token
let transferFeeController
let limitController
let limitSetting

const allowRoleForContract = ([sender, role, contract, method]) => {
    send(gateRoles, sender, 'setRoleCapability', role, address(contract), sig(method), true)
}
    

const init = async (web3, contractRegistry, DEPLOYER, OPERATOR,
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
        MembershipRule,
        GateRoles,
        DSGuard,
        FiatToken,
        TransferFeeController,
        AddressControlStatus,
        LimitController,
        LimitSetting
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
    membershipRule = await deploy(MembershipRule, address(gateRoles), address(addressControlStatus), address(kycAmlStatus), address(mockMembershipAuthority))
    limitController = await deploy(LimitController, address(fiatTokenGuard), address(limitSetting))

    if (!FEE_COLLECTOR) {
        FEE_COLLECTOR = OPERATOR
    }
    token = await deploy(FiatToken, address(fiatTokenGuard), web3.utils.utf8ToHex('TOKUSD'), FEE_COLLECTOR, address(transferFeeController))


    const OPERATOR_ROLE = await call(gateRoles, 'OPERATOR')

    const roleContractRules = [
        [DEPLOYER, OPERATOR_ROLE, kycAmlStatus, 'setKycVerified(address,bool)'],
        [DEPLOYER, OPERATOR_ROLE, addressControlStatus, 'freezeAddress(address)'],
        [DEPLOYER, OPERATOR_ROLE, addressControlStatus, 'unfreezeAddress(address)'],
        [DEPLOYER, OPERATOR_ROLE, limitSetting, 'setSettingDefaultDelayHours(uint256)'],
        [DEPLOYER, OPERATOR_ROLE, limitSetting, 'setLimitCounterResetTimeOffset(int256)'],
        [DEPLOYER, OPERATOR_ROLE, limitSetting, 'setDefaultMintDailyLimit(uint256)'],
        [DEPLOYER, OPERATOR_ROLE, limitSetting, 'setDefaultBurnDailyLimit(uint256)'],
        [DEPLOYER, OPERATOR_ROLE, limitSetting, 'setCustomMintDailyLimit(address,uint256)'],
        [DEPLOYER, OPERATOR_ROLE, limitSetting, 'setCustomBurnDailyLimit(address,uint256)'],
        [DEPLOYER, OPERATOR_ROLE, transferFeeController, 'setDefaultTransferFee(uint256,uint256)'],
        [DEPLOYER, OPERATOR_ROLE, membershipRule, 'setMembershipAuthority(address)'],
    ]

    // await Promise.all([
    //     send(gateRoles, DEPLOYER, 'setUserRole', OPERATOR, OPERATOR_ROLE, true),
    //     ...roleContractRules.map(allowRoleForContract),
    // ])

    const initCallMethods = [
        send(gateRoles, DEPLOYER, 'setUserRole', OPERATOR, OPERATOR_ROLE, true),
        ...roleContractRules.map(allowRoleForContract),
    ]

    for(let method of initCallMethods){
        await method
    }

    return {
        kycAmlStatus,
        addressControlStatus,
        noKycAmlRule,
        boundaryKycAmlRule,
        fullKycAmlRule,
        mockMembershipAuthority,
        membershipRule,
        fiatTokenGuard,
        gateRoles,
        token,
        transferFeeController,
        limitController,
        limitSetting
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

    const permitFiatTokenGuard = ([src, dst, method]) =>{
        send(fiatTokenGuard, DEPLOYER, 'permit', bytes32(address(src)), bytes32(address(dst)), sig(method))
    }
        

    const mapTokenGuardRules = ([methodSig]) => {
        return [gate, token, methodSig]
    }

    //todo factor me out as default
    const gateGuardRules = [
        [gate, limitController, 'bumpMintLimitCounter(uint256)'],
        [gate, limitController, 'bumpBurnLimitCounter(uint256)'],
    ]
    const gateAsGuardToOtherContractRules = defaultTokenGuardRules.map(mapTokenGuardRules).concat(gateGuardRules)

    const baseCallMethods = [
        send(gateRoles, DEPLOYER, 'setUserRole', OPERATOR, OPERATOR_ROLE, true),
        ...roleContractRules.map(allowRoleForContract),
        ...gateAsGuardToOtherContractRules.map(permitFiatTokenGuard)
    ]

    for(let method of baseCallMethods){
        await method
    }

    await send(gate, OPERATOR, 'setERC20Authority', address(noKycAmlRule))
    await send(gate, OPERATOR, 'setTokenAuthority', address(noKycAmlRule))

    return {
        kycAmlStatus,
        addressControlStatus,
        noKycAmlRule,
        boundaryKycAmlRule,
        fullKycAmlRule,
        mockMembershipAuthortiy,
        membershipRule,
        fiatTokenGuard,
        gateRoles,
        token,
        gate,
        limitController,
        limitSetting
    }
}

const deployGateWithFee = async (web3, contractRegistry, DEPLOYER, OPERATOR, MINT_FEE_COLLECTOR, BURN_FEE_COLLECTOR, TRANSFER_FEE_COLLECTOR, NEGATIVE_INTEREST_RATE_COLLECTOR,) => {
    const deploy = (...args) => create(web3, DEPLOYER, ...args)
    const {
        GateWithFee
    } = contractRegistry

    const gateWithFee = await deploy(GateWithFee, address(gateRoles), address(token), address(limitController), MINT_FEE_COLLECTOR, BURN_FEE_COLLECTOR, NEGATIVE_INTEREST_RATE_COLLECTOR, address(transferFeeController))

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
        ['requestInterestPayment(address,uint256)'],
        ['processInterestPayment(address,uint256)'],
        ['setMintFeeCollector(address)'],
        ['setBurnFeeCollector(address)'],
        ['setNegativeInterestRateFeeCollector(address)'],
        
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

    const gateWithFeeMethods = [
        send(gateRoles, DEPLOYER, 'setUserRole', OPERATOR, OPERATOR_ROLE, true),
        ...roleContractRules.map(allowRoleForContract),
        ...gateAsGuardToOtherContractRules.map(permitFiatTokenGuard),
    ]

    for(let method of gateWithFeeMethods){
        await method
    }

    await send(gateWithFee, OPERATOR, 'setERC20Authority', address(noKycAmlRule))
    await send(gateWithFee, OPERATOR, 'setTokenAuthority', address(noKycAmlRule))

    return {gateWithFee}
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    init,
    base,
    deployGateWithFee
}
