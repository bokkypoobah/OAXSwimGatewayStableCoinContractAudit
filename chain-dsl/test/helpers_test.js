const {
    expect,
    expectAsyncThrow,
    expectNoAsyncThrow,
    expectThrow
} = require('./helpers')

describe('expectThrow', function () {
    it('Fails when no exception is thrown', async () => {
        await expectAsyncThrow(async () => {
            await expectThrow(async () => {
                return "No exception is thrown"
            })
        })
    })

    it('catches EVM exceptions', async () => {
        await expectNoAsyncThrow(async () => {
            await expectThrow(async () => {
                throw Error("VM Exception")
            })
        })
    })

    it('re-throws non EVM exceptions', async () => {
        await expectAsyncThrow(async () => {
            await expectThrow(async () => {
                throw Error("Not and EVM EXCEPTION")
            })
        })
    })
})
