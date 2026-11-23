-- Preserve orphaned currency-resolution audit history while restoring a valid
-- relationship to the current resolution for the same claim. The original
-- missing resolution ID remains recorded in the audit JSON.
UPDATE `Claim_Currency_Resolution_Audit_Event`
SET
  `details_json` = json_set(`details_json`, '$.orphanedResolutionId', `resolution_id`),
  `resolution_id` = (
    SELECT r.`id`
    FROM `Claim_Currency_Resolution` r
    WHERE r.`claim_id` = `Claim_Currency_Resolution_Audit_Event`.`claim_id`
    LIMIT 1
  )
WHERE NOT EXISTS (
  SELECT 1
  FROM `Claim_Currency_Resolution` existing
  WHERE existing.`id` = `Claim_Currency_Resolution_Audit_Event`.`resolution_id`
)
AND EXISTS (
  SELECT 1
  FROM `Claim_Currency_Resolution` current
  WHERE current.`claim_id` = `Claim_Currency_Resolution_Audit_Event`.`claim_id`
);
