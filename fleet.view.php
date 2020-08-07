<?php
/**
 *------
 * BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
 * Fleet implementation : © Dan Marcus <bga.marcuda@gmail.com>
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 *
 * fleet.view.php
 *
 * This is your "view" file.
 *
 * The method "build_page" below is called each time the game interface is displayed to a player, ie:
 * _ when the game starts
 * _ when a player refreshes the game page (F5)
 *
 * "build_page" method allows you to dynamically modify the HTML generated for the game interface. In
 * particular, you can set here the values of variables elements defined in fleet_fleet.tpl (elements
 * like {MY_VARIABLE_ELEMENT}), and insert HTML block elements (also defined in your HTML template file)
 *
 * Note: if the HTML of your game interface is always the same, you don't have to place anything here.
 *
 */
  
require_once( APP_BASE_PATH."view/common/game.view.php" );

class view_fleet_fleet extends game_view
{
    function getGameName() {
        return "fleet";
    }    
    function build_page( $viewArgs )
    {		
        // Get players & players number
        $players = $this->game->loadPlayersBasicInfos();
        $players_nbr = count( $players );

        /*********** Place your code below:  ************/

        $players_ordered = $this->game->getPlayersInOrder();

        // Auction block
        $this->page->begin_block("fleet_fleet", "bid");
        foreach($players_ordered as $player_id) {
            $this->page->insert_block("bid", array(
                "PLAYER_ID" => $player_id,
                "PLAYER_NAME" => $players[$player_id]['player_name'],
                "PLAYER_COLOR" => $players[$player_id]['player_color'],
            ));
        }

        // Player tableau
        $this->page->begin_block("fleet_fleet", "player");
        foreach ($players_ordered as $player_id) {
            $this->page->insert_block("player", array(
                "PLAYER_ID" => $player_id,
                "PLAYER_COLOR" => $players[$player_id]['player_color'],
                "PLAYER_NAME" => $players[$player_id]['player_name']
            ));
        }

        // Translations
        $this->tpl['MY_HAND'] = self::_("My hand");
        $this->tpl['AUCTION_LABEL'] = self::_("License Auction");
        $this->tpl['DRAW_LABEL'] = self::_("Drawn cards");
        $this->tpl['LICENSES'] = self::_("licenses");
        $this->tpl['BOATS'] = self::_("boats");
        $this->tpl['FINAL_SCORE'] = self::_("Victory Points");

        /*********** Do not change anything below this line  ************/
    }
}


