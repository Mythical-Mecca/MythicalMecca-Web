-- LFG posts can now be unlimited: total_seats becomes nullable (null = no cap).
ALTER TABLE "lfg_posts" ALTER COLUMN "total_seats" DROP NOT NULL;
