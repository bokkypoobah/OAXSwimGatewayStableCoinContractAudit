exports.displayError = function (res, internalError) {
    if (!internalError) {
        return null
    } else {
        let displayError = {}
        displayError.errors = []
        if (internalError.name && (internalError.name === "SequelizeValidationError" || internalError.name === "OaxValidationError")) {
            res.statusCode = 400
            for (let singleErrorIndex in internalError.errors) {
                let singleError = internalError.errors[singleErrorIndex]
                displayError.errors.push({
                    title: singleError.type.replace(" ", "."),
                    detail: singleError.message,
                    status: "400",
                    source: {
                        parameter: singleError.path
                    }
                })
            }
        } else {
            res.statusCode = 500
            let singleError = {status: "500"}
            if (internalError.name) {
                singleError.title = internalError.name
            } else {
                singleError.title = "internal.server.error"
            }
            if (internalError.message) {
                singleError.detail = internalError.message
            }
            displayError.errors.push(singleError)
        }

        res.json(displayError)

    }

}

exports.displayData = function (res, type, attributes) {
    let displayData = {
        data: {
            type: type,
            attributes: attributes
        }
    }

    res.statusCode = 200
    res.json(displayData)
}