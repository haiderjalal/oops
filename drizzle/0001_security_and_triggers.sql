-- Row Level Security: deny by default.
--
-- The application connects with a privileged role (the table owner / `postgres`), which
-- bypasses RLS. Enabling RLS with *no* policies means any other role — notably the
-- `anon` / `authenticated` roles behind an auto-generated Data API such as Supabase
-- PostgREST — can read or write nothing. The public site only ever reads published rows,
-- and it does so through the server (see src/features/places/queries.ts).
ALTER TABLE "places" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "photos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "trips" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "place_tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bucket_list_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "site_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- updated_at is maintained by the database so it can never be forged by a client clock.
CREATE FUNCTION "set_updated_at"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;--> statement-breakpoint

CREATE TRIGGER "places_set_updated_at" BEFORE UPDATE ON "places"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();--> statement-breakpoint
CREATE TRIGGER "trips_set_updated_at" BEFORE UPDATE ON "trips"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();--> statement-breakpoint
CREATE TRIGGER "bucket_list_items_set_updated_at" BEFORE UPDATE ON "bucket_list_items"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();--> statement-breakpoint
CREATE TRIGGER "site_settings_set_updated_at" BEFORE UPDATE ON "site_settings"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();
