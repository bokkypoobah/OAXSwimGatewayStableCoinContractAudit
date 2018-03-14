const createEventHandler = require('../services/blockchain-event-handler')

module.exports = (web3, gate, token) => {
    const {withdrawalRequests} = createEventHandler(web3, gate, token)

    return {
        getRequests: async (req, res, next) => {
            res.json({data: await withdrawalRequests()})
            next()
        }
    }
}
