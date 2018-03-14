const BasicStrategy = require('passport-http').BasicStrategy
const BearerStrategy = require('passport-http-bearer').Strategy
const LocalStrategy = require('passport-local').Strategy

module.exports = (models, passport) => {
    const User = models.user
    const Client = models.application_client
    const Token = models.token
    const bCrypt = require('bcrypt-nodejs')

    passport.use(new BasicStrategy({
            passReqToCallback: true // allows us to pass back the entire request to the callback
        },
        function (req, username, password, callback) {
            console.log("log in request", req)
            // let ethereumAddress = req.headers["authorization-ethereum-address"]
            // if (!ethereumAddress) {
            //     return callback(null, false)
            // }
            User.findOne({
                where: {
                    username: username,
                    // ethereum_address: ethereumAddress
                }
            })
                .then(function (user) {
                    // No user found with that username
                    if (!user) {
                        return callback(null, false)
                    }

                    let isValidPassword = function (userpass, password) {
                        return bCrypt.compareSync(password, userpass)
                    }

                    if (!isValidPassword(user.password, password)) {
                        return callback(new Error("Password does not match"))
                    } else {
                        return callback(null, user)
                    }
                })
                .catch(function (err) {
                    if (err) {
                        return callback(err)
                    }
                })
        }
    ))

    passport.use('client-basic', new BasicStrategy(
        function (username, password, callback) {
            Client.findOne({where: {id: username}})
                .then(function (client) {
                    // No client found with that id or bad password
                    if (!client || client.secret !== password) {
                        return callback(null, false)
                    }

                    // Success
                    return callback(null, client)
                })
                .catch(function (err) {
                    if (err) {
                        return callback(err)
                    }
                })
        }
    ))

    passport.use(new BearerStrategy(
        function (accessToken, callback) {
            Token.findOne({where: {value: accessToken}})
                .then(function (token) {
                    // No token found
                    if (!token) {
                        return callback(null, false)
                    }

                    User.findOne({where: {id: token.userId}})
                        .then(function (user) {
                            // No user found
                            if (!user) {
                                return callback(null, false)
                            }

                            // Simple example with no scope
                            callback(null, user, {scope: '*'})
                        })
                        .catch(function (err) {
                            if (err) {
                                return callback(err)
                            }
                        })
                })
                .catch(function (err) {
                    if (err) {
                        return callback(err)
                    }
                })
        }
    ))


    passport.use(new LocalStrategy(
        function (username, password, callback) {
            User.findOne({
                where: {
                    username: username,
                }
            })
                .then(function (user) {

                    // No user found with that username
                    if (!user) {
                        return callback(null, false)
                    }

                    let isValidPassword = function (userpass, password) {
                        return bCrypt.compareSync(password, userpass)
                    }

                    if (!isValidPassword(user.password, password)) {
                        return callback(new Error("Password does not match"))
                    } else {
                        return callback(null, user)
                    }

                })
                .catch(function (err) {
                    if (err) {
                        return callback(err)
                    }
                })
        }
    ))

    return {
        isAuthenticated: passport.authenticate(['local', 'bearer'], {session: false}),
        isClientAuthenticated: passport.authenticate('client-basic', {session: false}),
        isBearerAuthenticated: passport.authenticate('bearer', {session: false})
    }
}
