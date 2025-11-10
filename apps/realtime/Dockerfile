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

# Build Realtime
WORKDIR /app/apps/realtime
RUN npm run build

# Production stage
FROM node:20-alpine

# Install OpenSSL and tzdata
RUN apk add --no-cache openssl tzdata

# Set timezone
ENV TZ=America/Sao_Paulo
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /app

# Copy built files and dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/realtime ./apps/realtime

WORKDIR /app/apps/realtime

EXPOSE 4500

CMD ["node", "dist/index.js"]
