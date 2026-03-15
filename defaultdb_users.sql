-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: mysql-2325669c-z2e4r1o-8be1.f.aivencloud.com    Database: defaultdb
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ 'cb53a9da-2008-11f1-aa33-aed45f80809f:1-30';

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users`
(
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar
(50) NOT NULL,
  `fullname` varchar
(255) NOT NULL,
  `email` varchar
(191) NOT NULL,
  `gender` varchar
(50) NOT NULL,
  `college` varchar
(255) NOT NULL,
  `campus` varchar
(50) NOT NULL,
  `role` varchar
(100) NOT NULL,
  `registered_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL,
  `spin` enum
('yes','no') DEFAULT 'no',
  `prizeGet` varchar
(255) DEFAULT NULL,
  PRIMARY KEY
(`id`),
  UNIQUE KEY `user_id`
(`user_id`),
  UNIQUE KEY `email`
(`email`),
  KEY `idx_role`
(`role`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `
users`
VALUES
  (1, 'user_69b5b1d0c00dd7.65848884', 'Clifford', 'cliffordpunzalan34@gmail.com', 'Male', 'CCS', 'MCC', 'Student', '2026-03-15 03:12:43', '2026-03-14 11:09:33', 'yes', '1/4 paper'),
  (2, 'user_69b5b1d0e9aac4.38415386', 'Dan', 'icalladan@gmail.com', 'Others', 'Ccs', 'MCC', 'Student', '2026-03-15 03:12:43', '2026-03-14 11:09:42', 'yes', 'Correction Tape'),
  (3, 'user_69b5b1d44e1115.66964481', 'Vince Gillo Rolle', 'vincegillorolle@gmail.com', 'Male', 'CCS', 'MCC', 'Student', '2026-03-15 03:12:43', '2026-03-14 11:09:51', 'yes', 'Ballpen');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-15 11:42:35
