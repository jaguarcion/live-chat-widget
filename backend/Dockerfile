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
COPY --from=builder /app/package*.json ./

# Set environment to production
ENV NODE_ENV="production"

# Apply DB migrations and start the server
CMD ["sh", "-c", "max=30; i=0; until ./node_modules/.bin/prisma migrate deploy; do i=$((i+1)); if [ \"$i\" -ge \"$max\" ]; then echo 'Migration failed after 30 attempts'; exit 1; fi; echo 'Waiting for database...'; sleep 3; done; node dist/index.js"]
