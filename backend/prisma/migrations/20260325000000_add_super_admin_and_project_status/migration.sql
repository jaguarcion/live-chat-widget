-- AlterTable: Add status and ownerId to Project
ALTER TABLE `Project` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN `ownerId` VARCHAR(191);

-- AlterTable: Add foreign key for ownerId
ALTER TABLE `Project` ADD CONSTRAINT `Project_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for status
CREATE INDEX `Project_status_idx` ON `Project`(`status`);
