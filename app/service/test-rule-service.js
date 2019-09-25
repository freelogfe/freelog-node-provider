'use strict'

const semver = require('semver')
const lodash = require('lodash')
const Service = require('egg').Service
const {ApplicationError} = require('egg-freelog-base/error')
const NodeTestRuleHandler = require('../test-rule-handler/index')

module.exports = class TestRuleService extends Service {

    constructor({app, request}) {
        super(...arguments)
        this.nodeTestRuleHandler = new NodeTestRuleHandler(app)
        this.nodeTestRuleProvider = app.dal.nodeTestRuleProvider
        this.nodeTestResourceProvider = app.dal.nodeTestResourceProvider
        this.nodeTestResourceDependencyTreeProvider = app.dal.nodeTestResourceDependencyTreeProvider
    }

    /**
     * 匹配并保持节点的测试资源
     * @param nodeId
     * @param testRuleText
     * @returns {Promise<model>}
     */
    async matchAndSaveNodeTestRule(nodeId, testRuleText) {

        const {ctx} = this
        const userId = ctx.request.userId
        const {matchedTestResources, testRules} = await this._compileAndMatchTestRule(nodeId, userId, testRuleText)


        const nodeTestRuleInfo = {
            nodeId, userId, ruleText: testRuleText,
            testRules: testRules.map(testRuleInfo => {
                let {id, text, effectiveMatchCount, matchErrors} = testRuleInfo
                return {
                    id, text, effectiveMatchCount, matchErrors,
                    ruleInfo: lodash.omit(testRuleInfo, ['id', '_abortIndex', 'text', 'effectiveMatchCount', 'isValid', 'matchErrors'])
                }
            })
        }

        const nodeTestResources = matchedTestResources.map(nodeTestResource => {
            let {testResourceId, testResourceName, type, version, definedTagInfo, onlineInfo, efficientRules, dependencyTree, _originModel} = nodeTestResource
            return {
                _id: testResourceId, testResourceId, testResourceName, nodeId, dependencyTree,
                resourceType: _originModel['resourceType'] || _originModel.releaseInfo.resourceType,
                originInfo: {
                    id: _originModel['presentableId'] || _originModel['releaseId'] || _originModel['mockResourceId'],
                    name: _originModel['presentableName'] || _originModel['releaseName'] || _originModel['fullName'],
                    type, version
                },
                differenceInfo: {
                    onlineStatusInfo: {
                        isOnline: onlineInfo.isOnline,
                        ruleId: onlineInfo.source === 'default' ? "" : onlineInfo.source
                    },
                    userDefinedTagInfo: {
                        tags: definedTagInfo.definedTags,
                        ruleId: definedTagInfo.source === 'default' ? "" : definedTagInfo.source
                    }
                },
                rules: efficientRules.map(x => Object({
                    id: x.id, operation: x.operation
                }))
            }
        })

        const nodeTestResourceDependencyTrees = nodeTestResources.map(testResource => Object({
            _id: testResource.testResourceId, nodeId,
            testResourceName: testResource.testResourceName,
            dependencyTree: this._flattenDependencyTree(testResource.dependencyTree)
        }))

        const deleteTask1 = this.nodeTestRuleProvider.deleteOne({nodeId})
        const deleteTask2 = this.nodeTestResourceProvider.deleteMany({nodeId})
        const deleteTask3 = this.nodeTestResourceDependencyTreeProvider.deleteMany({nodeId})

        await Promise.all([deleteTask1, deleteTask2, deleteTask3])

        const task1 = this.nodeTestRuleProvider.create(nodeTestRuleInfo)
        const task2 = this.nodeTestResourceProvider.insertMany(nodeTestResources)
        const task3 = this.nodeTestResourceDependencyTreeProvider.insertMany(nodeTestResourceDependencyTrees)

        return Promise.all([task1, task2, task3]).then(() => nodeTestRuleInfo).catch(error => {
            console.log('测试节点规则,匹配结果数据保存失败', error)
        })
    }

    /**
     * 过滤特使资源依赖树
     * @returns {Promise<void>}
     */
    filterTestResourceDependency(dependencyTree, dependentEntityName, dependentEntityType, dependentEntityVersionRange) {

        const rootDependencies = dependencyTree.filter(x => x.deep === 1)

        function recursionSetMatchResult(dependencies) {
            for (let i = 0; i < dependencies.length; i++) {
                let currentDependInfo = dependencies[i]
                if (entityIsMatched(currentDependInfo)) {
                    currentDependInfo.isMatched = true
                    continue
                }
                let subDependencies = getDependencies(currentDependInfo)
                currentDependInfo.isMatched = recursionMatchResult(subDependencies)
                recursionSetMatchResult(subDependencies)
            }
        }

        function recursionMatchResult(dependencies) {
            if (!dependencies.length) {
                return false
            }
            for (let i = 0; i < dependencies.length; i++) {
                let currentDependInfo = dependencies[i]
                if (entityIsMatched(currentDependInfo)) {
                    return true
                }
                return recursionMatchResult(getDependencies(currentDependInfo))
            }
        }

        function getDependencies(dependInfo, isFilterMatched = false) {
            return dependencyTree.filter(x => x.deep === dependInfo.deep + 1 && x.parentId === dependInfo.id && x.parentVersion === dependInfo.version && (!isFilterMatched || x.isMatched))
        }

        function entityIsMatched(dependInfo) {
            let {name, type, version} = dependInfo
            let nameAndVersionIsMatched = name === dependentEntityName && type === dependentEntityType
            let versionIsMatched = dependentEntityType === 'mock' ? true : semver.satisfies(version, dependentEntityVersionRange)
            return nameAndVersionIsMatched && versionIsMatched
        }

        function recursionBuildDependencyTree(dependencies) {
            return dependencies.filter(x => x.isMatched).map(item => {
                let model = lodash.pick(item, ['id', 'name', 'type', 'version'])
                model.dependencies = recursionBuildDependencyTree(getDependencies(item), item.deep, item.id, item.parentVersion)
                return model
            })
        }

        recursionSetMatchResult(rootDependencies)

        return recursionBuildDependencyTree(rootDependencies)
    }

    /**
     * 编译并匹配测试结果
     * @param nodeId
     * @param userId
     * @param testRuleText
     * @returns {Promise<*>}
     */
    async _compileAndMatchTestRule(nodeId, userId, testRuleText) {

        const {errors, rules} = this.nodeTestRuleHandler.compileTestRule(testRuleText)
        if (!lodash.isEmpty(errors)) {
            throw new ApplicationError(this.ctx.gettext('node-test-rule-compile-failed'), {errors})
        }
        
        const matchedTestResources = await this.nodeTestRuleHandler.matchTestRuleResults(nodeId, userId, rules)

        return {matchedTestResources, testRules: rules}
    }

    /**
     * 拍平依赖树
     * @param dependencies
     * @param parentId
     * @param parentReleaseVersion
     * @private
     */
    _flattenDependencyTree(dependencyTree, parentId = '', parentVersion = '', results = []) {
        for (let i = 0, j = dependencyTree.length; i < j; i++) {
            let {id, name, type, deep, version, dependencies} = dependencyTree[i]
            results.push({id, name, type, deep, version, parentId, parentVersion})
            this._flattenDependencyTree(dependencies, id, version, results)
        }
        return results
    }
}


