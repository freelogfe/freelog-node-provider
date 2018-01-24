'use strict';

/**
 * restful wiki: http://eggjs.org/zh-cn/basics/router.html
 */
module.exports = app => {

    /**
     * 创建pb的presentable
     */
    app.post('/v1/presentables/createPageBuildPresentable', app.controller.presentable.v1.createPageBuildPresentable)

    /**
     * 关联pb-persentable对应的插件合同ID
     */
    app.post('/v1/presentables/pageBuildAssociateWidget', app.controller.presentable.v1.pageBuildAssociateWidget)
    app.get('/v1/presentables/pageBuildAssociateWidgetContract', app.controller.presentable.v1.pageBuildAssociateWidgetContract)
    app.get('/v1/presentables/pageBuildAssociateWidgetPresentable', app.controller.presentable.v1.pageBuildAssociateWidgetPresentable)
    app.get('/v1/presentables/pbPresentableStatistics', app.controller.presentable.v1.pbPresentableStatistics)

    //请求获取presentable资源
    app.get('/v1/nodes/:nodeId/presentables/:presentableId.:extName', app.controller.presentable.auth.resource)
    app.get('/v1/nodes/:nodeId/presentables/:presentableId', app.controller.presentable.auth.resource)

    /**
     * index
     */
    app.redirect('/', '/public/index.html', 404);

    /**
     * node-pb restful api
     */
    app.resources('/v1/nodes/pagebuilds', '/v1/nodes/pagebuilds', app.controller.nodePageBuild.v1)

    /**
     * node restful api
     */
    app.resources('/v1/nodes', '/v1/nodes', app.controller.node.v1)

    /**
     * presentables restful api
     */
    app.resources('/v1/presentables', '/v1/presentables', app.controller.presentable.v1)

}



