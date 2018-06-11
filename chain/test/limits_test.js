const {
    expect,
    expectAsyncThrow,
    expectNoAsyncThrow,
    expectThrow,
    toBN,
    solc,
    ganacheWeb3,
} = require('chain-dsl/test/helpers')

const {
    address,
    wad,
    send,
    call,
    txEvents
} = require('chain-dsl')

const deployer = require('../lib/deployer')

const mint = 'mint(address,uint256)'
const withdraw = 'withdraw'
const burn = 'burn(address,uint256)'
const deposit = 'deposit'
const approve = 'approve'
const transfer = 'transfer'
const transferFrom = 'transferFrom'
const lastLimitResetTime = 'lastLimitResetTime'

function hours(hrs) {
    return hrs * 1000 * 60 * 60
}

describe("Limits:", function () {
    this.timeout(8000)

    let web3, snaps, accounts, gate, token, limitController, limitSetting,
        DEPLOYER,
        OPERATOR,
        CUSTOMER,
        CUSTOMER_TWO,
        MIN_AMT,
        AMT,
        DEFAULT_DAILY_MINT_LIMIT,
        DEFAULT_DAILY_BURN_LIMIT

    before('deployment', async () => {
        snaps = []
        web3 = ganacheWeb3()
        ;[
            DEPLOYER,
            OPERATOR,
            CUSTOMER,
            CUSTOMER_TWO
        ] = accounts = await web3.eth.getAccounts()

        MIN_AMT = wad(1)
        AMT = wad(100)
        DEFAULT_DAILY_MINT_LIMIT = wad(10000)
        DEFAULT_DAILY_BURN_LIMIT = wad(20000)
        DEFAULT_LIMIT_COUNTER_RESET_TIME_OFFSET = 0
        DEFAULT_SETTING_DELAY_HOURS = 0


        ;({
            gate, token,
            limitController,
            limitSetting
        } = await deployer.base(
            web3,
            solc(__dirname, '../solc-input.json'),
            DEPLOYER,
            OPERATOR,
            OPERATOR,
            DEFAULT_DAILY_MINT_LIMIT,
            DEFAULT_DAILY_BURN_LIMIT,
            DEFAULT_LIMIT_COUNTER_RESET_TIME_OFFSET,
            DEFAULT_SETTING_DELAY_HOURS
        ))
    })

    beforeEach(async () => snaps.push(await web3.evm.snapshot()))
    afterEach(async () => web3.evm.revert(snaps.pop()))

    context("Limits Enforcement -", async () => {

        it('Can never mint more than the daily mint limit at once', async () => {
            web3.evm.increaseTime(hours(2 * 24))
            await expectThrow(async () =>
                await send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT + 1))
        })

        it('Can not mint more than daily mint limit in same day', async () => {
            const moreThanADay = hours((1 + 2) * 24)
            web3.evm.increaseTime(moreThanADay)
            await expectNoAsyncThrow(async () =>
                send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT - 1))
        })

        it('Can never burn more than the daily burn limit at once', async () => {
            //prepare balance
            send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT - 1)
            web3.evm.increaseTime(hours(2 * 24))
            send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT - 1)

            send(token, CUSTOMER, approve, address(gate), DEFAULT_DAILY_BURN_LIMIT)
            await expectThrow(async () =>
                send(gate, OPERATOR, burn, CUSTOMER, DEFAULT_DAILY_BURN_LIMIT + 1))
        })

        it('Can not burn more than daily burn limit in same day', async () => {
            //prepare balance
            await send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT - 1)
            web3.evm.increaseTime(hours(2 * 24))
            await send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT - 1)
            web3.evm.increaseTime(hours(2 * 24))
            await send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT - 1)
            web3.evm.increaseTime(hours(2 * 24))
            await send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT - 1)

            const moreThanADay = hours((1 + 2) * 24)
            await web3.evm.increaseTime(moreThanADay)

            await send(token, CUSTOMER, approve, address(gate), DEFAULT_DAILY_BURN_LIMIT)
            await expectNoAsyncThrow(async () =>
                await send(gate, OPERATOR, burn, CUSTOMER, DEFAULT_DAILY_BURN_LIMIT - 1))
        })

        it('Mint/burn counter is 0 after deployments', async () => {
            const mintLimitCounter = await call(limitController, 'mintLimitCounter')
            expect(mintLimitCounter).to.eq(0)
            const burnLimitCounter = await call(limitController, 'burnLimitCounter')
            expect(burnLimitCounter).to.eq(0)
        })

        it('Resets on 00:00 UTC (TODO timezone pending to be changed according to business decision)', async () => {
            const time = await call(limitController, lastLimitResetTime)
            expect(time | 0).to.be.above(0)
            expect(time % (24 * 60 * 60)).to.eq(0)
        })

        it('Delay reset to 03:00 UTC', async () => {
            let randomDelayHours = 3 * 3600;
            await send(limitSetting, OPERATOR, "setLimitCounterResetTimeOffset", randomDelayHours)
            const time = await call(limitSetting, "getLimitCounterResetTimeOffset")
            expect(time | 0).to.be.at.least(3*60*60)
            expect(time % (24 * 60 * 60)).to.eq(3*60*60)
        })

        it('Limits have reset for {0} offset', async ()=>{
            let delayHours = 0 * 3600

            //increase time to the next 00:00 UTC
            let now = Date.now() /1000 | 0 
            let today = now - (now % (24*60*60))
            let nextDay = today + 24*60*60

            web3.evm.increaseTime(nextDay - now)
            await send(limitSetting, OPERATOR, "setLimitCounterResetTimeOffset", delayHours)
            await send(gate, OPERATOR, mint, CUSTOMER, 1)  
            expect(await call(limitController,"mintLimitCounter")).to.eq(1)
            web3.evm.increaseTime(24*60*60)    
            await send(gate, OPERATOR, mint, CUSTOMER, 1)        
            expect(await call(limitController, "mintLimitCounter")).to.eq(1)
        })

        it('Limits have reset for {-11} hours offset', async ()=>{
            let delayHours = -11 * 3600

            //increase time to the next 00:00 UTC
            let now = Date.now() /1000 | 0 
            let today = now - (now % (24*60*60))
            let nextDay = today + 24*60*60

            web3.evm.increaseTime(nextDay - now)
            await send(limitSetting, OPERATOR, "setLimitCounterResetTimeOffset", delayHours)
            await send(gate, OPERATOR, mint, CUSTOMER, 1)  
            expect(await call(limitController,"mintLimitCounter")).to.eq(1)
            web3.evm.increaseTime((24-11)*60*60)    
            await send(gate, OPERATOR, mint, CUSTOMER, 1)        
            expect(await call(limitController, "mintLimitCounter")).to.eq(1)
        })

        it('Limits have reset for {+14} hours offset', async ()=>{
            let delayHours = 14 * 3600

            //increase time to the next 00:00 UTC
            let now = Date.now() /1000 | 0 
            let today = now - (now % (24*60*60))
            let nextDay = today + 24*60*60

            web3.evm.increaseTime(nextDay - now)
            await send(limitSetting, OPERATOR, "setLimitCounterResetTimeOffset", delayHours)
            await send(gate, OPERATOR, mint, CUSTOMER, 1)  
            expect(await call(limitController,"mintLimitCounter")).to.eq(1)
            web3.evm.increaseTime(24*60*60)    
            //should throw error when within the period
            expect(await call(limitController,"mintLimitCounter")).to.eq(1)
            //add offset
            web3.evm.increaseTime(14*60*60)  
            await send(gate, OPERATOR, mint, CUSTOMER, 1)        
            expect(await call(limitController, "mintLimitCounter")).to.eq(1)
        })

        it('Can never set offset time to <-11 hours and >14 hours', async ()=> {
            let delayHours = -12 * 3600
            await expectThrow(async ()=>{
                await send(limitSetting, OPERATOR, "setLimitCounterResetTimeOffset", delayHours)
            })
            delayHours = 15 * 3600
            await expectThrow(async ()=>{
                await send(limitSetting, OPERATOR, "setLimitCounterResetTimeOffset", delayHours)
            })
            
        })

        it('Limits are guaranteed to reset after 24h', async ()=> {
            const moreThanADay = hours((1 + 2) * 24)

            web3.evm.increaseTime(moreThanADay)

            await expectNoAsyncThrow(async () =>
                send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT))

            web3.evm.increaseTime(moreThanADay)

            await expectNoAsyncThrow(async () =>
                send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT))

            web3.evm.increaseTime(moreThanADay)

            await expectNoAsyncThrow(async () =>
                send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT))

            web3.evm.increaseTime(hours(24))

            await expectNoAsyncThrow(async () =>
                send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT))

            send(token, CUSTOMER, approve, address(gate), DEFAULT_DAILY_BURN_LIMIT)
            await expectNoAsyncThrow(async () =>
                send(gate, OPERATOR, burn, CUSTOMER, DEFAULT_DAILY_BURN_LIMIT))

            web3.evm.increaseTime(hours(24))

            send(token, CUSTOMER, approve, address(gate), DEFAULT_DAILY_BURN_LIMIT)
            await expectNoAsyncThrow(async () =>
                send(gate, OPERATOR, burn, CUSTOMER, DEFAULT_DAILY_BURN_LIMIT))
        })
    })

    context("Limits Configuration - ", async () => {

        it('For each ethereum address\'s point of view, there is one minting limit and another burning limit.', async () => {
            let mintLimit = await call(limitSetting, "getMintDailyLimit", CUSTOMER)
            let burnLimit = await call(limitSetting, "getBurnDailyLimit", CUSTOMER)
            //This is only because the default mint/burn limit is different
            expect(mintLimit).to.not.eq(burnLimit)
        })
        it('Ethereum wallets could have customised limits different from default. Ethereum wallets without customised limits shall respect default limits.', async () => {
            //set wallet two's customised limits 2x default
            let mintLimit = await call(limitSetting, "getMintDailyLimit", CUSTOMER)
            let burnLimit = await call(limitSetting, "getBurnDailyLimit", CUSTOMER)
            //This is only because the default mint/burn limit is different
            expect(mintLimit).to.not.eq(burnLimit)

            //DO limit change
            await send(limitSetting, OPERATOR, "setCustomMintDailyLimit", CUSTOMER_TWO, DEFAULT_DAILY_MINT_LIMIT * 3)
            await send(limitSetting, OPERATOR, "setCustomBurnDailyLimit", CUSTOMER_TWO, DEFAULT_DAILY_BURN_LIMIT * 3)

            let vipMintLimit = await call(limitSetting, "getMintDailyLimit", CUSTOMER_TWO)
            let vipBurnLimit = await call(limitSetting, "getBurnDailyLimit", CUSTOMER_TWO)
            
            expect(mintLimit).to.not.eq(vipMintLimit)
            expect(burnLimit).to.not.eq(vipBurnLimit)

            expect(mintLimit).to.eq(DEFAULT_DAILY_MINT_LIMIT)
            expect(burnLimit).to.eq(DEFAULT_DAILY_BURN_LIMIT)
        })

        it('Only authorised ethereum addresses can change limits configuration.', async () => {
            let randomLimit = wad(1000)
            await expectNoAsyncThrow(async () => {
                await send(limitSetting, OPERATOR, "setDefaultMintDailyLimit", randomLimit)
            })
            expect(await call(limitSetting, "getMintDailyLimit", "0x0")).to.eq(randomLimit)

            await expectNoAsyncThrow(async () => {
                await send(limitSetting, OPERATOR, "setDefaultBurnDailyLimit", randomLimit * 3)
            })
            expect(await call(limitSetting, "getBurnDailyLimit", "0x0")).to.eq(randomLimit * 3)
        })
        it('Unauthorised ethereum addresses can NEVER change limits configuration.', async () => {
            let randomLimit = wad(1000)
            await expectThrow(async () => {
                await send(limitSetting, DEPLOYER, "setCustomMintDailyLimit", CUSTOMER_TWO, randomLimit)
            })
            await expectThrow(async () => {
                await send(limitSetting, DEPLOYER, "setCustomBurnDailyLimit", CUSTOMER_TWO, randomLimit)
            })
        })

        it('Only authorised ethereum addresses can configure customised limits for each ethereum address.', async () => {
            let randomLimit = wad(1000)

            await expectNoAsyncThrow(async () => {
                await send(limitSetting, OPERATOR, "setCustomMintDailyLimit", CUSTOMER_TWO, randomLimit)
            })
            let vipMintLimit = await call(limitSetting, "getMintDailyLimit", CUSTOMER_TWO)
            expect(vipMintLimit).to.eq(randomLimit)

            await expectNoAsyncThrow(async () => {
                await send(limitSetting, OPERATOR, "setCustomBurnDailyLimit", CUSTOMER_TWO, randomLimit * 2)
            })
            let vipBurnLimit = await call(limitSetting, "getBurnDailyLimit", CUSTOMER_TWO)
            expect(vipBurnLimit).to.eq(randomLimit * 2)
        })
        it('Unauthorised ethereum addresses can NEVER configure customised limits for any ethereum address.', async () => {
            let randomLimit = wad(1000)
            await expectThrow(async () => {
                await send(limitSetting, DEPLOYER, "setCustomMintDailyLimit", CUSTOMER_TWO, randomLimit)
            })
            await expectThrow(async () => {
                await send(limitSetting, DEPLOYER, "setCustomBurnDailyLimit", CUSTOMER_TWO, randomLimit)
            })
        })

        it('Default Mint Limits increase takes effect after {0} hours.', async () => {

            //request default limit increase (new_larger_limit)
            await send(limitSetting, OPERATOR, "setSettingDefaultDelayHours", 24)
            await send(limitSetting, OPERATOR, "setSettingDefaultDelayHours", 0)
            await web3.evm.increaseTime(24*60*60*30) // Increase 30days
            await send(limitSetting, OPERATOR, "setDefaultMintDailyLimit", DEFAULT_DAILY_MINT_LIMIT*2)
            
            //expect throw if minting beyond existing limit
            await send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT*2) 
            await expectThrow(async () => {
                await send(gate, OPERATOR, mint, CUSTOMER, 1) 
            })
            
            //expect no throw if minting beyond existing limit after {24} hours
            await web3.evm.increaseTime(24*60*60) // Increase 24 hours
            await send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT*2) 
        })

        it('Default Mint Limits decrease takes effect after {0} hours.', async () => {

            //request default limit increase (new_larger_limit)
            await send(limitSetting, OPERATOR, "setSettingDefaultDelayHours", 24)
            await send(limitSetting, OPERATOR, "setSettingDefaultDelayHours", 0)
            await web3.evm.increaseTime(24*60*60*30) // Increase 30days
            await send(limitSetting, OPERATOR, "setDefaultMintDailyLimit", DEFAULT_DAILY_MINT_LIMIT/3)
            
            //expect throw if minting beyond existing limit
            await expectThrow(async () => {
                await send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT/3+1) 
            })
            
        })
        
        it('Default Mint Limits increase takes effect after {24} hours.', async () => {

            //request default limit increase (new_larger_limit)
            await expectNoAsyncThrow(async () => {
                await send(limitSetting, OPERATOR, "setSettingDefaultDelayHours", 24)
                await web3.evm.increaseTime(24*60*60*30) // Increase 30days
                await send(limitSetting, OPERATOR, "setDefaultMintDailyLimit", DEFAULT_DAILY_MINT_LIMIT*2)
            })

            //expect throw if minting beyond existing limit
            await expectThrow(async () => {
                await send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT*2) 
            })

            //expect no throw if minting beyond existing limit after {24} hours
            await web3.evm.increaseTime(24*60*60) // Increase 24 hours

            await expectNoAsyncThrow(async () => {
                await send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT*2) 
            })

            //request one wallet's custom limit increase (new_larger_limit)
            //expect throw if minting beyond existing limit
            //expect no throw if minting beyond existing limit after {24} hours


            //request one wallet's custom limit decrease (new_smaller_limit)
            //expect no throw if minting beyond new_smaller_limit
            //expect throw if minting beyond new_smaller_limit after {24} hours

        })

        it('Default Mint Limits decrease takes effect after {24} hours.', async () => {

            //request default limit increase (new_larger_limit)
            await expectNoAsyncThrow(async () => {
                await send(limitSetting, OPERATOR, "setSettingDefaultDelayHours", 24)
                await web3.evm.increaseTime(24*60*60*30) // Increase 30days
                await send(limitSetting, OPERATOR, "setDefaultMintDailyLimit", DEFAULT_DAILY_MINT_LIMIT/3)
            })

            //expect no throw if minting beyond new_smaller_limit
            await expectNoAsyncThrow(async () => {
                await send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT) 
            })

            await web3.evm.increaseTime(24*60*60) // Increase 24 hours

            //expect throw if minting beyond new_smaller_limit after {24} hours
            await expectThrow(async () => {
                await send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT) 
            })
        })

        it('Custom Mint Limits increase takes effect after {24} hours.', async () => {

            //request default limit increase (new_larger_limit)
            await expectNoAsyncThrow(async () => {
                await send(limitSetting, OPERATOR, "setSettingDefaultDelayHours", 24)
                await web3.evm.increaseTime(24*60*60*30) // Increase 30days
                await send(limitSetting, OPERATOR, "setCustomMintDailyLimit", CUSTOMER, DEFAULT_DAILY_MINT_LIMIT+456)
            })

            //expect throw if minting beyond existing limit
            await expectThrow(async () => {
                await send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT+456) 
            })

            //expect no throw if minting beyond existing limit after {24} hours
            await web3.evm.increaseTime(24*60*60) // Increase 24 hours

            await expectNoAsyncThrow(async () => {
                await send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT+456) 
            })

        })

        it('Custom Mint Limits decrease takes effect after {24} hours.', async () => {

            //request default limit increase (new_larger_limit)
            await expectNoAsyncThrow(async () => {
                await send(limitSetting, OPERATOR, "setSettingDefaultDelayHours", 24)
                await web3.evm.increaseTime(24*60*60*30) // Increase 30days
                await send(limitSetting, OPERATOR, "setCustomMintDailyLimit", CUSTOMER, DEFAULT_DAILY_MINT_LIMIT/3)
            })

            //expect no throw if minting beyond new_smaller_limit
            await expectNoAsyncThrow(async () => {
                await send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT) 
            })

            await web3.evm.increaseTime(24*60*60) // Increase 24 hours

            //expect throw if minting beyond new_smaller_limit after {24} hours
            await expectThrow(async () => {
                await send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT) 
            })

            await expectNoAsyncThrow(async () => {
                await send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT/3) 
            })
        })

        it('Default Burn Limits increase takes effect after {24} hours.', async () => {

            //request default limit increase (new_larger_limit)
            await expectNoAsyncThrow(async () => {
                await send(limitSetting, OPERATOR, "setSettingDefaultDelayHours", 24)
                await web3.evm.increaseTime(24*60*60*30) // Increase 30days
                await send(limitSetting, OPERATOR, "setDefaultMintDailyLimit", DEFAULT_DAILY_MINT_LIMIT*2)
                await send(limitSetting, OPERATOR, "setDefaultBurnDailyLimit", DEFAULT_DAILY_MINT_LIMIT*2) 
            })

            //expect throw if minting beyond existing limit
            await expectThrow(async () => {
                await send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT*2) 
                await send(token, CUSTOMER, approve, address(gate), DEFAULT_DAILY_MINT_LIMIT*2)
                await send(gate, OPERATOR, burn, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT*2) 
            })

            //expect no throw if minting beyond existing limit after {24} hours
            await web3.evm.increaseTime(24*60*60) // Increase 24 hours

            await expectNoAsyncThrow(async () => {
                await send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT*2)
                await send(token, CUSTOMER, approve, address(gate), DEFAULT_DAILY_MINT_LIMIT*2)
                await send(gate, OPERATOR, burn, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT*2)
            })


        })

        it('Default Burn Limits decrease takes effect after {24} hours.', async () => {

            //request default limit increase (new_larger_limit)
            await expectNoAsyncThrow(async () => {
                await send(limitSetting, OPERATOR, "setSettingDefaultDelayHours", 24)
                await web3.evm.increaseTime(24*60*60*30) // Increase 30days
                await send(limitSetting, OPERATOR, "setDefaultMintDailyLimit", DEFAULT_DAILY_MINT_LIMIT/3) 
                await send(limitSetting, OPERATOR, "setDefaultBurnDailyLimit", DEFAULT_DAILY_MINT_LIMIT/3) 
            })

            //expect no throw if minting beyond new_smaller_limit
            await expectNoAsyncThrow(async () => {
                await send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT)
                await send(token, CUSTOMER, approve, address(gate), DEFAULT_DAILY_MINT_LIMIT)
                await send(gate, OPERATOR, burn, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT) 
            })

            await web3.evm.increaseTime(24*60*60) // Increase 24 hours

            //expect throw if minting beyond new_smaller_limit after {24} hours
            await expectThrow(async () => {
                await send(gate, OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT)
                await send(token, CUSTOMER, approve, address(gate), DEFAULT_DAILY_MINT_LIMIT)
                await send(gate, OPERATOR, burn, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT)
            })
        })

        it('Custom Burn Limits increase takes effect after {24} hours.', async () => {

            let randomLimit = DEFAULT_DAILY_MINT_LIMIT*3

            //request default limit increase (new_larger_limit)
            await expectNoAsyncThrow(async () => {
                await send(limitSetting, OPERATOR, "setSettingDefaultDelayHours", 24)
                await web3.evm.increaseTime(24*60*60*30) // Increase 30days
                await send(limitSetting, OPERATOR, "setCustomMintDailyLimit", CUSTOMER, randomLimit)
                await send(limitSetting, OPERATOR, "setCustomBurnDailyLimit", CUSTOMER, randomLimit)
            })

            //expect throw if minting beyond existing limit
            await expectThrow(async () => {
                await send(gate, OPERATOR, mint, CUSTOMER, randomLimit) 
                await send(token, CUSTOMER, approve, address(gate), randomLimit)
                await send(gate, OPERATOR, burn, CUSTOMER, randomLimit) 
            })

            //expect no throw if minting beyond existing limit after {24} hours
            await web3.evm.increaseTime(24*60*60) // Increase 24 hours

            await expectNoAsyncThrow(async () => {
                await send(gate, OPERATOR, mint, CUSTOMER, randomLimit) 
                await send(token, CUSTOMER, approve, address(gate), randomLimit)
                await send(gate, OPERATOR, burn, CUSTOMER, randomLimit) 
            })

        })

        it('Custom Burn Limits decrease takes effect after {24} hours.', async () => {

            let randomLimit = DEFAULT_DAILY_MINT_LIMIT

            //request default limit increase (new_larger_limit)
            await expectNoAsyncThrow(async () => {
                await send(limitSetting, OPERATOR, "setSettingDefaultDelayHours", 24)
                await web3.evm.increaseTime(24*60*60*30) // Increase 30days
                await send(limitSetting, OPERATOR, "setCustomMintDailyLimit", CUSTOMER, randomLimit/3)
                await send(limitSetting, OPERATOR, "setCustomBurnDailyLimit", CUSTOMER, randomLimit/3)
            })

            //expect throw if minting beyond existing limit
            await expectNoAsyncThrow(async () => {
                await send(gate, OPERATOR, mint, CUSTOMER, randomLimit) 
                await send(token, CUSTOMER, approve, address(gate), randomLimit)
                await send(gate, OPERATOR, burn, CUSTOMER, randomLimit) 
            })

            //expect no throw if minting beyond existing limit after {24} hours
            await web3.evm.increaseTime(24*60*60) // Increase 24 hours

            await expectThrow(async () => {
                await send(gate, OPERATOR, mint, CUSTOMER, randomLimit) 
                await send(token, CUSTOMER, approve, address(gate), randomLimit)
                await send(gate, OPERATOR, burn, CUSTOMER, randomLimit) 
            })

        })

        it('Limits configuration change delay time (e.g. 24 hours) is configurable in the unit of hours.', async () => {
            await expectNoAsyncThrow(async () => {
                await send(limitSetting, OPERATOR, "setSettingDefaultDelayHours", 24)
                await send(limitSetting, OPERATOR, "setSettingDefaultDelayHours", 10)
                await send(limitSetting, OPERATOR, "setSettingDefaultDelayHours", 25)
                await send(limitSetting, OPERATOR, "setSettingDefaultDelayHours", 0)
                await send(limitSetting, OPERATOR, "setSettingDefaultDelayHours", -1)
            })
        })

        it.skip('Limits logic is upgrade-able.', async () => {

        })

        it('Changes to the mint/burn quantity limit generates an event', async ()=>{
            let randomLimit = 148
            let events = await txEvents(await send(limitSetting, OPERATOR, "setDefaultMintDailyLimit", randomLimit))
            events = events.concat(await txEvents(await send(limitSetting, OPERATOR, "setDefaultMintDailyLimit", randomLimit)))
            events = events.concat(await txEvents(await send(limitSetting, OPERATOR, "setCustomMintDailyLimit", CUSTOMER ,randomLimit)))
            events = events.concat(await txEvents(await send(limitSetting, OPERATOR, "setCustomBurnDailyLimit", CUSTOMER, randomLimit)))

            expect(events).containSubset([
                {NAME: 'MintLimit', wad: randomLimit.toString()},
                {NAME: 'MintLimit', guy: CUSTOMER, wad: randomLimit.toString()},
                {NAME: 'BurnLimit', wad: randomLimit.toString()},
                {NAME: 'BurnLimit', guy: CUSTOMER, wad: randomLimit.toString()},
            ])
        })
    })
})
