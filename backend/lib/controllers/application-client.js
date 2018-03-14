/**
 * this controller is used to facilitate adding and viewing application clients
 * @type {*|Object}
 */

const controllerUtil = require('./util.js')

module.exports = (models) => {
    const ApplicationClient = models.application_client;

    return {
        postClients(req, res) {
            const client = {
                name: req.body.name,
                client_id: req.body.id,

                //TODO encrypt password in storage
                secret: req.body.secret,
                userId: req.user.id,
            }

            ApplicationClient.create(client)
                .then(function (newClientApplication) {
                    if (!newClientApplication) {
                        controllerUtil.displayError(res, new Error("Failed to add client application"))
                    } else {
                        controllerUtil.displayData(res, "clientApplications", {
                            clientName: client.name
                        })
                    }
                })
                .catch(function (err) {
                    console.log("insertion error", JSON.stringify(err))

                    //respond with error following jsonapi format
                    controllerUtil.displayError(res, err)
                })
        }
    }
}
