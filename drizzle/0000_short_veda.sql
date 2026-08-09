CREATE TABLE `action_targets` (
	`action_id` text NOT NULL,
	`machine_id` text NOT NULL,
	`status` text NOT NULL,
	`previous_state_json` text,
	`result_json` text,
	`started_at` integer,
	`finished_at` integer,
	PRIMARY KEY(`action_id`, `machine_id`),
	FOREIGN KEY (`action_id`) REFERENCES `actions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `actions` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`requested_by` text NOT NULL,
	`requested_at` integer NOT NULL,
	`status` text NOT NULL,
	`parameters_json` text NOT NULL,
	`incident_id` text,
	`reason` text NOT NULL,
	`planned_only` integer DEFAULT true NOT NULL,
	`started_at` integer,
	`finished_at` integer
);
--> statement-breakpoint
CREATE INDEX `actions_status_time_idx` ON `actions` (`status`,`requested_at`);--> statement-breakpoint
CREATE TABLE `build_artifacts` (
	`id` text PRIMARY KEY NOT NULL,
	`build_id` text NOT NULL,
	`name` text NOT NULL,
	`path` text NOT NULL,
	`version` text,
	`size_bytes` integer,
	`checksum` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`build_id`) REFERENCES `builds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `artifacts_build_idx` ON `build_artifacts` (`build_id`);--> statement-breakpoint
CREATE TABLE `builds` (
	`id` text PRIMARY KEY NOT NULL,
	`build_type` text NOT NULL,
	`branch` text NOT NULL,
	`status` text NOT NULL,
	`state` text NOT NULL,
	`queued_at` integer NOT NULL,
	`started_at` integer,
	`finished_at` integer,
	`duration_ms` integer,
	`queue_duration_ms` integer,
	`agent_id` text,
	`build_number` text NOT NULL,
	`commit_sha` text,
	`environment` text NOT NULL,
	`parameters_json` text,
	`artifact_count` integer DEFAULT 0 NOT NULL,
	`test_anomaly_count` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `builds_started_at_idx` ON `builds` (`started_at`);--> statement-breakpoint
CREATE INDEX `builds_agent_idx` ON `builds` (`agent_id`);--> statement-breakpoint
CREATE INDEX `builds_commit_idx` ON `builds` (`commit_sha`);--> statement-breakpoint
CREATE UNIQUE INDEX `builds_number_type_idx` ON `builds` (`build_number`,`build_type`);--> statement-breakpoint
CREATE TABLE `connector_health` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`mode` text NOT NULL,
	`status` text DEFAULT 'IDLE' NOT NULL,
	`last_started_at` integer,
	`last_finished_at` integer,
	`last_success_at` integer,
	`last_error` text,
	`records_synced` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `deployments` (
	`id` text PRIMARY KEY NOT NULL,
	`environment` text NOT NULL,
	`application` text NOT NULL,
	`service` text,
	`artifact_name` text,
	`artifact_version` text,
	`build_id` text,
	`commit_sha` text,
	`status` text NOT NULL,
	`requested_at` integer NOT NULL,
	`started_at` integer,
	`finished_at` integer,
	`target_machine` text,
	`stages_json` text,
	`raw_json` text,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `deployments_environment_time_idx` ON `deployments` (`environment`,`started_at`);--> statement-breakpoint
CREATE INDEX `deployments_build_idx` ON `deployments` (`build_id`);--> statement-breakpoint
CREATE INDEX `deployments_commit_idx` ON `deployments` (`commit_sha`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`timestamp` integer NOT NULL,
	`source` text NOT NULL,
	`type` text NOT NULL,
	`severity` text NOT NULL,
	`environment` text NOT NULL,
	`service_id` text,
	`machine_id` text,
	`build_id` text,
	`deployment_id` text,
	`commit_sha` text,
	`test_occurrence_id` text,
	`summary` text NOT NULL,
	`metadata_json` text
);
--> statement-breakpoint
CREATE INDEX `events_time_idx` ON `events` (`timestamp`);--> statement-breakpoint
CREATE INDEX `events_environment_time_idx` ON `events` (`environment`,`timestamp`);--> statement-breakpoint
CREATE INDEX `events_build_idx` ON `events` (`build_id`);--> statement-breakpoint
CREATE INDEX `events_machine_idx` ON `events` (`machine_id`);--> statement-breakpoint
CREATE INDEX `events_service_idx` ON `events` (`service_id`);--> statement-breakpoint
CREATE TABLE `git_commit_files` (
	`commit_sha` text NOT NULL,
	`path` text NOT NULL,
	`change_type` text NOT NULL,
	`additions` integer,
	`deletions` integer,
	PRIMARY KEY(`commit_sha`, `path`),
	FOREIGN KEY (`commit_sha`) REFERENCES `git_commits`(`sha`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `git_commit_files_path_idx` ON `git_commit_files` (`path`);--> statement-breakpoint
CREATE TABLE `git_commits` (
	`sha` text PRIMARY KEY NOT NULL,
	`repository_id` text NOT NULL,
	`author_name` text NOT NULL,
	`author_email` text,
	`author_date` integer NOT NULL,
	`committer_date` integer NOT NULL,
	`subject` text NOT NULL,
	`body` text,
	`parent_sha` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`repository_id`) REFERENCES `repositories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `git_commits_repository_date_idx` ON `git_commits` (`repository_id`,`committer_date`);--> statement-breakpoint
CREATE TABLE `incidents` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`severity` text NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`title` text NOT NULL,
	`started_at` integer NOT NULL,
	`resolved_at` integer,
	`primary_entity_type` text NOT NULL,
	`primary_entity_id` text NOT NULL,
	`explanation_json` text
);
--> statement-breakpoint
CREATE INDEX `incidents_status_severity_idx` ON `incidents` (`status`,`severity`);--> statement-breakpoint
CREATE TABLE `machine_env_vars` (
	`machine_id` text NOT NULL,
	`variable_name` text NOT NULL,
	`value_hash` text NOT NULL,
	`display_value` text NOT NULL,
	`sensitive` integer DEFAULT false NOT NULL,
	`captured_at` integer NOT NULL,
	PRIMARY KEY(`machine_id`, `variable_name`),
	FOREIGN KEY (`machine_id`) REFERENCES `machines`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `machine_health_samples` (
	`id` text PRIMARY KEY NOT NULL,
	`machine_id` text NOT NULL,
	`timestamp` integer NOT NULL,
	`reachable` integer NOT NULL,
	`cpu_percent` real,
	`memory_percent` real,
	`disk_free_percent` real,
	`uptime_seconds` integer,
	`teamcity_agent_ok` integer,
	`metadata_json` text,
	FOREIGN KEY (`machine_id`) REFERENCES `machines`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `machine_health_machine_time_idx` ON `machine_health_samples` (`machine_id`,`timestamp`);--> statement-breakpoint
CREATE TABLE `machine_packages` (
	`machine_id` text NOT NULL,
	`package_name` text NOT NULL,
	`version` text NOT NULL,
	`captured_at` integer NOT NULL,
	PRIMARY KEY(`machine_id`, `package_name`),
	FOREIGN KEY (`machine_id`) REFERENCES `machines`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `machine_packages_name_idx` ON `machine_packages` (`package_name`);--> statement-breakpoint
CREATE TABLE `machines` (
	`id` text PRIMARY KEY NOT NULL,
	`hostname` text NOT NULL,
	`role` text NOT NULL,
	`environment` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`last_seen_at` integer NOT NULL,
	`reference_machine_id` text,
	`metadata_json` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `machines_hostname_unique` ON `machines` (`hostname`);--> statement-breakpoint
CREATE INDEX `machines_environment_role_idx` ON `machines` (`environment`,`role`);--> statement-breakpoint
CREATE TABLE `oracle_samples` (
	`id` text PRIMARY KEY NOT NULL,
	`database_name` text NOT NULL,
	`environment` text NOT NULL,
	`timestamp` integer NOT NULL,
	`connection_ok` integer NOT NULL,
	`connect_ms` integer,
	`query_ok` integer NOT NULL,
	`query_ms` integer,
	`application_probe_ms` integer,
	`error_code` text,
	`error_message` text,
	`metadata_json` text
);
--> statement-breakpoint
CREATE INDEX `oracle_environment_time_idx` ON `oracle_samples` (`environment`,`timestamp`);--> statement-breakpoint
CREATE TABLE `repositories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`path` text NOT NULL,
	`remote_url` text,
	`default_branch` text DEFAULT 'main' NOT NULL,
	`last_fetch_at` integer,
	`last_seen_commit` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `service_status_samples` (
	`id` text PRIMARY KEY NOT NULL,
	`service_id` text NOT NULL,
	`service_name` text NOT NULL,
	`environment` text NOT NULL,
	`timestamp` integer NOT NULL,
	`status` text NOT NULL,
	`latency_ms` integer,
	`error_count` integer DEFAULT 0 NOT NULL,
	`warning_count` integer DEFAULT 0 NOT NULL,
	`instance_count` integer DEFAULT 0 NOT NULL,
	`last_restart_at` integer,
	`grafana_url` text,
	`metadata_json` text
);
--> statement-breakpoint
CREATE INDEX `services_id_time_idx` ON `service_status_samples` (`service_id`,`timestamp`);--> statement-breakpoint
CREATE INDEX `services_environment_time_idx` ON `service_status_samples` (`environment`,`timestamp`);--> statement-breakpoint
CREATE TABLE `teamcity_agents` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`machine_id` text,
	`connected` integer NOT NULL,
	`enabled` integer NOT NULL,
	`authorized` integer NOT NULL,
	`current_build_id` text,
	`pool` text,
	`version` text,
	`last_seen_at` integer NOT NULL,
	`last_status_change_at` integer,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`machine_id`) REFERENCES `machines`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `agents_machine_idx` ON `teamcity_agents` (`machine_id`);--> statement-breakpoint
CREATE TABLE `test_baselines` (
	`test_key` text PRIMARY KEY NOT NULL,
	`sample_count` integer NOT NULL,
	`median_ms` integer NOT NULL,
	`p25_ms` integer NOT NULL,
	`p75_ms` integer NOT NULL,
	`p90_ms` integer NOT NULL,
	`p95_ms` integer NOT NULL,
	`mad_ms` integer NOT NULL,
	`median_test_count` integer,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `test_occurrences` (
	`id` text PRIMARY KEY NOT NULL,
	`teamcity_test_id` text NOT NULL,
	`build_id` text NOT NULL,
	`test_name` text NOT NULL,
	`test_suite` text,
	`test_type` text NOT NULL,
	`status` text NOT NULL,
	`duration_ms` integer NOT NULL,
	`machine_id` text,
	`worker_id` text,
	`environment` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer NOT NULL,
	`failure_message` text,
	`test_count` integer,
	`passed_count` integer,
	`failed_count` integer,
	`skipped_count` integer,
	`anomaly_type` text DEFAULT 'NONE' NOT NULL,
	`anomaly_severity` text DEFAULT 'INFO' NOT NULL,
	`anomaly_score` real DEFAULT 0 NOT NULL,
	`probable_cause` text,
	`evidence_json` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`build_id`) REFERENCES `builds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`machine_id`) REFERENCES `machines`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `tests_name_idx` ON `test_occurrences` (`test_name`);--> statement-breakpoint
CREATE INDEX `tests_type_idx` ON `test_occurrences` (`test_type`);--> statement-breakpoint
CREATE INDEX `tests_build_idx` ON `test_occurrences` (`build_id`);--> statement-breakpoint
CREATE INDEX `tests_started_idx` ON `test_occurrences` (`started_at`);--> statement-breakpoint
CREATE INDEX `tests_machine_idx` ON `test_occurrences` (`machine_id`);--> statement-breakpoint
CREATE INDEX `tests_anomaly_idx` ON `test_occurrences` (`anomaly_type`,`anomaly_severity`);