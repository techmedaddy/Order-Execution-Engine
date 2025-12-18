# ---------- Base ----------
FROM node:20-alpine AS base

WORKDIR /app

# Install deps first (better caching)
COPY package*.json ./
RUN npm ci

# Copy source
COPY tsconfig.json ./
COPY src ./src

# ---------- Build ----------
FROM base AS build
RUN npm run build

# ---------- Runtime ----------
FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

# Copy only what runtime needs
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

EXPOSE 7542

CMD ["node", "dist/server.js"]
