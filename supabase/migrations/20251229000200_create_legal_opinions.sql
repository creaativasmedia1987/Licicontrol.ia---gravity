create table if not exists public.legal_opinions (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    content text not null,
    compliance_score numeric not null,
    author_id uuid references auth.users(id) not null,
    created_at timestamptz default now()
);

-- Enable RLS
alter table public.legal_opinions enable row level security;

-- Policies
create policy "Users can view all legal opinions"
    on public.legal_opinions for select
    using (true);

create policy "Users can insert their own legal opinions"
    on public.legal_opinions for insert
    with check (auth.uid() = author_id);
