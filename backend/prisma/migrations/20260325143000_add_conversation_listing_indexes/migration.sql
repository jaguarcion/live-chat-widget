CREATE INDEX `Conversation_projectId_updatedAt_idx` ON `Conversation`(`projectId`, `updatedAt`);
CREATE INDEX `Conversation_projectId_status_updatedAt_idx` ON `Conversation`(`projectId`, `status`, `updatedAt`);
CREATE INDEX `Conversation_projectId_operatorId_updatedAt_idx` ON `Conversation`(`projectId`, `operatorId`, `updatedAt`);
CREATE INDEX `Conversation_projectId_isPinned_updatedAt_idx` ON `Conversation`(`projectId`, `isPinned`, `updatedAt`);
