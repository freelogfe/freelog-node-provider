/**
 * Created by yuliang on 2017/10/17.
 */

const moment = require('moment')

module.exports = app => {
    return class NodePageBuildService extends app.Service {

        /**
         * 节点设置自己的pb文件
         * @param model
         */
        createNodePageBuild(model) {
            let {type, knex} = this.app

            if (!type.object(model)) {
                return Promise.reject(new Error("model must be object"))
            }

            model.createDate = moment().toDate()

            return knex.node('nodepagebuild').insert(model)
        }

        /**
         * 更新节点pb
         * @param model
         * @returns {Promise|Promise.<*>}
         */
        updateNodePageBuild(model, condition) {

            let {type, knex} = this.app

            if (!type.object(model)) {
                return Promise.reject(new Error("model must be object"))
            }

            if (!type.object(condition)) {
                return Promise.reject(new Error("condition must be object"))
            }

            return knex.node('nodepagebuild').update(model).where(condition)
        }

        /**
         * 查询nodePageBuild
         * @param condition
         * @returns {*}
         */
        getNodePageBuild(condition) {

            let {type, knex} = this.app

            if (!type.object(condition)) {
                return Promise.reject(new Error("condition must be object"))
            }

            return knex.node('nodepagebuild').where(condition).first()
        }

        /**
         * 查询nodePageBuild
         * @param condition
         * @returns {*}
         */
        getNodePageBuildList(condition) {

            let {type, knex} = this.app

            if (!type.object(condition)) {
                return Promise.reject(new Error("condition must be object"))
            }

            return knex.node('nodepagebuild').where(condition).select()
        }

        /**
         * 更新状态
         * @param nodeId
         * @param id
         * @param status
         * @returns {*}
         */
        updateNodePageBuildStatus(nodeId, id, status) {

            let {type, knex} = this.app

            return knex.node.transaction(trans => {
                let task1 = knex.node('nodepagebuild').update({status}).where({nodeId, id})
                let task2 = status === 1
                    ? knex.node('nodepagebuild').update({status: 0}).where('id', '<>', id).where({nodeId})
                    : undefined

                return Promise.all([task1, task2]).then(trans.commit).catch(err => {
                    trans.rollback()
                    return err
                })
            })
        }
    }
}
