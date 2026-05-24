CREATE TABLE `products` (
  `id` varchar(40) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `base_price` decimal(10,2) DEFAULT NULL,
  `stock` int(11) DEFAULT NULL,
  `image_url` text DEFAULT NULL,
  `video_url` text DEFAULT NULL,
  `long_description` text DEFAULT NULL,
  `tag` varchar(255) DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` varchar(50) DEFAULT NULL,
  `product_name` varchar(255) DEFAULT NULL,
  `customer_name` varchar(255) DEFAULT NULL,
  `total_amount` decimal(10,2) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `tracking_number` varchar(100) DEFAULT NULL,
  `product_price` decimal(10,2) DEFAULT 0.00,
  `markup_fee` decimal(10,2) DEFAULT 0.00,
  `split_sets` int(11) DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 AUTO_INCREMENT=1;

CREATE TABLE `order_assignments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) DEFAULT NULL,
  `product_name` varchar(255) DEFAULT NULL,
  `customer_name` varchar(255) DEFAULT NULL,
  `contact_info` varchar(255) DEFAULT NULL,
  `quantity_bought` int(11) DEFAULT NULL,
  `tracking_number` varchar(100) DEFAULT NULL,
  `markup_earned` decimal(10,2) DEFAULT NULL,
  `total_billed` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  CONSTRAINT `order_assignments_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 AUTO_INCREMENT=1;

CREATE TABLE `cart` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` varchar(50) DEFAULT NULL,
  `product_name` varchar(255) DEFAULT NULL,
  `simple_description` text DEFAULT NULL,
  `base_sets` int(11) DEFAULT 1,
  `split_sets` int(11) DEFAULT 1,
  `units_per_set` int(11) DEFAULT 1,
  `product_price` decimal(15,2) DEFAULT NULL,
  `markup_fee` decimal(15,2) DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `tag` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 AUTO_INCREMENT=1;

CREATE TABLE `customers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
