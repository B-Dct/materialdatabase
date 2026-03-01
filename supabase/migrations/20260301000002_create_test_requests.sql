-- Migration: Create test_requests table
CREATE TABLE IF NOT EXISTS public.test_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('material', 'layup', 'assembly')),
    entity_id UUID NOT NULL,
    requester_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'in_progress', 'completed', 'canceled')),
    order_number TEXT,
    variant_description TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.test_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read test requests" ON public.test_requests
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert test requests" ON public.test_requests
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update test requests" ON public.test_requests
    FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete test requests" ON public.test_requests
    FOR DELETE USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_test_requests_updated_at
    BEFORE UPDATE ON public.test_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
