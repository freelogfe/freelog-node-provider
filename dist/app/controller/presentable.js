"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PresentableController = void 0;
const semver = require("semver");
const lodash_1 = require("lodash");
const midway_1 = require("midway");
const vistorIdentityDecorator_1 = require("../../extend/vistorIdentityDecorator");
const egg_freelog_base_1 = require("egg-freelog-base");
const enum_1 = require("../../enum");
let PresentableController = class PresentableController {
    async presentablePageList(ctx) {
        const nodeId = ctx.checkQuery('nodeId').exist().toInt().value;
        const resourceType = ctx.checkQuery('resourceType').optional().isResourceType().value;
        const omitResourceType = ctx.checkQuery('omitResourceType').optional().isResourceType().value;
        const tags = ctx.checkQuery('tags').optional().toSplitArray().len(1, 20).value;
        const onlineStatus = ctx.checkQuery('onlineStatus').optional().toInt().default(1).value;
        const page = ctx.checkQuery('page').optional().default(1).toInt().gt(0).value;
        const pageSize = ctx.checkQuery('pageSize').optional().default(10).gt(0).lt(101).toInt().value;
        const keywords = ctx.checkQuery('keywords').optional().type('string').len(1, 100).value;
        const isLoadPolicyInfo = ctx.checkQuery('isLoadPolicyInfo').optional().toInt().default(0).in([0, 1]).value;
        const isLoadVersionProperty = ctx.checkQuery("isLoadVersionProperty").optional().toInt().default(0).in([0, 1]).value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();
        const condition = { nodeId };
        if (lodash_1.isString(resourceType)) { //resourceType 与 omitResourceType互斥
            condition['resourceInfo.resourceType'] = resourceType;
        }
        else if (lodash_1.isString(omitResourceType)) {
            condition['resourceInfo.resourceType'] = { $ne: omitResourceType };
        }
        if (tags) {
            condition.tags = { $in: tags };
        }
        if (onlineStatus === 0 || onlineStatus === 1) {
            condition.onlineStatus = onlineStatus;
        }
        if (lodash_1.isString(keywords)) {
            const searchExp = { $regex: keywords, $options: 'i' };
            condition.$or = [{ presentableName: searchExp }, { presentableTitle: searchExp }, { 'resourceInfo.resourceName': searchExp }];
        }
        const pageResult = await this.presentableService.findPageList(condition, page, pageSize, projection, { createDate: -1 });
        if (isLoadPolicyInfo) {
            pageResult.dataList = await this.presentableService.fillPresentablePolicyInfo(pageResult.dataList);
        }
        if (isLoadVersionProperty) {
            pageResult.dataList = await this.presentableService.fillPresentableVersionProperty(pageResult.dataList, false, false);
        }
        return ctx.success(pageResult);
        // 以下代码已过期,目前只有展品切换版本时需要考虑所有版本列表,此操作可以通过调用资源接口获取到可选版本集
        // const isLoadingResourceInfo = ctx.checkQuery("isLoadingResourceInfo").optional().toInt().in([0, 1]).default(0).value;
        // if (!pageResult.dataList.length || !isLoadingResourceInfo) {
        //     return ctx.success(pageResult);
        // }
        // const allResourceIds = chain(pageResult.dataList).map(x => x.resourceInfo.resourceId).uniq().value();
        // const resourceVersionsMap = await this.outsideApiService.getResourceListByIds(allResourceIds, {projection: 'resourceId,resourceVersions'})
        //     .then(dataList => new Map(dataList.map(x => [x.resourceId, x.resourceVersions])));
        //
        // pageResult.dataList = pageResult.dataList.map(presentableInfo => {
        //     const model = (<any>presentableInfo).toObject();
        //     const resourceVersions = resourceVersionsMap.get(model.resourceInfo.resourceId) ?? [];
        //     model.resourceInfo.versions = resourceVersions.map(x => x.version);
        //     return model;
        // });
        //
        // ctx.success(pageResult);
    }
    /**
     * 获取presentable列表
     * @param ctx
     * @returns {Promise<void>}
     */
    async list(ctx) {
        const userId = ctx.checkQuery('userId').optional().toInt().gt(0).value;
        const nodeId = ctx.checkQuery('nodeId').optional().toInt().gt(0).value;
        const presentableIds = ctx.checkQuery('presentableIds').optional().isSplitMongoObjectId().toSplitArray().len(1, 100).value;
        const resourceIds = ctx.checkQuery('resourceIds').optional().isSplitMongoObjectId().toSplitArray().len(1, 100).value;
        const resourceNames = ctx.checkQuery('resourceNames').optional().toSplitArray().len(1, 100).value;
        const isLoadPolicyInfo = ctx.checkQuery('isLoadPolicyInfo').optional().toInt().in([0, 1]).value;
        const isLoadVersionProperty = ctx.checkQuery("isLoadVersionProperty").optional().toInt().default(0).in([0, 1]).value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();
        const condition = {};
        if (lodash_1.isNumber(userId)) {
            condition.userId = userId;
        }
        if (lodash_1.isNumber(nodeId)) {
            condition.nodeId = nodeId;
        }
        if (presentableIds) {
            condition._id = { $in: presentableIds };
        }
        if (resourceIds) {
            condition['resourceInfo.resourceId'] = { $in: resourceIds };
        }
        if (resourceNames) {
            condition['resourceInfo.resourceNames'] = { $in: resourceNames.map(decodeURIComponent) };
        }
        if (!resourceIds && !presentableIds && !resourceNames) {
            throw new egg_freelog_base_1.ArgumentError(ctx.gettext('params-required-validate-failed', 'presentableIds,resourceIds,resourceNames'));
        }
        let presentableList = await this.presentableService.find(condition, projection.join(' '));
        if (isLoadPolicyInfo) {
            presentableList = await this.presentableService.fillPresentablePolicyInfo(presentableList);
        }
        if (isLoadVersionProperty) {
            presentableList = await this.presentableService.fillPresentableVersionProperty(presentableList, false, false);
        }
        ctx.success(presentableList);
    }
    async createPresentable(ctx) {
        const nodeId = ctx.checkBody('nodeId').exist().toInt().gt(0).value;
        const resourceId = ctx.checkBody('resourceId').isResourceId().value;
        const resolveResources = ctx.checkBody('resolveResources').exist().isArray().value;
        const policies = ctx.checkBody('policies').optional().default([]).isArray().value;
        const tags = ctx.checkBody('tags').optional().isArray().len(0, 20).value;
        const presentableName = ctx.checkBody('presentableName').exist().type('string').isPresentableName().value;
        const version = ctx.checkBody('version').exist().is(semver.valid, ctx.gettext('params-format-validate-failed', 'version')).value;
        ctx.validateParams();
        this._policySchemaValidate(policies, 'addPolicy');
        this._resolveResourcesSchemaValidate(resolveResources);
        const nodeInfo = await this.nodeService.findById(nodeId);
        this.nodeCommonChecker.nullObjectAndUserAuthorizationCheck(nodeInfo);
        await this.presentableCommonChecker.checkResourceIsCreated(nodeId, resourceId);
        await this.presentableCommonChecker.checkPresentableNameIsUnique(nodeId, presentableName);
        const resourceInfo = await this.outsideApiService.getResourceInfo(resourceId);
        if (!resourceInfo) {
            throw new egg_freelog_base_1.ArgumentError(ctx.gettext('params-validate-failed', 'resourceId'));
        }
        if (resourceInfo.status === 0) {
            throw new egg_freelog_base_1.ArgumentError(ctx.gettext('be-sign-subject-offline'), { resourceId });
        }
        const subjectVersionInfo = resourceInfo.resourceVersions.find(x => x.version === version);
        if (!subjectVersionInfo) {
            throw new egg_freelog_base_1.ArgumentError(ctx.gettext('params-validate-failed', 'version'), { version });
        }
        await this.presentableService.createPresentable({
            presentableName, resourceInfo, version,
            tags, policies, nodeInfo, resolveResources,
            versionId: subjectVersionInfo.versionId,
            presentableTitle: presentableName,
            coverImages: resourceInfo.coverImages,
        }).then(ctx.success);
    }
    async updatePresentable(ctx) {
        const presentableId = ctx.checkParams("presentableId").exist().isPresentableId().value;
        const presentableTitle = ctx.checkBody('presentableTitle').optional().type('string').value;
        const tags = ctx.checkBody('tags').optional().isArray().value;
        const resolveResources = ctx.checkBody('resolveResources').optional().isArray().value;
        const updatePolicies = ctx.checkBody('updatePolicies').optional().isArray().len(1).value;
        const addPolicies = ctx.checkBody('addPolicies').optional().isArray().len(1).value;
        const coverImages = ctx.checkBody('coverImages').optional().isArray().len(0, 10).value;
        ctx.validateParams();
        if ([updatePolicies, addPolicies, presentableTitle, tags, resolveResources].every(lodash_1.isUndefined)) {
            throw new egg_freelog_base_1.ArgumentError(ctx.gettext('params-required-validate-failed'));
        }
        if (!lodash_1.isEmpty(coverImages) && coverImages.some(x => !ctx.app.validator.isURL(x.toString(), { protocols: ['https'] }))) {
            throw new egg_freelog_base_1.ArgumentError(ctx.gettext('params-format-validate-failed', 'coverImages'));
        }
        this._policySchemaValidate(addPolicies, 'addPolicy');
        this._policySchemaValidate(updatePolicies, 'updatePolicy');
        this._resolveResourcesSchemaValidate(resolveResources);
        const presentableInfo = await this.presentableService.findById(presentableId);
        ctx.entityNullValueAndUserAuthorizationCheck(presentableInfo, {
            msg: ctx.gettext('params-validate-failed', 'presentableId')
        });
        await this.presentableService.updatePresentable(presentableInfo, {
            addPolicies, updatePolicies, presentableTitle, resolveResources, tags, coverImages
        }).then(ctx.success);
    }
    async updatePresentableOnlineStatus(ctx) {
        const presentableId = ctx.checkParams("presentableId").exist().isPresentableId().value;
        const onlineStatus = ctx.checkBody("onlineStatus").exist().toInt().in([enum_1.PresentableOnlineStatusEnum.Offline, enum_1.PresentableOnlineStatusEnum.Online]).value;
        ctx.validateParams();
        const presentableInfo = await this.presentableService.findById(presentableId);
        ctx.entityNullValueAndUserAuthorizationCheck(presentableInfo, {
            msg: ctx.gettext('params-validate-failed', 'presentableId')
        });
        await this.presentableService.updateOnlineStatus(presentableInfo, onlineStatus).then(ctx.success);
    }
    async updatePresentableVersion(ctx) {
        const presentableId = ctx.checkParams("presentableId").exist().isPresentableId().value;
        const version = ctx.checkBody('version').exist().is(semver.valid, ctx.gettext('params-format-validate-failed', 'version')).value;
        ctx.validateParams();
        const presentableInfo = await this.presentableService.findById(presentableId);
        ctx.entityNullValueAndUserAuthorizationCheck(presentableInfo, {
            msg: ctx.gettext('params-validate-failed', 'presentableId')
        });
        const resourceInfo = await this.outsideApiService.getResourceInfo(presentableInfo.resourceInfo.resourceId, { projection: 'resourceVersions' });
        const resourceVersionInfo = resourceInfo.resourceVersions.find(x => x.version === version);
        if (!resourceVersionInfo) {
            throw new egg_freelog_base_1.ArgumentError(ctx.gettext('params-validate-failed', 'version'), { version });
        }
        await this.presentableService.updatePresentableVersion(presentableInfo, resourceVersionInfo.version, resourceVersionInfo.versionId).then(ctx.success);
    }
    async updatePresentableRewriteProperty(ctx) {
        const presentableId = ctx.checkParams("presentableId").exist().isPresentableId().value;
        const rewriteProperty = ctx.checkBody('rewriteProperty').exist().isArray().value;
        ctx.validateParams();
        const presentableInfo = await this.presentableService.findById(presentableId);
        ctx.entityNullValueAndUserAuthorizationCheck(presentableInfo, {
            msg: ctx.gettext('params-validate-failed', 'presentableId')
        });
        const rewritePropertyValidateResult = this.presentableRewritePropertyValidator.validate(rewriteProperty);
        if (!lodash_1.isEmpty(rewritePropertyValidateResult.errors)) {
            throw new egg_freelog_base_1.ArgumentError(this.ctx.gettext('params-format-validate-failed', 'rewriteProperty'), {
                errors: rewritePropertyValidateResult.errors
            });
        }
        await this.presentableVersionService.updatePresentableRewriteProperty(presentableInfo, rewriteProperty).then(ctx.success);
    }
    async presentableDetail(ctx) {
        const nodeId = ctx.checkQuery('nodeId').exist().isInt().gt(0).value;
        const resourceId = ctx.checkQuery('resourceId').optional().isResourceId().value;
        const resourceName = ctx.checkQuery('resourceName').optional().isFullResourceName().value;
        const presentableName = ctx.checkQuery('presentableName').optional().isPresentableName().value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        const isLoadPolicyInfo = ctx.checkQuery('isLoadPolicyInfo').optional().toInt().in([0, 1]).value;
        const isLoadVersionProperty = ctx.checkQuery("isLoadVersionProperty").optional().toInt().default(0).in([0, 1]).value;
        const isLoadCustomPropertyDescriptors = ctx.checkQuery("isLoadCustomPropertyDescriptors").optional().toInt().default(0).in([0, 1]).value;
        ctx.validateParams();
        if ([resourceId, resourceName, presentableName].every(lodash_1.isUndefined)) {
            throw new egg_freelog_base_1.ArgumentError(ctx.gettext('params-required-validate-failed', 'resourceId,resourceName,presentableName'));
        }
        const condition = { nodeId };
        if (lodash_1.isString(resourceId)) {
            condition['resourceInfo.resourceId'] = resourceId;
        }
        if (lodash_1.isString(resourceName)) {
            condition['resourceInfo.resourceName'] = resourceName;
        }
        if (lodash_1.isString(presentableName)) {
            condition['presentableName'] = presentableName;
        }
        let presentableInfo = await this.presentableService.findOne(condition, projection.join(' ')).then(ctx.success);
        if (presentableInfo && (isLoadVersionProperty || isLoadCustomPropertyDescriptors)) {
            presentableInfo = await this.presentableService.fillPresentableVersionProperty([presentableInfo], isLoadCustomPropertyDescriptors, isLoadCustomPropertyDescriptors).then(lodash_1.first);
        }
        if (presentableInfo && isLoadPolicyInfo) {
            presentableInfo = await this.presentableService.fillPresentablePolicyInfo([presentableInfo]).then(lodash_1.first);
        }
        ctx.success(presentableInfo);
    }
    async show(ctx) {
        const presentableId = ctx.checkParams("presentableId").isPresentableId().value;
        const isLoadPolicyInfo = ctx.checkQuery('isLoadPolicyInfo').optional().toInt().in([0, 1]).value;
        const isLoadVersionProperty = ctx.checkQuery("isLoadVersionProperty").optional().toInt().default(0).in([0, 1]).value;
        const isLoadCustomPropertyDescriptors = ctx.checkQuery("isLoadCustomPropertyDescriptors").optional().toInt().default(0).in([0, 1]).value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();
        let presentableInfo = await this.presentableService.findById(presentableId, projection.join(' '));
        if (presentableInfo && (isLoadVersionProperty || isLoadCustomPropertyDescriptors)) {
            presentableInfo = await this.presentableService.fillPresentableVersionProperty([presentableInfo], isLoadCustomPropertyDescriptors, isLoadCustomPropertyDescriptors).then(lodash_1.first);
        }
        if (presentableInfo && isLoadPolicyInfo) {
            presentableInfo = await this.presentableService.fillPresentablePolicyInfo([presentableInfo]).then(lodash_1.first);
        }
        ctx.success(presentableInfo);
    }
    async dependencyTree(ctx) {
        const presentableId = ctx.checkParams("presentableId").isPresentableId().value;
        const maxDeep = ctx.checkQuery('maxDeep').optional().toInt().default(100).lt(101).value;
        // 不传则默认从根节点开始,否则从指定的树节点ID开始往下构建依赖树
        const nid = ctx.checkQuery('nid').optional().type('string').value;
        const isContainRootNode = ctx.checkQuery('isContainRootNode').optional().default(true).toBoolean().value;
        const version = ctx.checkQuery('version').optional().is(semver.valid, ctx.gettext('params-format-validate-failed', 'version')).value;
        ctx.validateParams();
        const condition = { presentableId };
        if (lodash_1.isString(version)) {
            condition.version = version;
        }
        else {
            await this.presentableService.findById(presentableId, 'version').then(data => condition.version = data?.version ?? '');
        }
        const presentableVersionInfo = await this.presentableVersionService.findOne(condition, 'dependencyTree');
        if (!presentableVersionInfo) {
            throw new egg_freelog_base_1.ArgumentError(ctx.gettext('params-validate-failed', 'presentableId or version'));
        }
        const presentableDependencies = this.presentableVersionService.convertPresentableDependencyTree(presentableVersionInfo.dependencyTree, nid, isContainRootNode, maxDeep);
        ctx.success(presentableDependencies);
    }
    async authTree(ctx) {
        const presentableId = ctx.checkParams("presentableId").isPresentableId().value;
        const maxDeep = ctx.checkQuery('maxDeep').optional().toInt().default(100).lt(101).value;
        // 不传则默认从根节点开始,否则从指定的树节点ID开始往下构建依赖树
        const nid = ctx.checkQuery('nid').optional().type('string').value;
        // 与依赖树不同的是presentable授权树没有根节点(节点签约的,不能作为根),所以此参数一般是配合nid一起使用才有正确的效果
        const isContainRootNode = ctx.checkQuery('isContainRootNode').optional().default(true).toBoolean().value;
        const version = ctx.checkQuery('version').optional().is(semver.valid, ctx.gettext('params-format-validate-failed', 'version')).value;
        ctx.validateParams();
        const condition = { presentableId };
        if (lodash_1.isString(version)) {
            condition.version = version;
        }
        else {
            await this.presentableService.findById(presentableId, 'version').then(data => condition.version = data.version);
        }
        const presentableVersionInfo = await this.presentableVersionService.findOne(condition, 'authTree');
        if (!presentableVersionInfo) {
            throw new egg_freelog_base_1.ArgumentError(ctx.gettext('params-validate-failed', 'version'));
        }
        const presentableAuthTree = this.presentableVersionService.convertPresentableAuthTree(presentableVersionInfo.authTree, nid, isContainRootNode, maxDeep);
        ctx.success(presentableAuthTree);
    }
    /**
     * 策略格式校验
     * @param policies
     * @private
     */
    _policySchemaValidate(policies, mode) {
        const policyValidateResult = this.presentablePolicyValidator.validate(policies || [], mode);
        if (!lodash_1.isEmpty(policyValidateResult.errors)) {
            throw new egg_freelog_base_1.ArgumentError(this.ctx.gettext('params-format-validate-failed', 'policies'), {
                errors: policyValidateResult.errors
            });
        }
    }
    /**
     * 解决上抛资源格式校验
     * @param resolveResources
     */
    _resolveResourcesSchemaValidate(resolveResources) {
        const resolveResourcesValidateResult = this.resolveResourcesValidator.validate(resolveResources || []);
        if (!lodash_1.isEmpty(resolveResourcesValidateResult.errors)) {
            throw new egg_freelog_base_1.ArgumentError(this.ctx.gettext('params-format-validate-failed', 'resolveResources'), {
                errors: resolveResourcesValidateResult.errors
            });
        }
    }
};
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], PresentableController.prototype, "ctx", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], PresentableController.prototype, "nodeCommonChecker", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], PresentableController.prototype, "presentableCommonChecker", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], PresentableController.prototype, "nodeService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], PresentableController.prototype, "outsideApiService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], PresentableController.prototype, "presentableService", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], PresentableController.prototype, "resolveResourcesValidator", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], PresentableController.prototype, "presentablePolicyValidator", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], PresentableController.prototype, "presentableRewritePropertyValidator", void 0);
__decorate([
    midway_1.inject(),
    __metadata("design:type", Object)
], PresentableController.prototype, "presentableVersionService", void 0);
__decorate([
    midway_1.get('/'),
    vistorIdentityDecorator_1.visitorIdentity(egg_freelog_base_1.InternalClient | egg_freelog_base_1.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PresentableController.prototype, "presentablePageList", null);
__decorate([
    midway_1.get('/list'),
    vistorIdentityDecorator_1.visitorIdentity(egg_freelog_base_1.InternalClient | egg_freelog_base_1.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PresentableController.prototype, "list", null);
__decorate([
    midway_1.post('/'),
    vistorIdentityDecorator_1.visitorIdentity(egg_freelog_base_1.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PresentableController.prototype, "createPresentable", null);
__decorate([
    midway_1.put('/:presentableId'),
    vistorIdentityDecorator_1.visitorIdentity(egg_freelog_base_1.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PresentableController.prototype, "updatePresentable", null);
__decorate([
    midway_1.put('/:presentableId/onlineStatus'),
    vistorIdentityDecorator_1.visitorIdentity(egg_freelog_base_1.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PresentableController.prototype, "updatePresentableOnlineStatus", null);
__decorate([
    midway_1.put('/:presentableId/version'),
    vistorIdentityDecorator_1.visitorIdentity(egg_freelog_base_1.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PresentableController.prototype, "updatePresentableVersion", null);
__decorate([
    midway_1.put('/:presentableId/rewriteProperty'),
    vistorIdentityDecorator_1.visitorIdentity(egg_freelog_base_1.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PresentableController.prototype, "updatePresentableRewriteProperty", null);
__decorate([
    midway_1.get('/detail'),
    vistorIdentityDecorator_1.visitorIdentity(egg_freelog_base_1.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PresentableController.prototype, "presentableDetail", null);
__decorate([
    midway_1.get('/:presentableId'),
    vistorIdentityDecorator_1.visitorIdentity(egg_freelog_base_1.InternalClient | egg_freelog_base_1.LoginUser),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PresentableController.prototype, "show", null);
__decorate([
    midway_1.get('/:presentableId/dependencyTree'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PresentableController.prototype, "dependencyTree", null);
__decorate([
    midway_1.get('/:presentableId/authTree'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PresentableController.prototype, "authTree", null);
PresentableController = __decorate([
    midway_1.provide(),
    midway_1.controller('/v2/presentables')
], PresentableController);
exports.PresentableController = PresentableController;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VudGFibGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvYXBwL2NvbnRyb2xsZXIvcHJlc2VudGFibGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsaUNBQWlDO0FBQ2pDLG1DQUF1RTtBQUN2RSxtQ0FBbUU7QUFDbkUsa0ZBQXFFO0FBQ3JFLHVEQUEwRTtBQUsxRSxxQ0FBdUQ7QUFJdkQsSUFBYSxxQkFBcUIsR0FBbEMsTUFBYSxxQkFBcUI7SUF5QjlCLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHO1FBRXpCLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsS0FBSyxDQUFDO1FBQzlELE1BQU0sWUFBWSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsY0FBYyxFQUFFLENBQUMsS0FBSyxDQUFDO1FBQ3RGLE1BQU0sZ0JBQWdCLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLGNBQWMsRUFBRSxDQUFDLEtBQUssQ0FBQztRQUM5RixNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLFlBQVksRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQy9FLE1BQU0sWUFBWSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUN4RixNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFB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