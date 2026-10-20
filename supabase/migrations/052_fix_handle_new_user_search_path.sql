-- handle_new_user() is SECURITY DEFINER with no pinned search_path, so it
-- resolves unqualified type names (user_role, trade_category) against
-- whatever search_path is active in the CALLING session — not the
-- definer's. GoTrue performs the auth.users insert as supabase_auth_admin,
-- whose role-level search_path is just "auth" (a Supabase security
-- default), so every signup that reaches the ::user_role / ::trade_category
-- casts has been throwing "type does not exist", silently swallowed by the
-- function's own EXCEPTION WHEN OTHERS handler — the whole profiles insert
-- rolls back (the exception happens inside the INSERT's VALUES expression,
-- before the row is ever written), and the signup "succeeds" at the auth
-- layer with no profile ever created. Confirmed live: a real tradie signup
-- (test@test.com / "Test2") has no profiles or tradie_profiles row.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;
