FROM node:18.16-alpine

RUN apk add --no-cache tini

WORKDIR /server
COPY dist .
COPY container/run run

ENTRYPOINT ["/sbin/tini", "--"]

ARG VERSION
ENV VERSION=$VERSION
ARG GIT_COMMIT
ENV GIT_COMMIT=$GIT_COMMIT
ARG BUILD_DATE
ENV BUILD_DATE=$BUILD_DATE


CMD ["/server/run"]
