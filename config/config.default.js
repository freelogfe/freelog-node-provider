'use strict';

module.exports = {

    cluster: {
        listen: {port: 7005}
    },

    /**
     * mongoDB配置
     */
    mongoose: {
        url: "mongodb://192.168.0.99:27017/node",
    },

    middleware: ['errorHandler', 'identiyAuthentication'],

    /**
     * DB-mysql相关配置
     */
    knex: {
        node: {
            client: 'mysql',
            connection: {
                host: '192.168.2.239',
                user: 'root',
                password: 'yuliang@@',
                database: 'fr_node',
                charset: 'utf8',
                timezone: '+08:00',
                bigNumberStrings: true,
                supportBigNumbers: true,
                connectTimeout: 1500,
                typeCast: (field, next) => {
                    if (field.type === 'JSON') {
                        return JSON.parse(field.string())
                    }
                    return next()
                },
            },
            pool: {max: 10, min: 2},
            acquireConnectionTimeout: 500,
            debug: false
        },
    },

    security: {
        xframe: {enable: false},
        csrf: {enable: false}
    },

    /**
     * API网关地址
     */
    gatewayUrl: "https://api.freelog.com",

    keys: 'freelog-node-provider-1502781772068_5353'
}
