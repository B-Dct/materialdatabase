-- Enhance Test Methods with Title and Category

-- Add Title column
ALTER TABLE test_methods
ADD COLUMN IF NOT EXISTS title TEXT;

-- Add Category column with constraints
-- Categories: mechanical, physical, chemical
ALTER TABLE test_methods
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('mechanical', 'physical', 'chemical'));

-- Add comment
COMMENT ON COLUMN test_methods.title IS 'Descriptive title of the test method (e.g. "Tensile Properties")';
COMMENT ON COLUMN test_methods.category IS 'Classification of the test method';
