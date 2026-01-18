CREATE TABLE "divisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_division_id" integer NOT NULL,
	"league_id" integer NOT NULL,
	"season_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"tier" integer,
	"last_scraped_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fixtures" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_fixture_id" integer,
	"division_id" integer NOT NULL,
	"home_team_id" integer NOT NULL,
	"away_team_id" integer NOT NULL,
	"fixture_date" timestamp NOT NULL,
	"fixture_time" varchar(50),
	"pitch" varchar(255),
	"round_number" integer,
	"home_score" integer,
	"away_score" integer,
	"status" text NOT NULL,
	"is_forfeit" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leagues" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_league_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"region_id" integer,
	"venue_name" varchar(255),
	"day_of_week" varchar(50),
	"format" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_awards" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"division_id" integer NOT NULL,
	"fixture_id" integer,
	"award_type" varchar(50) NOT NULL,
	"award_count" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_player_id" integer,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_season_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"is_current" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "standings" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"division_id" integer NOT NULL,
	"position" integer NOT NULL,
	"played" integer NOT NULL,
	"wins" integer NOT NULL,
	"losses" integer NOT NULL,
	"draws" integer NOT NULL,
	"forfeits_for" integer NOT NULL,
	"forfeits_against" integer NOT NULL,
	"points_for" integer NOT NULL,
	"points_against" integer NOT NULL,
	"point_difference" integer NOT NULL,
	"bonus_points" integer NOT NULL,
	"total_points" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_divisions" (
	"team_id" integer NOT NULL,
	"division_id" integer NOT NULL,
	CONSTRAINT "team_divisions_team_id_division_id_pk" PRIMARY KEY("team_id","division_id")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_team_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "divisions" ADD CONSTRAINT "divisions_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "divisions" ADD CONSTRAINT "divisions_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leagues" ADD CONSTRAINT "leagues_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_awards" ADD CONSTRAINT "player_awards_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_awards" ADD CONSTRAINT "player_awards_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_awards" ADD CONSTRAINT "player_awards_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_awards" ADD CONSTRAINT "player_awards_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standings" ADD CONSTRAINT "standings_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standings" ADD CONSTRAINT "standings_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_divisions" ADD CONSTRAINT "team_divisions_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_divisions" ADD CONSTRAINT "team_divisions_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "divisions_unique_idx" ON "divisions" USING btree ("external_division_id","league_id","season_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fixtures_unique_idx" ON "fixtures" USING btree ("division_id","home_team_id","away_team_id","fixture_date");--> statement-breakpoint
CREATE UNIQUE INDEX "leagues_external_id_idx" ON "leagues" USING btree ("external_league_id");--> statement-breakpoint
CREATE UNIQUE INDEX "player_awards_unique_idx" ON "player_awards" USING btree ("player_id","division_id","award_type");--> statement-breakpoint
CREATE UNIQUE INDEX "players_name_idx" ON "players" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "players_external_id_idx" ON "players" USING btree ("external_player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "regions_name_idx" ON "regions" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "seasons_external_id_idx" ON "seasons" USING btree ("external_season_id");--> statement-breakpoint
CREATE UNIQUE INDEX "standings_unique_idx" ON "standings" USING btree ("team_id","division_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_external_id_idx" ON "teams" USING btree ("external_team_id");