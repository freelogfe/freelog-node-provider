export const development = {
    watchDirs: [
        'app',
        'controller',
        'lib',
        'service',
        'extend',
        'config',
        'app.ts',
        'agent.ts',
        'interface.ts',
    ],
    overrideDefault: true
};

export default () => {
    const config: any = {};

    config.middleware = ['errorAutoSnapHandler', 'gatewayIdentityInfoHandler', 'localIdentityInfoHandler'];

    // config.mongoose = {
    //     url: 'mongodb://127.0.0.1:27017/node-beta'
    // };

    config.mongoose = {
        url: 'mongodb://39.108.77.211:30772/node-beta'
    };

    config.localIdentity = {
        userId: 50021,
        username: 'yuliang',
        email: 'support@freelog.com'
    };

    return config;
};
