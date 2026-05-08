FROM node:22-alpine AS builder

WORKDIR /app/frontend

ARG VITE_API_URL=http://localhost:8080
ARG VITE_MCP_URL=http://localhost:8080
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_MCP_URL=$VITE_MCP_URL

COPY frontend/package*.json ./
RUN npm ci
RUN ln -s /app/frontend/node_modules /app/node_modules

COPY frontend ./
COPY shared ../shared

RUN npm run build

FROM nginx:1.27-alpine AS runner

COPY frontend/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 80
