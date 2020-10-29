import { PageResult, PresentableInfo } from "./interface";
import { SubjectAuthResult } from "./auth-interface";
export declare enum TestResourceOriginType {
    Resource = "resource",
    Object = "object"
}
export declare enum TestNodeOperationEnum {
    Add = "add",
    Alter = "alter",
    ActivateTheme = "activate_theme"
}
export interface BaseTestResourceOriginInfo {
    name: string;
    type: TestResourceOriginType;
}
export interface CandidateInfo extends BaseTestResourceOriginInfo {
    versionRange?: string;
}
export interface TestResourceOriginInfo extends BaseTestResourceOriginInfo {
    id: string;
    version?: string;
    versions?: string[];
    coverImages?: string[];
    resourceType: string;
}
export interface ReplaceOptionInfo {
    replaced: CandidateInfo;
    replacer: CandidateInfo;
    scopes: CandidateInfo[][];
}
export interface BaseTestRuleInfo {
    text: string;
    operation: TestNodeOperationEnum;
    presentableName?: string;
    themeName?: string;
    tags: string[] | null;
    replaces?: ReplaceOptionInfo[];
    online: boolean | null;
    candidate?: CandidateInfo;
}
export interface TestRuleEfficientInfo {
    type: 'setTags' | 'setOnlineStatus' | 'replace';
    count: number;
}
export interface TestRuleMatchInfo {
    id: string;
    isValid: boolean;
    matchErrors: string[];
    ruleInfo: BaseTestRuleInfo;
    presentableInfo?: PresentableInfo;
    testResourceOriginInfo?: TestResourceOriginInfo;
    entityDependencyTree?: TestResourceDependencyTree[];
    tags?: {
        tags: string[];
        source: string;
    };
    onlineStatus?: {
        status: number;
        source: string;
    };
    efficientInfos: TestRuleEfficientInfo[];
}
export interface BaseReplacedInfo {
    id: string;
    name: string;
    type: TestResourceOriginType;
}
export interface TestResourceAuthTree {
    nid: string;
    id: string;
    name: string;
    type: TestResourceOriginType;
    version: string;
    versionId: string;
    userId?: number;
    children: TestResourceAuthTree[];
}
export interface FlattenTestResourceAuthTree {
    nid: string;
    id: string;
    name: string;
    type: TestResourceOriginType;
    version: string;
    versionId: string;
    deep: number;
    parentNid: string;
    userId: number;
}
export interface TestResourceDependencyTree {
    nid?: string;
    id: string;
    name: string;
    type: TestResourceOriginType;
    version: string;
    versionId: string;
    resourceType: string;
    fileSha1: string;
    replaced?: BaseReplacedInfo;
    dependencies: TestResourceDependencyTree[];
}
export interface FlattenTestResourceDependencyTree {
    nid: string;
    id: string;
    name: string;
    type: TestResourceOriginType;
    version: string;
    versionId: string;
    fileSha1: string;
    resourceType: string;
    deep: number;
    parentNid: string;
    userId?: number;
    replaced?: BaseReplacedInfo;
}
export interface ObjectDependencyTreeInfo {
    id: string;
    name: string;
    version?: string;
    versionId?: string;
    versionRange?: string;
    versions?: string[];
    fileSha1: string;
    type: 'object' | 'resource';
    resourceType: string;
    dependencies: ObjectDependencyTreeInfo[];
}
/**
 * 以下为DB数据结构
 */
export interface BaseContractInfo {
    policyId: string;
    contractId?: string;
}
export interface ResolveResourceInfo {
    resourceId: string;
    resourceName?: string;
    contracts: BaseContractInfo[];
}
export interface StateInfo {
    onlineStatusInfo?: {
        isOnline: number;
        ruleId: string;
    };
    tagsInfo?: {
        tags: string[];
        ruleId: string;
    };
}
export interface TestResourceInfo {
    nodeId: number;
    userId: number;
    testResourceId: string;
    testResourceName: string;
    coverImages: string[];
    associatedPresentableId?: string;
    resourceType: string;
    originInfo: TestResourceOriginInfo;
    stateInfo: StateInfo;
    resolveResources?: ResolveResourceInfo[];
    dependencyTree?: FlattenTestResourceDependencyTree[];
    authTree?: FlattenTestResourceAuthTree[];
    ruleId?: string;
    status?: number;
}
export interface TestResourceTreeInfo {
    nodeId: number;
    testResourceId: string;
    testResourceName: string;
    dependencyTree: FlattenTestResourceDependencyTree[];
    authTree: FlattenTestResourceAuthTree[];
}
export interface NodeTestRuleInfo {
    nodeId: number;
    userId: number;
    ruleText: string;
    themeId?: string;
    testRules: any[];
    status?: number;
}
export interface TestRuleMatchResult {
    ruleId: string;
    isValid: boolean;
    matchErrors: string[];
    efficientInfos: TestRuleEfficientInfo[];
    associatedPresentableId?: string;
}
export interface IMatchTestRuleEventHandler {
    handle(nodeId: number): Promise<void>;
}
export interface ITestNodeService {
    testResourceCount(condition: object): Promise<number>;
    findOneTestResource(condition: object, ...args: any[]): Promise<TestResourceInfo>;
    findTestResources(condition: object, ...args: any[]): Promise<TestResourceInfo[]>;
    findOneTestResourceTreeInfo(condition: object, ...args: any[]): Promise<TestResourceTreeInfo>;
    findTestResourceTreeInfos(condition: object, ...args: any[]): Promise<TestResourceTreeInfo[]>;
    findNodeTestRuleInfoById(nodeId: number, ...args: any[]): Promise<NodeTestRuleInfo>;
    matchAndSaveNodeTestRule(nodeId: number, testRuleText: string): Promise<NodeTestRuleInfo>;
    updateTestResource(testResource: TestResourceInfo, resolveResources: ResolveResourceInfo[]): Promise<TestResourceInfo>;
    findTestResourcePageList(condition: object, page: number, pageSize: number, projection: string[], orderBy: object): Promise<PageResult<TestResourceInfo>>;
}
export interface ITestResourceAuthService {
    testResourceAuth(testResourceInfo: TestResourceInfo, testResourceAuthTree: FlattenTestResourceAuthTree[]): Promise<SubjectAuthResult>;
}