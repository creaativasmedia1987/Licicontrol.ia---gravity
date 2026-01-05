-- Criar função para updated_at primeiro
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Criar tabela para processos de licitação
CREATE TABLE public.licitation_processes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  process_number TEXT NOT NULL,
  object TEXT NOT NULL,
  estimated_value DECIMAL(15,2) NOT NULL,
  modality TEXT NOT NULL, -- Pregão, Concorrência, Dispensa, Inexigibilidade
  department TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'em_andamento', -- em_andamento, concluído, cancelado
  publication_date DATE,
  opening_date DATE,
  supplier_history JSONB, -- Histórico do fornecedor (multas, inexecuções)
  technical_study_attached BOOLEAN DEFAULT false,
  reference_term_attached BOOLEAN DEFAULT false,
  budget_allocation TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para análises de risco
CREATE TABLE public.risk_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  process_id UUID NOT NULL REFERENCES public.licitation_processes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  risk_level TEXT NOT NULL, -- baixo, medio, alto
  risk_score INTEGER NOT NULL, -- 0-100
  risk_factors JSONB NOT NULL, -- Fatores que contribuíram para o risco
  recommendations TEXT,
  analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para templates de minutas
CREATE TABLE public.document_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  template_type TEXT NOT NULL, -- edital, termo_referencia, contrato
  template_name TEXT NOT NULL,
  template_content TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.licitation_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies para licitation_processes
CREATE POLICY "Users can view their own processes"
  ON public.licitation_processes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own processes"
  ON public.licitation_processes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own processes"
  ON public.licitation_processes
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own processes"
  ON public.licitation_processes
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies para risk_analysis
CREATE POLICY "Users can view their own risk analyses"
  ON public.risk_analysis
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own risk analyses"
  ON public.risk_analysis
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own risk analyses"
  ON public.risk_analysis
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own risk analyses"
  ON public.risk_analysis
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies para document_templates
CREATE POLICY "Users can view their own templates"
  ON public.document_templates
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own templates"
  ON public.document_templates
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON public.document_templates
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON public.document_templates
  FOR DELETE
  USING (auth.uid() = user_id);

-- Triggers para atualizar updated_at
CREATE TRIGGER update_licitation_processes_updated_at
  BEFORE UPDATE ON public.licitation_processes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_document_templates_updated_at
  BEFORE UPDATE ON public.document_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();