# PopupGenerator als nginx-Image hinter dem Gateway (http://10.32.128.63/popupgenerator/).
# Build-Kontext ist das Repo-Root:
#
#   docker build -f deploy/Dockerfile --build-arg BASE_PATH=/popupgenerator/ -t popupgenerator-web:latest .
#
# BASE_PATH überschreibt `base` aus vite.config.js (dort bleibt der Pfad
# für GitHub Pages) und muss zum Pfad im Gateway passen (mit / am Ende).

FROM node:24-alpine AS build
WORKDIR /app
ARG BASE_PATH=/popupgenerator/

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY index.html vite.config.js ./
COPY public    public
COPY src       src
COPY analytics analytics
RUN npm run build -- --base=${BASE_PATH}

FROM nginx:stable-alpine
# Kennzeichnung, damit der Workflow gezielt alte Images dieser App aufräumen kann
LABEL de.aquachem.app="popupgenerator"
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
