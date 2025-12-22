-- Migration: Create AI context documents table
-- This migration creates a table for storing documents that will be used as context for AI models

-- Create ai_context_documents table
CREATE TABLE IF NOT EXISTS public.ai_context_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  pinecone_index_name TEXT NOT NULL,
  pinecone_vector_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('processing', 'completed', 'failed'))
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_ai_context_documents_user_id ON public.ai_context_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_context_documents_status ON public.ai_context_documents(status);
CREATE INDEX IF NOT EXISTS idx_ai_context_documents_pinecone_index ON public.ai_context_documents(pinecone_index_name);

-- Enable Row Level Security
ALTER TABLE public.ai_context_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own AI context documents"
  ON public.ai_context_documents
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own AI context documents"
  ON public.ai_context_documents
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own AI context documents"
  ON public.ai_context_documents
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own AI context documents"
  ON public.ai_context_documents
  FOR DELETE
  USING (user_id = auth.uid());

-- Add trigger for updated_at
CREATE TRIGGER update_ai_context_documents_updated_at
  BEFORE UPDATE ON public.ai_context_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();









