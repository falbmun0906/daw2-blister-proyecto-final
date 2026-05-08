FROM node:22-alpine AS builder

WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm ci

COPY backend ./backend
COPY shared ./shared

RUN cd backend && npm run build && npm prune --omit=dev

FROM node:22-alpine AS runner

WORKDIR /app/backend
ENV NODE_ENV=production

COPY --from=builder /app/backend/package*.json ./
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/dist ./dist

EXPOSE 3000

CMD ["node", "dist/backend/src/index.js"]
