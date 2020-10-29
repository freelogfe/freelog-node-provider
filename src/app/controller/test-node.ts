import {satisfies} from 'semver';
import {IJsonSchemaValidate, INodeService} from '../../interface';
import {controller, inject, get, post, put, provide} from 'midway';
import {visitorIdentity} from '../../extend/vistorIdentityDecorator';
import {LoginUser, InternalClient, ArgumentError} from 'egg-freelog-base/index';
import {ITestNodeService, TestResourceOriginType} from "../../test-node-interface";
import {isString, isArray, isUndefined, pick, chain, uniq, first, isEmpty} from 'lodash';

@provide()
@controller('/v2/testNodes')
export class TestNodeController {

    @inject()
    nodeCommonChecker;
    @inject()
    testNodeGenerator;
    @inject()
    nodeService: INodeService;
    @inject()
    testNodeService: ITestNodeService;
    @inject()
    resolveResourcesValidator: IJsonSchemaValidate;

    @get('/:nodeId/rules')
    @visitorIdentity(LoginUser | InternalClient)
    async showTestRuleInfo(ctx) {

        const nodeId = ctx.checkParams('nodeId').toInt().gt(0).value;
        ctx.validateParams();

        await this.testNodeService.findNodeTestRuleInfoById(nodeId).then(ctx.success);
    }

    @post('/:nodeId/rules')
    @visitorIdentity(LoginUser)
    async createTestRule(ctx) {

        const nodeId = ctx.checkParams('nodeId').toInt().gt(0).value;
        const testRuleText = ctx.checkBody('testRuleText').exist().type('string').decodeURIComponent().value;
        ctx.validateParams();

        const nodeInfo = await this.nodeService.findById(nodeId);
        this.nodeCommonChecker.nullObjectAndUserAuthorizationCheck(nodeInfo);

        await this.testNodeService.matchAndSaveNodeTestRule(nodeId, testRuleText ?? '').then(ctx.success);
    }

    @put('/:nodeId/rules')
    @visitorIdentity(LoginUser)
    async updateTestRule(ctx) {

        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const additionalTestRule = ctx.checkBody('additionalTestRule').exist().type('string').decodeURIComponent().value;
        ctx.validateParams();

        const nodeInfo = await this.nodeService.findById(nodeId);
        this.nodeCommonChecker.nullObjectAndUserAuthorizationCheck(nodeInfo);

        const nodeTestRule = await this.testNodeService.findNodeTestRuleInfoById(nodeId, 'ruleText');
        const currentRuleText = (nodeTestRule?.ruleText ?? '') + '   ' + additionalTestRule;

        await this.testNodeService.matchAndSaveNodeTestRule(nodeId, currentRuleText).then(ctx.success);
    }

    @post('/:nodeId/rules/rematch')
    @visitorIdentity(LoginUser)
    async rematchTestRule(ctx) {

        const nodeId = ctx.checkParams('nodeId').toInt().gt(0).value;
        ctx.validateParams();

        const nodeInfo = await this.nodeService.findById(nodeId);
        this.nodeCommonChecker.nullObjectAndUserAuthorizationCheck(nodeInfo);

        const nodeTestRule = await this.testNodeService.findNodeTestRuleInfoById(nodeId, 'ruleText');

        await this.testNodeService.matchAndSaveNodeTestRule(nodeId, nodeTestRule?.ruleText ?? '').then(ctx.success);
    }

    @get('/:nodeId/testResources')
    @visitorIdentity(LoginUser)
    async testResources(ctx) {

        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const page = ctx.checkQuery("page").optional().default(1).toInt().gt(0).value;
        const pageSize = ctx.checkQuery("pageSize").optional().default(10).gt(0).lt(101).toInt().value;
        const keywords = ctx.checkQuery('keywords').optional().type('string').len(1, 100).value;
        const tags = ctx.checkQuery('tags').optional().toSplitArray().len(1, 20).value;
        const resourceType = ctx.checkQuery('resourceType').optional().isResourceType().value;
        const isOnline = ctx.checkQuery('isOnline').optional().toInt().default(1).in([0, 1, 2]).value;
        const projection = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        const omitResourceType = ctx.checkQuery('omitResourceType').optional().isResourceType().value;
        ctx.validateParams();

        const nodeInfo = await this.nodeService.findById(nodeId);
        this.nodeCommonChecker.nullObjectAndUserAuthorizationCheck(nodeInfo);

        const condition: any = {nodeId};
        if (isString(resourceType)) { //resourceType 与 omitResourceType互斥
            condition.resourceType = resourceType
        } else if (isString(omitResourceType)) {
            condition.resourceType = {$ne: omitResourceType};
        }
        if (isArray(tags)) {
            condition['stateInfo.tagsInfo.tags'] = {$in: tags};
        }
        if (isOnline === 1 || isOnline === 0) {
            condition['stateInfo.onlineStatusInfo.isOnline'] = isOnline;
        }
        if (isString(keywords)) {
            const searchExp = {$regex: keywords, $options: 'i'};
            condition.$or = [{testResourceName: searchExp}, {'originInfo.name': searchExp}];
        }

        await this.testNodeService.findTestResourcePageList(condition, page, pageSize, projection, null).then(ctx.success);
    }

    /**
     * 根据源资源获取测试资源.例如通过发行名称或者发行ID获取测试资源.API不再提供单一查询
     * @param ctx
     */
    @get('/:nodeId/testResources/list')
    @visitorIdentity(LoginUser)
    async testResourceList(ctx) {

        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const entityType = ctx.checkQuery('entityType').optional().in([TestResourceOriginType.Resource, TestResourceOriginType.Object]).value;
        const entityIds = ctx.checkQuery('entityIds').optional().isSplitMongoObjectId().toSplitArray().len(1, 100).value;
        const entityNames = ctx.checkQuery('entityNames').optional().toSplitArray().len(1, 100).value;
        const projection: string[] = ctx.checkQuery('projection').optional().toSplitArray().default([]).value;
        ctx.validateParams();

        if ([entityType, entityIds, entityNames].every(isUndefined)) {
            throw new ArgumentError('params-required-validate-failed', 'entityType,entityIds,entityNames')
        }

        const nodeInfo = await this.nodeService.findById(nodeId);
        this.nodeCommonChecker.nullObjectAndUserAuthorizationCheck(nodeInfo);

        const condition = {nodeId};
        if (entityType) {
            condition['originInfo.type'] = entityType;
        }
        if (isArray(entityIds)) {
            condition['originInfo.id'] = {$in: entityIds};
        }
        if (isArray(entityNames)) {
            condition['originInfo.name'] = {$in: entityNames};
        }

        await this.testNodeService.findTestResources(condition, projection.join(' ')).then(ctx.success);
    }

    @get('/testResources/:testResourceId')
    @visitorIdentity(LoginUser)
    async showTestResource(ctx) {

        const testResourceId = ctx.checkParams('testResourceId').exist().isMd5().value;
        ctx.validateParams();

        await this.testNodeService.findOneTestResource({testResourceId}).then(ctx.success);
    }

    @put('/testResources/:testResourceId')
    @visitorIdentity(LoginUser)
    async updateTestResource(ctx) {

        const testResourceId = ctx.checkParams('testResourceId').exist().isMd5().value;
        const resolveResources = ctx.checkBody('resolveResources').exist().isArray().len(1, 999).value;
        ctx.validateParams();

        const resolveResourcesValidateResult = this.resolveResourcesValidator.validate(resolveResources ?? []);
        if (!isEmpty(resolveResourcesValidateResult.errors)) {
            throw new ArgumentError(ctx.gettext('params-format-validate-failed', 'resolveResources'), {
                errors: resolveResourcesValidateResult.errors
            });
        }

        const testResourceInfo = await this.testNodeService.findOneTestResource({testResourceId});
        ctx.entityNullValueAndUserAuthorizationCheck(testResourceInfo, {
            msg: ctx.gettext('params-validate-failed', 'testResourceId')
        });

        await this.testNodeService.updateTestResource(testResourceInfo, resolveResources).then(ctx.success);
    }

    @get('/:nodeId/testResources/searchByDependency')
    @visitorIdentity(LoginUser)
    async searchTestResources(ctx) {

        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const dependentEntityId = ctx.checkQuery('dependentEntityId').exist().isMongoObjectId().value;
        const dependentEntityVersionRange = ctx.checkQuery('dependentEntityVersionRange').optional().toVersionRange().value;
        ctx.validateParams();

        const isFilterVersionRange = isString(dependentEntityVersionRange) && dependentEntityVersionRange !== '*';
        const projection = isFilterVersionRange ? 'testResourceId testResourceName dependencyTree' : 'testResourceId testResourceName';
        let testResourceTreeInfos = await this.testNodeService.findTestResourceTreeInfos({
            nodeId, 'dependencyTree.id': dependentEntityId
        }, projection);
        if (isFilterVersionRange) {
            testResourceTreeInfos = testResourceTreeInfos.filter(item => item.dependencyTree.some(x => x.id === dependentEntityId && satisfies(dependentEntityVersionRange, x.version)))
        }

        ctx.success(testResourceTreeInfos.map(x => pick(x, ['testResourceId', 'testResourceName'])));
    }

    @get('/testResources/:testResourceId/dependencyTree')
    @visitorIdentity(LoginUser)
    async testResourceDependencyTree(ctx) {

        const testResourceId = ctx.checkParams('testResourceId').exist().isMd5().value;
        const nid = ctx.checkQuery('nid').optional().type('string').value;
        const maxDeep = ctx.checkQuery('maxDeep').optional().toInt().default(100).lt(101).value;
        const isContainRootNode = ctx.checkQuery('isContainRootNode').optional().default(true).toBoolean().value;
        ctx.validateParams();

        const testResourceTreeInfo = await this.testNodeService.findOneTestResourceTreeInfo({testResourceId}, 'dependencyTree');
        if (!testResourceTreeInfo) {
            return [];
        }
        const dependencyTree = this.testNodeGenerator.generateTestResourceDependencyTree(testResourceTreeInfo.dependencyTree, nid, maxDeep, isContainRootNode);
        ctx.success(dependencyTree);
    }


    @get('/testResources/:testResourceId/authTree')
    @visitorIdentity(LoginUser)
    async testResourceAuthTree(ctx) {

        const testResourceId = ctx.checkParams('testResourceId').exist().isMd5().value;
        const nid = ctx.checkQuery('nid').optional().type('string').len(12, 12).value;
        const maxDeep = ctx.checkQuery('maxDeep').optional().toInt().default(100).lt(101).value;
        const isContainRootNode = ctx.checkQuery('isContainRootNode').optional().default(true).toBoolean().value;
        ctx.validateParams();

        const testResourceTreeInfo = await this.testNodeService.findOneTestResourceTreeInfo({testResourceId}, 'authTree');
        if (!testResourceTreeInfo) {
            return [];
        }
        const dependencyTree = this.testNodeGenerator.convertTestResourceAuthTree(testResourceTreeInfo.authTree, nid, maxDeep, isContainRootNode);
        ctx.success(dependencyTree);
    }


    @get('/:nodeId/testResources/dependencyTree/search')
    @visitorIdentity(LoginUser)
    async searchTestResourceDependencyTree(ctx) {

        const nodeId = ctx.checkParams('nodeId').exist().toInt().gt(0).value;
        const keywords = ctx.checkQuery('keywords').exist().type('string').value;
        ctx.validateParams();

        const searchRegexp = new RegExp(keywords, 'i');
        const condition = {
            nodeId, 'dependencyTree.name': searchRegexp
        };

        const nodeTestResourceDependencyTree = await this.testNodeService.findTestResourceTreeInfos(condition, 'dependencyTree');

        const searchResults = [];
        chain(nodeTestResourceDependencyTree).map(x => x.dependencyTree).flattenDeep().filter(x => searchRegexp.test(x.name)).groupBy(x => x.id).forIn((values) => {
            const model = pick(first(values), ['id', 'name', 'type']);
            model['versions'] = uniq(values.filter(x => x.version).map(x => x.version));
            searchResults.push(model);
        }).value();

        ctx.success(searchResults);
    }

    @get('/testResources/:testResourceId/dependencyTree/filter')
    @visitorIdentity(LoginUser)
    async filterTestResourceDependencyTree(ctx) {

        const testResourceId = ctx.checkParams('testResourceId').exist().isMd5().value;
        const dependentEntityId = ctx.checkQuery('dependentEntityId').exist().isMongoObjectId().value;
        const dependentEntityVersionRange = ctx.checkQuery('dependentEntityVersionRange').optional().toVersionRange().value;
        ctx.validateParams();

        const testResourceTreeInfo = await this.testNodeService.findOneTestResourceTreeInfo({testResourceId}, 'dependencyTree');
        if (!testResourceTreeInfo) {
            return ctx.success([]);
        }

        const filteredDependencyTree = this.testNodeGenerator.filterTestResourceDependencyTree(testResourceTreeInfo.dependencyTree ?? [], dependentEntityId, dependentEntityVersionRange);

        ctx.success(filteredDependencyTree);
    }
}