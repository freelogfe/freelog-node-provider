"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = () => {
    const config = {};
    // config.mongoose = {
    //     url: 'mongodb://mongo-prod.common:27017/node-beta'
    // };
    config.mongoose = {
        url: 'mongodb://39.108.77.211:30772/node-beta'
    };
    config.rabbitMq = {
        connOptions: {
            host: 'rabbitmq-prod.common',
            port: 5672,
            login: 'prod_user_node',
            password: 'rabbit@freelog',
            authMechanism: 'AMQPLAIN'
        }
    };
    return config;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLnByb2QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29uZmlnL2NvbmZpZy5wcm9kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsa0JBQWUsR0FBRyxFQUFFO0lBQ2hCLE1BQU0sTUFBTSxHQUFRLEVBQUUsQ0FBQztJQUV2QixzQkFBc0I7SUFDdEIseURBQXlEO0lBQ3pELEtBQUs7SUFFTCxNQUFNLENBQUMsUUFBUSxHQUFHO1FBQ2QsR0FBRyxFQUFFLHlDQUF5QztLQUNqRCxDQUFDO0lBRUYsTUFBTSxDQUFDLFFBQVEsR0FBRztRQUNkLFdBQVcsRUFBRTtZQUNULElBQUksRUFBRSxzQkFBc0I7WUFDNUIsSUFBSSxFQUFFLElBQUk7WUFDVixLQUFLLEVBQUUsZ0JBQWdCO1lBQ3ZCLFFBQVEsRUFBRSxnQkFBZ0I7WUFDMUIsYUFBYSxFQUFFLFVBQVU7U0FDNUI7S0FDSixDQUFDO0lBRUYsT0FBTyxNQUFNLENBQUM7QUFDbEIsQ0FBQyxDQUFDIn0=