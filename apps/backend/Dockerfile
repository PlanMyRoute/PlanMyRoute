FROM node:22-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/ ./packages/
COPY apps/backend/ ./apps/backend/

RUN pnpm install
RUN pnpm --filter @planmyroute/types build

WORKDIR /app/apps/backend
RUN npx tsc --noEmitOnError false || true

EXPOSE 3001

CMD ["node", "dist/index.js"]
