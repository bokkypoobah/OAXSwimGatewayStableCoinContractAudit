let bCrypt = require('bcrypt-nodejs')

module.exports = function (sequelize, Sequelize) {

    let User = sequelize.define('user', {

        id: {
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },

        username: {
            type: Sequelize.TEXT,
            validate: {
                isEmail: true
            },
            notEmpty: true,
            allowNull: false
        },

        password: {
            type: Sequelize.STRING,
            allowNull: false
        },

        ethereum_address: {
            type: Sequelize.STRING,
            notEmpty: true,
            allowNull: false
        }


    });


    User.generateHash = function (password) {
        return bCrypt.hashSync(password, bCrypt.genSaltSync(8), null)
    };

    return User;


}
