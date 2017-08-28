/**
 * Created by yuliang on 2017/6/30.
 */

'use strict'

const mongoDb = require('./app/models/db_start')


module.exports = async (app) => {

    app.on('error', (err, ctx) => {
        if (!err || !ctx) {
            return
        }

        ctx.body = ctx.buildReturnObject(app.retCodeEnum.serverError,
            app.errCodeEnum.autoSnapError,
            err.message || err.toString())
    })


    global.Promise = require('bluebird')


    await mongoDb.connect(app)
}