const express = require('express')
const {Passport} = require('passport')
const session = require('express-session')
const bodyParser = require('body-parser')
const path = require('path')
const cors = require('cors')

const createModels = require("./models")

const createApp = async (config, web3, gate, token) => {
    const models = createModels(config)
    const passport = new Passport()

    const clientController = require('./controllers/application-client')(models)
    const authController = require('./controllers/auth')(models, passport)
    const userController = require('./controllers/user')(models)
    const oauth2Controller = require('./controllers/oauth2')(models)

    const depositRequestsController = require('./controllers/deposit-requests')(web3, gate, token)
    const withdrawalRequestsController = require('./controllers/withdrawal-requests')(web3, gate, token)

    const app = express()
    app.use(cors())

    //For BodyParser
    app.use(bodyParser.urlencoded({
        extended: true
    }))
    app.use(bodyParser.json())

    app.set('view engine', 'ejs')
    app.set('views', path.join(__dirname, '/views'));

    app.use(express.static(path.join(__dirname, 'public')))

    // Use express session support since OAuth2orize requires it
    app.use(session({
        secret: 'Super Secret Session Key',
        saveUninitialized: true,
        resave: true
    }))

    app.use(passport.initialize())

    app.get('/', function (req, res) {
        res.send('Welcome to OAX Backend Web Server')
    })

    //Sync Database
    if (models) {
        try {
            await models.sequelize.sync()
            console.log('Nice! Database looks fine')
        } catch (err) {
            console.log(err, "Something went wrong with the Database Update!")
        }
    }

    // Create endpoint handlers for /users
    const apiPrefix = '/api/v1'
    app.post(apiPrefix + '/users/sign-up', userController.postUsers)
    app.get(apiPrefix + '/users/sign-in', authController.isAuthenticated, userController.signInUser)

    // Create endpoint handlers for /clients (client applications) to register
    app.post(apiPrefix + '/client-applications', authController.isAuthenticated, clientController.postClients)

    // app.get(apiPrefix + '/users/authorize', authController.isAuthenticated, oauth2Controller.authorization)
    app.get(apiPrefix + '/users/authorize', oauth2Controller.authorization)
    app.post(apiPrefix + '/users/authorize', authController.isAuthenticated, oauth2Controller.decision)

    app.post(apiPrefix + '/oauth2/token', authController.isClientAuthenticated, oauth2Controller.token)
    app.get(apiPrefix + '/deposit-requests', depositRequestsController.getRequests)
    app.get(apiPrefix + '/withdrawal-requests', withdrawalRequestsController.getRequests)

    return app
}

module.exports = createApp
