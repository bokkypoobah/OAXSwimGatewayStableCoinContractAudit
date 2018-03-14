module.exports = function (sequelize, Sequelize) {

    let Token = sequelize.define('token', {

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
        user_id: {
            type: Sequelize.STRING,
            notEmpty: true,
            allowNull: false
        },

        client_id: {
            type: Sequelize.STRING,
            notEmpty: true,
            allowNull: false
        }

    });

    return Token;

};
