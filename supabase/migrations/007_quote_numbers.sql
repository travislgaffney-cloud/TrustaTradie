-- Global sequence for TAT quote numbers
CREATE SEQUENCE IF NOT EXISTS quote_number_seq START WITH 1;

-- Add quote_number column
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS quote_number TEXT UNIQUE;

-- Trigger function to auto-assign TAT quote numbers on insert
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quote_number IS NULL THEN
    NEW.quote_number := 'TAT' || LPAD(nextval('quote_number_seq')::TEXT, 8, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_quote_number
BEFORE INSERT ON quotes
FOR EACH ROW
EXECUTE FUNCTION generate_quote_number();

-- Back-fill any existing quotes that don't have numbers
UPDATE quotes
SET quote_number = 'TAT' || LPAD(nextval('quote_number_seq')::TEXT, 8, '0')
WHERE quote_number IS NULL;
