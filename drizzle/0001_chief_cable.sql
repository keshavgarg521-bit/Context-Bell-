CREATE TABLE `chat_messages` (
	`id` varchar(36) NOT NULL,
	`lectureId` varchar(36) NOT NULL,
	`role` enum('user','assistant','system') NOT NULL,
	`content` mediumtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `confusion_moments` (
	`id` varchar(36) NOT NULL,
	`lectureId` varchar(36) NOT NULL,
	`timestamp` int NOT NULL,
	`topic` varchar(255),
	`transcriptContext` mediumtext,
	`audioClipUrl` varchar(512),
	`aiExplanation` mediumtext,
	`status` enum('new','explained','reviewed') NOT NULL DEFAULT 'new',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `confusion_moments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lectures` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`topic` text,
	`duration` int DEFAULT 0,
	`status` enum('active','ended','processing') NOT NULL DEFAULT 'active',
	`transcript` mediumtext,
	`aiSummary` mediumtext,
	`aiQuiz` mediumtext,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lectures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transcripts` (
	`id` varchar(36) NOT NULL,
	`lectureId` varchar(36) NOT NULL,
	`text` text NOT NULL,
	`timestamp` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transcripts_id` PRIMARY KEY(`id`)
);
