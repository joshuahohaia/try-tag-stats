CREATE TABLE "player_teams" (
	"player_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"division_id" integer NOT NULL,
	CONSTRAINT "player_teams_player_id_team_id_division_id_pk" PRIMARY KEY("player_id","team_id","division_id")
);
--> statement-breakpoint
ALTER TABLE "player_teams" ADD CONSTRAINT "player_teams_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_teams" ADD CONSTRAINT "player_teams_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_teams" ADD CONSTRAINT "player_teams_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;