module.exports = function (sequelize, Sequelize) {
    const ApplicationClient = sequelize.define('application_client', {

        //name of the application client
        name: {
            type: Sequelize.STRING,
            unique: true,
            notEmpty: true,
            allowNull: false
        },

        /**
         * The id and secret are used as part of the OAuth2 flow
         * and should always be kept secret
         */
        client_id: {
            type: Sequelize.STRING,
            notEmpty: true,
            allowNull: false
        },

        //TODO hash the secret
        secret: {
            type: Sequelize.STRING,
            notEmpty: true,
            allowNull: false
        },

        //userId field is used to identify which user owns this application client.
        userId: {
            type: Sequelize.STRING,
            notEmpty: true,
            allowNull: false
        }

    });

    return ApplicationClient;
};
