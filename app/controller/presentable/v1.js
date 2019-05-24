/**
 * Created by yuliang on 2019/5/5.
 * presentable 面向用户消费策略相关API
 */

'use strict'

const semver = require('semver')
const lodash = require('lodash')
const Controller = require('egg').Controller
const {ArgumentError, ApplicationError} = require('egg-freelog-base/error')
const PresentablePolicyValidator = require('../../extend/json-schema/presentable-policy-validator')
const PresentableResolveReleaseValidator = require('../../extend/json-schema/presentable-resolve-release-validator')

module.exports = class PresentableController extends Controller {

    constructor({app}) {
        super(...arguments)
        this.nodeProvider = app.dal.nodeProvider
        this.presentableProvider = app.dal.presentableProvider
        this.presentableAuthTreeProvider = app.dal.presentableAuthTreeProvider
    }

    /**
     * 展示节点所有的消费方案
     * @param ctx
     * @returns {Promise.<void>}
     */
    async index(ctx) {

        const nodeId = ctx.checkQuery("nodeId").exist().isInt().toInt().value
        const userId = ctx.checkQuery("userId").optional().isInt().gt(0).toInt().value
        const resourceType = ctx.checkQuery('resourceType').optional().isResourceType().value
        const tags = ctx.checkQuery('tags').optional().toSplitArray().len(1, 20).value
        const isOnline = ctx.checkQuery('isOnline').optional().toInt().default(1).value
        const page = ctx.checkQuery("page").optional().default(1).toInt().gt(0).value
        const pageSize = ctx.checkQuery("pageSize").optional().default(10).gt(0).lt(101).toInt().value
        const order = ctx.checkQuery("order").optional().in(['isOnline']).value
        const asc = ctx.checkQuery("asc").optional().default(0).in([0, 1]).value
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value
        const keywords = ctx.checkQuery('keywords').optional().type('string').len(1, 100).value
        ctx.validate()

        const condition = {nodeId}
        if (resourceType) {
            condition['releaseInfo.resourceType'] = resourceType
        }
        if (tags) {
            condition.userDefinedTags = {$in: tags}
        }
        if (userId) {
            condition.userId = userId
        }
        if (isOnline === 0 || isOnline === 1) {
            condition.isOnline = isOnline
        }
        if (lodash.isString(keywords)) {
            let searchExp = {$regex: keywords, $options: 'i'}
            condition.$or = [{presentableName: searchExp}, {'releaseInfo.releaseName': searchExp}]
        }

        var presentableList = []
        const totalItem = await this.presentableProvider.count(condition)
        if (totalItem > (page - 1) * pageSize) {
            presentableList = await this.presentableProvider.findPageList(condition, page, pageSize, projection.join(' '), {createDate: -1})
        }
        ctx.success({page, pageSize, totalItem, dataList: presentableList})
    }

    /**
     * 获取presentable列表
     * @param ctx
     * @returns {Promise<void>}
     */
    async list(ctx) {

        const userId = ctx.checkQuery('userId').optional().toInt().gt(0).value
        const nodeId = ctx.checkQuery('nodeId').optional().toInt().gt(0).value
        const presentableIds = ctx.checkQuery('presentableIds').optional().isSplitMongoObjectId().toSplitArray().len(1, 100).value
        const releaseIds = ctx.checkQuery('releaseIds').optional().isSplitMongoObjectId().toSplitArray().len(1, 100).value
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value
        ctx.validate()

        const condition = {}
        if (userId) {
            condition.userId = userId
        }
        if (nodeId) {
            condition.nodeId = nodeId
        }
        if (presentableIds) {
            condition._id = {$in: presentableIds}
        }
        if (releaseIds) {
            condition['releaseInfo.releaseId'] = {$in: releaseIds}
        }
        if (!releaseIds && !presentableIds) {
            throw new ArgumentError(ctx.gettext('params-required-validate-failed', 'presentableIds,releaseIds'))
        }

        await this.presentableProvider.find(condition, projection.join(' ')).then(ctx.success)
    }

    /**
     * 展示presentable详情
     * @param ctx
     * @returns {Promise.<void>}
     */
    async show(ctx) {

        const presentableId = ctx.checkParams("id").isPresentableId().value
        ctx.validate()

        await this.presentableProvider.findById(presentableId).then(ctx.success)
    }

    /**
     * 创建节点消费方案
     * @param ctx
     * @returns {Promise.<void>}
     */
    async create(ctx) {

        const nodeId = ctx.checkBody('nodeId').toInt().gt(0).value
        const releaseId = ctx.checkBody('releaseId').isReleaseId().value
        const resolveReleases = ctx.checkBody('resolveReleases').exist().isArray().value
        const policies = ctx.checkBody('policies').optional().default([]).isArray().value
        const userDefinedTags = ctx.checkBody('userDefinedTags').optional().isArray().len(0, 20).value
        const intro = ctx.checkBody('intro').optional().type('string').default('').len(0, 500).value
        const presentableName = ctx.checkBody('presentableName').optional().type('string').len(2, 50).value
        const version = ctx.checkBody('version').exist().is(semver.valid, ctx.gettext('params-format-validate-failed', 'version')).value
        ctx.validate()

        this._validateResolveReleasesParamFormat(resolveReleases)
        const policiesValidateResult = new PresentablePolicyValidator().createReleasePoliciesValidate(policies)
        if (policiesValidateResult.errors.length) {
            throw new ArgumentError(ctx.gettext('params-format-validate-failed', 'policies'), {policiesValidateResult})
        }

        const nodeInfo = await this.nodeProvider.findOne({nodeId}).tap(model => ctx.entityNullValueAndUserAuthorizationCheck(model, {
            property: 'ownerUserId',
            msg: ctx.gettext('params-validate-failed', 'nodeId'),
            data: {nodeId}
        }))

        await this.presentableProvider.findOne({'releaseInfo.releaseId': releaseId, nodeId}, 'id').then(exist => {
            if (!exist) {
                return
            }
            throw new ApplicationError(ctx.gettext('presentable-release-repetition-create-error'), {
                releaseId, nodeId
            })
        })

        const releaseInfo = await ctx.curlIntranetApi(`${ctx.webApi.releaseInfo}/${releaseId}`)
        if (!releaseInfo || releaseInfo.status === 0) {
            throw new ApplicationError(ctx.gettext('params-validate-failed', 'releaseId'), {releaseInfo})
        }
        if (!releaseInfo.resourceVersions.some(x => x.version === version)) {
            throw new ApplicationError(ctx.gettext('params-validate-failed', 'version'), {version})
        }

        await ctx.service.presentableService.createPresentable({
            releaseInfo, presentableName, resolveReleases,
            version, policies, nodeInfo, intro, userDefinedTags
        }).then(ctx.success)
    }

    /**
     * @param ctx
     * @returns {Promise<void>}
     */
    async presentableAuthChainInfo(ctx) {

        const presentableId = ctx.checkParams("presentableId").exist().isMongoObjectId().value
        ctx.validate()

        const presentableInfo = await this.presentableProvider.findById(presentableId).tap(model => ctx.entityNullObjectCheck(model, {
            msg: ctx.gettext('params-validate-failed', 'presentableId'),
            data: {presentableId}
        }))

        const presentableAuthTreeInfo = await this.presentableAuthTreeProvider.findOne({presentableId})

        const result = lodash.pick(presentableAuthTreeInfo, ['presentableId', 'nodeId', 'masterReleaseId', 'version'])
        result.userId = presentableInfo.userId
        result.presentableName = presentableInfo.presentableName
        result.nodeResolveReleases = presentableInfo.resolveReleases
        result.schemeResolveReleases = presentableAuthTreeInfo.authTree

        ctx.success(result)
    }

    /**
     * 更新presentable
     * @param ctx
     * @returns {Promise<void>}
     */
    async update(ctx) {

        const presentableId = ctx.checkParams("id").exist().isMongoObjectId().value
        const policyInfo = ctx.checkBody('policyInfo').optional().isObject().value
        const presentableName = ctx.checkBody('presentableName').optional().type('string').len(2, 50).value
        const userDefinedTags = ctx.checkBody('userDefinedTags').optional().isArray().value
        const resolveReleases = ctx.checkBody('resolveReleases').optional().isArray().value
        const intro = ctx.checkBody('intro').optional().type('string').default('').len(0, 500).value
        ctx.validate()

        if ([policyInfo, presentableName, userDefinedTags, resolveReleases, intro].every(x => x === undefined)) {
            ctx.error({msg: ctx.gettext('缺少必要的参数')})
        }
        if (resolveReleases) {
            this._validateResolveReleasesParamFormat(resolveReleases)
        }
        if (policyInfo) {
            const result = new PresentablePolicyValidator().updateReleasePoliciesValidate(policyInfo)
            result.errors.length && ctx.error({msg: ctx.gettext('参数%s格式校验失败', 'policyInfo'), data: result.errors})
        }

        const presentableInfo = await this.presentableProvider.findById(presentableId).tap(model => ctx.entityNullValueAndUserAuthorizationCheck(model, {
            msg: ctx.gettext('params-validate-failed', 'presentableId'),
            data: {presentableId}
        }))

        await ctx.service.presentableService.updatePresentable({
            presentableInfo, policyInfo, presentableName, userDefinedTags, resolveReleases, intro
        }).then(ctx.success)
    }


    /**
     * 删除节点消费方案
     * @param ctx
     * @returns {Promise.<void>}
     */
    async destroy(ctx) {
        throw new ApplicationError('接口已过期,presentable不允许删除')
    }


    /**
     * 切换presentable上线状态(上线或下线)
     * @returns {Promise<void>}
     */
    async switchOnlineState(ctx) {

        const presentableId = ctx.checkParams("presentableId").exist().isPresentableId().value
        const onlineState = ctx.checkBody("onlineState").exist().toInt().in([0, 1]).value
        ctx.validate()

        const presentableInfo = await this.presentableProvider.findById(presentableId).tap(model => ctx.entityNullValueAndUserAuthorizationCheck(model, {
            msg: ctx.gettext('params-validate-failed', 'presentableId'),
            data: {presentableId}
        }))

        if (presentableInfo.isOnline === onlineState) {
            return ctx.success(true)
        }

        await ctx.service.presentableService.switchPresentableOnlineState(presentableInfo, onlineState).then(ctx.success)
    }

    /**
     * 发行所挂载的节点
     * @param ctx
     * @returns {Promise<void>}
     */
    async releaseSubordinateNodes(ctx) {

        const releaseId = ctx.checkQuery('releaseId').isReleaseId().value
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value
        ctx.validate()

        const condition = {
            'releaseInfo.releaseId': releaseId, userId: ctx.request.userId
        }

        await this.presentableProvider.find(condition, projection.join(' ')).then(ctx.success)
    }

    /**
     * presentable下的节点合同状况
     * 此接口考虑终止提供.前端可以调用presentable/list和contracts/list即可组合完成.
     * @param ctx
     * @returns {Promise<void>}
     */
    async contractInfos(ctx) {

        throw new ApplicationError('接口终止提供功能')

        // const nodeId = ctx.checkQuery('nodeId').exist().isInt().gt(1).value
        // const presentableIds = ctx.checkQuery('presentableIds').exist().isSplitMongoObjectId().toSplitArray().len(1, 100).value
        // ctx.validate()
        //
        // var presentableContractMap = new Map()
        // const presentableInfos = await this.presentableProvider.find({nodeId, _id: {$in: presentableIds}})
        //
        // const contractIds = lodash.chain(presentableInfos).map(x => x.resolveReleases).flattenDeep().map(x => x.contracts)
        //     .flattenDeep().map(x => x.contractId).uniq().value()
        //
        // if (contractIds.length) {
        //     presentableContractMap = await ctx.curlIntranetApi(`${ctx.webApi.contractInfo}/list?contractIds=${contractIds.toString()}`)
        //         .then(contractInfos => new Map(contractInfos.map(x => [x.contractId, x])))
        // }
        //
        // const results = []
        // for (let i = 0, j = presentableInfos.length; i < j; i++) {
        //     let presentable = presentableInfos[i]
        //     let model = lodash.pick(presentable, ['presentableId', 'presentableName', 'status', 'isOnline', 'createDate'])
        //     model.resolveReleases = presentable.resolveReleases.map(release => Object({
        //         releaseId: release.releaseId,
        //         releaseName: release.releaseName,
        //         isMasterRelease: release.releaseId === presentable.releaseInfo.releaseId,
        //         contracts: release.contracts.map(item => {
        //             let contractInfo = presentableContractMap.get(item.contractId)
        //             return {
        //                 contractId: item.contractId,
        //                 policyId: item.policyId,
        //                 status: contractInfo.status
        //             }
        //         })
        //     }))
        //     results.push(model)
        // }
        //
        // ctx.success(results)
    }

    /**
     * 批量获取presentable合同状态
     * @param ctx
     * @returns {Promise<void>}
     */
    async getPresentableContractState(ctx) {

        throw new ApplicationError('此接口不在提供')

        // const nodeId = ctx.checkQuery("nodeId").exist().toInt().value
        // const presentableIds = ctx.checkQuery('presentableIds').exist().isSplitMongoObjectId().toSplitArray().len(1, 20).value
        // ctx.validate()
        //
        // await ctx.service.presentableService.getPresentableContractState(nodeId, presentableIds).then(ctx.success)
    }

    /**
     * 校验处理解决的发行数据格式
     * @param resolveReleases
     * @private
     */
    _validateResolveReleasesParamFormat(resolveReleases) {

        const {ctx} = this
        const resolveReleasesValidateResult = new PresentableResolveReleaseValidator().resolveReleasesValidate(resolveReleases)
        if (resolveReleasesValidateResult.errors.length) {
            throw new ArgumentError(ctx.gettext('params-format-validate-failed', 'resolveReleases'), {
                errors: resolveReleasesValidateResult.errors
            })
        }
    }
}