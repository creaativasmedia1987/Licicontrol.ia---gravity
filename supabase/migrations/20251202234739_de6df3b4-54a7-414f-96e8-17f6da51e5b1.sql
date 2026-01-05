-- Create table for saved minutes/minutas
CREATE TABLE public.saved_minutas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  template_type TEXT NOT NULL,
  pncp_id TEXT,
  pncp_objeto TEXT,
  pncp_data JSONB,
  generated_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Rascunho',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.saved_minutas ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own minutas" 
ON public.saved_minutas 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own minutas" 
ON public.saved_minutas 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own minutas" 
ON public.saved_minutas 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own minutas" 
ON public.saved_minutas 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_saved_minutas_updated_at
BEFORE UPDATE ON public.saved_minutas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();