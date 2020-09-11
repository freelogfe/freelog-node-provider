import { IOutsideApiService, ResourceInfo } from "../../interface";
import { TestRuleMatchInfo, TestResourceDependencyTree } from "../../test-node-interface";
export declare class ImportResourceEntityHandler {
    outsideApiService: IOutsideApiService;
    /**
     * 从规则中分析需要导入的资源数据
     * @param testRules
     * @param promiseResults
     */
    importResourceEntityDataFromRules(addResourceRules: TestRuleMatchInfo[]): Promise<void>;
    /**
     * 获取展品依赖树
     * @param resourceId
     * @param version
     */
    getResourceDependencyTree(resourceIdOrName: string, version: string): Promise<TestResourceDependencyTree[]>;
    /**
     * 填充实体数据
     * @param matchRule
     * @param resourceInfo
     * @private
     */
    _fillRuleEntityInfo(matchRule: TestRuleMatchInfo, resourceInfo: ResourceInfo): void;
    /**
     * 匹配发行版本
     * @param releaseInfo
     * @param versionRange
     * @returns {*}
     */
    matchResourceVersion(resourceInfo: ResourceInfo, versionRange: string): any;
}
