CREATE TABLE `tokenBlacklist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` text NOT NULL,
	`userId` int NOT NULL,
	`blacklistedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	CONSTRAINT `tokenBlacklist_id` PRIMARY KEY(`id`)
);
