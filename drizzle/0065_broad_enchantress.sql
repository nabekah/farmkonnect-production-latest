CREATE TABLE `taskComments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`commentId` varchar(50) NOT NULL,
	`taskId` varchar(50) NOT NULL,
	`authorUserId` int NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `taskComments_id` PRIMARY KEY(`id`),
	CONSTRAINT `taskComments_commentId_unique` UNIQUE(`commentId`)
);
