const createEventHandler = require('../services/blockchain-event-handler')

module.exports = (web3, gate, token) => {
    const {depositRequests} = createEventHandler(web3, gate, token)

    return {
        async getRequests(req, res, next) {
            const deposits = await depositRequests()
            res.json({data: deposits})
            next()
        }
    }
}


