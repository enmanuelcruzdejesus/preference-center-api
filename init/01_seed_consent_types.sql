-- Seeds consent types on first DB initialization.
-- Re-running the container keeps data volume, so these will only run on a fresh volume.
INSERT INTO consent_types (id, slug, name, "createdAt")
SELECT gen_random_uuid(), 'email_notifications', 'Email notifications', NOW()
WHERE NOT EXISTS (SELECT 1 FROM consent_types WHERE slug = 'email_notifications');

INSERT INTO consent_types (id, slug, name, "createdAt")
SELECT gen_random_uuid(), 'sms_notifications', 'SMS notifications', NOW()
WHERE NOT EXISTS (SELECT 1 FROM consent_types WHERE slug = 'sms_notifications');
