CREATE TABLE `AdminAuditLog` (
  `id` VARCHAR(191) NOT NULL,
  `actorId` VARCHAR(191) NOT NULL,
  `action` VARCHAR(191) NOT NULL,
  `targetType` VARCHAR(191) NOT NULL,
  `targetId` VARCHAR(191) NOT NULL,
  `projectId` VARCHAR(191) NULL,
  `metadata` LONGTEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `AdminAuditLog_actorId_createdAt_idx` (`actorId`, `createdAt`),
  INDEX `AdminAuditLog_projectId_createdAt_idx` (`projectId`, `createdAt`),
  INDEX `AdminAuditLog_action_createdAt_idx` (`action`, `createdAt`),
  CONSTRAINT `AdminAuditLog_actorId_fkey`
    FOREIGN KEY (`actorId`) REFERENCES `User`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
);
