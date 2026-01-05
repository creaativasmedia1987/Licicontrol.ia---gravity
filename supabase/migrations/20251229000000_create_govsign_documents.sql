create table if not exists public.documents (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    content text not null,
    department text not null default 'Controle Interno',
    author_id uuid references auth.users(id) not null,
    created_at bigint not null,
    integrity_hash text not null,
    status text not null default 'authenticated'
);

-- Enable RLS
alter table public.documents enable row level security;

-- Policies
create policy "Users can view all documents"
    on public.documents for select
    using (true);

create policy "Users can insert their own documents"
    on public.documents for insert
    with check (auth.uid() = author_id);
