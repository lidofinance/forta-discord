FROM node:20.10.0-alpine3.18 AS base

FROM base AS deps
WORKDIR /usr/src/app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --non-interactive && yarn cache clean
COPY --chown=node:node . .

FROM base AS runtime
RUN apk add --no-cache tini
ENV NODE_ENV=production
COPY --from=deps /usr/src/app /usr/src/app
WORKDIR /usr/src/app
USER node
HEALTHCHECK CMD sh -c "wget -q http://localhost:${PORT:-5001}/health -O- || exit 1"
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "index.js"]
