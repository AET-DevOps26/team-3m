# syntax=docker/dockerfile:1

FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.29-alpine

USER root
WORKDIR /usr/share/nginx/html
COPY --from=build /app/dist .
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN chown -R 101:101 /usr/share/nginx/html
USER 101

EXPOSE 8080

ENTRYPOINT sh -c "./vite-envs.sh && nginx -g 'daemon off;'"
