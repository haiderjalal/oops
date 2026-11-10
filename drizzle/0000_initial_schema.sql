CREATE TYPE "public"."bucket_status" AS ENUM('planned', 'completed');--> statement-breakpoint
CREATE TYPE "public"."location_privacy" AS ENUM('exact', 'approximate');--> statement-breakpoint
CREATE TYPE "public"."place_type" AS ENUM('country', 'city', 'cafe', 'restaurant', 'attraction', 'hotel', 'other');--> statement-breakpoint
CREATE TYPE "public"."publication_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "bucket_list_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"place_name" text NOT NULL,
	"lat" numeric(9, 6) NOT NULL,
	"lng" numeric(9, 6) NOT NULL,
	"country_code" char(2),
	"country_name" text,
	"geocoder_provider" text,
	"provider_place_id" text,
	"note" text DEFAULT '' NOT NULL,
	"status" "bucket_status" DEFAULT 'planned' NOT NULL,
	"linked_place_id" uuid,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bucket_lat_range" CHECK ("bucket_list_items"."lat" between -90 and 90),
	CONSTRAINT "bucket_lng_range" CHECK ("bucket_list_items"."lng" between -180 and 180),
	CONSTRAINT "bucket_country_code_format" CHECK ("bucket_list_items"."country_code" is null or "bucket_list_items"."country_code" ~ '^[A-Z]{2}$')
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"place_id" uuid,
	"storage_key" text NOT NULL,
	"alt" text DEFAULT '' NOT NULL,
	"caption" text,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"bytes" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"blur_data_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "photos_dimensions_positive" CHECK ("photos"."width" > 0 and "photos"."height" > 0)
);
--> statement-breakpoint
CREATE TABLE "place_tags" (
	"place_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "place_tags_place_id_tag_id_pk" PRIMARY KEY("place_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "places" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"type" "place_type" DEFAULT 'other' NOT NULL,
	"lat" numeric(9, 6) NOT NULL,
	"lng" numeric(9, 6) NOT NULL,
	"location_privacy" "location_privacy" DEFAULT 'exact' NOT NULL,
	"geocoder_provider" text,
	"provider_place_id" text,
	"place_name" text,
	"formatted_address" text,
	"city" text,
	"region" text,
	"country_code" char(2),
	"country_name" text,
	"visited_at" date,
	"excerpt" text DEFAULT '' NOT NULL,
	"story" text DEFAULT '' NOT NULL,
	"funny_moment" text,
	"rating" smallint,
	"status" "publication_status" DEFAULT 'draft' NOT NULL,
	"cover_photo_id" uuid,
	"trip_id" uuid,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "places_slug_format" CHECK ("places"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "places_lat_range" CHECK ("places"."lat" between -90 and 90),
	CONSTRAINT "places_lng_range" CHECK ("places"."lng" between -180 and 180),
	CONSTRAINT "places_rating_range" CHECK ("places"."rating" is null or "places"."rating" between 1 and 5),
	CONSTRAINT "places_country_code_format" CHECK ("places"."country_code" is null or "places"."country_code" ~ '^[A-Z]{2}$'),
	CONSTRAINT "places_title_length" CHECK (char_length("places"."title") between 1 and 140),
	CONSTRAINT "places_published_has_timestamp" CHECK ("places"."status" <> 'published' or "places"."published_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_slug_format" CHECK ("tags"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"start_date" date,
	"end_date" date,
	"description" text DEFAULT '' NOT NULL,
	"status" "publication_status" DEFAULT 'draft' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trips_slug_format" CHECK ("trips"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "trips_dates_ordered" CHECK ("trips"."start_date" is null or "trips"."end_date" is null or "trips"."end_date" >= "trips"."start_date")
);
--> statement-breakpoint
ALTER TABLE "bucket_list_items" ADD CONSTRAINT "bucket_list_items_linked_place_id_places_id_fk" FOREIGN KEY ("linked_place_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_tags" ADD CONSTRAINT "place_tags_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_tags" ADD CONSTRAINT "place_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_cover_photo_id_photos_id_fk" FOREIGN KEY ("cover_photo_id") REFERENCES "public"."photos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bucket_list_items_linked_place_id_idx" ON "bucket_list_items" USING btree ("linked_place_id");--> statement-breakpoint
CREATE INDEX "bucket_list_items_status_idx" ON "bucket_list_items" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "photos_storage_key_key" ON "photos" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "photos_place_sort_idx" ON "photos" USING btree ("place_id","sort_order");--> statement-breakpoint
CREATE INDEX "place_tags_tag_id_idx" ON "place_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "places_slug_key" ON "places" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "places_public_idx" ON "places" USING btree ("visited_at" DESC NULLS LAST,"published_at") WHERE "places"."status" = 'published' and "places"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "places_trip_id_idx" ON "places" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "places_cover_photo_id_idx" ON "places" USING btree ("cover_photo_id");--> statement-breakpoint
CREATE INDEX "places_country_code_idx" ON "places" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "places_updated_at_idx" ON "places" USING btree ("updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "tags_slug_key" ON "tags" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "trips_slug_key" ON "trips" USING btree ("slug");