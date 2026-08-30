-- AlterTable
ALTER TABLE `usersettings` ADD COLUMN `spendingLockAmount` DOUBLE NULL,
    ADD COLUMN `spendingLockEnabled` BOOLEAN NOT NULL DEFAULT false;
