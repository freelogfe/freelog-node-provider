'use strict'

module.exports = class SetOnlineStatusOptionHandler {

    /**
     * tags操作实现
     * @param ruleInfo
     * @returns {*}
     */
    handle(ruleInfo) {

        if (!ruleInfo.isValid || !['alter', 'add'].includes(ruleInfo.operation)) {
            return ruleInfo
        }

        const {tags = null, entityInfo} = ruleInfo

        if (tags === null && entityInfo.entityType === "presentable") {
            ruleInfo.userDefinedTags = entityInfo.userDefinedTags
        }
        else {
            ruleInfo.userDefinedTags = tags || []
        }

        return ruleInfo
    }
}