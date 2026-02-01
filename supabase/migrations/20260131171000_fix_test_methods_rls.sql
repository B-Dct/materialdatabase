-- Fix RLS for test_methods to allow anon access (since Auth is mocked)
DROP POLICY IF EXISTS "Enable write access for authenticated users" ON public.test_methods;

CREATE POLICY "Enable write access for all users" ON public.test_methods
    FOR ALL USING (true) 
    WITH CHECK (true); -- CHECK required for INSERT/UPDATE
