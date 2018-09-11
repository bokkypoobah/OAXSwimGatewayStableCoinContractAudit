const {expect, expectNoAsyncThrow, expectThrow} = require('chain-dsl/test/helpers')
const {address, wad, send, call, txEvents} = require('chain-dsl')
const deployer = require('../lib/deployer')

const mint = 'mint(address,uint256)'
const burn = 'burn(address,uint256)'
const approve = 'approve'
const lastLimitResetTime = 'lastLimitResetTime'

function hours(hrs) {
    return hrs * 1000 * 60 * 60
}

describe("Limits:", function () {
    this.timeout(30000)

    let gate, gateRoles, token, limitController, limitSetting,
        DEPLOYER,
        SYSTEM_ADMIN, KYC_OPERATOR, MONEY_OPERATOR, MONEY_OPERATOR_2,
        CUSTOMER,
        CUSTOMER_TWO,
        MIN_AMT,
        AMT,
        DEFAULT_DAILY_MINT_LIMIT,
        DEFAULT_DAILY_BURN_LIMIT

    before('deployment', async () => {
        ;[
            DEPLOYER,
            SYSTEM_ADMIN, KYC_OPERATOR, MONEY_OPERATOR, MONEY_OPERATOR_2,
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
            gate, gateRoles, token,
            limitController,
            limitSetting
        } = await deployer.base(
            web3,
            contractRegistry,
            DEPLOYER,
            SYSTEM_ADMIN, KYC_OPERATOR, MONEY_OPERATOR,
            SYSTEM_ADMIN,
            DEFAULT_DAILY_MINT_LIMIT,
            DEFAULT_DAILY_BURN_LIMIT,
            DEFAULT_LIMIT_COUNTER_RESET_TIME_OFFSET,
            DEFAULT_SETTING_DELAY_HOURS
        ))

        const MONEY_OPERATOR_ROLE = await call(gateRoles, 'MONEY_OPERATOR')
        await send(gateRoles, DEPLOYER, 'setUserRole', MONEY_OPERATOR_2, MONEY_OPERATOR_ROLE, true)

    })

    context("Limits Enforcement -", async () => {

        it("should be able to apply all limit setting", async () => {


            await send(limitSetting, SYSTEM_ADMIN, "setDefaultMintDailyLimit", wad(25000))
            await send(limitSetting, SYSTEM_ADMIN, "setCustomMintDailyLimit", MONEY_OPERATOR, wad(10000))
            await send(limitSetting, SYSTEM_ADMIN, "setCustomMintDailyLimit", MONEY_OPERATOR_2, wad(25000))

            await expect(send(gate, MONEY_OPERATOR, mint, CUSTOMER, wad(9000)))
            expect(await call(limitController, 'mintLimitCounter')).to.eq(9000)
            expect(await call(token, "balanceOf", CUSTOMER)).eq(9000)

            await expect(send(gate, MONEY_OPERATOR, mint, CUSTOMER, wad(5000)))
            expect(await call(limitController, 'mintLimitCounter')).to.eq(14000)
            expect(await call(token, "balanceOf", CUSTOMER)).eq(14000)

            await expectThrow(async () =>
                send(gate, MONEY_OPERATOR, mint, CUSTOMER, wad(11000)))
            expect(await call(limitController, 'mintLimitCounter')).to.eq(14000)
            expect(await call(token, "balanceOf", CUSTOMER)).eq(14000)

            await expectNoAsyncThrow(async () =>
                send(gate, MONEY_OPERATOR_2, mint, CUSTOMER, wad(11000)))
            expect(await call(limitController, 'mintLimitCounter')).to.eq(25000)
            expect(await call(token, "balanceOf", CUSTOMER)).eq(25000)

            await expectThrow(async () =>
                send(gate, MONEY_OPERATOR, mint, CUSTOMER, wad(2000)))
            expect(await call(limitController, 'mintLimitCounter')).to.eq(25000)
            expect(await call(token, "balanceOf", CUSTOMER)).eq(25000)
        })

        it("Non-custom MONEY_OPERATOR should be able to mint any amount within the limit", async()=>{

            await send(limitSetting, SYSTEM_ADMIN, "setDefaultMintDailyLimit", wad(25000))

            await expect(send(gate, MONEY_OPERATOR_2, mint, CUSTOMER, wad(25000)))
            expect(await call(limitController, 'mintLimitCounter')).to.eq(25000)
            expect(await call(token, "balanceOf", CUSTOMER)).eq(25000)

        })

        it('No one can mint more than the daily mint in a same day', async () => {
            web3.evm.increaseTime(hours(2 * 24))
            await expect(send(gate, MONEY_OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT))
            await expect(send(gate, MONEY_OPERATOR, mint, CUSTOMER, 1))
                .to.be.rejected
            await expect(send(gate, MONEY_OPERATOR_2, mint, CUSTOMER, 1))
                .to.be.rejected
        })

        it('Can not mint more than daily mint limit in same day', async () => {
            const moreThanADay = hours((1 + 2) * 24)
            web3.evm.increaseTime(moreThanADay)
            await send(gate, MONEY_OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT - 1)
        })

        it('Can never burn more than the daily burn limit at once', async () => {
            //prepare balance
            send(gate, MONEY_OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT - 1)
            web3.evm.increaseTime(hours(2 * 24))
            send(gate, MONEY_OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT - 1)

            send(token, CUSTOMER, approve, address(gate), DEFAULT_DAILY_BURN_LIMIT)
            await expectThrow(async () =>
                send(gate, MONEY_OPERATOR, burn, CUSTOMER, DEFAULT_DAILY_BURN_LIMIT + 1))
        })

        it('Can not burn more than daily burn limit in same day', async () => {
            //prepare balance
            await send(gate, MONEY_OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT - 1)
            web3.evm.increaseTime(hours(2 * 24))
            await send(gate, MONEY_OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT - 1)
            web3.evm.increaseTime(hours(2 * 24))
            await send(gate, MONEY_OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT - 1)
            web3.evm.increaseTime(hours(2 * 24))
            await send(gate, MONEY_OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT - 1)

            const moreThanADay = hours((1 + 2) * 24)
            await web3.evm.increaseTime(moreThanADay)

            await send(token, CUSTOMER, approve, address(gate), DEFAULT_DAILY_BURN_LIMIT)
            await expectNoAsyncThrow(async () =>
                await send(gate, MONEY_OPERATOR, burn, CUSTOMER, DEFAULT_DAILY_BURN_LIMIT - 1))
        })

        it('Mint/burn counter is 0 after deployments', async () => {
            const mintLimitCounter = await call(limitController, 'mintLimitCounter')
            expect(mintLimitCounter).to.eq(0)
            const burnLimitCounter = await call(limitController, 'burnLimitCounter')
            expect(burnLimitCounter).to.eq(0)
        })

        it('Resets on 00:00 UTC', async () => {
            const time = await call(limitController, lastLimitResetTime)
            expect(time | 0).to.be.above(0)
            expect(time % (24 * 60 * 60)).to.eq(0)
        })

        it('Delay reset to 03:00 UTC', async () => {
            let randomDelayHours = 3 * 3600;
            await send(limitSetting, SYSTEM_ADMIN, "setLimitCounterResetTimeOffset", randomDelayHours)
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
            await send(limitSetting, SYSTEM_ADMIN, "setLimitCounterResetTimeOffset", delayHours)
            await send(gate, MONEY_OPERATOR, mint, CUSTOMER, 1)
            expect(await call(limitController,"mintLimitCounter")).to.eq(1)
            web3.evm.increaseTime(24*60*60)    
            await send(gate, MONEY_OPERATOR, mint, CUSTOMER, 1)
            expect(await call(limitController, "mintLimitCounter")).to.eq(1)
        })

        it('Limits have reset for {-11} hours offset', async ()=>{
            let delayHours = -11 * 3600

            //increase time to the next 00:00 UTC
            let now = Date.now() /1000 | 0 
            let today = now - (now % (24*60*60))
            let nextDay = today + 24*60*60

            web3.evm.increaseTime(nextDay - now)
            await send(limitSetting, SYSTEM_ADMIN, "setLimitCounterResetTimeOffset", delayHours)
            await send(gate, MONEY_OPERATOR, mint, CUSTOMER, 1)
            expect(await call(limitController,"mintLimitCounter")).to.eq(1)
            web3.evm.increaseTime((24-11)*60*60)    
            await send(gate, MONEY_OPERATOR, mint, CUSTOMER, 1)
            expect(await call(limitController, "mintLimitCounter")).to.eq(1)
        })

        it('Limits have reset for {+14} hours offset', async ()=>{
            let delayHours = 14 * 3600

            //increase time to the next 00:00 UTC
            let now = Date.now() /1000 | 0 
            let today = now - (now % (24*60*60))
            let nextDay = today + 24*60*60

            web3.evm.increaseTime(nextDay - now)
            await send(limitSetting, SYSTEM_ADMIN, "setLimitCounterResetTimeOffset", delayHours)
            await send(gate, MONEY_OPERATOR, mint, CUSTOMER, 1)
            expect(await call(limitController,"mintLimitCounter")).to.eq(1)
            web3.evm.increaseTime(24*60*60)    
            //should throw error when within the period
            expect(await call(limitController,"mintLimitCounter")).to.eq(1)
            //add offset
            web3.evm.increaseTime(14*60*60)  
            await send(gate, MONEY_OPERATOR, mint, CUSTOMER, 1)
            expect(await call(limitController, "mintLimitCounter")).to.eq(1)
        })

        it('Can never set offset time to <11 hours and >14 hours', async ()=> {
            let delayHours = -12 * 3600
            await expectThrow(async ()=>{
                await send(limitSetting, SYSTEM_ADMIN, "setLimitCounterResetTimeOffset", delayHours)
            })
            delayHours = 15 * 3600
            await expectThrow(async ()=>{
                await send(limitSetting, SYSTEM_ADMIN, "setLimitCounterResetTimeOffset", delayHours)
            })
            
        })

        it('Limits are guaranteed to reset after 24h', async ()=> {
            const moreThanADay = hours((1 + 2) * 24)

            web3.evm.increaseTime(moreThanADay)

            await expectNoAsyncThrow(async () =>
                send(gate, MONEY_OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT))

            web3.evm.increaseTime(moreThanADay)

            await expectNoAsyncThrow(async () =>
                send(gate, MONEY_OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT))

            web3.evm.increaseTime(moreThanADay)

            await expectNoAsyncThrow(async () =>
                send(gate, MONEY_OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT))

            web3.evm.increaseTime(hours(24))

            await expectNoAsyncThrow(async () =>
                send(gate, MONEY_OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT))

            send(token, CUSTOMER, approve, address(gate), DEFAULT_DAILY_BURN_LIMIT)
            await expectNoAsyncThrow(async () =>
                send(gate, MONEY_OPERATOR, burn, CUSTOMER, DEFAULT_DAILY_BURN_LIMIT))

            web3.evm.increaseTime(hours(24))

            send(token, CUSTOMER, approve, address(gate), DEFAULT_DAILY_BURN_LIMIT)
            await expectNoAsyncThrow(async () =>
                send(gate, MONEY_OPERATOR, burn, CUSTOMER, DEFAULT_DAILY_BURN_LIMIT))
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
            let mintLimit = await call(limitSetting, "getMintDailyLimit", MONEY_OPERATOR)
            let burnLimit = await call(limitSetting, "getBurnDailyLimit", MONEY_OPERATOR)
            //This is only because the default mint/burn limit is different
            expect(mintLimit).to.not.eq(burnLimit)

            //DO limit change
            await send(limitSetting, SYSTEM_ADMIN, "setCustomMintDailyLimit", MONEY_OPERATOR_2, DEFAULT_DAILY_MINT_LIMIT/3)
            await send(limitSetting, SYSTEM_ADMIN, "setCustomBurnDailyLimit", MONEY_OPERATOR_2, DEFAULT_DAILY_BURN_LIMIT/3)

            let vipMintLimit = await call(limitSetting, "getMintDailyLimit", MONEY_OPERATOR_2)
            let vipBurnLimit = await call(limitSetting, "getBurnDailyLimit", MONEY_OPERATOR_2)
            
            expect(mintLimit).to.not.eq(vipMintLimit)
            expect(burnLimit).to.not.eq(vipBurnLimit)

            expect(mintLimit).to.eq(DEFAULT_DAILY_MINT_LIMIT)
            expect(burnLimit).to.eq(DEFAULT_DAILY_BURN_LIMIT)
        })

        it('Only authorised ethereum addresses can change limits configuration.', async () => {
            let randomLimit = wad(1000)
            await expectNoAsyncThrow(async () => {
                await send(limitSetting, SYSTEM_ADMIN, "setDefaultMintDailyLimit", randomLimit)
            })
            expect(await call(limitSetting, "getMintDailyLimit", "0x0")).to.eq(randomLimit)

            await expectNoAsyncThrow(async () => {
                await send(limitSetting, SYSTEM_ADMIN, "setDefaultBurnDailyLimit", randomLimit * 3)
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
                await send(limitSetting, SYSTEM_ADMIN, "setCustomMintDailyLimit", MONEY_OPERATOR_2, randomLimit)
            })
            let vipMintLimit = await call(limitSetting, "getMintDailyLimit", MONEY_OPERATOR_2)
            expect(vipMintLimit).to.eq(randomLimit)

            await expectNoAsyncThrow(async () => {
                await send(limitSetting, SYSTEM_ADMIN, "setCustomBurnDailyLimit", MONEY_OPERATOR_2, randomLimit * 2)
            })
            let vipBurnLimit = await call(limitSetting, "getBurnDailyLimit", MONEY_OPERATOR_2)
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

        it('Maximum number of limit setting is 1 week', async ()=> {
            // 169 = Hours of 1 week + 1 hour
            await expect(send(limitSetting, SYSTEM_ADMIN, "setDefaultDelayHours", 169))
                .to.be.rejected
        })

        it('Default Mint Limits increase takes effect after {0} hours.', async () => {

            //request default limit increase (new_larger_limit)
            await send(limitSetting, SYSTEM_ADMIN, "setDefaultDelayHours", 24)
            await send(limitSetting, SYSTEM_ADMIN, "setDefaultDelayHours", 0)
            await web3.evm.increaseTime(24*60*60*30) // Increase 30days
            await send(limitSetting, SYSTEM_ADMIN, "setDefaultMintDailyLimit", DEFAULT_DAILY_MINT_LIMIT*2)
            
            //expect throw if minting beyond existing limit
            await send(gate, MONEY_OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT*2)
            await expectThrow(async () => {
                await send(gate, MONEY_OPERATOR, mint, CUSTOMER, 1)
            })
            
            //expect no throw if minting beyond existing limit after {24} hours
            await web3.evm.increaseTime(24*60*60) // Increase 24 hours
            await send(gate, MONEY_OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT*2)
        })

        it('Default Mint Limits decrease takes effect after {0} hours.', async () => {

            //request default limit increase (new_larger_limit)
            await send(limitSetting, SYSTEM_ADMIN, "setDefaultDelayHours", 24)
            await send(limitSetting, SYSTEM_ADMIN, "setDefaultDelayHours", 0)
            await web3.evm.increaseTime(24*60*60*30) // Increase 30days
            await send(limitSetting, SYSTEM_ADMIN, "setDefaultMintDailyLimit", DEFAULT_DAILY_MINT_LIMIT/3)
            
            //expect throw if minting beyond existing limit
            await expectThrow(async () => {
                await send(gate, MONEY_OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT/3+1)
            })
            
        })
        
        it('Default Mint Limits increase takes effect after {24} hours.', async () => {

            //request default limit increase (new_larger_limit)
            await expectNoAsyncThrow(async () => {
                await send(limitSetting, SYSTEM_ADMIN, "setDefaultDelayHours", 24)
                await web3.evm.increaseTime(24*60*60*30) // Increase 30days
                await send(limitSetting, SYSTEM_ADMIN, "setDefaultMintDailyLimit", DEFAULT_DAILY_MINT_LIMIT*2)
            })

            //expect throw if minting beyond existing limit
            await expectThrow(async () => {
                await send(gate, MONEY_OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT*2)
            })

            //expect no throw if minting beyond existing limit after {24} hours
            await web3.evm.increaseTime(24*60*60) // Increase 24 hours

            await expectNoAsyncThrow(async () => {
                await send(gate, MONEY_OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT*2)
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
                await send(limitSetting, SYSTEM_ADMIN, "setDefaultDelayHours", 24)
                await web3.evm.increaseTime(24*60*60*30) // Increase 30days
                await send(limitSetting, SYSTEM_ADMIN, "setDefaultMintDailyLimit", DEFAULT_DAILY_MINT_LIMIT/3)
            })

            //expect no throw if minting beyond new_smaller_limit
            await expectNoAsyncThrow(async () => {
                await send(gate, MONEY_OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT)
            })

            await web3.evm.increaseTime(24*60*60) // Increase 24 hours

            //expect throw if minting beyond new_smaller_limit after {24} hours
            await expectThrow(async () => {
                await send(gate, MONEY_OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT)
            })
        })

        it('Custom Mint Limits increase takes effect after {24} hours.', async () => {

            //request default limit increase (new_larger_limit)
            await expectNoAsyncThrow(async () => {
                await send(limitSetting, SYSTEM_ADMIN, "setDefaultDelayHours", 24)
                await web3.evm.increaseTime(24*60*60*30) // Increase 30days
                await send(limitSetting, SYSTEM_ADMIN, "setDefaultMintDailyLimit", DEFAULT_DAILY_MINT_LIMIT+456)
                await send(limitSetting, SYSTEM_ADMIN, "setCustomMintDailyLimit", MONEY_OPERATOR, DEFAULT_DAILY_MINT_LIMIT+100)
            })

            //expect throw if minting beyond existing limit
            await expectThrow(async () => {
                await send(gate, MONEY_OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT+100)
            })

            //expect no throw if minting beyond existing limit after {24} hours
            await web3.evm.increaseTime(24*60*60) // Increase 24 hours

            await expectNoAsyncThrow(async () => {
                await send(gate, MONEY_OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT+100)
            })

        })

        it('Custom Mint Limits decrease takes effect after {24} hours.', async () => {

            //request default limit increase (new_larger_limit)
            await expectNoAsyncThrow(async () => {
                await send(limitSetting, SYSTEM_ADMIN, "setDefaultDelayHours", 24)
                await web3.evm.increaseTime(24*60*60*30) // Increase 30days
                await send(limitSetting, SYSTEM_ADMIN, "setCustomMintDailyLimit", MONEY_OPERATOR, DEFAULT_DAILY_MINT_LIMIT/3)
            })

            //expect no throw if minting beyond new_smaller_limit
            await expectNoAsyncThrow(async () => {
                await send(gate, MONEY_OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT)
            })

            await web3.evm.increaseTime(25*60*60) // Increase 24 hours

            //expect throw if minting beyond new_smaller_limit after {24} hours
            await expectThrow(async () => {
                await send(gate, MONEY_OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT)
            })

            await expectNoAsyncThrow(async () => {
                await send(gate, MONEY_OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT/3)
            })
        })

        it('Should be equal to existing value instead of buffer', async () => {
            ({
                limitSetting: limitSetting2
            } = await deployer.base(
                web3,
                contractRegistry,
                DEPLOYER,
                SYSTEM_ADMIN, KYC_OPERATOR, MONEY_OPERATOR,
                SYSTEM_ADMIN,
                1e18,
                1e18,
                DEFAULT_LIMIT_COUNTER_RESET_TIME_OFFSET,
                3600
            ))

            //request default limit increase (new_larger_limit)
            await expectNoAsyncThrow(async () => {
              await send(limitSetting2, SYSTEM_ADMIN, "setCustomMintDailyLimit", MONEY_OPERATOR, 100)
              let mintLimit = await call(limitSetting2, "getMintDailyLimit", MONEY_OPERATOR)
              expect(mintLimit).to.eq(1e18)
            })


        })

        it('Default Burn Limits increase takes effect after {24} hours.', async () => {

            //request default limit increase (new_larger_limit)
            await expectNoAsyncThrow(async () => {
                await send(limitSetting, SYSTEM_ADMIN, "setDefaultDelayHours", 24)
                await web3.evm.increaseTime(24*60*60*30) // Increase 30days
                await send(limitSetting, SYSTEM_ADMIN, "setDefaultMintDailyLimit", DEFAULT_DAILY_MINT_LIMIT*2)
                await send(limitSetting, SYSTEM_ADMIN, "setDefaultBurnDailyLimit", DEFAULT_DAILY_MINT_LIMIT*2)
            })

            //expect throw if minting beyond existing limit
            await expectThrow(async () => {
                await send(gate, MONEY_OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT*2)
                await send(token, CUSTOMER, approve, address(gate), DEFAULT_DAILY_MINT_LIMIT*2)
                await send(gate, MONEY_OPERATOR, burn, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT*2)
            })

            //expect no throw if minting beyond existing limit after {24} hours
            await web3.evm.increaseTime(24*60*60) // Increase 24 hours

            await expectNoAsyncThrow(async () => {
                await send(gate, MONEY_OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT*2)
                await send(token, CUSTOMER, approve, address(gate), DEFAULT_DAILY_MINT_LIMIT*2)
                await send(gate, MONEY_OPERATOR, burn, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT*2)
            })


        })

        it('Default Burn Limits decrease takes effect after {24} hours.', async () => {

            //request default limit increase (new_larger_limit)
            await expectNoAsyncThrow(async () => {
                await send(limitSetting, SYSTEM_ADMIN, "setDefaultDelayHours", 24)
                await web3.evm.increaseTime(24*60*60*30) // Increase 30days
                await send(limitSetting, SYSTEM_ADMIN, "setDefaultMintDailyLimit", DEFAULT_DAILY_MINT_LIMIT/3)
                await send(limitSetting, SYSTEM_ADMIN, "setDefaultBurnDailyLimit", DEFAULT_DAILY_MINT_LIMIT/3)
            })

            //expect no throw if minting beyond new_smaller_limit
            await expectNoAsyncThrow(async () => {
                await send(gate, MONEY_OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT)
                await send(token, CUSTOMER, approve, address(gate), DEFAULT_DAILY_MINT_LIMIT)
                await send(gate, MONEY_OPERATOR, burn, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT)
            })

            await web3.evm.increaseTime(24*60*60) // Increase 24 hours

            //expect throw if minting beyond new_smaller_limit after {24} hours
            await expectThrow(async () => {
                await send(gate, MONEY_OPERATOR, mint, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT)
                await send(token, CUSTOMER, approve, address(gate), DEFAULT_DAILY_MINT_LIMIT)
                await send(gate, MONEY_OPERATOR, burn, CUSTOMER, DEFAULT_DAILY_MINT_LIMIT)
            })
        })

        it('Custom Burn Limits increase takes effect after {24} hours.', async () => {

            let randomLimit = DEFAULT_DAILY_MINT_LIMIT*3

            //request default limit increase (new_larger_limit)
            await expectNoAsyncThrow(async () => {
                await send(limitSetting, SYSTEM_ADMIN, "setDefaultDelayHours", 24)
                await web3.evm.increaseTime(24*60*60*30) // Increase 30days
                await send(limitSetting, SYSTEM_ADMIN, "setDefaultMintDailyLimit", randomLimit)
                await send(limitSetting, SYSTEM_ADMIN, "setDefaultBurnDailyLimit", randomLimit)
                await send(limitSetting, SYSTEM_ADMIN, "setCustomMintDailyLimit", MONEY_OPERATOR, randomLimit)
                await send(limitSetting, SYSTEM_ADMIN, "setCustomBurnDailyLimit", MONEY_OPERATOR, randomLimit)
            })

            //expect throw if minting beyond existing limit
            await expectThrow(async () => {
                await send(gate, MONEY_OPERATOR, mint, CUSTOMER, randomLimit)
                await send(token, CUSTOMER, approve, address(gate), randomLimit)
                await send(gate, MONEY_OPERATOR, burn, CUSTOMER, randomLimit)
            })

            //expect no throw if minting beyond existing limit after {24} hours
            await web3.evm.increaseTime(24*60*60) // Increase 24 hours

            await expectNoAsyncThrow(async () => {
                await send(gate, MONEY_OPERATOR, mint, CUSTOMER, randomLimit)
                await send(token, CUSTOMER, approve, address(gate), randomLimit)
                await send(gate, MONEY_OPERATOR, burn, CUSTOMER, randomLimit)
            })

        })

        it('Custom Burn Limits decrease takes effect after {24} hours.', async () => {

            let randomLimit = DEFAULT_DAILY_MINT_LIMIT

            //request default limit increase (new_larger_limit)
            await expectNoAsyncThrow(async () => {
                await send(limitSetting, SYSTEM_ADMIN, "setDefaultDelayHours", 24)
                await web3.evm.increaseTime(24*60*60*30) // Increase 30days
                await send(limitSetting, SYSTEM_ADMIN, "setCustomMintDailyLimit", MONEY_OPERATOR, randomLimit/3)
                await send(limitSetting, SYSTEM_ADMIN, "setCustomBurnDailyLimit", MONEY_OPERATOR, randomLimit/3)
            })

            //expect throw if minting beyond existing limit
            await expectNoAsyncThrow(async () => {
                await send(gate, MONEY_OPERATOR, mint, CUSTOMER, randomLimit)
                await send(token, CUSTOMER, approve, address(gate), randomLimit)
                await send(gate, MONEY_OPERATOR, burn, CUSTOMER, randomLimit)
            })

            //expect no throw if minting beyond existing limit after {24} hours
            await web3.evm.increaseTime(24*60*60) // Increase 24 hours

            await expectThrow(async () => {
                await send(gate, MONEY_OPERATOR, mint, CUSTOMER, randomLimit)
                await send(token, CUSTOMER, approve, address(gate), randomLimit)
                await send(gate, MONEY_OPERATOR, burn, CUSTOMER, randomLimit)
            })

        })

        it('Limits configuration change delay time (e.g. 24 hours) is configurable in the unit of hours.', async () => {
            await expectNoAsyncThrow(async () => {
                await send(limitSetting, SYSTEM_ADMIN, "setDefaultDelayHours", 24)
                await send(limitSetting, SYSTEM_ADMIN, "setDefaultDelayHours", 10)
                await send(limitSetting, SYSTEM_ADMIN, "setDefaultDelayHours", 25)
                await send(limitSetting, SYSTEM_ADMIN, "setDefaultDelayHours", 0)
                await expect(send(limitSetting, SYSTEM_ADMIN, "setDefaultDelayHours", -1))
                    .to.be.rejected
            })
        })

        it('Changes to the mint/burn quantity limit generates an event', async ()=>{
            let randomLimit = 148
            let events = await txEvents(await send(limitSetting, SYSTEM_ADMIN, "setDefaultMintDailyLimit", randomLimit))
            events = events.concat(await txEvents(await send(limitSetting, SYSTEM_ADMIN, "setDefaultMintDailyLimit", randomLimit)))
            events = events.concat(await txEvents(await send(limitSetting, SYSTEM_ADMIN, "setCustomMintDailyLimit", MONEY_OPERATOR ,randomLimit)))
            events = events.concat(await txEvents(await send(limitSetting, SYSTEM_ADMIN, "setCustomBurnDailyLimit", MONEY_OPERATOR, randomLimit)))

            expect(events).containSubset([
                {NAME: 'AdjustMintLimitRequested', wad: randomLimit.toString()},
                {NAME: 'AdjustMintLimitRequested', guy: MONEY_OPERATOR, wad: randomLimit.toString()},
                {NAME: 'AdjustBurnLimitRequested', wad: randomLimit.toString()},
                {NAME: 'AdjustBurnLimitRequested', guy: MONEY_OPERATOR, wad: randomLimit.toString()},
            ])
        })

        it('Cannot set custom limit address to 0x0', async ()=>{
            await expectThrow(async () => {
                await send(limitSetting, SYSTEM_ADMIN, "setCustomMintDailyLimit", "0x0" , 100)
            })
            await expectThrow(async () => {
                await send(limitSetting, SYSTEM_ADMIN, "setCustomBurnDailyLimit", "0x0" , 100)
            })
        })



    })
})
