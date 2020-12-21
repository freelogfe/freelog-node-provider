import {differenceWith, isEmpty} from 'lodash';
import {controller, get, inject, provide} from 'midway';
import {
    IPresentableAuthResponseHandler,
    IPresentableAuthService, IPresentableService, IPresentableVersionService
} from '../../interface';
import {ArgumentError, IdentityTypeEnum, visitorIdentityValidator, CommonRegex, FreelogContext} from 'egg-freelog-base';

@provide()
@controller('/v2/auths/presentables') // 统一URL v2/auths/:subjectType/:subjectId
export class ResourceAuthController {

    @inject()
    ctx: FreelogContext;
    @inject()
    presentableCommonChecker;
    @inject()
    presentableService: IPresentableService;
    @inject()
    presentableAuthService: IPresentableAuthService;
    @inject()
    presentableVersionService: IPresentableVersionService;
    @inject()
    presentableAuthResponseHandler: IPresentableAuthResponseHandler;

    /**
     * 通过展品ID获取展品并且授权
     */
    @get('/:subjectId/(result|info|resourceInfo|fileStream)', {middleware: ['authExceptionHandlerMiddleware']})
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser | IdentityTypeEnum.UnLoginUser | IdentityTypeEnum.InternalClient)
    async presentableAuth() {

        const {ctx} = this;
        const presentableId = ctx.checkParams('subjectId').isPresentableId().value;
        const parentNid = ctx.checkQuery('parentNid').optional().value;
        const subResourceIdOrName = ctx.checkQuery('subResourceIdOrName').optional().decodeURIComponent().value;
        ctx.validateParams();

        const presentableInfo = await this.presentableService.findById(presentableId);
        ctx.entityNullObjectCheck(presentableInfo);

        const presentableVersionInfo = await this.presentableVersionService.findById(presentableId, presentableInfo.version, 'dependencyTree authTree versionProperty');
        const presentableAuthResult = await this.presentableAuthService.presentableAuth(presentableInfo, presentableVersionInfo.authTree);

        await this.presentableAuthResponseHandler.handle(presentableInfo, presentableVersionInfo, presentableAuthResult, parentNid, subResourceIdOrName);
    }

    /**
     * 通过节点ID和资源ID获取展品,并且授权
     */
    @get('/nodes/:nodeId/:resourceIdOrName/(result|info|resourceInfo|fileSteam)', {middleware: ['authExceptionHandlerMiddleware']})
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser | IdentityTypeEnum.LoginUser | IdentityTypeEnum.InternalClient)
    async nodeResourceAuth() {

        const {ctx} = this;
        const resourceIdOrName = ctx.checkParams('resourceIdOrName').exist().decodeURIComponent().value;
        const nodeId = ctx.checkParams('nodeId').exist().isInt().gt(0).value;
        const parentNid = ctx.checkQuery('parentNid').optional().value;
        const subResourceIdOrName = ctx.checkQuery('subResourceIdOrName').optional().decodeURIComponent().value;
        ctx.validateParams();

        const condition = {nodeId};
        if (CommonRegex.mongoObjectId.test(resourceIdOrName)) {
            condition['resourceInfo.resourceId'] = resourceIdOrName;
        } else if (CommonRegex.fullResourceName.test(resourceIdOrName)) {
            condition['resourceInfo.resourceName'] = resourceIdOrName;
        } else {
            throw new ArgumentError(ctx.gettext('params-format-validate-failed', 'resourceIdOrName'));
        }

        const presentableInfo = await this.presentableService.findOne(condition);
        ctx.entityNullObjectCheck(presentableInfo);

        const presentableVersionInfo = await this.presentableVersionService.findById(presentableInfo.presentableId, presentableInfo.version, 'dependencyTree authTree versionProperty');
        const presentableAuthResult = await this.presentableAuthService.presentableAuth(presentableInfo, presentableVersionInfo.authTree);

        await this.presentableAuthResponseHandler.handle(presentableInfo, presentableVersionInfo, presentableAuthResult, parentNid, subResourceIdOrName);
    }

    /**
     * 批量展品节点侧以及上游链路授权(不包含C端用户)
     */
    @get('/nodes/:nodeId/batchPresentableNodeSideAndUpstreamAuth/result')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async presentableNodeSideAndUpstreamAuth() {

        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().isInt().gt(0).value;
        const presentableIds = ctx.checkQuery('presentableIds').exist().isSplitMongoObjectId().toSplitArray().len(1, 100).value;
        ctx.validateParams();

        const presentables = await this.presentableService.find({nodeId, _id: {$in: presentableIds}});
        const invalidPresentableIds = differenceWith(presentableIds, presentables, (x: string, y) => x === y.presentableId);

        if (!isEmpty(invalidPresentableIds)) {
            throw new ArgumentError(ctx.gettext('params-validate-failed', 'presentableIds'), {invalidPresentableIds});
        }

        const presentableVersionIds = presentables.map(x => this.presentableCommonChecker.generatePresentableVersionId(x.presentableId, x.version));
        const presentableAuthTreeMap = await this.presentableVersionService.findByIds(presentableVersionIds, 'presentableId authTree').then(list => {
            return new Map(list.map(x => [x.presentableId, x.authTree]));
        });

        const tasks = [];
        const returnResults = [];
        for (const presentableInfo of presentables) {
            const task = this.presentableAuthService.presentableNodeSideAndUpstreamAuth(presentableInfo, presentableAuthTreeMap.get(presentableInfo.presentableId)).then(authResult => returnResults.push({
                presentableId: presentableInfo.presentableId,
                authCode: authResult.authCode,
                isAuth: authResult.isAuth,
                error: authResult.errorMsg
            }));
            tasks.push(task);
        }

        await Promise.all(tasks).then(() => ctx.success(returnResults));
    }

    /**
     * 批量展品上游链路授权(不包含C端以及节点侧)
     */
    @get('/nodes/:nodeId/batchPresentableUpstreamAuth/result')
    @visitorIdentityValidator(IdentityTypeEnum.LoginUser)
    async presentableUpstreamAuth() {

        const {ctx} = this;
        const nodeId = ctx.checkParams('nodeId').exist().isInt().gt(0).value;
        const presentableIds = ctx.checkQuery('presentableIds').exist().isSplitMongoObjectId().toSplitArray().len(1, 100).value;
        ctx.validateParams();

        const presentables = await this.presentableService.find({nodeId, _id: {$in: presentableIds}});
        const invalidPresentableIds = differenceWith(presentableIds, presentables, (x: string, y) => x === y.presentableId);

        if (!isEmpty(invalidPresentableIds)) {
            throw new ArgumentError(ctx.gettext('params-validate-failed', 'presentableIds'), {invalidPresentableIds});
        }

        const presentableVersionIds = presentables.map(x => this.presentableCommonChecker.generatePresentableVersionId(x.presentableId, x.version));
        const presentableAuthTreeMap = await this.presentableVersionService.findByIds(presentableVersionIds, 'presentableId authTree').then(list => {
            return new Map(list.map(x => [x.presentableId, x.authTree]));
        });

        const tasks = [];
        const returnResults = [];
        for (const presentableInfo of presentables) {
            const task = this.presentableAuthService.presentableUpstreamAuth(presentableInfo, presentableAuthTreeMap.get(presentableInfo.presentableId)).then(authResult => returnResults.push({
                presentableId: presentableInfo.presentableId,
                authCode: authResult.authCode,
                isAuth: authResult.isAuth,
                error: authResult.errorMsg
            }));
            tasks.push(task);
        }

        await Promise.all(tasks).then(() => ctx.success(returnResults));
    }
}