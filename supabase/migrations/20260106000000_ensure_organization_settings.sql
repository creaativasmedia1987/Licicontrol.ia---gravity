-- Ensure organization_settings table exists
create table if not exists public.organization_settings (
    id uuid default gen_random_uuid() primary key,
    org_name text not null default 'Painel de Governança',
    logo_data text, -- Stores Base64 string of the logo
    state text default 'Brasil',
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.organization_settings enable row level security;

-- Policies (Drop first to avoid conflicts if re-running)
drop policy if exists "Allow read access to all authenticated users" on public.organization_settings;
create policy "Allow read access to all authenticated users"
    on public.organization_settings for select
    to authenticated
    using (true);

drop policy if exists "Allow update access to all authenticated users" on public.organization_settings;
create policy "Allow update access to all authenticated users"
    on public.organization_settings for update
    to authenticated
    using (true)
    with check (true);

drop policy if exists "Allow insert access to all authenticated users" on public.organization_settings;
create policy "Allow insert access to all authenticated users"
    on public.organization_settings for insert
    to authenticated
    with check (true);

-- Insert default row if table is empty
insert into public.organization_settings (org_name, state)
select 'Painel de Governança', 'Brasil'
where not exists (select 1 from public.organization_settings);
