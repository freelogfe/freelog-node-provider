/**
 * Created by yuliang on 2017/11/8.
 */

'use strict'

module.exports = appInfo => {
    return {

        /**
         * DB-mysql相关配置
         */
        dbConfig: {
            node: {
                client: 'mysql2',
                connection: {
                    host: 'rm-wz9wj9435a0428942.mysql.rds.aliyuncs.com',
                    user: 'freelog',
                    password: 'Ff@233109',
                    database: 'fr_node',
                    charset: 'utf8',
                    timezone: '+08:00',
                    bigNumberStrings: true,
                    supportBigNumbers: true,
                    connectTimeout: 10000
                },
                pool: {
                    maxConnections: 50,
                    minConnections: 1,
                },
                acquireConnectionTimeout: 10000,
                debug: false
            },
        },

        /**
         * api网关内网地址
         */
        gatewayUrl: "http://39.108.77.211",

        /**
         * mongodb连接
         */
        mongo: {
            uri: "mongodb://root:Ff233109@dds-wz9b5420c30a27941546-pub.mongodb.rds.aliyuncs.com:3717,dds-wz9b5420c30a27942267-pub.mongodb.rds.aliyuncs.com:3717/node?replicaSet=mgset-5016983"
        },

        nodeHomePageTemplateUrl: "http://frcdn.oss-cn-shenzhen.aliyuncs.com/web-components/index.html"
    }
}