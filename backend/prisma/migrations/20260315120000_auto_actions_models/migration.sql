CREATE TABLE `AutoActionRule` (
  `projectId` VARCHAR(191) NOT NULL,
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `urlContains` VARCHAR(191) NOT NULL DEFAULT '/',
  `referrerContains` VARCHAR(191) NOT NULL DEFAULT '',
  `deviceContains` VARCHAR(191) NOT NULL DEFAULT '',
  `utmSource` VARCHAR(191) NOT NULL DEFAULT '',
  `utmMedium` VARCHAR(191) NOT NULL DEFAULT '',
  `utmCampaign` VARCHAR(191) NOT NULL DEFAULT '',
  `utmTerm` VARCHAR(191) NOT NULL DEFAULT '',
  `delaySeconds` INTEGER NOT NULL DEFAULT 0,
  `cooldownMinutes` INTEGER NOT NULL DEFAULT 30,
  `oncePerConversation` BOOLEAN NOT NULL DEFAULT true,
  `maxTriggersPerConversation` INTEGER NOT NULL DEFAULT 3,
  `maxTriggersPerSession` INTEGER NOT NULL DEFAULT 2,
  `message` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`projectId`, `id`),
  CONSTRAINT `AutoActionRule_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE `AutoActionTrigger` (
  `id` VARCHAR(191) NOT NULL,
  `projectId` VARCHAR(191) NOT NULL,
  `ruleId` VARCHAR(191) NOT NULL,
  `conversationId` VARCHAR(191) NOT NULL,
  `visitorId` VARCHAR(191) NOT NULL,
  `sessionId` VARCHAR(191) NULL,
  `messageId` VARCHAR(191) NULL,
  `url` TEXT NULL,
  `replied` BOOLEAN NOT NULL DEFAULT false,
  `replyMessageId` VARCHAR(191) NULL,
  `replyAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  CONSTRAINT `AutoActionTrigger_projectId_ruleId_fkey` FOREIGN KEY (`projectId`, `ruleId`) REFERENCES `AutoActionRule`(`projectId`, `id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `AutoActionTrigger_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX `AutoActionRule_projectId_isActive_idx` ON `AutoActionRule`(`projectId`, `isActive`);
CREATE INDEX `AutoActionTrigger_projectId_createdAt_idx` ON `AutoActionTrigger`(`projectId`, `createdAt`);
CREATE INDEX `AutoActionTrigger_projectId_ruleId_createdAt_idx` ON `AutoActionTrigger`(`projectId`, `ruleId`, `createdAt`);
CREATE INDEX `AutoActionTrigger_projectId_conversationId_createdAt_idx` ON `AutoActionTrigger`(`projectId`, `conversationId`, `createdAt`);
CREATE INDEX `AutoActionTrigger_projectId_visitorId_createdAt_idx` ON `AutoActionTrigger`(`projectId`, `visitorId`, `createdAt`);
CREATE INDEX `AutoActionTrigger_projectId_sessionId_createdAt_idx` ON `AutoActionTrigger`(`projectId`, `sessionId`, `createdAt`);
CREATE INDEX `AutoActionTrigger_projectId_replied_createdAt_idx` ON `AutoActionTrigger`(`projectId`, `replied`, `createdAt`);
