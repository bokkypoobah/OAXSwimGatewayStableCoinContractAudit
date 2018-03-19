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


const allowRoleForContract = ([sender, role, contract, method]) =>
    send(gateRoles, sender, 'setRoleCapability',
        role, address(contract), sig(method), true)

const init = async (web3, contractRegistry, DEPLOYER, OPERATOR, LIMIT = wad(10000)) => {
    const deploy = (...args) => create(web3, DEPLOYER, ...args)

    const {
        KycAmlStatus,
        NoKycAmlRule,
        BoundaryKycAmlRule,
        FullKycAmlRule,
        GateRoles,
        DSGuard,
        FiatToken,
    } = contractRegistry

    gateRoles = await deploy(GateRoles)
    fiatTokenGuard = await deploy(DSGuard)
    kycAmlStatus = await deploy(KycAmlStatus, address(gateRoles))


    noKycAmlRule = await deploy(NoKycAmlRule)
    boundaryKycAmlRule = await deploy(BoundaryKycAmlRule, address(kycAmlStatus))
    fullKycAmlRule = await deploy(FullKycAmlRule, address(kycAmlStatus))
    token = await deploy(FiatToken, address(fiatTokenGuard), web3.utils.utf8ToHex('TOKUSD'))

    const OPERATOR_ROLE = await call(gateRoles, 'OPERATOR')
    const roleContractRules = [
        [DEPLOYER, OPERATOR_ROLE, kycAmlStatus, 'setKycVerified(address,bool)']
    ]
    await Promise.all([
        send(gateRoles, DEPLOYER, 'setUserRole', OPERATOR, OPERATOR_ROLE, true),
        ...roleContractRules.map(allowRoleForContract),
    ])
}

const base = async (web3, contractRegistry, DEPLOYER, OPERATOR, LIMIT = wad(10000)) => {
    const deploy = (...args) => create(web3, DEPLOYER, ...args)

    await init(web3, contractRegistry, DEPLOYER, OPERATOR, LIMIT)

    const {
        Gate
    } = contractRegistry

    const gate = await deploy(Gate, address(gateRoles), address(token), LIMIT)

    // Allow decoding events emitted by token methods when called from within gate methods
    const tokenEventABIs = token.options.jsonInterface.filter(el => el.type === 'event')
    gate.options.jsonInterface = gate.options.jsonInterface.concat(tokenEventABIs)

    const OPERATOR_ROLE = await call(gateRoles, 'OPERATOR')

    const roleContractRules = [
        [DEPLOYER, OPERATOR_ROLE, gate, 'mint(uint256)'],
        [DEPLOYER, OPERATOR_ROLE, gate, 'mint(address,uint256)'],
        [DEPLOYER, OPERATOR_ROLE, gate, 'burn(uint256)'],
        [DEPLOYER, OPERATOR_ROLE, gate, 'burn(address,uint256)'],
        [DEPLOYER, OPERATOR_ROLE, gate, 'start()'],
        [DEPLOYER, OPERATOR_ROLE, gate, 'stop()'],
    ]

    const permitFiatTokenGuard = ([src, dst, method]) =>
        send(fiatTokenGuard, DEPLOYER, 'permit',
            bytes32(address(src)), bytes32(address(dst)), sig(method))

    const fiatTokenGuardRules = [
        [gate, token, 'mint(uint256)'],
        [gate, token, 'mint(address,uint256)'],
        [gate, token, 'burn(uint256)'],
        [gate, token, 'burn(address,uint256)'],
        // [gate, token, 'setERC20Authority(address)'],
        // [gate, token, 'setTokenAuthority(address)'],
    ]

    await Promise.all([
        send(gateRoles, DEPLOYER, 'setUserRole', OPERATOR, OPERATOR_ROLE, true),
        ...roleContractRules.map(allowRoleForContract),
        ...fiatTokenGuardRules.map(permitFiatTokenGuard),
    ])

    await send(token, DEPLOYER, 'setERC20Authority', address(noKycAmlRule))
    await send(token, DEPLOYER, 'setTokenAuthority', address(noKycAmlRule))

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

    const gateWithFee = await deploy(GateWithFee, address(gateRoles), address(token), LIMIT, FEE_COLLECTOR)

    // Allow decoding events emitted by token methods when called from within gate methods
    const tokenEventABIs = token.options.jsonInterface.filter(el => el.type === 'event')
    gateWithFee.options.jsonInterface = gateWithFee.options.jsonInterface.concat(tokenEventABIs)

    const OPERATOR_ROLE = await call(gateRoles, 'OPERATOR')


    const gateRoleRules = [
        [DEPLOYER, OPERATOR_ROLE, gateWithFee, 'mint(uint256)'],
        [DEPLOYER, OPERATOR_ROLE, gateWithFee, 'mint(address,uint256)'],
        [DEPLOYER, OPERATOR_ROLE, gateWithFee, 'burn(uint256)'],
        [DEPLOYER, OPERATOR_ROLE, gateWithFee, 'burn(address,uint256)'],
        [DEPLOYER, OPERATOR_ROLE, gateWithFee, 'start()'],
        [DEPLOYER, OPERATOR_ROLE, gateWithFee, 'stop()']
    ]

    const permitFiatTokenGuard = ([src, dst, method]) =>
        send(fiatTokenGuard, DEPLOYER, 'permit',
            bytes32(address(src)), bytes32(address(dst)), sig(method))

    const fiatTokenGuardRules = [
        [gateWithFee, token, 'mint(uint256)'],
        [gateWithFee, token, 'mint(address,uint256)'],
        [gateWithFee, token, 'burn(uint256)'],
        [gateWithFee, token, 'burn(address,uint256)'],
        // [gateWithFee, token, 'setERC20Authority(address)'],
        // [gateWithFee, token, 'setTokenAuthority(address)'],
    ]

    await Promise.all([
        send(gateRoles, DEPLOYER, 'setUserRole', OPERATOR, OPERATOR_ROLE, true),
        ...gateRoleRules.map(allowRoleForContract),
        ...fiatTokenGuardRules.map(permitFiatTokenGuard),
    ])

    return {gateWithFee}
}

module.exports = {
    base,
    deployGateWithFee
}
