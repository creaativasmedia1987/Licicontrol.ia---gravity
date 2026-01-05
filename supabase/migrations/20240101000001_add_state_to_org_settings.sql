-- Add state column to organization_settings
alter table public.organization_settings 
add column if not exists state text default 'Brasil';
