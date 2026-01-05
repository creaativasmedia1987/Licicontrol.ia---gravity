-- Create organization_settings table
create table if not exists public.organization_settings (
    id uuid default gen_random_uuid() primary key,
    org_name text not null default 'Painel de Governança',
    logo_data text, -- Storing base64 for simplicity matching the HTML provided
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.organization_settings enable row level security;

-- Create policies
create policy "Allow read access to all authenticated users"
    on public.organization_settings for select
    to authenticated
    using (true);

create policy "Allow update access to all authenticated users"
    on public.organization_settings for update
    to authenticated
    using (true)
    with check (true);

create policy "Allow insert access to all authenticated users"
    on public.organization_settings for insert
    to authenticated
    with check (true);

-- Insert default row if not exists
insert into public.organization_settings (org_name)
select 'Painel de Governança'
where not exists (select 1 from public.organization_settings);
