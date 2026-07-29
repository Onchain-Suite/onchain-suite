import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // Hand-added to a generated file, on purpose.
  //
  // payload.config.ts sets `schemaName: "payload"` to keep CMS tables away from
  // the Render backend's tables in the same database. Payload qualifies all of
  // its DDL with "payload". but never emits a CREATE SCHEMA, so `payload migrate`
  // against a fresh database fails with: schema "payload" does not exist.
  //
  // Creating it here keeps the migration self-contained: a brand-new Neon branch
  // (or a Vercel build running `payload migrate`) works with no manual setup.
  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS "payload";`)

  await db.execute(sql`
   CREATE TYPE "payload"."enum_posts_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload"."enum__posts_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload"."enum_users_role" AS ENUM('admin', 'editor');
  CREATE TABLE "payload"."posts_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tag" varchar
  );
  
  CREATE TABLE "payload"."posts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"excerpt" varchar,
  	"cover_image_id" integer,
  	"content" jsonb,
  	"published_at" timestamp(3) with time zone,
  	"slug" varchar,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "payload"."enum_posts_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "payload"."posts_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"categories_id" integer
  );
  
  CREATE TABLE "payload"."_posts_v_version_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"tag" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_posts_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_excerpt" varchar,
  	"version_cover_image_id" integer,
  	"version_content" jsonb,
  	"version_published_at" timestamp(3) with time zone,
  	"version_slug" varchar,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "payload"."enum__posts_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "payload"."_posts_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"categories_id" integer
  );
  
  CREATE TABLE "payload"."categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"caption" varchar,
  	"cloudinary_public_id" varchar,
  	"cloudinary_resource_type" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "payload"."users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "payload"."users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"role" "payload"."enum_users_role" DEFAULT 'editor' NOT NULL,
  	"bio" varchar,
  	"avatar_id" integer,
  	"wallet_address" varchar,
  	"farcaster" varchar,
  	"x" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload"."payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"posts_id" integer,
  	"categories_id" integer,
  	"media_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "payload"."payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload"."payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload"."posts_tags" ADD CONSTRAINT "posts_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."posts" ADD CONSTRAINT "posts_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."posts" ADD CONSTRAINT "posts_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."posts_rels" ADD CONSTRAINT "posts_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."posts_rels" ADD CONSTRAINT "posts_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."posts_rels" ADD CONSTRAINT "posts_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "payload"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_posts_v_version_tags" ADD CONSTRAINT "_posts_v_version_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_posts_v" ADD CONSTRAINT "_posts_v_parent_id_posts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_posts_v" ADD CONSTRAINT "_posts_v_version_cover_image_id_media_id_fk" FOREIGN KEY ("version_cover_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_posts_v" ADD CONSTRAINT "_posts_v_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "payload"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."users" ADD CONSTRAINT "users_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "payload"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "payload"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "payload"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "posts_tags_order_idx" ON "payload"."posts_tags" USING btree ("_order");
  CREATE INDEX "posts_tags_parent_id_idx" ON "payload"."posts_tags" USING btree ("_parent_id");
  CREATE INDEX "posts_cover_image_idx" ON "payload"."posts" USING btree ("cover_image_id");
  CREATE INDEX "posts_published_at_idx" ON "payload"."posts" USING btree ("published_at");
  CREATE UNIQUE INDEX "posts_slug_idx" ON "payload"."posts" USING btree ("slug");
  CREATE INDEX "posts_meta_meta_image_idx" ON "payload"."posts" USING btree ("meta_image_id");
  CREATE INDEX "posts_updated_at_idx" ON "payload"."posts" USING btree ("updated_at");
  CREATE INDEX "posts_created_at_idx" ON "payload"."posts" USING btree ("created_at");
  CREATE INDEX "posts__status_idx" ON "payload"."posts" USING btree ("_status");
  CREATE INDEX "posts_rels_order_idx" ON "payload"."posts_rels" USING btree ("order");
  CREATE INDEX "posts_rels_parent_idx" ON "payload"."posts_rels" USING btree ("parent_id");
  CREATE INDEX "posts_rels_path_idx" ON "payload"."posts_rels" USING btree ("path");
  CREATE INDEX "posts_rels_users_id_idx" ON "payload"."posts_rels" USING btree ("users_id");
  CREATE INDEX "posts_rels_categories_id_idx" ON "payload"."posts_rels" USING btree ("categories_id");
  CREATE INDEX "_posts_v_version_tags_order_idx" ON "payload"."_posts_v_version_tags" USING btree ("_order");
  CREATE INDEX "_posts_v_version_tags_parent_id_idx" ON "payload"."_posts_v_version_tags" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_parent_idx" ON "payload"."_posts_v" USING btree ("parent_id");
  CREATE INDEX "_posts_v_version_version_cover_image_idx" ON "payload"."_posts_v" USING btree ("version_cover_image_id");
  CREATE INDEX "_posts_v_version_version_published_at_idx" ON "payload"."_posts_v" USING btree ("version_published_at");
  CREATE INDEX "_posts_v_version_version_slug_idx" ON "payload"."_posts_v" USING btree ("version_slug");
  CREATE INDEX "_posts_v_version_meta_version_meta_image_idx" ON "payload"."_posts_v" USING btree ("version_meta_image_id");
  CREATE INDEX "_posts_v_version_version_updated_at_idx" ON "payload"."_posts_v" USING btree ("version_updated_at");
  CREATE INDEX "_posts_v_version_version_created_at_idx" ON "payload"."_posts_v" USING btree ("version_created_at");
  CREATE INDEX "_posts_v_version_version__status_idx" ON "payload"."_posts_v" USING btree ("version__status");
  CREATE INDEX "_posts_v_created_at_idx" ON "payload"."_posts_v" USING btree ("created_at");
  CREATE INDEX "_posts_v_updated_at_idx" ON "payload"."_posts_v" USING btree ("updated_at");
  CREATE INDEX "_posts_v_latest_idx" ON "payload"."_posts_v" USING btree ("latest");
  CREATE INDEX "_posts_v_rels_order_idx" ON "payload"."_posts_v_rels" USING btree ("order");
  CREATE INDEX "_posts_v_rels_parent_idx" ON "payload"."_posts_v_rels" USING btree ("parent_id");
  CREATE INDEX "_posts_v_rels_path_idx" ON "payload"."_posts_v_rels" USING btree ("path");
  CREATE INDEX "_posts_v_rels_users_id_idx" ON "payload"."_posts_v_rels" USING btree ("users_id");
  CREATE INDEX "_posts_v_rels_categories_id_idx" ON "payload"."_posts_v_rels" USING btree ("categories_id");
  CREATE UNIQUE INDEX "categories_slug_idx" ON "payload"."categories" USING btree ("slug");
  CREATE INDEX "categories_updated_at_idx" ON "payload"."categories" USING btree ("updated_at");
  CREATE INDEX "categories_created_at_idx" ON "payload"."categories" USING btree ("created_at");
  CREATE INDEX "media_updated_at_idx" ON "payload"."media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "payload"."media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "payload"."media" USING btree ("filename");
  CREATE INDEX "users_sessions_order_idx" ON "payload"."users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "payload"."users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_avatar_idx" ON "payload"."users" USING btree ("avatar_id");
  CREATE INDEX "users_updated_at_idx" ON "payload"."users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "payload"."users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "payload"."users" USING btree ("email");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload"."payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload"."payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload"."payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload"."payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload"."payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload"."payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload"."payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_posts_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("posts_id");
  CREATE INDEX "payload_locked_documents_rels_categories_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("categories_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload"."payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload"."payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload"."payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload"."payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload"."payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload"."payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload"."payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload"."payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload"."payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."posts_tags" CASCADE;
  DROP TABLE "payload"."posts" CASCADE;
  DROP TABLE "payload"."posts_rels" CASCADE;
  DROP TABLE "payload"."_posts_v_version_tags" CASCADE;
  DROP TABLE "payload"."_posts_v" CASCADE;
  DROP TABLE "payload"."_posts_v_rels" CASCADE;
  DROP TABLE "payload"."categories" CASCADE;
  DROP TABLE "payload"."media" CASCADE;
  DROP TABLE "payload"."users_sessions" CASCADE;
  DROP TABLE "payload"."users" CASCADE;
  DROP TABLE "payload"."payload_kv" CASCADE;
  DROP TABLE "payload"."payload_locked_documents" CASCADE;
  DROP TABLE "payload"."payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload"."payload_preferences" CASCADE;
  DROP TABLE "payload"."payload_preferences_rels" CASCADE;
  DROP TABLE "payload"."payload_migrations" CASCADE;
  DROP TYPE "payload"."enum_posts_status";
  DROP TYPE "payload"."enum__posts_v_version_status";
  DROP TYPE "payload"."enum_users_role";`)
}
