-- AlterTable: add tags/outcome classification to Conversation
ALTER TABLE `Conversation` ADD COLUMN `tags` TEXT NULL;
ALTER TABLE `Conversation` ADD COLUMN `outcome` VARCHAR(64) NULL;

-- Index for outcome analytics/filtering
CREATE INDEX `Conversation_projectId_outcome_updatedAt_idx` ON `Conversation`(`projectId`, `outcome`, `updatedAt`);
