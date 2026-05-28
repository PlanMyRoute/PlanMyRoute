FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/ ./packages/
COPY apps/frontend/ ./apps/frontend/

RUN pnpm install

WORKDIR /app/apps/frontend

ARG EXPO_PUBLIC_API_URL=http://planmyroute.es:3001
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL

RUN npx expo export -p web

FROM nginx:alpine

COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
