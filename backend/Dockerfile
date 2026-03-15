FROM node:20-alpine AS builder

WORKDIR /app

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

# Copy built assets and dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

# Set environment to production
ENV NODE_ENV="production"

# Apply DB migrations and start the server
CMD ["sh", "-c", "until ./node_modules/.bin/prisma migrate deploy; do echo 'Waiting for database...'; sleep 3; done; node dist/index.js"]
