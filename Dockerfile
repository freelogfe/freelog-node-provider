FROM daocloud.io/node:8.5

MAINTAINER yuliang <yu.liang@freelog.com>

RUN mkdir -p /data/freelog-node-provider

WORKDIR /data/freelog-node-provider

COPY . /data/freelog-node-provider

RUN npm install

#ENV
#VOLUME ['/opt/logs','/opt/logs/db','/opt/logs/koa','/opt/logs/track']

ENV NODE_ENV prod
ENV EGG_SERVER_ENV prod
ENV PORT 7005

EXPOSE 7005

CMD [ "npm", "start" ]
