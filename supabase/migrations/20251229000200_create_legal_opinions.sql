CREATE TABLE IF NOT EXISTS public.legal_opinions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    analysis_result JSONB, -- Stores the full audit object if needed, or just text summary
    author_name TEXT NOT NULL,
    author_role TEXT NOT NULL,
    compliance_score NUMERIC,
    signature_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    signature_token TEXT NOT NULL,
    author_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies
ALTER TABLE public.legal_opinions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own opinions" 
    ON public.legal_opinions FOR SELECT 
    USING (auth.uid() = author_id);

CREATE POLICY "Users can insert their own opinions" 
    ON public.legal_opinions FOR INSERT 
    WITH CHECK (auth.uid() = author_id);
