-- CreateTable
CREATE TABLE `MessageQueue` (
    `id` VARCHAR(191) NOT NULL,
    `integrationId` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `toPhone` VARCHAR(191) NULL,
    `toEmail` VARCHAR(191) NULL,
    `toTelegramId` VARCHAR(191) NULL,
    `toName` VARCHAR(191) NULL,
    `content` TEXT NOT NULL,
    `mediaUrl` TEXT NULL,
    `mediaType` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'SCHEDULED', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `priority` INTEGER NOT NULL DEFAULT 5,
    `maxRetries` INTEGER NOT NULL DEFAULT 3,
    `currentRetry` INTEGER NOT NULL DEFAULT 0,
    `minInterval` INTEGER NOT NULL DEFAULT 300,
    `scheduledAt` DATETIME(3) NULL,
    `lastAttemptAt` DATETIME(3) NULL,
    `sentAt` DATETIME(3) NULL,
    `failedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `errorMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MessageQueue_status_scheduledAt_idx`(`status`, `scheduledAt`),
    INDEX `MessageQueue_integrationId_idx`(`integrationId`),
    INDEX `MessageQueue_userId_idx`(`userId`),
    INDEX `MessageQueue_toPhone_idx`(`toPhone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QueueAttempt` (
    `id` VARCHAR(191) NOT NULL,
    `queueId` VARCHAR(191) NOT NULL,
    `attemptNumber` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `responseCode` INTEGER NULL,
    `responseMessage` TEXT NULL,
    `failureReason` TEXT NULL,
    `externalId` VARCHAR(191) NULL,
    `externalData` JSON NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,

    INDEX `QueueAttempt_queueId_idx`(`queueId`),
    INDEX `QueueAttempt_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApiKey` (
    `id` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `permissions` JSON NOT NULL,
    `rateLimit` INTEGER NOT NULL DEFAULT 60,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `expiresAt` DATETIME(3) NULL,
    `lastUsedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ApiKey_key_key`(`key`),
    INDEX `ApiKey_key_idx`(`key`),
    INDEX `ApiKey_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WebhookEndpoint` (
    `id` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `secret` VARCHAR(191) NOT NULL,
    `events` JSON NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `totalSent` INTEGER NOT NULL DEFAULT 0,
    `totalFailed` INTEGER NOT NULL DEFAULT 0,
    `lastSentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `WebhookEndpoint_userId_idx`(`userId`),
    INDEX `WebhookEndpoint_enabled_idx`(`enabled`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WebhookOutboundLog` (
    `id` VARCHAR(191) NOT NULL,
    `endpointId` VARCHAR(191) NULL,
    `event` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `payload` JSON NOT NULL,
    `response` JSON NULL,
    `statusCode` INTEGER NULL,
    `success` BOOLEAN NOT NULL,
    `errorMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `WebhookOutboundLog_event_idx`(`event`),
    INDEX `WebhookOutboundLog_success_idx`(`success`),
    INDEX `WebhookOutboundLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MessageQueue` ADD CONSTRAINT `MessageQueue_integrationId_fkey` FOREIGN KEY (`integrationId`) REFERENCES `Integration`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MessageQueue` ADD CONSTRAINT `MessageQueue_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QueueAttempt` ADD CONSTRAINT `QueueAttempt_queueId_fkey` FOREIGN KEY (`queueId`) REFERENCES `MessageQueue`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApiKey` ADD CONSTRAINT `ApiKey_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WebhookEndpoint` ADD CONSTRAINT `WebhookEndpoint_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
