-- AlterTable: add internal-note flag and mentions to Message
ALTER TABLE `Message` ADD COLUMN `isNote` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `Message` ADD COLUMN `mentions` TEXT NULL;

-- AlterTable: add pinned flag to Conversation
ALTER TABLE `Conversation` ADD COLUMN `isPinned` BOOLEAN NOT NULL DEFAULT false;

-- Index for notes queries
CREATE INDEX `Message_conversationId_isNote_idx` ON `Message`(`conversationId`, `isNote`);
