module.exports = function (sequelize, Sequelize) {

    let Code = sequelize.define('code', {

        //name of the application client
        value: {
            type: Sequelize.STRING,
            notEmpty: true,
            allowNull: false
        },

        /**
         * The id and secret are used as part of the OAuth2 flow
         * and should always be kept secret
         */
        redirectUri: {
            type: Sequelize.STRING,
            notEmpty: true,
            allowNull: false
        },

        //TODO hash the secret
        userId: {
            type: Sequelize.STRING,
            notEmpty: true,
            allowNull: false
        },

        //userId field is used to identify which user owns this application client.
        clientId: {
            type: Sequelize.STRING,
            notEmpty: true,
            allowNull: false
        }

    });

    return Code;

};