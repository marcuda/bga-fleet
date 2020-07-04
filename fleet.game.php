<?php
 /**
  *------
  * BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
  * fleet implementation : © <Your name here> <Your email address here>
  * 
  * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
  * See http://en.boardgamearena.com/#!doc/Studio for more information.
  * -----
  * 
  * fleet.game.php
  *
  * This is the main file for your game logic.
  *
  * In this PHP file, you are going to defines the rules of the game.
  *
  */


require_once( APP_GAMEMODULE_PATH.'module/table/table.game.php' );


class fleet extends Table
{
    function __construct( )
    {
        // Your global variables labels:
        //  Here, you can assign labels to global variables you are using for this game.
        //  You can use any number of global variables with IDs between 10 and 99.
        //  If your game has options (variants), you also have to associate here a label to
        //  the corresponding ID in gameoptions.inc.php.
        // Note: afterwards, you can get/set the global variables with getGameStateValue/setGameStateInitialValue/setGameStateValue
        parent::__construct();
        
        self::initGameStateLabels( array( 
            'fish_cubes' => 10,
            'auction_card' => 11,
            'current_phase' => 12,         // current phase number, always increasing
            'first_player' => 13,
            'final_round' => 14,
            'auction_winner' => 15,
            'current_player_launches' => 16,
            'current_player_hires' => 17,
        ) );

        $this->cards = self::getNew("module.common.deck");
        $this->cards->init("card");

        // Game phases for determining next player logic and states
        // N.B. Phases Two and Four are split into two phases each here
        $this->phases = array(
            PHASE_AUCTION,
            PHASE_LAUNCH,
            PHASE_HIRE,
            PHASE_FISHING,
            PHASE_PROCESSING,
            PHASE_TRADING,
            PHASE_DRAW
        );
        $this->nbr_phases = count($this->phases);
    }
        
    protected function getGameName( )
    {
        // Used for translations and stuff. Please do not modify.
        return "fleet";
    }   

    /*
        setupNewGame:
        
        This method is called only once, when a new game is launched.
        In this method, you must setup the game according to the game rules, so that
        the game is ready to be played.
    */
    protected function setupNewGame( $players, $options = array() )
    {    
        // Set the colors of the players with HTML color code
        // The default below is red/green/blue/orange/brown
        // The number of colors defined here must correspond to the maximum number of players allowed for the gams
        $gameinfos = self::getGameinfos();
        $default_colors = $gameinfos['player_colors'];
 
        // Create players
        // Note: if you added some extra field on "player" table in the database (dbmodel.sql), you can initialize it there.
        $sql = "INSERT INTO player (player_id, player_color, player_canal, player_name, player_avatar) VALUES ";
        $values = array();
        foreach( $players as $player_id => $player )
        {
            $color = array_shift( $default_colors );
            $values[] = "('".$player_id."','$color','".$player['player_canal']."','".addslashes( $player['player_name'] )."','".addslashes( $player['player_avatar'] )."')";
        }
        $sql .= implode( $values, ',' );
        self::DbQuery( $sql );
        self::reattributeColorsBasedOnPreferences( $players, $gameinfos['player_colors'] );
        self::reloadPlayersBasicInfos();
        
        /************ Start the game initialization *****/

        // Init global values with their initial values
        self::setGameStateInitialValue('auction_card', 0);
        self::setGameStateInitialValue('auction_winner', 0);
        self::setGameStateInitialValue("current_phase", 0);
        self::setGameStateInitialValue("final_round", 0);
        self::setGameStateInitialValue("current_player_launches", 0);
        self::setGameStateInitialValue("current_player_hires", 0);
        
        // Init game statistics
        // (note: statistics used in this file must be defined in your stats.inc.php file)
        //self::initStat( 'table', 'table_teststat1', 0 );    // Init a table statistics
        //self::initStat( 'player', 'player_teststat1', 0 );  // Init a player statistics (for all players)

        // Card decks
        $cards = array();
        foreach ($this->card_types as $idx => $card) {
            $cards[] = array(
                'type' => $card['type'],
                'type_arg' => $idx,
                'nbr' => $card['nbr']
            );
        }
        $this->cards->createCards($cards);

        // Separate licenses from boats
        $licenses = $this->cards->getCardsOfType(CARD_LICENSE);
        $this->cards->moveCards(array_column($licenses, 'id'), 'licenses');

        // Setup license deck
        // Separate all premium and 8-10 common licenses
        $nbr_players = count($players);
        foreach ($this->premium_license_types as $type_arg) {
            $cards = $this->cards->getCardsOfType(CARD_LICENSE, $type_arg);
            $this->cards->moveCards(array_column($cards, 'id'), 'setup_premium');
        }
        $nbr_common = $nbr_players == 2 ? 10 : 8;
        $this->cards->pickCardsForLocation($nbr_common, 'licenses', 'setup_common');
        $this->cards->shuffle('setup_premium');
        $this->cards->shuffle('setup_common');

        // Remove some licenses from game based on number of players
        if ($nbr_players == 2) {
            $this->cards->pickCardsForLocation(3, 'setup_premium', 'box');
            $this->cards->pickCardsForLocation(6, 'setup_common', 'box');
        } else if ($nbr_players == 3) {
            $this->cards->pickCardsForLocation(2, 'setup_premium', 'box');
            $this->cards->pickCardsForLocation(2, 'setup_common', 'box');
        }

        // Shuffle premium back into deck and put common on top
        $this->cards->moveAllCardsInLocation('setup_premium', 'licenses');
        $this->cards->shuffle('licenses');
        foreach ($this->cards->getCardsInLocation('setup_common') as $card) {
            $this->cards->insertCardOnExtremePosition($card['id'], 'licenses', true);
        }

        // Draw initial licenses for auction
        $this->cards->pickCardsForLocation($nbr_players, 'licenses', 'auction');

        // Give each player one of each boat
        foreach ($this->boat_types as $type_arg) {
            $cards = $this->cards->getCardsOfType(CARD_BOAT, $type_arg);
            foreach ($players as $player_id => $player) {
                $this->cards->moveCard(array_shift($cards)['id'], 'hand', $player_id);
            }
        }

        // Shuffle boat deck and auto shuffle discard pile as needed
        // TODO: notify on shuffle
        $this->cards->shuffle('deck');
        $this->cards->autoreshuffle = true;

        // 25 fish crates in the game for each player
        self::setGameStateInitialValue("fish_cubes", $nbr_players * 25);

        // Activate first player (which is in general a good idea :) )
        $player_id = $this->activeNextPlayer();
        self::setGameStateInitialValue('first_player', $player_id);

        /************ End of the game initialization *****/
    }

    /*
        getAllDatas: 
        
        Gather all informations about current game situation (visible by the current player).
        
        The method is called each time the game interface is displayed to a player, ie:
        _ when the game starts
        _ when a player refreshes the game page (F5)
    */
    protected function getAllDatas()
    {
        $result = array();
    
        $current_player_id = self::getCurrentPlayerId();    // !! We must only return informations visible by this player !!
    
        // Get information about players
        // Note: you can retrieve some extra field you added for "player" table in "dbmodel.sql" if you need it.
        $sql = "SELECT player_id id, player_score score, auction_bid bid, auction_pass pass, passed done FROM player ";
        $result['players'] = self::getCollectionFromDb( $sql );
        $result['first_player'] = self::getGameStateValue('first_player');

        // Get player cards on table
        $players = self::loadPlayersBasicInfos();
        $boats = array();
        $licenses = array();
        $fish = array();
        $hands = array();
        foreach ($players as $player_id => $player) {
            $boats[$player_id] = $this->getBoats($player_id);
            $licenses[$player_id] = $this->getLicenses($player_id);
            $fish[$player_id] = $this->getFishCrates($player_id);
            $hands[$player_id] = count($this->cards->getPlayerHand($player_id));
        }
        $result['boats'] = $boats;
        $result['licenses'] = $licenses;
        $result['processed_fish'] = $fish;
        $result['hand_cards'] = $hands;

        $result['hand'] = $this->cards->getPlayerHand($current_player_id);
        $result['coins'] = $this->getCoins($current_player_id);
        $result['draw'] = $this->cards->getCardsInLocation('draw', $current_player_id);

        // Each Shrimp License reduces the cost by one
        $result['discount'] = count($this->getLicenses($current_player_id, LICENSE_SHRIMP));
        $result['hand_discard'] = count($this->getLicenses($current_player_id, LICENSE_TUNA)) > 0;

        $result['cards'] = $this->cards->countCardsInLocations();

        $result['auction'] = $this->cards->getCardsInLocation('auction');
        $result['auction_card'] = self::getGameStateValue('auction_card');
        $result['auction_winner'] = self::getGameStateValue('auction_winner');
        $result['auction_bid'] = $this->getHighBid();

        $result['fish_cubes'] = self::getGameStateValue('fish_cubes');

        $result['card_infos'] = $this->card_types;

        $result['moves'] = $this->possibleMoves($current_player_id, $this->getCurrentPhase());

  
        // TODO: Gather all information about current game situation (visible by player $current_player_id).
  
        return $result;
    }

    /*
        getGameProgression:
        
        Compute and return the current game progression.
        The number returned must be an integer beween 0 (=the game just started) and
        100 (= the game is finished or almost finished).
    
        This method is called each time we are in a game state with the "updateGameProgression" property set to true 
        (see states.inc.php)
    */
    function getGameProgression()
    {
        // TODO: compute and return the game progression

        return 0;
    }


//////////////////////////////////////////////////////////////////////////////
//////////// Utility functions
////////////    

    /*
        In this space, you can put any utility methods useful for your game logic
    */
    function getPlayersInOrder()
    {
        $result = array();

        $players = self::loadPlayersBasicInfos();
        $next_player = self::getNextPlayerTable();
        $player_id = self::getCurrentPlayerId();

        // Check for spectator
        if (!key_exists($player_id, $players)) {
            $player_id = $next_player[0];
        }

        // Build array starting with current player
        for ($i=0; $i<count($players); $i++) {
            $result[] = $player_id;
            $player_id = $next_player[$player_id];
        }

        return $result;
    }

    function nextPhase()
    {
        self::DbQuery("UPDATE player SET passed = 0");
        $phase = self::incGameStateValue('current_phase', 1) % $this->nbr_phases;
        return $this->phases[$phase];
    }

    function getCurrentPhase()
    {
        $phase = self::getGameStateValue('current_phase') % $this->nbr_phases;
        return $this->phases[$phase];
    }

    /*
     * Return additional card information for the given card.
     * This information is stored outside of the in order to make
     * use of the standard Deck implementation and functions.
     */
    function getCardInfo($card)
    {
        return $this->card_types[$card['type_arg']];
    }

    /*
     * Return additional card information for the given card ID.
     * See getCardInfo
     */
    function getCardInfoById($card_id)
    {
        $card = $this->cards->getCard($card_id);
        return $this->getCardInfo($card);
    }

    /*
     * Return the written name of the given card.
     * Convenience function mainly used for notifications.
     */
    function getCardName($card)
    {
        return $this->getCardInfo($card)['name'];
    }

    /*
     * Return true if player is able to bid in the current auction round,
     * false otherwise (passed or won previous)
     */
    function canBid($player_id)
    {
        $sql = "SELECT (auction_pass + passed) AS passed FROM player WHERE player_id = $player_id";
        return self::getUniqueValueFromDB($sql) == 0;
    }

    function getBoats($player_id)
    {
        $sql = "SELECT";
        // Standard deck query
        foreach (array('id', 'type', 'type_arg', 'location', 'location_arg') as $col) {
            $sql .= " card_$col AS $col,";
        }
        // Extra columns
        $sql .= ' nbr_fish AS fish, has_captain FROM card';
        $sql .= " WHERE card_location = 'table' AND card_location_arg = $player_id AND card_type = '" . CARD_BOAT . "'";
        return self::getCollectionFromDB($sql);
    }

    function getLicenses($player_id, $type_arg=null)
    {
        return $this->cards->getCardsOfTypeInLocation(CARD_LICENSE, $type_arg, 'table', $player_id);
    }

    function getFishCrates($player_id)
    {
        return self::getUniqueValueFromDB("SELECT fish_crates FROM player WHERE player_id = $player_id");
    }

    function incFishCrates($player_id, $inc)
    {
        if ($inc == 0) {
            return;
        }
        self::DbQuery("UPDATE player SET fish_crates = fish_crates + '$inc' WHERE player_id = $player_id");
    }

    function getHighBid()
    {
        return self::getUniqueValueFromDB("SELECT MAX(auction_bid) AS high_bid FROM player");
    }

    function possibleMoves($player_id, $phase)
    {
        $moves = array();
        if ($phase == PHASE_AUCTION) {
            // No actions for auction in progress
            if (self::getGameStateValue('auction_winner')) {
                // Auction won
                // All cards in hand can be used
                $moves = $this->cards->getPlayerHand($player_id);
            } else if (!self::getGameStateValue('auction_card')) {
                // Start new auction
                $coins = $this->getCoins($player_id);
                $cards = $this->cards->getCardsInLocation('auction');
                foreach ($cards as $card_id => $card) {
                    $card_info = $this->getCardInfo($card);
                    if ($coins >= $card_info['cost']) {
                        $moves[$card_id] = true;
                    }
                }
            }
        } else if ($phase == PHASE_LAUNCH) {
            $coins = $this->getCoins($player_id);
            $cards = $this->cards->getPlayerHand($player_id);
            $licenses = array_column($this->getLicenses($player_id), 'type_arg');
            foreach ($cards as $card_id => $card) {
                $move = array('can_play' => false);
                $card_info = $this->getCardInfo($card);
                if (!$this->isLicenseInList($card['type_arg'], $card_info['license'], $licenses)) {
                    $move['error'] = clienttranslate('You do not have the required license');
                } else if (($coins - $card_info['coins']) < $card_info['cost']) {
                    $move['error'] = clienttranslate('You cannot afford this boat');
                } else {
                    $move['can_play'] = true;
                }
                $moves[$card_id] = $move;
            }
        } else if ($phase == PHASE_HIRE) {
            $boats = $this->getBoats($player_id);
            foreach ($boats as $card_id => $boat) {
                if (!$boat['has_captain']) {
                    $moves[$card_id] = true;
                }
            }
        } else if ($phase == PHASE_PROCESSING) {
            $boats = $this->getBoats($player_id);
            foreach ($boats as $card_id => $boat) {
                if ($boat['fish'] > 0) {
                    $moves[$card_id] = true;
                }
            }
        } else if ($phase == PHASE_TRADING) {
            $moves[] = true; // Client will track this directly
        } else if ($phase == PHASE_DRAW) {
            $moves[] = true; // Client will track this directly
        }

        return $moves;
    }

    // Separate function because logic was getting too complicated...
    function isLicenseInList($card_type, $license_type, $licenses)
    {
        if ($card_type == BOAT_CRAB) {
            // Crab has three unique licenses that all launch the same boat
            foreach ($license_type as $crab_type) {
                if (in_array($crab_type, $licenses)) {
                    return true;
                }
            }
            return false;
        } else {
            return in_array($license_type, $licenses);
        }
    }

    function incScore($player_id, $inc)
    {
        if ($inc == 0) {
            return;
        }
        self::DbQuery("UPDATE player SET player_score = player_score + '$inc' WHERE player_id = $player_id");
    }

//////////////////////////////////////////////////////////////////////////////
//////////// Player actions
//////////// 

    function pass()
    {
        self::checkAction('pass');

        $player_id = self::getActivePlayerId();
        $auction = false;
        if ($this->getCurrentPhase() == PHASE_AUCTION) {
            // Keep track of which players pass during auction
            $sql = 'UPDATE player SET auction_bid = 0, auction_pass = 1';

            if (self::getGameStateValue('auction_card') == 0) {
                // No active auction, player chooses not to buy
                $sql .= ', passed = 1';
                // Tell client to remove player
                $auction = true;
            }

            $sql .= " WHERE player_id = $player_id";
            self::DbQuery($sql);
        } else {
            self::DbQuery("UPDATE player SET passed = 1 WHERE player_id = $player_id");
        }

        self::notifyAllPlayers('pass', clienttranslate('${player_name} passes'), array(
            'player_name' => self::getActivePlayerName(),
            'player_id' => self::getActivePlayerId(),
            'auction' => $auction,
        ));

        $this->gamestate->nextState();
    }

    function bid($current_bid, $card_id=-1)
    {
        self::checkAction('bid');

        $player_id = self::getActivePlayerId();

        // Verify player is still active in auction
        if (!$this->canBid($player_id)) {
            throw new feException("Player is not active in this auction");
        }

        // Initial card selection for auction round
        if ($card_id > 0) {
            // Verify some card not already selected
            if (self::getGameStateValue('auction_card') > 0) {
                throw new feException("Impossible bid state");
            }

            // Verify card exists in auction
            $card = $this->cards->getCard($card_id);
            if ($card == null || $card['location'] != 'auction') {
                throw new feException("Impossible bid action");
            }

            // Verify bid meets minimum
            $card_info = $this->getCardInfo($card);
            if ($current_bid < $card_info['cost']) {
                $cost = $card_info['cost'];
                throw new BgaUserException(self::_("You must bid at least $cost"));
            }

            // Store selected card for current auction round
            self::setGameStateValue('auction_card', $card_id);
        } else {
            // Verify license already selected
            if (self::getGameStateValue('auction_card') == 0) {
                throw new feException("Impossible bid without license");
            }
        }

        // Verify bid is higher than previous
        $high_bid = $this->getHighBid();
        if ($current_bid <= $high_bid) {
            $min_bid = $high_bid + 1;
            throw new BgaUserException(self::_("You must bid at least $min_bid"));
        }

        // Verify player can pay bid
        $coins = $this->getCoins($player_id);
        if ($coins < $current_bid) {
            throw new BgaUserException(self::_("You cannot afford that bid"));
        }

        // Set player bid
        $sql = "UPDATE player SET auction_bid = $current_bid WHERE player_id = $player_id";
        self::DbQuery($sql);

        if ($card_id > 0) {
            $msg = clienttranslate('${player_name} selects ${card_name} for auction');
            self::notifyAllPlayers('auctionSelect', $msg, array(
                'player_name' => self::getActivePlayerName(),
                'card_name' => $this->getCardName($card),
                'card_id' => $card_id,
            ));
        }
        $msg = clienttranslate('${player_name} bids ${bid}');
        self::notifyAllPlayers('auctionBid', $msg, array(
            'player_name' => self::getActivePlayerName(),
            'bid' => $current_bid,
            'player_id' => $player_id,
        ));

        $this->gamestate->nextState();
    }

    function getCoins($player_id)
    {
        $coins = 0;

        // Add up coins from all cards in hand
        $cards = $this->cards->getPlayerHand($player_id);
        foreach ($cards as $card) {
            $card_info = $this->getCardInfo($card);
            $coins += $card_info['coins'];
        }

        // Each processed fish crate can be sold for $1
        $coins += $this->getFishCrates($player_id);

        // Add one for each Shrimp License as it effectively
        // increases the player's buying power
        $shrimp = $this->getLicenses($player_id, LICENSE_SHRIMP);
        $coins += count($shrimp);

        return $coins;
    }

    function buyLicense($card_ids, $fish=0)
    {
        self::checkAction('buyLicense');

        $player_id = self::getActivePlayerId();
        $coins = $fish; // $1 per fish crate

        // Validate game state and transaction

        // Verify player is current auction winner
        if ($player_id != self::getGameStateValue('auction_winner')) {
            throw new feException("Impossible buy: not winner");
        }

        // Verify license selected in auction
        $license_id = self::getGameStateValue('auction_card');
        if ($license_id == 0) {
            throw new feException("Impossible buy: no license");
        }
        $license = $this->cards->getCard($license_id);
        if ($license == null || $license['location'] != 'auction') {
            throw new feException("Impossible buy: non-auction license");
        }
        $license_info = $this->getCardInfo($license);

        // Verify all cards in player hand and tally coins
        foreach ($card_ids as $card_id) {
            $card = $this->cards->getCard($card_id);
            if ($card == null || $card['location'] != 'hand' || $card['location_arg'] != $player_id) {
                throw new feException("Invalid card id for purchase: $card_id");
            }

            $card_info = $this->getCardInfo($card);
            $coins += $card_info['coins'];
        }

        if ($fish > 0) {
            // Verify player has fish to sell
            if ($this->getFishCrates($player_id) < $fish) {
                throw new feException("Impossible buy: too many fish");
            }
        }

        // Each Shrimp License reduces the cost by one
        $discount = count($this->getLicenses($player_id, LICENSE_SHRIMP));

        // Verify player paid enough
        if ($coins < ($license_info['cost'] - $discount)) {
            throw new feException("Impossible buy: not enough");
        }

        // Purchase is valid

        // Discard cards and fish crates
        $this->cards->moveCards($card_ids, 'discard');
        if ($fish > 0) {
            $this->incFishCrates($player_id, -$fish);
        }

        // Take license and score VP
        $this->cards->moveCard($license_id, 'table', $player_id);
        $this->incScore($player_id, $license_info['points']);

        // Reset auction
        self::setGameStateValue('auction_card', 0);
        self::setGameStateValue('auction_winner', 0);
        $sql = 'UPDATE player SET auction_bid = 0, auction_pass = 1, passed = 1';
        $sql .= " WHERE player_id = $player_id";
        self::DbQuery($sql);

        $msg = clienttranslate('${player_name} discards ${nbr_cards} card(s)');
        if ($fish > 0) {
            $msg .= clienttranslate(' and ${nbr_fish} fish crate(s)');
        }
        $msg .= clienttranslate(' for $${coins}');
        if ($discount > 0) {
            $msg .= " (with $$discount " . $this->card_types[LICENSE_SHRIMP]['name'] . ' ';
            $msg .= clienttranslate('discount') . ')';
        }
        self::notifyAllPlayers('buyLicense', $msg, array(
            'player_name' => self::getActivePlayerName(),
            'nbr_cards' => count($card_ids),
            'nbr_fish' => $fish,
            'coins' => $coins,
            'player_id' => $player_id,
            'card_ids' => $card_ids,
            'license_id' => $license_id,
            'license_type' => $license['type_arg'],
            'points' => $license_info['points'],
        ));

        $this->gamestate->nextState();
    }

    function launchBoat($boat_id, $card_ids, $fish=0)
    {
        self::checkAction('launchBoat');

        $player_id = self::getActivePlayerId();
        $coins = $fish; // $1 per fish crate

        // Validate game state and transaction

        // Verify boat exists in player hand
        $boat = $this->cards->getCard($boat_id);
        if ($boat == null || $boat['location'] != 'hand' || $boat['location_arg'] != $player_id) {
            throw new feException("Impossible launch: invalid boat");
        }
        $boat_info = $this->getCardInfo($boat);

        // Verify player owns required license
        // TODO: license:boat = 1:1 or 1:many?
        if ($boat['type_arg'] == BOAT_CRAB) {
            // Multiple licenses for crab boats
            $licenses1 = $this->getLicenses($player_id, LICENSE_CRAB_C);
            $licenses2 = $this->getLicenses($player_id, LICENSE_CRAB_F);
            $licenses3 = $this->getLicenses($player_id, LICENSE_CRAB_L);
            $licenses = array_merge($licenses1, $licenses2, $licenses3);
        } else {
            $licenses = $this->getLicenses($player_id, $boat_info['license']);
        }
        if (count($licenses) == 0) {
            throw new feException("Impossible launch: missing license");
        }

        // Verify all cards in player hand and tally coins
        foreach ($card_ids as $card_id) {
            $card = $this->cards->getCard($card_id);
            if ($card == null || $card['location'] != 'hand' || $card['location_arg'] != $player_id) {
                throw new feException("Invalid card id for purchase: $card_id");
            }

            $card_info = $this->getCardInfo($card);
            $coins += $card_info['coins'];
        }

        if ($fish > 0) {
            // Verify player has fish to sell
            if ($this->getFishCrates($player_id) < $fish) {
                throw new feException("Impossible launch: too many fish");
            }
        }

        // Each Shrimp License reduces the cost by one
        $discount = count($this->getLicenses($player_id, LICENSE_SHRIMP));

        // Verify player paid enough
        if ($coins < ($boat_info['cost'] - $discount)) {
            throw new feException("Impossible launch: not enough");
        }

        // Launch is valid

        // Discard cards and fish crates
        $this->cards->moveCards($card_ids, 'discard');
        if ($fish > 0) {
            $this->incFishCrates($player_id, -$fish);
        }

        // Play boat card and score VP
        $this->cards->moveCard($boat_id, 'table', $player_id);
        $this->incScore($player_id, $boat_info['points']);
        self::incGameStateValue('current_player_launches', 1);


        $msg = clienttranslate('${player_name} discards ${nbr_cards} card(s)');
        if ($fish > 0) {
            $msg .= clienttranslate(' and ${nbr_fish} fish crates');
        }
        $msg .= clienttranslate(' for $${coins} to launch a ${card_name}');
        if ($discount > 0) {
            $msg .= " (with $$discount " . $this->card_types[LICENSE_SHRIMP]['name'] . ' ';
            $msg .= clienttranslate('discount') . ')';
        }
        self::notifyAllPlayers('launchBoat', $msg, array(
            'player_name' => self::getActivePlayerName(),
            'nbr_cards' => count($card_ids),
            'nbr_fish' => $fish,
            'coins' => $coins,
            'card_name' => $boat_info['name'],
            'player_id' => $player_id,
            'boat_id' => $boat_id,
            'boat_type' => $boat['type_arg'],
            'card_ids' => $card_ids,
            'points' => $boat_info['points'],
        ));

        $this->gamestate->nextState();
    }

    function hireCaptain($boat_id, $card_id)
    {
        self::checkAction('hireCaptain');

        $player_id = self::getActivePlayerId();

        // Validate game state and transaction

        // Verify card in player hand
        $card = $this->cards->getCard($card_id);
        if ($card == null || $card['location'] != 'hand' || $card['location_arg'] != $player_id) {
            throw new feException("Impossible hire: invalid card");
        }

        // Verify boat owned by player
        $boat = $this->cards->getCard($boat_id);
        if ($boat == null || $boat['location'] != 'table' || $boat['location_arg'] != $player_id) {
            throw new feException("Impossible hire: invalid boat");
        }

        // Verify boat needs captain
        $sql = "SELECT has_captain FROM card WHERE card_id = $boat_id";
        if (self::getUniqueValueFromDB($sql)) {
            throw new feException("Impossible hire: already captained");
        }

        // Hire is valid

        // Place card on boat
        $this->cards->moveCard($card_id, 'captain', $boat_id);
        self::DbQuery("UPDATE card SET has_captain = 1 WHERE card_id = $boat_id");
        self::incGameStateValue('current_player_hires', 1);

        $msg = clienttranslate('${player_name} hires a captain for their ${card_name}');
        self::notifyAllPlayers('hireCaptain', $msg, array(
            'player_name' => self::getActivePlayerName(),
            'card_name' => $this->getCardName($boat),
            'player_id' => $player_id,
            'boat_id' => $boat_id,
            'card_id' => $card_id,
        ));

        $this->gamestate->nextState();
    }

    function processFish($card_ids)
    {
        self::checkAction('processFish');

        $player_id = self::getActivePlayerId();

        // Validate game state and transaction

        // Verify player has Processing Vessel License
        $license = $this->getLicenses($player_id, LICENSE_PROCESSING);
        if (count($license) == 0) {
            throw new feException("Impossible process: no license");
        }

        // Verify selected boats have fish
        $boats = $this->getBoats($player_id);
        foreach ($card_ids as $card_id) {
            $boat = $boats[$card_id];
            if ($boat == null) { // getBoats verifies card owned by player
                throw new feException("Impossible process: invalid card $card_id");
            }

            if (!$boat['has_captain'] || $boat['fish'] == 0) {
                throw new feException("Impossible process: no fish");
            }

            // Boat is valid
            // Transactions will prevent this from taking if any other boat is invalid
            self::DbQuery("UPDATE card SET nbr_fish = nbr_fish - 1 WHERE card_id = $card_id");
        }

        // Add fish to PV and reduce score
        $this->incFishCrates($player_id, count($card_ids));
        $this->incScore($player_id, -count($card_ids));

        $msg = clienttranslate('${player_name} processes ${nbr_fish} fish crate(s)');
        self::notifyAllPlayers('processFish', $msg, array(
            'player_name' => self::getActivePlayerName(),
            'nbr_fish' => count($card_ids),
            'card_ids' => $card_ids,
            'player_id' => $player_id,
        ));

        $this->gamestate->nextState();
    }

    function tradeFish()
    {
        self::checkAction('tradeFish');
        $player_id = self::getActivePlayerId();

        // Validate game state and transaction

        // Verify player has license with fish
        $license = $this->getLicenses($player_id, LICENSE_PROCESSING);
        if (count($license) == 0) {
            throw new feException("Impossible trading: no license");
        }
        $fish = $this->getFishCrates($player_id);
        if ($fish == 0) {
            throw new feException("Impossible trading: no fish");
        }

        // Remove fish crate and draw card(s)
        $this->incFishCrates($player_id, -1);
        $cards = $this->cards->pickCards(count($license), 'deck', $player_id);

        $msg = clienttranslate('${player_name} trades a fish crate for ${nbr_cards} card(s)');
        self::notifyAllPlayers('tradeFish', $msg, array(
            'player_name' => self::getActivePlayerName(),
            'nbr_cards' => count($cards),
            'player_id' => $player_id,
        ));
        self::notifyPlayer($player_id, 'draw', '', array(
            'cards' => $cards,
            'to_hand' => true,
        ));

        $this->gamestate->nextState();
    }

    function discard($card_id)
    {
        self::checkAction('discard');

        $player_id = self::getActivePlayerId();

        // Tuna license gives bonus to discard from hand
        $bonus = count($this->getLicenses($player_id, LICENSE_TUNA));
        $loc = $bonus > 0 ? 'hand' : 'draw';

        // Verify card
        $card = $this->cards->getCard($card_id);
        if ($card == null || $card['location'] != $loc || $card['location_arg'] != $player_id) {
            throw new feException("Impossible discard: invalid card $card_id");
        }

        // Discard card and take remainder
        $this->cards->playCard($card_id);
        $kept = $this->cards->getCardsInLocation('draw', $player_id);
        $this->cards->moveAllCardsInLocation('draw', 'hand', $player_id, $player_id);

        self::notifyAllPlayers('discardLog', clienttranslate('${player_name} discards a card'), array(
            'player_name' => self::getActivePlayerName(),
            'player_id' => $player_id,
        ));
        self::notifyPlayer($player_id, 'discard', '', array(
            'discard' => $card,
            'keep' => count($kept) > 0 ? array_shift($kept) : null,
            'in_hand' => $bonus > 0,
        ));

        $this->gamestate->nextState();
    }

    
//////////////////////////////////////////////////////////////////////////////
//////////// Game state arguments
////////////

    /*
        Here, you can create methods defined as "game state arguments" (see "args" property in states.inc.php).
        These methods function is to return some additional information that is specific to the current
        game state.
    */

    /*
    
    Example for game state "MyGameState":
    
    function argMyGameState()
    {
        // Get some values from the current game situation in database...
    
        // return values:
        return array(
            'variable1' => $value1,
            'variable2' => $value2,
            ...
        );
    }    
    */

//////////////////////////////////////////////////////////////////////////////
//////////// Game state actions
////////////

    function hasPassed($player_id)
    {
        $sql = "SELECT passed FROM player WHERE player_id = $player_id";
        return self::getUniqueValueFromDB($sql) == 1;
    }

    //TODO: this function is too large
    function stNextPlayer()
    {
        // Determine next player and phase
        $current_phase = $this->getCurrentPhase();
        $next_state = $current_phase;
        if ($current_phase == PHASE_AUCTION) {
            // Auction phase has complicated progression
            $player_and_state = $this->nextAuction();
            $player_id = $player_and_state[0];
            $next_state = $player_and_state[1];
        } else {
            // All other phases proceed in order
            // But some bonuses allow multiple actions
            if ($current_phase == PHASE_LAUNCH) {
                // Cod license gives bonus boat launch
                // Allow extra turn if player has license and legal play
                $player_id = self::getActivePlayerId();
                $nbr_license = count($this->getLicenses($player_id, LICENSE_COD));
                if ($nbr_license > 0 &&
                    self::getGameStateValue('current_player_launches') < 2 &&
                    $this->cards->countCardInLocation('hand', $player_id) > 0 &&
                    !$this->hasPassed($player_id))
                {
                    // Player gets bonus action
                    $has_bonus = true;
                } else {
                    // No bonus action, but license also
                    // gives draw bonus after any launch
                    $has_bonus = false;
                    if ($nbr_license > 0 &&
                        self::getGameStateValue('current_player_launches') > 0)
                    {
                        $this->drawCards($player_id, $nbr_license, 'hand',
                            $this->card_types[LICENSE_COD]['name']);
                    }
                }
            } else if ($current_phase == PHASE_HIRE) {
                // Lobster license gives bonus captain hire
                // Allow extra turn if player has license and legal play
                $player_id = self::getActivePlayerId();
                $nbr_license = count($this->getLicenses($player_id, LICENSE_LOBSTER));
                $sql = "SELECT COUNT(*) FROM card WHERE card_location = 'table' ";
                $sql .= "AND card_location_arg = $player_id AND card_type = '";
                $sql .= CARD_BOAT . "' AND has_captain = 0";
                if ($nbr_license > 0 &&
                    self::getGameStateValue('current_player_hires') < 2 &&
                    $this->cards->countCardInLocation('hand', $player_id) > 0 &&
                    self::getUniqueValueFromDB($sql) > 0 &&
                    !$this->hasPassed($player_id))
                {
                    // Player gets bonus action
                    $has_bonus = true;
                } else {
                    // No bonus action, but license also
                    // gives draw bonus for hired captains
                    $has_bonus = false;
                    if ($nbr_license > 0) {
                        // Bonus depends on both number of licenses and captained boats
                        $sql = "SELECT SUM(has_captain) FROM card WHERE card_location = 'table' ";
                        $sql .= "AND card_location_arg = $player_id AND card_type = '" . CARD_BOAT ."'";
                        $nbr_captain = self::getUniqueValueFromDB($sql);
                        if ($nbr_captain > 0) {
                            if ($nbr_license == 1) {
                                $nbr_cards = $nbr_captain < 4 ? 1 : 2;
                            } else {
                                if ($nbr_captain < 3) {
                                    $nbr_cards = 1;
                                } else if ($nbr_captain < 7) {
                                    $nbr_cards = 2;
                                } else  {
                                    $nbr_cards = 3;
                                }
                            }
                        } else {
                            $nbr_cards = 0;
                        }

                        $this->drawCards($player_id, $nbr_cards, 'hand',
                            $this->card_types[LICENSE_LOBSTER]['name']);
                    }
                }
            } else {
                // Other phases have no bonus action
                $has_bonus = false;
            }

            if (!$has_bonus) {
                // Clear bonus counters
                // TODO: only clear when needed?
                self::setGameStateValue('current_player_launches', 0);
                self::setGameStateValue('current_player_hires', 0);

                // Next player
                $player_id = self::activeNextPlayer();
                if ($player_id == self::getGameStateValue('first_player')) {
                    // Back to first player => next phase
                    $next_state = $this->nextPhase();
                    if ($next_state == PHASE_AUCTION) {
                        // New round, advance first player token
                        $player_id = $this->rotateFirstPlayer();
                        if (self::getGameStateValue('final_round')) {
                            $next_state = 'finalScore';
                        }
                    }
                }
            }
        }

        // Perform game actions
        if ($next_state == PHASE_FISHING) {
            // Fishing is automatic, move to next phase (or end)
            $next_state = $this->doFishing();
        } else if ($next_state == PHASE_DRAW) {
            // Draw cards for next player
            $this->drawPhase($player_id);
        }

        // When possible automatically skip players without a valid play
        // but _NOT_ when it would reveal private information
        switch ($next_state) {
            case PHASE_LAUNCH:
                // Skip player _only_ if hand is empty (ignore no legal play)
                $skip = $this->cards->countCardInLocation('hand', $player_id) == 0;
                break;
            case PHASE_HIRE:
                // Skip player if hand empty or no open boats
                $hand = $this->cards->countCardInLocation('hand', $player_id);
                $sql = "SELECT COUNT(*) FROM card WHERE card_location = 'table' ";
                $sql .= "AND card_location_arg = $player_id AND card_type = '";
                $sql .= CARD_BOAT . "' AND has_captain = 0";
                $skip = $hand == 0 || self::getUniqueValueFromDB($sql) == 0;
                break;
            case PHASE_PROCESSING:
                // Skip player if no license or fish to process
                $license = $this->getLicenses($player_id, LICENSE_PROCESSING);
                $sql = "SELECT SUM(nbr_fish) FROM card WHERE card_location = 'table' ";
                $sql .= "AND card_location_arg = $player_id AND card_type = '" . CARD_BOAT ."'";
                $skip = count($license) == 0 || self::getUniqueValueFromDB($sql) == 0;
                break;
            case PHASE_TRADING:
                // Skip player if no processed fish to trade
                $sql = "SELECT fish_crates FROM player WHERE player_id = $player_id";
                $skip = self::getUniqueValueFromDB($sql) == 0;
                break;
            case PHASE_DRAW:
                // Skip if player has Tuna bonus to not discard
                $bonus = count($this->getLicenses($player_id, LICENSE_TUNA));
                $skip = $bonus == 1 || $bonus == 3;
                break;
            default:
                $skip = false;
                break;
        }

        if ($skip) {
            //TODO: notify if skipped?
            $next_state = 'cantPlay';
        } else {
            self::notifyPlayer($player_id, 'possibleMoves', '', $this->possibleMoves($player_id, $next_state));
            self::giveExtraTime($player_id);
        }

        $this->gamestate->nextState($next_state);
    }

    function doFishing()
    {
        $fish = self::getGameStateValue('fish_cubes');
        $players = self::loadPlayersBasicInfos();
        foreach ($players as $player_id => $player) {
            $boats = $this->getBoats($player_id);
            $boat_ids = array();
            foreach ($boats as $card_id => $boat) {
                if ($boat['has_captain'] && $boat['fish'] < 4) {
                    // Add fish crate to boat
                    $sql = "UPDATE card SET nbr_fish = nbr_fish + 1 WHERE card_id = $card_id";
                    self::DbQuery($sql);
                    $fish = self::incGameStateValue('fish_cubes', -1);
                    $boat_ids[] = $card_id;
                }
            }

            $nbr_fish = count($boat_ids);
            if ($nbr_fish > 0) {
                // Score 1 VP per fish crate
                $this->incScore($player_id, $nbr_fish);
            }

            //TODO: notify if zero?
            $msg = '${player_name} gains ${nbr_fish} fish crate(s)';
            self::notifyAllPlayers('fishing', $msg, array(
                'player_name' => $player['player_name'],
                'nbr_fish' => $nbr_fish,
                'player_id' => $player_id,
                'card_ids' => $boat_ids
            ));
        }

        if ($fish <= 0) {
            // No more fish crates, game is over!
            // TODO: notify
            return 'finalScore';
        } else {
            // Next phase
            return $this->nextPhase();
        }
    }

    function drawPhase($player_id)
    {
        // Tuna license gives draw bonus
        $bonus = count($this->getLicenses($player_id, LICENSE_TUNA));
        if ($bonus == 0) {
            $dest = 'draw';
            $nbr = 2;
        } else {
            $dest = 'hand';
            if ($bonus < 3) {
                // 1 => 2, 2 => 3
                $nbr = $bonus + 1;
            } else {
                // 3 => 3, 4 => 4
                $nbr = $bonus;
            }
        }

        $this->drawCards($player_id, $nbr, $dest,
            $bonus == 0 ? null : $this->card_types[LICENSE_TUNA]['name']);
    }

    function drawCards($player_id, $nbr, $dest, $bonus=null)
    {
        if ($nbr > 0) {
            // Draw cards
            $cards = $this->cards->pickCardsForLocation($nbr, 'deck', $dest, $player_id);

            // All players get log notice but only current player gets card details
            $msg = '';
            if ($bonus != null) {
                $msg = $bonus . ': ';
            }
            $msg .= clienttranslate('${player_name} draws ${nbr} card(s)');
            self::notifyAllPlayers('drawLog', $msg, array(
                'player_name' => self::getActivePlayerName(),
                'player_id' => $player_id,
                'nbr' => $nbr,
            ));
            self::notifyPlayer($player_id, 'draw', '', array(
                'cards' => $cards,
                'to_hand' => $dest == 'hand' ? true : false,
            ));
        }
    }

    function rotateFirstPlayer()
    {
        $player_id = self::getGameStateValue('first_player');
        $next_player = self::getNextPlayerTable();
        $first_player = $next_player[$player_id];
        self::setGameStateValue('first_player', $first_player);

        self::notifyAllPlayers('firstPlayer', '', array(
            'current_player_id' => $player_id,
            'next_player_id' => $first_player,
        ));

        $this->gamestate->changeActivePlayer($first_player);
        return $first_player;
    }

    function nextAuction()
    {
        $next_state = PHASE_AUCTION;
        if (self::getGameStateValue('auction_card')) {
            // Auction in progress
            // Determine if auction should end
            $sql = "SELECT COUNT(player_id) AS passed FROM player WHERE auction_pass = 1";
            $num_pass = self::getUniqueValueFromDB($sql);
            if ($num_pass == (self::getPlayersNumber() - 1)) {
                // Some player won the bid
                $sql = "SELECT player_id FROM player WHERE auction_pass = 0";
                $player_id = self::getUniqueValueFromDB($sql);
                self::setGameStateValue('auction_winner', $player_id);

                // Notify client of winner to handle buy
                $players = self::loadPlayersBasicInfos();
                $msg = clienttranslate('${player_name} wins the auction');
                self::notifyAllPlayers('auctionWin', $msg, array(
                    'player_name' => $players[$player_id]['player_name'],
                    'player_id' => $player_id,
                    'bid' => $this->getHighBid(),
                    'card_id' => self::getGameStateValue('auction_card'),
                ));
            } else {
                // One or more players left to act
                // Some players may be skipped
                $current_player = self::getActivePlayerId();
                $next_player = self::getNextPlayerTable();
                $player_id = $next_player[$current_player];
                while (!$this->canBid($player_id)) {
                    $player_id = $next_player[$player_id];
                }
            }
        } else {
            // Start new auction
            // Reset bids and pass count for those still in auction
            self::DbQuery('UPDATE player SET auction_bid = 0');
            self::DbQuery('UPDATE player SET auction_pass = 0 WHERE passed = 0');

            // Determine player to start auction
            $first_player = self::getGameStateValue('first_player');
            if (!$this->canBid($first_player)) {
                // First player won or passed, find next valid player
                $next_player = self::getNextPlayerTable();
                $player_id = $next_player[$first_player];
                while ($player_id != $first_player) {
                    if (!$this->canBid($player_id)) {
                        $player_id = $next_player[$player_id];
                        continue;
                    }

                    break;
                }

                if ($player_id == $first_player) {
                    // All players finished auction
                    // Reset auction and go to next phase
                    $this->drawLicenses();
                    self::DbQuery('UPDATE player SET auction_bid = 0, auction_pass = 0, passed = 0');
                    $next_state = $this->nextPhase();
                }
            } else {
                $player_id = $first_player;
            }
        }

        $this->gamestate->changeActivePlayer($player_id);
        return array($player_id, $next_state);
    }

    function drawLicenses()
    {
        // Determine number licenses to draw
        $nbr_players = self::getPlayersNumber();
        $nbr_left = $this->cards->countCardInLocation('auction');
        $nbr_draw = $nbr_players - $nbr_left;
        $discard = false;
        if ($nbr_draw == 0) {
            // No license bought this round, remove all from game and redraw
            $this->cards->moveAllCardsInLocation('auction', 'box');
            $nbr_draw = $nbr_players;
            $discard = true;
        }

        // Draw new licenses
        $cards = $this->cards->pickCardsForLocation($nbr_draw, 'licenses', 'auction', 0, true);
        self::notifyAllPlayers('drawLicenses', '', array('cards' => $cards, 'discard' => $discard));

        if (count($cards) < $nbr_draw) {
            // Not enough cards left to fill license auction
            // This will be the final round
            self::setGameStateValue('final_round', 1);
            //TODO: notify
        }
    }

    function stFinalScore()
    {
        $players = self::loadPlayersBasicInfos();

        // King Crab captain license: +1VP per captained boat (max 10)
        $crab = $this->cards->getCardsOfType(CARD_LICENSE, LICENSE_CRAB_C);
        $card = array_shift($crab);
        if ($card['location'] == 'table') {
            $player_id = $card['location_arg'];
            $boats = $this->getBoats($player_id);
            $captains = array_sum(array_column($boats, 'has_captain'));
            $points = min($captains, 10);
            $this->incScore($player_id, $points);
            $msg = clienttranslate('${card_name}: ${player_name} scores ${points} points for ${nbr} captains');
            self::notifyAllPlayers('finalScore', $msg, array(
                'card_name' => $this->getCardName($card),
                'player_name' => $players[$player_id]['player_name'],
                'points' => $points,
                'nbr' => $captains,
                'player_id' => $player_id,
            ));
        }

        // Kig Crab fish crate license: +1VP per 3 fish crates (max 10)
        $crab = $this->cards->getCardsOfType(CARD_LICENSE, LICENSE_CRAB_F);
        $card = array_shift($crab);
        if ($card['location'] == 'table') {
            $player_id = $card['location_arg'];
            $boats = $this->getBoats($player_id);
            $fish = array_sum(array_column($boats, 'fish'));
            $points = min(intdiv($fish, 3), 10);
            $this->incScore($player_id, $points);
            $msg = clienttranslate('${card_name}: ${player_name} scores ${points} points for ${nbr} fish crates');
            self::notifyAllPlayers('finalScore', $msg, array(
                'card_name' => $this->getCardName($card),
                'player_name' => $players[$player_id]['player_name'],
                'points' => $points,
                'nbr' => $fish,
                'player_id' => $player_id,
            ));
        }

        // King Crab licenses license: +VP depending on number difference licenses
        $crab = $this->cards->getCardsOfType(CARD_LICENSE, LICENSE_CRAB_L);
        $card = array_shift($crab);
        if ($card['location'] == 'table') {
            $player_id = $card['location_arg'];
            $licenses = array_column($this->getLicenses($player_id), 'type_arg');
            $unique = count(array_unique($licenses));
            // All King Crab count as one type so do not double count any others
            if (in_array(LICENSE_CRAB_F, $licenses)) {
                $unique -= 1;
            }
            if (in_array(LICENSE_CRAB_C, $licenses)) {
                $unique -= 1;
            }

            if ($unique == 1) {
                $points = 0;
            } else if ($unique == 2) {
                $points = 2;
            } else if ($unique == 3) {
                $points = 4;
            } else if ($unique == 4) {
                $points = 5;
            } else if ($unique == 5) {
                $points = 6;
            } else if ($unique == 6) {
                $points = 8;
            } else if ($unique == 7) {
                $points = 10;
            }
            $this->incScore($player_id, $points);
            $msg = clienttranslate('${card_name}: ${player_name} scores ${points} points for ${nbr} different licenses');
            self::notifyAllPlayers('finalScore', $msg, array(
                'card_name' => $this->getCardName($card),
                'player_name' => $players[$player_id]['player_name'],
                'points' => $points,
                'nbr' => $unique,
                'player_id' => $player_id,
            ));
        }

        $this->gamestate->nextState();
    }

//////////////////////////////////////////////////////////////////////////////
//////////// Zombie
////////////

    /*
        zombieTurn:
        
        This method is called each time it is the turn of a player who has quit the game (= "zombie" player).
        You can do whatever you want in order to make sure the turn of this player ends appropriately
        (ex: pass).
        
        Important: your zombie code will be called when the player leaves the game. This action is triggered
        from the main site and propagated to the gameserver from a server, not from a browser.
        As a consequence, there is no current player associated to this action. In your zombieTurn function,
        you must _never_ use getCurrentPlayerId() or getCurrentPlayerName(), otherwise it will fail with a "Not logged" error message. 
    */

    function zombieTurn( $state, $active_player )
    {
        $statename = $state['name'];
        
        if ($state['type'] === "activeplayer") {
            switch ($statename) {
                default:
                    $this->gamestate->nextState( "zombiePass" );
                        break;
            }

            return;
        }

        if ($state['type'] === "multipleactiveplayer") {
            // Make sure player is in a non blocking status for role turn
            $this->gamestate->setPlayerNonMultiactive( $active_player, '' );
            
            return;
        }

        throw new feException( "Zombie mode not supported at this game state: ".$statename );
    }
    
///////////////////////////////////////////////////////////////////////////////////:
////////// DB upgrade
//////////

    /*
        upgradeTableDb:
        
        You don't have to care about this until your game has been published on BGA.
        Once your game is on BGA, this method is called everytime the system detects a game running with your old
        Database scheme.
        In this case, if you change your Database scheme, you just have to apply the needed changes in order to
        update the game database and allow the game to continue to run with your new version.
    
    */
    
    function upgradeTableDb( $from_version )
    {
        // $from_version is the current version of this game database, in numerical form.
        // For example, if the game was running with a release of your game named "140430-1345",
        // $from_version is equal to 1404301345
        
        // Example:
//        if( $from_version <= 1404301345 )
//        {
//            // ! important ! Use DBPREFIX_<table_name> for all tables
//
//            $sql = "ALTER TABLE DBPREFIX_xxxxxxx ....";
//            self::applyDbUpgradeToAllDB( $sql );
//        }
//        if( $from_version <= 1405061421 )
//        {
//            // ! important ! Use DBPREFIX_<table_name> for all tables
//
//            $sql = "CREATE TABLE DBPREFIX_xxxxxxx ....";
//            self::applyDbUpgradeToAllDB( $sql );
//        }
//        // Please add your future database scheme changes here
//
//


    }    
}
