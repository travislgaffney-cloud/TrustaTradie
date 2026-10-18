-- The live handle_new_user() function had drifted from migration 001: at
-- some point it was replaced with a version that only inserts into
-- `profiles` and silently swallows all errors (EXCEPTION WHEN OTHERS ->
-- RAISE LOG -> RETURN NEW), so it never surfaced the missing tradie_profiles
-- insert as a failure. Net effect: every tradie signup since that drift
-- never got a tradie_profiles row at all — categories, experience, hourly
-- rate, service_towns all silently empty for every tradie account. This
-- restores the original intent (create tradie_profiles for role='tradie',
-- seeded from signup metadata) while keeping a safety net that actually
-- logs loudly instead of hiding failures.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'customer')
  );

  IF COALESCE(NEW.raw_user_meta_data->>'role', 'customer') = 'tradie' THEN
    INSERT INTO public.tradie_profiles (id, categories)
    VALUES (
      NEW.id,
      COALESCE(
        (SELECT ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'categories'))::trade_category[]),
        '{}'
      )
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill every existing tradie account that was created while this was
-- broken — seeds categories from their original signup metadata where
-- available so nothing is lost.
INSERT INTO tradie_profiles (id, categories)
SELECT
  p.id,
  COALESCE(
    (SELECT ARRAY(SELECT jsonb_array_elements_text(u.raw_user_meta_data->'categories'))::trade_category[]),
    '{}'
  )
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.role = 'tradie'
  AND NOT EXISTS (SELECT 1 FROM tradie_profiles tp WHERE tp.id = p.id);
