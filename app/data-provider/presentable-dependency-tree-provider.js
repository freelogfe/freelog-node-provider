'use strict'

const MongoBaseOperation = require('egg-freelog-database/lib/database/mongo-base-operation')

module.exports = class PresentableDependencyTreeProvider extends MongoBaseOperation {

    constructor(app) {
        super(app.model.PresentableDependencyTree)
        this.app = app
    }
}