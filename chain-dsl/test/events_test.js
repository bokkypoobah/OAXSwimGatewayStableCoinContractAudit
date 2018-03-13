const {
    expect,
} = require('./helpers')

const {distillEvent, txEvents} = require('../index')

describe('distillEvent', () => {
    it('works', async () => {
        const aWeb3Event = {
            logIndex: 1,
            transactionIndex: 0,
            transactionHash: '0x3e434eb17ac4eacc1033c2d862406a17ec54e6ce99752ec33a8a79b2711fd2c5',
            blockHash: '0xed59d2f5be5ecf23155f2febac024a4bc883127bf16aaefee9c7da3905452af9',
            blockNumber: 10,
            address: '0xF12b5dd4EAD5F743C6BaA640B0216200e89B60Da',
            type: 'mined',
            id: 'log_f8e0fe8a',
            returnValues: {
                '0': '0x0000000000000000000000000000000000000000',
                '1': '0xf17f52151EbEF6C7334FAD080c5704D77216b732',
                '2': '999',
                src: '0x0000000000000000000000000000000000000000',
                dst: '0xf17f52151EbEF6C7334FAD080c5704D77216b732',
                wad: '999'
            },
            event: 'Transfer',
            signature: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
            raw: {
                data: '0x00000000000000000000000000000000000000000000000000000000000003e7',
                topics:
                    ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
                        '0x0000000000000000000000000000000000000000000000000000000000000000',
                        '0x000000000000000000000000f17f52151ebef6c7334fad080c5704d77216b732']
            }
        }

        expect(distillEvent(aWeb3Event))
            .eql({
                NAME: 'Transfer',
                src: '0x0000000000000000000000000000000000000000',
                dst: '0xf17f52151EbEF6C7334FAD080c5704D77216b732',
                wad: '999'
            })
    })
})

describe('txEvents', () => {
    it('works', async () => {
        const aTransactionReceipt = {
            events: {
                Mint: {event: 'Mint', logIndex: 0, returnValues: {a: 0}},
                Transfer: [
                    {event: 'Transfer', logIndex: 1, returnValues: {b: 1}},
                    {event: 'Transfer', logIndex: 2, returnValues: {c: 2}}
                ]
            }
        }
        expect(await txEvents(Promise.resolve(aTransactionReceipt)))
            .eql([
                {NAME: 'Mint', a: 0},
                {NAME: 'Transfer', b: 1},
                {NAME: 'Transfer', c: 2}
            ])
    })
})
