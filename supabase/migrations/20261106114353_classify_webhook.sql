-- On insert of an uncategorised transaction, ask the classify Edge Function to categorise it.
-- Needs a Vault secret 'classify_api_key' (a Supabase secret API key), created outside migrations.
create extension if not exists pg_net with schema extensions;

create function public.request_classify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  k text := (select decrypted_secret from vault.decrypted_secrets where name = 'classify_api_key');
begin
  if k is not null then
    perform net.http_post(
      url := 'https://bfpeqizfymrmsoxjbmhp.supabase.co/functions/v1/classify',
      headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', k),
      body := jsonb_build_object('id', new.id),
      timeout_milliseconds := 30000
    );
  end if;
  return new;
end $$;
revoke execute on function public.request_classify from public, anon, authenticated;

create trigger request_classify after insert on public.transactions
  for each row when (new.category_id is null) execute function public.request_classify();
