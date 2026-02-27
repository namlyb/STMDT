CREATE DATABASE  IF NOT EXISTS `stmdt` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `stmdt`;
-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: stmdt
-- ------------------------------------------------------
-- Server version	8.0.44

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

--
-- Table structure for table `accounts`
--

DROP TABLE IF EXISTS `accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `accounts` (
  `AccountId` int NOT NULL AUTO_INCREMENT,
  `Username` text NOT NULL,
  `Password` text NOT NULL,
  `Avt` text,
  `Name` text NOT NULL,
  `Phone` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `IdentityNumber` varchar(12) NOT NULL,
  `DateOfBirth` date DEFAULT NULL,
  `Gender` enum('m','f') DEFAULT NULL,
  `IsActive` tinyint(1) NOT NULL DEFAULT '1',
  `RoleId` int DEFAULT NULL,
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`AccountId`),
  KEY `RoleId` (`RoleId`),
  CONSTRAINT `accounts_ibfk_1` FOREIGN KEY (`RoleId`) REFERENCES `roles` (`RoleId`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `address`
--

DROP TABLE IF EXISTS `address`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `address` (
  `AddressId` int NOT NULL AUTO_INCREMENT,
  `AccountId` int NOT NULL,
  `Name` varchar(50) NOT NULL,
  `Phone` varchar(10) NOT NULL,
  `Content` text NOT NULL,
  `Status` tinyint(1) NOT NULL DEFAULT '1',
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`AddressId`),
  KEY `AccountId` (`AccountId`),
  CONSTRAINT `address_ibfk_1` FOREIGN KEY (`AccountId`) REFERENCES `accounts` (`AccountId`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ads`
--

DROP TABLE IF EXISTS `ads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ads` (
  `AdsId` int NOT NULL AUTO_INCREMENT,
  `AdsImage` text NOT NULL,
  `StyleID` int DEFAULT NULL,
  `Status` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`AdsId`),
  KEY `StyleID` (`StyleID`),
  CONSTRAINT `ads_ibfk_1` FOREIGN KEY (`StyleID`) REFERENCES `styleads` (`StyleID`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `callsessions`
--

DROP TABLE IF EXISTS `callsessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `callsessions` (
  `CallId` int NOT NULL AUTO_INCREMENT,
  `ChatId` int NOT NULL,
  `CallerId` int NOT NULL,
  `ReceiverId` int NOT NULL,
  `SessionId` varchar(255) NOT NULL,
  `Type` enum('audio','video') NOT NULL,
  `Status` enum('initiated','ringing','active','ended','missed','rejected') DEFAULT 'initiated',
  `StartTime` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `EndTime` datetime(3) DEFAULT NULL,
  `Duration` int DEFAULT '0',
  `RecordURL` text,
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`CallId`),
  UNIQUE KEY `SessionId` (`SessionId`),
  KEY `ChatId` (`ChatId`),
  KEY `CallerId` (`CallerId`),
  KEY `ReceiverId` (`ReceiverId`),
  KEY `idx_session_id` (`SessionId`),
  KEY `idx_call_status` (`Status`),
  CONSTRAINT `callsessions_ibfk_1` FOREIGN KEY (`ChatId`) REFERENCES `chats` (`ChatId`) ON DELETE CASCADE,
  CONSTRAINT `callsessions_ibfk_2` FOREIGN KEY (`CallerId`) REFERENCES `accounts` (`AccountId`),
  CONSTRAINT `callsessions_ibfk_3` FOREIGN KEY (`ReceiverId`) REFERENCES `accounts` (`AccountId`)
) ENGINE=InnoDB AUTO_INCREMENT=130 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `after_call_insert` AFTER INSERT ON `callsessions` FOR EACH ROW BEGIN
    IF NEW.Status = 'initiated' THEN
        INSERT INTO Messages (ChatId, SenderId, Content, MessageType, CallId, SendAt)
        VALUES (NEW.ChatId, NEW.CallerId,
                CONCAT('Cuộc gọi ', NEW.Type, ' được bắt đầu'),
                'call_invite', NEW.CallId, NOW(3));
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `after_call_update` AFTER UPDATE ON `callsessions` FOR EACH ROW BEGIN
    IF OLD.Status != 'ended' AND NEW.Status = 'ended' THEN
        INSERT INTO Messages (ChatId, SenderId, Content, MessageType, CallId, SendAt)
        VALUES (NEW.ChatId, NEW.CallerId,
                CONCAT('Cuộc gọi kết thúc. Thời lượng: ',
                       FLOOR(NEW.Duration/60), ' phút ', MOD(NEW.Duration, 60), ' giây'),
                'call_end', NEW.CallId, NOW(3));
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `callsignals`
--

DROP TABLE IF EXISTS `callsignals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `callsignals` (
  `SignalId` int NOT NULL AUTO_INCREMENT,
  `CallId` int NOT NULL,
  `SenderId` int NOT NULL,
  `SignalType` enum('offer','answer','candidate','end','ice-candidate') NOT NULL,
  `SignalData` json NOT NULL,
  `CreatedAt` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`SignalId`),
  KEY `SenderId` (`SenderId`),
  KEY `idx_call_signals` (`CallId`,`SignalType`),
  CONSTRAINT `callsignals_ibfk_1` FOREIGN KEY (`CallId`) REFERENCES `callsessions` (`CallId`) ON DELETE CASCADE,
  CONSTRAINT `callsignals_ibfk_2` FOREIGN KEY (`SenderId`) REFERENCES `accounts` (`AccountId`)
) ENGINE=InnoDB AUTO_INCREMENT=2010 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `carts`
--

DROP TABLE IF EXISTS `carts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `carts` (
  `CartId` int NOT NULL AUTO_INCREMENT,
  `ProductId` int NOT NULL,
  `AccountId` int NOT NULL,
  `Quantity` int NOT NULL,
  `Status` tinyint(1) NOT NULL DEFAULT '1',
  `UnitPrice` int NOT NULL,
  `IsSelected` tinyint(1) DEFAULT '1',
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`CartId`),
  UNIQUE KEY `ProductId` (`ProductId`,`AccountId`),
  KEY `AccountId` (`AccountId`),
  CONSTRAINT `carts_ibfk_1` FOREIGN KEY (`ProductId`) REFERENCES `products` (`ProductId`),
  CONSTRAINT `carts_ibfk_2` FOREIGN KEY (`AccountId`) REFERENCES `accounts` (`AccountId`),
  CONSTRAINT `carts_chk_1` CHECK ((`Quantity` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=47 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `CategoryId` int NOT NULL AUTO_INCREMENT,
  `CategoryName` text NOT NULL,
  `CategoryImage` text NOT NULL,
  PRIMARY KEY (`CategoryId`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `chats`
--

DROP TABLE IF EXISTS `chats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chats` (
  `ChatId` int NOT NULL AUTO_INCREMENT,
  `BuyerId` int NOT NULL,
  `SellerId` int NOT NULL,
  `CreateAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ChatId`),
  UNIQUE KEY `uq_buyer_seller` (`BuyerId`,`SellerId`),
  KEY `SellerId` (`SellerId`),
  CONSTRAINT `chats_ibfk_1` FOREIGN KEY (`BuyerId`) REFERENCES `accounts` (`AccountId`),
  CONSTRAINT `chats_ibfk_2` FOREIGN KEY (`SellerId`) REFERENCES `accounts` (`AccountId`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `feedbackimages`
--

DROP TABLE IF EXISTS `feedbackimages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feedbackimages` (
  `ImageId` int NOT NULL AUTO_INCREMENT,
  `FeedbackId` int NOT NULL,
  `ImageName` varchar(255) NOT NULL,
  `CreatedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ImageId`),
  KEY `fk_feedback_images` (`FeedbackId`),
  CONSTRAINT `fk_feedback_images` FOREIGN KEY (`FeedbackId`) REFERENCES `feedbacks` (`FeedbackId`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `feedbacks`
--

DROP TABLE IF EXISTS `feedbacks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feedbacks` (
  `FeedbackId` int NOT NULL AUTO_INCREMENT,
  `AccountId` int NOT NULL,
  `OrderDetailId` int NOT NULL,
  `Score` int NOT NULL,
  `Content` text NOT NULL,
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`FeedbackId`),
  KEY `AccountId` (`AccountId`),
  KEY `OrderDetailId` (`OrderDetailId`),
  CONSTRAINT `feedbacks_ibfk_1` FOREIGN KEY (`AccountId`) REFERENCES `accounts` (`AccountId`),
  CONSTRAINT `feedbacks_ibfk_2` FOREIGN KEY (`OrderDetailId`) REFERENCES `orderdetails` (`OrderDetailId`),
  CONSTRAINT `feedbacks_chk_1` CHECK ((`Score` between 1 and 5))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `filestorage`
--

DROP TABLE IF EXISTS `filestorage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `filestorage` (
  `FileId` int NOT NULL AUTO_INCREMENT,
  `OriginalName` varchar(255) NOT NULL,
  `StoredName` varchar(255) NOT NULL,
  `FilePath` text NOT NULL,
  `MimeType` varchar(100) NOT NULL,
  `FileSize` int NOT NULL,
  `UploadedBy` int NOT NULL,
  `ChatId` int DEFAULT NULL,
  `IsTemporary` tinyint(1) DEFAULT '1',
  `ExpiresAt` datetime DEFAULT NULL,
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`FileId`),
  UNIQUE KEY `StoredName` (`StoredName`),
  KEY `UploadedBy` (`UploadedBy`),
  KEY `ChatId` (`ChatId`),
  KEY `idx_temp_files` (`IsTemporary`,`ExpiresAt`),
  CONSTRAINT `filestorage_ibfk_1` FOREIGN KEY (`UploadedBy`) REFERENCES `accounts` (`AccountId`),
  CONSTRAINT `filestorage_ibfk_2` FOREIGN KEY (`ChatId`) REFERENCES `chats` (`ChatId`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `messages`
--

DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `messages` (
  `MessageId` int NOT NULL AUTO_INCREMENT,
  `ChatId` int NOT NULL,
  `SenderId` int NOT NULL,
  `Content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `SendAt` datetime(3) NOT NULL,
  `IsRead` tinyint(1) DEFAULT '0',
  `MessageType` enum('text','image','file','audio','video','call_invite','call_end','call_missed') DEFAULT 'text',
  `FileURL` text,
  `FileName` varchar(255) DEFAULT NULL,
  `FileSize` int DEFAULT '0',
  `FileMimeType` varchar(100) DEFAULT NULL,
  `ThumbnailURL` text,
  `Duration` int DEFAULT '0',
  `CallId` int DEFAULT NULL,
  PRIMARY KEY (`MessageId`),
  KEY `ChatId` (`ChatId`),
  KEY `SenderId` (`SenderId`),
  KEY `idx_message_type` (`MessageType`),
  KEY `CallId` (`CallId`),
  CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`ChatId`) REFERENCES `chats` (`ChatId`),
  CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`SenderId`) REFERENCES `accounts` (`AccountId`),
  CONSTRAINT `messages_ibfk_3` FOREIGN KEY (`CallId`) REFERENCES `callsessions` (`CallId`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=506 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `orderdetails`
--

DROP TABLE IF EXISTS `orderdetails`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orderdetails` (
  `OrderDetailId` int NOT NULL AUTO_INCREMENT,
  `OrderId` int NOT NULL,
  `ProductId` int NOT NULL,
  `UsageId` int DEFAULT NULL,
  `FeeId` int NOT NULL,
  `UnitPrice` int NOT NULL,
  `Quantity` int NOT NULL,
  `ShipTypeId` int NOT NULL,
  `ShipFee` int NOT NULL,
  `Status` tinyint(1) NOT NULL DEFAULT '1',
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`OrderDetailId`),
  KEY `OrderId` (`OrderId`),
  KEY `ProductId` (`ProductId`),
  KEY `UsageId` (`UsageId`),
  KEY `fk_orderdetails_shiptype` (`ShipTypeId`),
  KEY `fk_orderdetails_fee` (`FeeId`),
  CONSTRAINT `fk_orderdetails_fee` FOREIGN KEY (`FeeId`) REFERENCES `platformfees` (`FeeId`),
  CONSTRAINT `fk_orderdetails_shiptype` FOREIGN KEY (`ShipTypeId`) REFERENCES `shiptype` (`ShipTypeId`),
  CONSTRAINT `orderdetails_ibfk_1` FOREIGN KEY (`OrderId`) REFERENCES `orders` (`OrderId`),
  CONSTRAINT `orderdetails_ibfk_2` FOREIGN KEY (`ProductId`) REFERENCES `products` (`ProductId`),
  CONSTRAINT `orderdetails_ibfk_4` FOREIGN KEY (`UsageId`) REFERENCES `voucherusage` (`UsageId`)
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `OrderId` int NOT NULL AUTO_INCREMENT,
  `AccountId` int NOT NULL,
  `AddressId` int NOT NULL,
  `MethodId` int NOT NULL,
  `UsageId` int DEFAULT NULL,
  `FinalPrice` int NOT NULL,
  `OrderDate` date NOT NULL,
  `Status` tinyint(1) NOT NULL DEFAULT '1',
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`OrderId`),
  KEY `AccountId` (`AccountId`),
  KEY `fk_orders_address` (`AddressId`),
  KEY `fk_orders_method` (`MethodId`),
  KEY `fk_orders_usage` (`UsageId`),
  CONSTRAINT `fk_orders_address` FOREIGN KEY (`AddressId`) REFERENCES `address` (`AddressId`),
  CONSTRAINT `fk_orders_method` FOREIGN KEY (`MethodId`) REFERENCES `paymentmethods` (`MethodId`),
  CONSTRAINT `fk_orders_usage` FOREIGN KEY (`UsageId`) REFERENCES `voucherusage` (`UsageId`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`AccountId`) REFERENCES `accounts` (`AccountId`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `orderstatushistory`
--

DROP TABLE IF EXISTS `orderstatushistory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orderstatushistory` (
  `HistoryId` int NOT NULL AUTO_INCREMENT,
  `OrderDetailId` int NOT NULL,
  `TrackingCode` varchar(100) NOT NULL,
  `Status` varchar(100) NOT NULL,
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`HistoryId`),
  KEY `OrderDetailId` (`OrderDetailId`),
  CONSTRAINT `orderstatushistory_ibfk_1` FOREIGN KEY (`OrderDetailId`) REFERENCES `orderdetails` (`OrderDetailId`)
) ENGINE=InnoDB AUTO_INCREMENT=85 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `paymentmethods`
--

DROP TABLE IF EXISTS `paymentmethods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `paymentmethods` (
  `MethodId` int NOT NULL AUTO_INCREMENT,
  `MethodName` varchar(100) NOT NULL,
  `Description` text,
  `Status` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`MethodId`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `PaymentId` int NOT NULL AUTO_INCREMENT,
  `OrderId` int NOT NULL,
  `Amount` int NOT NULL,
  `TransactionCode` varchar(255) DEFAULT NULL,
  `TransactionDate` datetime DEFAULT NULL,
  `Status` varchar(50) NOT NULL,
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`PaymentId`),
  KEY `OrderId` (`OrderId`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`OrderId`) REFERENCES `orders` (`OrderId`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `platformfees`
--

DROP TABLE IF EXISTS `platformfees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `platformfees` (
  `FeeId` int NOT NULL AUTO_INCREMENT,
  `PercentValue` int NOT NULL,
  `MinOrderValue` int NOT NULL DEFAULT '0',
  `MaxOrderValue` int DEFAULT NULL,
  `Description` text,
  `Status` tinyint(1) NOT NULL DEFAULT '1',
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`FeeId`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `productcategory`
--

DROP TABLE IF EXISTS `productcategory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `productcategory` (
  `ProductId` int NOT NULL,
  `CategoryId` int NOT NULL,
  PRIMARY KEY (`ProductId`,`CategoryId`),
  KEY `CategoryId` (`CategoryId`),
  CONSTRAINT `productcategory_ibfk_1` FOREIGN KEY (`ProductId`) REFERENCES `products` (`ProductId`),
  CONSTRAINT `productcategory_ibfk_2` FOREIGN KEY (`CategoryId`) REFERENCES `categories` (`CategoryId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `ProductId` int NOT NULL AUTO_INCREMENT,
  `StallId` int NOT NULL,
  `ProductName` text NOT NULL,
  `Price` int NOT NULL,
  `Description` text NOT NULL,
  `Image` text NOT NULL,
  `Status` tinyint(1) NOT NULL DEFAULT '1',
  `IsActive` tinyint(1) NOT NULL DEFAULT '1',
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ProductId`),
  KEY `StallId` (`StallId`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`StallId`) REFERENCES `stalls` (`StallId`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `returns`
--

DROP TABLE IF EXISTS `returns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `returns` (
  `ReturnId` int NOT NULL AUTO_INCREMENT,
  `OrderDetailId` int NOT NULL,
  `Reason` text NOT NULL,
  `EvidenceImage` text,
  `RequestDate` datetime DEFAULT CURRENT_TIMESTAMP,
  `Status` varchar(50) NOT NULL,
  `RefundAmount` int DEFAULT NULL,
  PRIMARY KEY (`ReturnId`),
  KEY `OrderDetailId` (`OrderDetailId`),
  CONSTRAINT `returns_ibfk_1` FOREIGN KEY (`OrderDetailId`) REFERENCES `orderdetails` (`OrderDetailId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `RoleId` int NOT NULL AUTO_INCREMENT,
  `RoleName` varchar(100) NOT NULL,
  PRIMARY KEY (`RoleId`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `shiptype`
--

DROP TABLE IF EXISTS `shiptype`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shiptype` (
  `ShipTypeId` int NOT NULL AUTO_INCREMENT,
  `Content` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `ShipFee` int NOT NULL,
  PRIMARY KEY (`ShipTypeId`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `stalls`
--

DROP TABLE IF EXISTS `stalls`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stalls` (
  `StallId` int NOT NULL AUTO_INCREMENT,
  `StallName` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `AccountId` int NOT NULL,
  PRIMARY KEY (`StallId`),
  UNIQUE KEY `AccountId` (`AccountId`),
  CONSTRAINT `stalls_ibfk_1` FOREIGN KEY (`AccountId`) REFERENCES `accounts` (`AccountId`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `styleads`
--

DROP TABLE IF EXISTS `styleads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `styleads` (
  `StyleID` int NOT NULL AUTO_INCREMENT,
  `StyleName` varchar(100) NOT NULL,
  PRIMARY KEY (`StyleID`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `vouchers`
--

DROP TABLE IF EXISTS `vouchers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vouchers` (
  `VoucherId` int NOT NULL AUTO_INCREMENT,
  `VoucherName` varchar(100) NOT NULL,
  `DiscountType` enum('fixed','percent','ship') NOT NULL,
  `DiscountValue` int NOT NULL,
  `MinOrderValue` int NOT NULL DEFAULT '0',
  `MaxDiscount` int DEFAULT NULL,
  `Quantity` int NOT NULL,
  `EndTime` date NOT NULL,
  `CreatedBy` int NOT NULL,
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`VoucherId`),
  KEY `CreatedBy` (`CreatedBy`),
  CONSTRAINT `vouchers_ibfk_1` FOREIGN KEY (`CreatedBy`) REFERENCES `accounts` (`AccountId`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `voucherusage`
--

DROP TABLE IF EXISTS `voucherusage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `voucherusage` (
  `UsageId` int NOT NULL AUTO_INCREMENT,
  `VoucherId` int NOT NULL,
  `AccountId` int NOT NULL,
  `Quantity` int NOT NULL,
  `IsUsed` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`UsageId`),
  KEY `VoucherId` (`VoucherId`),
  KEY `AccountId` (`AccountId`),
  CONSTRAINT `voucherusage_ibfk_1` FOREIGN KEY (`VoucherId`) REFERENCES `vouchers` (`VoucherId`),
  CONSTRAINT `voucherusage_ibfk_2` FOREIGN KEY (`AccountId`) REFERENCES `accounts` (`AccountId`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

DROP TRIGGER IF EXISTS after_call_update;
DELIMITER ;;
CREATE TRIGGER after_call_update AFTER UPDATE ON callsessions FOR EACH ROW
BEGIN
    -- Trường hợp cuộc gọi kết thúc bình thường (có thời lượng)
    IF OLD.Status != 'ended' AND NEW.Status = 'ended' THEN
        INSERT INTO Messages (ChatId, SenderId, Content, MessageType, CallId, SendAt)
        VALUES (NEW.ChatId, NEW.CallerId,
                CONCAT('Cuộc gọi kết thúc. Thời lượng: ',
                       FLOOR(NEW.Duration/60), ' phút ', MOD(NEW.Duration, 60), ' giây'),
                'call_end', NEW.CallId, NOW(3));
    END IF;

    -- Trường hợp cuộc gọi nhỡ hoặc bị từ chối
    IF OLD.Status IN ('initiated', 'ringing') AND NEW.Status IN ('missed', 'rejected') THEN
        INSERT INTO Messages (ChatId, SenderId, Content, MessageType, CallId, SendAt)
        VALUES (NEW.ChatId, NEW.CallerId,
                CONCAT(IF(NEW.Type='video', 'Cuộc gọi video nhỡ', 'Cuộc gọi thoại nhỡ')),
                'call_missed', NEW.CallId, NOW(3));
    END IF;
END;;
DELIMITER ;

--
-- Dumping routines for database 'stmdt'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-26 13:48:09
