const env = process.env.NODE_ENV || "development"
const config = require('./config.json')[env]
const Web3 = require('web3')
const createApp = require('./lib/app')

//todo url from config
let web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"))
let Gate = require('chain/out/Gate.json')
let gate = new web3.eth.Contract(Gate.jsonInterface)
let Token = require('chain/out/FiatToken.json')
let token = new web3.eth.Contract(Token.jsonInterface)
gate.options.address = Gate.address;

createApp(config, web3, gate, token)
    .then((app) => {
        app.listen(5000, function (err) {
            if (!err) {
                console.log("Site is live")
            }
            else {
                console.log(err)
            }
        })
    })
    .catch((err) => {
        console.error('Application startup error:', err)
    })
