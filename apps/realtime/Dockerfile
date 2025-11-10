# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY tsconfig.base.json ./

# Copy packages
COPY packages/database ./packages/database

# Copy Realtime
COPY apps/realtime ./apps/realtime

# Install dependencies
RUN npm ci --workspace=apps/realtime --workspace=packages/database

# Generate Prisma Client
WORKDIR /app/packages/database
RUN npx prisma generate --schema=./prisma/schema.prisma

# Production stage
FROM node:20-alpine

# Install OpenSSL and tzdata
RUN apk add --no-cache openssl tzdata

# Set timezone
ENV TZ=America/Sao_Paulo
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /app

# Copy everything from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/realtime ./apps/realtime
COPY --from=builder /app/package.json ./
COPY --from=builder /app/tsconfig.base.json ./

WORKDIR /app/apps/realtime

EXPOSE 4500

# Run with ts-node
CMD ["npx", "ts-node", "src/index.ts"]
