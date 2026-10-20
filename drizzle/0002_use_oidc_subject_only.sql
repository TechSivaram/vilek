UPDATE `User`
SET `oidc_subject` = `scim_id`
WHERE (`oidc_subject` IS NULL OR `oidc_subject` = '')
  AND `scim_id` IS NOT NULL;
--> statement-breakpoint
UPDATE `User`
SET `oidc_subject` = substr(`oidc_subject`, length('scim-pending:') + 1)
WHERE `oidc_subject` LIKE 'scim-pending:%';
--> statement-breakpoint
DROP INDEX IF EXISTS `User_scim_id_unique`;
--> statement-breakpoint
ALTER TABLE `User` DROP COLUMN `scim_id`;
