-- Create test_methods table
CREATE TABLE IF NOT EXISTS public.test_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    property_ids UUID[] DEFAULT '{}', -- Array of Property Definition IDs
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.test_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.test_methods
    FOR SELECT USING (true);

CREATE POLICY "Enable write access for authenticated users" ON public.test_methods
    FOR ALL USING (auth.role() = 'authenticated');

-- Trigger for updated_at
CREATE TRIGGER update_test_methods_modtime
    BEFORE UPDATE ON public.test_methods
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
