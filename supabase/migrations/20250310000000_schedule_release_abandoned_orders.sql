-- Schedule release-abandoned-orders Edge Function every 5 minutes via pg_cron + pg_net
-- OPTIONAL: Run this manually after enabling pg_cron + pg_net and adding Vault secrets.
-- Prerequisites:
--   1. Supabase Dashboard > Extensions: enable pg_cron, pg_net
--   2. SQL Editor: add Vault secrets
--      select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'project_url');
--      select vault.create_secret('YOUR_SERVICE_ROLE_KEY', 'service_role_key');
--   3. Run this migration manually (or it will be skipped if extensions/vault not ready)
--
-- Alternative: Use GitHub Actions (no setup) - .github/workflows/release-abandoned-orders-cron.yml

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron')
     and exists (select 1 from pg_extension where extname = 'pg_net')
     and exists (select 1 from vault.decrypted_secrets where name = 'project_url')
     and exists (select 1 from vault.decrypted_secrets where name = 'service_role_key')
  then
    perform cron.schedule(
      'release-abandoned-orders-every-5min',
      '*/5 * * * *',
      $$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/release-abandoned-orders',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
        ),
        body := '{}'::jsonb
      ) as request_id;
      $$
    );
    raise notice 'Scheduled release-abandoned-orders every 5 minutes';
  else
    raise notice 'Skipped: enable pg_cron, pg_net and add vault secrets (project_url, service_role_key). Or use GitHub Actions workflow.';
  end if;
exception
  when undefined_table or undefined_object then
    raise notice 'Skipped: pg_cron/pg_net or vault not available. Use GitHub Actions workflow instead.';
end $$;
