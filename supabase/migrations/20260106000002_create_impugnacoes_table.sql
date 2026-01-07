-- Create impugnacoes table
create table if not exists public.impugnacoes (
    id uuid default gen_random_uuid() primary key,
    edital_text text,
    impugnation_text text,
    analysis_result text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.impugnacoes enable row level security;

-- Policies
create policy "Allow read access to all authenticated users"
    on public.impugnacoes for select
    to authenticated
    using (true);

create policy "Allow insert access to all authenticated users"
    on public.impugnacoes for insert
    to authenticated
    with check (true);
