
-- ------
-- BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
-- fleet implementation : © <Your name here> <Your email address here>
-- 
-- This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
-- See http://en.boardgamearena.com/#!doc/Studio for more information.
-- -----

-- dbmodel.sql

-- This is the file where you are describing the database schema of your game
-- Basically, you just have to export from PhpMyAdmin your table structure and copy/paste
-- this export here.
-- Note that the database itself and the standard tables ("global", "stats", "gamelog" and "player") are
-- already created and must not be created here

-- Note: The database schema is created from this file when the game starts. If you modify this file,
--       you have to restart a game to see your changes in database.

-- Standard card table + fish counter and captain bool
CREATE TABLE IF NOT EXISTS `card` (
  `card_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `card_type` varchar(16) NOT NULL,
  `card_type_arg` int(11) NOT NULL,
  `card_location` varchar(16) NOT NULL,
  `card_location_arg` int(11) NOT NULL,
  `nbr_fish` tinyint(1) unsigned NOT NULL DEFAULT 0,
  `has_captain` tinyint(1) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`card_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;

-- Auction values
ALTER TABLE `player` ADD COLUMN `current_bid` tinyint(1) unsigned NOT NULL DEFAULT 0;
ALTER TABLE `player` ADD COLUMN `auction_pass` tinyint(1) unsigned NOT NULL DEFAULT 0;
ALTER TABLE `player` ADD COLUMN `auction_done` tinyint(1) unsigned NOT NULL DEFAULT 0;

-- Processed fish crates for selling
ALTER TABLE `player` ADD COLUMN `fish_crates` tinyint(1) unsigned NOT NULL DEFAULT 0;
