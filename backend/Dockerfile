FROM node:20-alpine AS builder

WORKDIR /app

# Prisma engines on Alpine require OpenSSL runtime libraries.
RUN apk add --no-cache openssl

# Install dependencies first for better caching
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install

# Copy source code and build
COPY . .
RUN npm run prisma:generate
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Runtime dependency for Prisma schema/query engines.
RUN apk add --no-cache openssl

# Copy built assets and dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh
COPY --from=builder /app/package*.json ./

# Set environment to production
ENV NODE_ENV="production"

# Apply DB migrations and start the server
CMD ["sh", "./docker-entrypoint.sh"]
