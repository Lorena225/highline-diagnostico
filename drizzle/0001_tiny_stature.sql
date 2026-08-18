CREATE TABLE `diagnosticSubmissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`respondentName` varchar(191) NOT NULL,
	`respondentRole` varchar(191),
	`respondentEmail` varchar(320) NOT NULL,
	`respondentPhone` varchar(64),
	`answers` json NOT NULL,
	`emailStatus` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
	`emailError` text,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `diagnosticSubmissions_id` PRIMARY KEY(`id`)
);
