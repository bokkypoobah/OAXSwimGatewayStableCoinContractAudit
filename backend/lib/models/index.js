let fs = require("fs")
let path = require("path")
let Sequelize = require("sequelize")

const excludeDirsAndIndexJs = (file) =>
    (file.indexOf(".") !== 0) && (file !== "index.js")

function associateModels(db) {
    Object.keys(db).forEach(function (modelName) {
        if ("associate" in db[modelName]) {
            db[modelName].associate(db)
        }
    })
    return db
}

const importModels = (sequelize, fileNames) => {
    const db = fileNames
        .filter(excludeDirsAndIndexJs)
        .map((file) => path.join(__dirname, file))
        .map(fullPath => sequelize.import(fullPath))
        .reduce((db, model) => {
            db[model.name] = model
            return db
        }, {})

    return associateModels(db)
}

const createModels = (config) => {
    const sequelize = new Sequelize(
        config.database,
        config.username,
        config.password,
        config)
    const models = importModels(sequelize, fs.readdirSync(__dirname))
    models.sequelize = sequelize
    models.Sequelize = Sequelize

    return models
}

module.exports = createModels
