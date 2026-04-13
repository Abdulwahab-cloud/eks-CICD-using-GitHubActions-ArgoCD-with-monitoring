FROM nginx:1.25-alpine

COPY src/ /usr/share/nginx/html/

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

LABEL maintainer="arket-devops"
LABEL service="frontend"
LABEL version="1.0.0"