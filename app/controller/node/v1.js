/**
 * Created by yuliang on 2017/10/16.
 * node相关api
 */

const Promise = require('bluebird')

'use strict'

module.exports = app => {

    const dataProvider = app.dataProvider

    return class NodeController extends app.Controller {

        /**
         * 节点列表
         * @param ctx
         * @returns {Promise.<void>}
         */
        async index(ctx) {
            let page = ctx.checkQuery("page").default(1).gt(0).toInt().value
            let pageSize = ctx.checkQuery("pageSize").default(10).gt(0).lt(101).toInt().value
            let status = ctx.checkQuery("status").default(0).in([0, 1, 2]).toInt().value
            let ownerUserId = ctx.checkQuery("ownerUserId").exist().gt(1).toInt().value

            ctx.validate(false)

            let condition = {status}
            if (ownerUserId > 0) {
                condition.ownerUserId = ownerUserId
            }

            let nodeList = []
            let totalItem = await dataProvider.nodeProvider.getCount(condition).then(data => parseInt(data.count)).catch(err => {
                console.log(err.code)
            })

            if (totalItem > (page - 1) * pageSize) { //避免不必要的分页查询
                nodeList = await dataProvider.nodeProvider.getNodeList(condition, page, pageSize)
            }
            ctx.success({page, pageSize, totalItem, dataList: nodeList})
        }

        /**
         * 查看节点详情
         * @param ctx
         * @returns {Promise.<void>}
         */
        async show(ctx) {
            let nodeId = ctx.checkParams('id').isInt().gt(0).value

            ctx.validate()

            await dataProvider.nodeProvider.getNodeInfo({nodeId}).bind(ctx).then(ctx.success)
        }

        /**
         * 创建节点
         * @param ctx
         * @returns {Promise.<void>}
         */
        async create(ctx) {
            let nodeName = ctx.checkBody('nodeName').notBlank().type('string').trim().len(4, 20).value
            let nodeDomain = ctx.checkBody('nodeDomain').isNodeDomain().value

            let checkResult = ctx.helper.nodeDomain.checkNodeDomain(nodeDomain)
            if (checkResult !== true) {
                ctx.errors.push({nodeDomain: checkResult})
            }

            ctx.allowContentType({type: 'json'}).validate()

            let checkNodeName = dataProvider.nodeProvider.getNodeInfo({nodeName})
            let checkNodeDomain = dataProvider.nodeProvider.getNodeInfo({nodeDomain})

            await Promise.all([checkNodeName, checkNodeDomain]).spread((nodeNameResult, nodeDomainResult) => {
                if (nodeNameResult) {
                    ctx.errors.push({nodeName: '节点名已经存在'})
                }
                if (nodeDomainResult) {
                    ctx.errors.push({nodeDomain: '节点域名已经存在'})
                }
                ctx.validate()
            })

            let nodeModel = {
                nodeName, nodeDomain,
                ownerUserId: ctx.request.userId
            }

            await dataProvider.nodeProvider.createNode(nodeModel).bind(ctx).then(result => {
                if (result.length > 0) {
                    return dataProvider.nodeProvider.getNodeInfo({nodeId: result[0]})
                }
            }).then(ctx.success)
        }
    }
}