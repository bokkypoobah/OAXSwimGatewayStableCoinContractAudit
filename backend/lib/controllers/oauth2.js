const oauth2orize = require('oauth2orize')
const controllerUtil = require('./util.js')

/**
 * Return a unique identifier with the given `len`.
 *
 *     utils.uid(10);
 *     // => "FDaS435D2z"
 *
 * @param {Number} len
 * @return {String}
 * @api private
 */
function uid(len) {
    let buf = []
        , chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        , charlen = chars.length;

    for (let i = 0; i < len; ++i) {
        buf.push(chars[getRandomInt(0, charlen - 1)]);
    }

    return buf.join('');
}

/**
 * Return a random int, used by `utils.uid()`
 *
 * @param {Number} min
 * @param {Number} max
 * @return {Number}
 * @api private
 */

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = (models) => {
    const Client = models.application_client
    const Token = models.token
    const Code = models.code

    // Create OAuth 2.0 server
    const server = oauth2orize.createServer();

    // Register serialization and deserialization functions.
    //
    // When a client redirects a user to user authorization endpoint, an
    // authorization transaction is initiated.  To complete the transaction, the
    // user must authenticate and approve the authorization request.  Because this
    // may involve multiple HTTP request/response exchanges, the transaction is
    // stored in the session.
    //
    // An application must supply serialization functions, which determine how the
    // client object is serialized into the session.  Typically this will be a
    // simple matter of serializing the client's ID, and deserialize by finding
    // the client by ID from the database.

    server.serializeClient(function (client, callback) {
        return callback(null, client.id);
    });

    server.deserializeClient(function (id, callback) {
        Client.findOne({where: {id: id}})
            .then(function (client) {
                return callback(null, client);

            })
            .catch(function (err) {
                if (err) {
                    return callback(err);
                }

            })
    });

    //TODO make sure error display in api response is according to format
    server.errorHandler(function errorHandler(err, req, res, next) {
        controllerUtil.displayError(res, err)
    })

    // Register supported grant types.
    //
    // OAuth 2.0 specifies a framework that allows users to grant client
    // applications limited access to their protected resources.  It does this
    // through a process of the user granting access, and the client exchanging
    // the grant for an access token.

    // Grant authorization codes.  The callback takes the `client` requesting
    // authorization, the `redirectUri` (which is used as a verifier in the
    // subsequent exchange), the authenticated `user` granting access, and
    // their response, which contains approved scope, duration, etc. as parsed by
    // the application.  The application issues a code, which is bound to these
    // values, and will be exchanged for an access token.

    server.grant(oauth2orize.grant.code(function (client, redirectUri, user, ares, callback) {
        // Create a new authorization code
        let code = {
            value: uid(16),
            clientId: client.id,
            redirectUri: redirectUri,
            userId: user.id
        };

        // Save the auth code and check for errors
        Code.create(code)
            .then(function (result) {
                console.log(JSON.stringify(result))
                callback(null, code.value);
            })
            .catch(function (err) {
                if (err) {
                    return callback(err);
                }
            })
    }));


    // Implicit flow
    server.grant(oauth2orize.grant.token(function (client, user, ares, callback) {

        // Create a new access token
        let token = {
            value: uid(16),
            client_id: client.client_id,
            user_id: user.id
        };

        // Save the access token and check for errors
        Token.create(token)
            .then(function (result) {
                console.log(JSON.stringify(result))
                callback(null, token.value);

            })
            .catch(function (err) {
                if (err) {
                    return callback(err);
                }
            })

    }))

    // Exchange authorization codes for access tokens.  The callback accepts the
    // `client`, which is exchanging `code` and any `redirectUri` from the
    // authorization request for verification.  If these values are validated, the
    // application issues an access token on behalf of the user who authorized the
    // code.
    server.exchange(oauth2orize.exchange.code(function (client, code, redirectUri, callback) {
        Code.findOne({where: {value: code}})
            .then(function (authCode) {

                if (authCode === undefined) {
                    return callback(null, false);
                }
                if (client.id.toString() !== authCode.clientId) {
                    return callback(null, false);
                }
                if (redirectUri !== authCode.redirectUri) {
                    return callback(null, false);
                }

                // Delete auth code now that it has been used
                authCode.remove(function (err) {
                    if (err) {
                        return callback(err);
                    }

                    // Create a new access token
                    let token = {
                        value: uid(256),
                        clientId: authCode.clientId,
                        userId: authCode.userId
                    };

                    // Save the access token and check for errors
                    Token.create(token)
                        .then(function (result) {
                            console.log(JSON.stringify(result))
                            callback(null, token);

                        })
                        .catch(function (err) {
                            if (err) {
                                return callback(err);
                            }
                        })
                });
            })
            .catch(function (err) {
                if (err) {
                    return callback(err);
                }
            })
    }))

    return {
        // user authorization endpoint
        //
        // `authorization` middleware accepts a `validate` callback which is
        // responsible for validating the client making the authorization request.  In
        // doing so, is recommended that the `redirectUri` be checked against a
        // registered value, although security requirements may vary accross
        // implementations.  Once validated, the `callback` callback must be invoked with
        // a `client` instance, as well as the `redirectUri` to which the user will be
        // redirected after an authorization decision is obtained.
        //
        // This middleware simply initializes a new authorization transaction.  It is
        // the application's responsibility to authenticate the user and render a dialog
        // to obtain their approval (displaying details about the client requesting
        // authorization).  We accomplish that here by routing through `ensureLoggedIn()`
        // first, and rendering the `dialog` view.
        authorization: [
            server.authorization(function (clientId, redirectUri, callback) {
                Client.findOne({where: {client_id: clientId}})
                    .then(function (client) {
                        if (!client) {
                            return callback(new oauth2orize.AuthorizationError("Application client with specified id is not registered in oauth server yet.", "unauthorized_client"))
                        } else {
                            console.log('client', client)
                            return callback(null, client, redirectUri);
                        }
                    })
                    .catch(function (err) {
                        if (err) {
                            console.log("find client app err", JSON.stringify(err))
                            return callback(err);
                        }
                    })
            }),
            function (req, res) {
                // FIXME session not detected if post from REST client, even with session cookie attached
                // res.json({
                //     type: "authorize",
                //     data: {transactionID: req.oauth2.transactionID, user: req.user, client: req.oauth2.client}
                // });
                // res.redirect(`/en-US/account/login?transactionID=${req.oauth2.transactionID}`)
                res.render('login', {transactionID: req.oauth2.transactionID});

            }
        ],

        // user decision endpoint
        //
        // `decision` middleware processes a user's decision to allow or deny access
        // requested by a client application.  Based on the grant type requested by the
        // client, the above grant middleware configured above will be invoked to send
        // a response.
        decision: [
            server.decision()
        ],

        // token endpoint
        //
        // `token` middleware handles client requests to exchange authorization grants
        // for access tokens.  Based on the grant type being exchanged, the above
        // exchange middleware will be invoked to handle the request.  Clients must
        // authenticate when making requests to this endpoint.
        token: [
            server.token(),
            server.errorHandler()
        ]
    }
}





