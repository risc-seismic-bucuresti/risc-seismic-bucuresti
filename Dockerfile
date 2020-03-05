FROM node:latest

ADD package.json /tmp/package.json
ADD package-lock.json /tmp/package-lock.json

RUN cd /tmp && npm install -s && \
    mkdir -p /code && cp -a /tmp/node_modules /code/

COPY . /code
WORKDIR /code

CMD ["node", "--max_old_space_size=3072", "node_modules/forever/bin/forever", "--minUptime", "10000", "--spinSleepTime", "1000", "node_modules/ts-node/dist/bin.js", "--ignore", "false", "app.ts"]
EXPOSE 3040
