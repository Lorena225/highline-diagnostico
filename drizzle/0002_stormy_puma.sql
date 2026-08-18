CREATE TABLE `diagnosticMaterials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submissionId` int NOT NULL,
	`category` varchar(64) NOT NULL,
	`notes` text,
	`fileName` varchar(512),
	`storageKey` varchar(1024),
	`fileUrl` varchar(1024),
	`contentType` varchar(191),
	`sizeBytes` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `diagnosticMaterials_id` PRIMARY KEY(`id`)
);
