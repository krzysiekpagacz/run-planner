CREATE TYPE "public"."relationship_status" AS ENUM('pending', 'active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."segment_type" AS ENUM('warmup', 'main_set', 'cooldown', 'recovery', 'build');--> statement-breakpoint
CREATE TYPE "public"."workout_type" AS ENUM('easy_run', 'tempo_run', 'interval_training', 'long_run', 'race', 'rest', 'cross_training', 'strength', 'fartlek', 'hill_workout');--> statement-breakpoint
CREATE TABLE "coach_athlete_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" uuid NOT NULL,
	"athlete_id" uuid NOT NULL,
	"status" "relationship_status" DEFAULT 'pending' NOT NULL,
	"custom_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strava_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"workout_id" uuid,
	"strava_id" text NOT NULL,
	"name" text NOT NULL,
	"activity_type" text NOT NULL,
	"started_at" timestamp NOT NULL,
	"duration_seconds" integer NOT NULL,
	"distance_meters" integer,
	"avg_pace_seconds_per_km" integer,
	"avg_heart_rate" integer,
	"max_heart_rate" integer,
	"elevation_gain_meters" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "strava_activities_strava_id_unique" UNIQUE("strava_id")
);
--> statement-breakpoint
CREATE TABLE "training_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" uuid NOT NULL,
	"athlete_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"role" text DEFAULT 'athlete' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workout_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workout_id" uuid NOT NULL,
	"order_index" integer NOT NULL,
	"segment_type" "segment_type" NOT NULL,
	"repetitions" integer DEFAULT 1 NOT NULL,
	"distance_meters" integer,
	"duration_minutes" integer,
	"pace_min_seconds_per_km" integer,
	"pace_max_seconds_per_km" integer,
	"heart_rate_min" integer,
	"heart_rate_max" integer,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "workouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid,
	"coach_id" uuid NOT NULL,
	"athlete_id" uuid NOT NULL,
	"scheduled_date" date NOT NULL,
	"title" text NOT NULL,
	"workout_type" "workout_type" NOT NULL,
	"total_duration_minutes" integer,
	"total_distance_meters" integer,
	"notes" text,
	"order_in_day" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "coach_athlete_relationships" ADD CONSTRAINT "coach_athlete_relationships_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_athlete_relationships" ADD CONSTRAINT "coach_athlete_relationships_athlete_id_users_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strava_activities" ADD CONSTRAINT "strava_activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strava_activities" ADD CONSTRAINT "strava_activities_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_plans" ADD CONSTRAINT "training_plans_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_plans" ADD CONSTRAINT "training_plans_athlete_id_users_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_segments" ADD CONSTRAINT "workout_segments_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_plan_id_training_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."training_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_athlete_id_users_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;