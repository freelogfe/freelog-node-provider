import { INodeService, NodeInfo } from "../interface";
export declare class NodeCommonChecker {
    ctx: any;
    nodeService: INodeService;
    /**
     * 检查节点域名
     * 先参考天猫:https://wenku.baidu.com/view/d5ab601db52acfc789ebc98f.html
     * @param nodeDomain
     */
    checkRegisterNodeDomainAndName(nodeDomain: string, nodeName: string): Promise<void>;
    /**
     * 生成规则ID
     * @param nodeId
     * @param ruleText
     */
    generateNodeUniqueKey(nodeDomain: string): string;
    /**
     * 检查节点创建数量限制
     * @returns {Promise<void>}
     */
    checkNodeCreatedLimit(): Promise<void>;
    nullObjectAndUserAuthorizationCheck(nodeInfo: NodeInfo): void;
    /**
     * 获取系统保留字段
     * @returns {[string,string]}
     */
    static get systemRetain(): string[];
}