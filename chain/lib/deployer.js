const {
    bytes32,
    address,
    wad,
    sig,
    send,
    call,
    create
} = require('chain-dsl')

const base = async (web3, contractRegistry, DEPLOYER, OPERATOR, LIMIT = wad(10000)) => {
    const deploy = (...args) => create(web3, DEPLOYER, ...args)

    const {
        KycAmlStatus,
        NoKycAmlRule,
        BoundaryKycAmlRule,
        FullKycAmlRule,
        GateRoles,
        DSGuard,
        FiatToken,
        Gate
    } = contractRegistry

    const gateRoles = await deploy(GateRoles)
    const fiatTokenGuard = await deploy(DSGuard)
    const kycAmlStatus = await deploy(KycAmlStatus, address(gateRoles))
    const noKycAmlRule = await deploy(NoKycAmlRule)
    const boundaryKycAmlRule = await deploy(BoundaryKycAmlRule, address(kycAmlStatus))
    const fullKycAmlRule = await deploy(FullKycAmlRule, address(kycAmlStatus))
    const token = await deploy(FiatToken, address(fiatTokenGuard), web3.utils.utf8ToHex('TOKUSD'))
    const gate = await deploy(Gate, address(gateRoles), address(token), LIMIT)

    // Allow decoding events emitted by token methods when called from within gate methods
    const tokenEventABIs = token.options.jsonInterface.filter(el => el.type === 'event')
    gate.options.jsonInterface = gate.options.jsonInterface.concat(tokenEventABIs)

    const OPERATOR_ROLE = await call(gateRoles, 'OPERATOR')

    const allowGateRole = ([role, contract, method]) =>
        send(gateRoles, DEPLOYER, 'setRoleCapability',
            role, address(contract), sig(method), true)

    const gateRoleRules = [
        [OPERATOR_ROLE, gate, 'mint(uint256)'],
        [OPERATOR_ROLE, gate, 'mint(address,uint256)'],
        [OPERATOR_ROLE, gate, 'burn(uint256)'],
        [OPERATOR_ROLE, gate, 'burn(address,uint256)'],
        [OPERATOR_ROLE, kycAmlStatus, 'setKycVerified(address,bool)']
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
        ...gateRoleRules.map(allowGateRole),
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

module.exports = {
    base
}
