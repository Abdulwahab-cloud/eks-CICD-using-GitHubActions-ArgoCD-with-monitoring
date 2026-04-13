FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production

FROM node:20-alpine AS runtime
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=deps /app/node_modules ./node_modules
COPY src/ ./src/
COPY package*.json ./

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3001
 
LABEL maintainer="arket-devops"
LABEL service="api-service"
LABEL version="1.0.0"
 
CMD ["node", "src/index.js"]
