FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules /app/node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist /app/dist
COPY package.json ./
RUN npm pkg delete scripts.prepare >/dev/null 2>&1 || true && \
    npm i --omit=dev --no-audit --no-fund
EXPOSE 3000
CMD ["node", "dist/main.js"]
