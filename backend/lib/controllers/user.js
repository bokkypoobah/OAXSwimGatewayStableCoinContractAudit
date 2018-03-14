// Load required packages
let controllerUtil = require('./util.js')

module.exports = (models) => {
    let User = models.user

    return {
        postUsers(req, res) {
            if (!req.body.username) {
                let usernameEmptyError = {
                    name: "OaxValidationError",
                    errors: [
                        {
                            path: "username",
                            type: "notNull Violation",
                            message: "username cannot be null"
                        }
                    ]
                }
                controllerUtil.displayError(res, usernameEmptyError)
            } else {
                User.findOne({
                    where: {
                        username: req.body.username
                    }
                })
                    .then(function (user) {
                        if (user) {
                            let usernameExistsError = {
                                name: "OaxValidationError",
                                errors: [
                                    {
                                        path: "username",
                                        type: "username exists",
                                        message: "username is already taken"
                                    }
                                ]
                            }
                            controllerUtil.displayError(res, usernameExistsError)
                        } else {

                            if (!req.body.password) {
                                let passwordEmptyError = {
                                    name: "OaxValidationError",
                                    errors: [
                                        {
                                            path: "password",
                                            type: "notNull Violation",
                                            message: "password cannot be null"
                                        }
                                    ]
                                }
                                controllerUtil.displayError(res, passwordEmptyError)
                            } else {
                                const user = {
                                    username: req.body.username,
                                    password: User.generateHash(req.body.password),
                                    ethereum_address: req.body.ethereumAddress
                                }
                                User.create(user)
                                    .then(function (newUser) {
                                        if (!newUser) {
                                            controllerUtil.displayError(res, new Error("Failed to add new user"))
                                        } else {
                                            controllerUtil.displayData(res, "users", {
                                                username: newUser.username,
                                                ethereumAddress: newUser.ethereum_address
                                            })
                                        }
                                    })
                                    .catch(function (err) {
                                        console.log("insertion error", JSON.stringify(err))
                                        controllerUtil.displayError(res, err)
                                    })
                            }
                        }
                    })
                    .catch(function (err) {
                        console.log("find user instance error", JSON.stringify(err))
                        controllerUtil.displayError(res, err)
                    })
            }
        },

        signInUser(req, res) {
            res.end()
        }
    }
}
