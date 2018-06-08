'use strict'

const uuid = require('uuid')
const freelogPolicyCompiler = require('@freelog/presentable-policy-compiler')

module.exports = class FreelogResourcePolicyCompiler {

    /**
     * @param policyText
     * @param policyName
     * @returns {Uint8Array | any[] | Int32Array | Uint16Array | Uint32Array | Float64Array | *}
     */
    compiler({policyText, policyName}) {

        const policySegments = freelogPolicyCompiler.compile(policyText)

        if (policySegments.errorMsg) {
            throw new Error("resource-policy-error:" + policySegments.errorMsg)
        }

        if (policySegments.policy_segments.length !== 1) {
            throw new Error("resource-policy-error,暂不支持多个策略段")
        }

        const policySegment = policySegments.policy_segments.map(item => new Object({
            segmentId: '',
            policyName: policyName,
            segmentText: item.segmentText,
            users: item.users,
            fsmDescription: item.state_transition_table,
            activatedStates: item.activatedStates,
            initialState: item.initialState,
            terminateState: item.terminateState,
            status: 1
        }))[0]

        policySegment.fsmDescription.forEach(item => {
            item.event && this._generateEventId(item.event)
        })

        return policySegment
    }

    /**
     * 生成事件ID
     * @param event
     */
    _generateEventId(event) {
        event.eventId = uuid.v4().replace(/-/g, '')
        if (event.type === 'compoundEvents' && Array.isArray(event.params)) {
            event.params.forEach(this._generateEventId)
        }
    }
}
