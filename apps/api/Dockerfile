# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY tsconfig.base.json ./

# Copy packages
COPY packages/database ./packages/database

# Copy API
COPY apps/api ./apps/api

# Install ALL dependencies (root + workspaces)
RUN npm ci

# Generate Prisma Client
WORKDIR /app/packages/database
RUN npx prisma generate --schema=./prisma/schema.prisma

# Production stage
FROM node:20-alpine

# Install OpenSSL, tzdata and ts-node
RUN apk add --no-cache openssl tzdata

# Set timezone
ENV TZ=America/Sao_Paulo
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /app

# Copy everything from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/package.json ./
COPY --from=builder /app/tsconfig.base.json ./

WORKDIR /app/apps/api

EXPOSE 4000

# Run with ts-node instead of compiled JS
CMD ["npx", "ts-node", "src/index.ts"]
