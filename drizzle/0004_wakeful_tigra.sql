ALTER TABLE `diagnosticSubmissions` ADD `receiptAccessToken` varchar(128);--> statement-breakpoint
ALTER TABLE `diagnosticSubmissions` ADD `receiptExpiresAt` timestamp;