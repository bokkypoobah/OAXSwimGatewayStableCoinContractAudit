/**
 * Run this script to create default Application and its Owner
 */

const env = process.env.NODE_ENV || "development"
const config = require('./config.json')[env]
const createModels = require("./lib/models")
const models = createModels(config)
let App = models.application_client
let User = models.user

let assert = require('chai').assert;


assert.exists(process.env.DEFAULT_OWNER_NAME,'please provide process.env.DEFAULT_OWNER_NAME for default Owner');
assert.exists(process.env.DEFAULT_OWNER_PASSWORD,'please provide process.env.DEFAULT_OWNER_PASSWORD for default Owner');
assert.exists(process.env.DEFAULT_OWNER_ETH_ADDRESS,'please provide process.env.DEFAULT_OWNER_ETH_ADDRESS for default Owner');

assert.exists(process.env.DEFAULT_CLIENT_NAME,'please provide process.env.DEFAULT_CLIENT_NAME for default Application');
assert.exists(process.env.DEFAULT_CLIENT_ID,'please provide process.env.DEFAULT_CLIENT_ID for default Application');
assert.exists(process.env.DEFAULT_CLIENT_SECRET,'please provide process.env.DEFAULT_CLIENT_SECRET for default Application');

const user_parms = {
    username: process.env.DEFAULT_OWNER_NAME,
    password: User.generateHash(process.env.DEFAULT_OWNER_PASSWORD),
    ethereum_address: process.env.DEFAULT_OWNER_ETH_ADDRESS
}

User.create(user_parms)
    .then(user=>{


        const client_parms = {
            name: process.env.DEFAULT_CLIENT_NAME,
            client_id: process.env.DEFAULT_CLIENT_ID,

            secret: process.env.DEFAULT_CLIENT_SECRET,
            userId: user.id,
        }

        console.log(`Successfully create owner with id: ${user.id}`);
        return App.create(client_parms)

    })
    .then(app=>{

        console.log(`Successfully create application with id: ${app.id}`);
        process.exit(0);
    })

    .catch(err=>{

        console.error(err)
        process.exit(1);
    })
