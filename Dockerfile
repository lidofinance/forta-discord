FROM node:14.19.0-alpine3.15 as deps
WORKDIR /usr/src/app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --non-interactive && yarn cache clean
COPY --chown=node:node . .

FROM node:14.19.0-alpine3.15 as base
RUN apk add --no-cache tini
ENV NODE_ENV production
COPY --from=deps /usr/src/app /usr/src/app
WORKDIR /usr/src/app
USER node
HEALTHCHECK CMD sh -c "wget -q http://localhost:${PORT:-5001}/health -O- || exit 1"
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "index.js"]
