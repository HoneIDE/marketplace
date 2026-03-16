-- Hone Marketplace database schema
-- Run against MySQL on webserver.skelpo.net

CREATE DATABASE IF NOT EXISTS hone_marketplace;
USE hone_marketplace;

CREATE TABLE publishers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(128) UNIQUE NOT NULL,
  displayName VARCHAR(256),
  email VARCHAR(256),
  avatarUrl VARCHAR(512),
  bio TEXT,
  website VARCHAR(512),
  verificationTier VARCHAR(32) DEFAULT 'unverified',
  oauthProvider VARCHAR(32),
  oauthId VARCHAR(128),
  sponsorUrl VARCHAR(512),
  createdAt BIGINT
);

CREATE TABLE plugins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(128) UNIQUE NOT NULL,
  displayName VARCHAR(256) NOT NULL,
  description TEXT,
  author VARCHAR(128),
  license VARCHAR(32),
  repository VARCHAR(512),
  iconUrl VARCHAR(512),
  tier INT DEFAULT 2,
  capabilities JSON,
  tags JSON,
  configSchema JSON,
  readme TEXT,
  downloads INT DEFAULT 0,
  ratingSum INT DEFAULT 0,
  ratingCount INT DEFAULT 0,
  featured INT DEFAULT 0,
  publishedAt BIGINT,
  updatedAt BIGINT,
  publisherId INT,
  FOREIGN KEY (publisherId) REFERENCES publishers(id),
  FULLTEXT INDEX ftSearch (name, displayName, description)
);

CREATE TABLE pluginVersions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pluginId INT NOT NULL,
  version VARCHAR(32) NOT NULL,
  minHoneVersion VARCHAR(32),
  perryVersion VARCHAR(32),
  platforms JSON,
  downloadUrl VARCHAR(512),
  sizeBytes INT,
  sha256 VARCHAR(64),
  changelog TEXT,
  publishedAt BIGINT,
  FOREIGN KEY (pluginId) REFERENCES plugins(id),
  UNIQUE(pluginId, version)
);

CREATE TABLE ratings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pluginId INT NOT NULL,
  publisherId INT NOT NULL,
  score INT NOT NULL,
  review TEXT,
  createdAt BIGINT,
  FOREIGN KEY (pluginId) REFERENCES plugins(id),
  FOREIGN KEY (publisherId) REFERENCES publishers(id),
  UNIQUE(pluginId, publisherId)
);

CREATE TABLE reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pluginId INT NOT NULL,
  reason VARCHAR(32),
  description TEXT,
  reporterEmail VARCHAR(256),
  createdAt BIGINT,
  resolved INT DEFAULT 0,
  FOREIGN KEY (pluginId) REFERENCES plugins(id)
);

CREATE TABLE pluginDownloads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pluginId INT NOT NULL,
  version VARCHAR(32),
  platform VARCHAR(32),
  downloadedAt BIGINT,
  FOREIGN KEY (pluginId) REFERENCES plugins(id)
);

CREATE TABLE buildJobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pluginId INT NOT NULL,
  version VARCHAR(32) NOT NULL,
  platform VARCHAR(32) NOT NULL,
  hubJobId VARCHAR(64),
  status VARCHAR(20) DEFAULT 'queued',
  errorMessage TEXT,
  createdAt BIGINT,
  completedAt BIGINT,
  FOREIGN KEY (pluginId) REFERENCES plugins(id),
  INDEX idxPluginVersion (pluginId, version),
  INDEX idxStatus (status)
);
