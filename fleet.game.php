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
            'fish_crates' => 10,
            'auction_card' => 11,
            'current_phase' => 12,         // current phase number, always increasing
            'first_player' => 13,
            'final_round' => 14,
            'auction_winner' => 15,
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
        
        // Init game statistics
        // (note: statistics used in this file must be defined in your stats.inc.php file)
        //self::initStat( 'table', 'table_teststat1', 0 );    // Init a table statistics
        //self::initStat( 'player', 'player_teststat1', 0 );  // Init a player statistics (for all players)

        // TODO: setup the initial game situation here
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
        $this->cards->shuffle('licenses');

        // Setup license deck
        // Separate all premium and 8 common licenses
        foreach ($this->premium_license_types as $type_arg) {
            $cards = $this->cards->getCardsOfType(CARD_LICENSE, $type_arg);
            $this->cards->moveCards(array_column($cards, 'id'), 'setup_premium');
        }
        $this->cards->pickCardsForLocation(8, 'licenses', 'setup_common');
        $this->cards->shuffle('setup_premium');
        $this->cards->shuffle('setup_common');

        // Remove some licenses from game based on number of players
        $nbr_players = count($players);
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
        if ($nbr_players == 1) { //TODO XXX
            $this->cards->pickCardsForLocation(4, 'licenses', 'auction');
        } else {
           $this->cards->pickCardsForLocation($nbr_players, 'licenses', 'auction');
        }

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
        self::setGameStateInitialValue("fish_crates", $nbr_players * 25);

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
        $sql = "SELECT player_id id, player_score score, auction_bid bid, auction_pass pass, auction_done done FROM player ";
        $result['players'] = self::getCollectionFromDb( $sql );

        // Get player cards on table
        $players = self::loadPlayersBasicInfos();
        $boats = array();
        $licenses = array();
        foreach ($players as $player_id => $player) {
            $boats[$player_id] = $this->getBoats($player_id);
            $licenses[$player_id] = $this->getLicenses($player_id);
        }
        $result['boats'] = $boats;
        $result['licenses'] = $licenses;

        $result['hand'] = $this->cards->getPlayerHand($current_player_id);
        $result['coins'] = $this->getCoins($current_player_id);
        $result['draw'] = $this->cards->getCardsInLocation('draw', $current_player_id);

        $result['cards'] = $this->cards->countCardsInLocations();

        $result['auction'] = $this->cards->getCardsInLocation('auction');
        $result['auction_card'] = self::getGameStateValue('auction_card');
        $result['auction_winner'] = self::getGameStateValue('auction_winner');
        $result['auction_bid'] = $this->getHighBid();

        $result['fish'] = self::getGameStateValue('fish_crates');

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
        $sql = "SELECT (auction_pass + auction_done) AS passed FROM player WHERE player_id = $player_id";
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
        if ($inc > 0) {
            $inc = "+ $inc";
        }
        self::DbQuery("UPDATE player SET fish_crates = fish_crates $inc WHERE player_id = $player_id");
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
                // TODO: fish crates
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
                if (!in_array($card_info['license'], $licenses)) {
                    //TODO: king crab?
                    $move['error'] = clienttranslate('You do not have the required license');
                } else if (($coins - $card_info['coins']) < $card_info['cost']) {
                    $move['error'] = clienttranslate('You cannot afford this boat');
                } else {
                    $move['can_play'] = true;
                }
                $moves[$card_id] = $move;
            }
        } else if ($phase == PHASE_HIRE) {
            $moves['hand'] = $this->cards->getPlayerHand($player_id);
            $moves['boats'] = array();
            $boats = $this->getBoats($player_id);
            foreach ($boats as $boat_id => $boat) {
                if (!$boat['has_captain']) {
                    $moves['boats'][] = $boat_id;
                }
            }
        } else if ($phase == PHASE_PROCESSING) {
            $boats = $this->getBoats($player_id);
            foreach ($boats as $boat_id => $boat) {
                if ($boat['fish'] > 0) {
                    $moves[$boat_id] = true;
                }
            }
        } else if ($phase == PHASE_TRADING) {
            //TODO
        } else if ($phase == PHASE_DRAW) {
            //TODO
        }

        return $moves;
    }

//////////////////////////////////////////////////////////////////////////////
//////////// Player actions
//////////// 

    function pass()
    {
        self::checkAction('pass');

        if ($this->getCurrentPhase() == PHASE_AUCTION) {
            // Keep track of which players pass during auction
            $player_id = self::getActivePlayerId();
            $sql = 'UPDATE player SET auction_bid = 0, auction_pass = 1';

            if (self::getGameStateValue('auction_card') == 0) {
                // No active auction, player chooses not to buy
                $sql .= ', auction_done = 1';
            }

            $sql .= " WHERE player_id = $player_id";
            self::DbQuery($sql);
        }

        self::notifyAllPlayers('pass', clienttranslate('${player_name} passes'), array(
            'player_name' => self::getActivePlayerName(),
            'player_id' => self::getActivePlayerId(),
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
        $cards = $this->cards->getPlayerHand($player_id);
        foreach ($cards as $card) {
            $card_info = $this->getCardInfo($card);
            $coins += $card_info['coins'];
        }
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

        // Verify player paid enough
        if ($coins < $license_info['cost']) {
            throw new feException("Impossible buy: not enough");
        }

        // Purchase is valid

        // Discard cards and fish crates
        $this->cards->moveCards($card_ids, 'discard');
        if ($fish > 0) {
            $this->incFishCrates($player_id, $fish);
        }

        // Take license
        $this->cards->moveCard($license_id, 'table', $player_id);

        // Reset auction
        self::setGameStateValue('auction_card', 0);
        self::setGameStateValue('auction_winner', 0);
        $sql = 'UPDATE player SET auction_bid = 0, auction_pass = 1, auction_done = 1';
        $sql .= " WHERE player_id = $player_id";
        self::DbQuery($sql);

        $msg = clienttranslate('${player_name} discards ${nbr_cards} card(s)');
        if ($fish > 0) {
            $msg .= clienttranslate(' and ${nbr_fish} fish crate(s)');
        }
        self::notifyAllPlayers('buyLicense', $msg, array(
            'player_name' => self::getActivePlayerName(),
            'nbr_cards' => count($card_ids),
            'nbr_fish' => $fish,
            'player_id' => $player_id,
            'card_ids' => $card_ids,
            'license_id' => $license_id,
            'license_type' => $license['type_arg'],
        ));

        $this->gamestate->nextState();

        //TODO: license bonus
        //      shrimp: -1 cost/license (could be free?)
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

        // Verify player paid enough
        if ($coins < $boat_info['cost']) {
            throw new feException("Impossible launch: not enough");
        }

        // Launch is valid

        // Discard cards and fish crates
        $this->cards->moveCards($card_ids, 'discard');
        if ($fish > 0) {
            $this->incFishCrates($player_id, $fish);
        }

        // Play boat
        $this->cards->moveCard($boat_id, 'table', $player_id);

        $msg = clienttranslate('${player_name} discards ${nbr_cards}');
        if ($fish > 0) {
            $msg .= clienttranslate(' and ${nbr_fish} fish crates');
        }
        $msg .= clienttranslate(' to launch a ${card_name}');
        self::notifyAllPlayers('launchBoat', $msg, array(
            'player_name' => self::getActivePlayerName(),
            'nbr_cards' => count($card_ids), //TODO: fish
            'nbr_fish' => $fish,
            'card_name' => $boat_info['name'],
            'player_id' => $player_id,
            'boat_id' => $boat_id,
            'boat_type' => $boat['type_arg'],
            'card_ids' => $card_ids,
        ));

        $this->gamestate->nextState();

        //TODO: license bonus
        //      cod: +1 launch, +1 card/license
        //      shrimp: -1 cost/license
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

        $msg = clienttranslate('${player_name} hires a captain for their ${card_name}');
        self::notifyAllPlayers('hireCaptain', $msg, array(
            'player_name' => self::getActivePlayerName(),
            'card_name' => $this->getCardName($boat),
            'player_id' => $player_id,
            'boat_id' => $boat_id,
            'card_id' => $card_id,
        ));

        $this->gamestate->nextState();

        //TODO: license bonus
        //      lobster: +1 captain, complicated draw bonus
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

        // Add fish to PV
        $this->incFishCrates($player_id, count($card_ids));

        //TODO: notify
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
        $cards = $this->cards->pickCards(count($license), 'hand', $player_id);

        //TODO: notify

        $this->gamestate->nextState();
    }

    function discard($card_id)
    {
        self::checkAction('discard');

        $player_id = self::getActivePlayerId();

        // Verify card
        $card = $this->cards->getCard($card_id);
        if ($card == null || $card['location'] != 'draw' || $card['location_arg'] != $player_id) {
            throw new feException("Impossible discard: invalid card $card_id");
        }

        // Discard card and take other(s)
        $this->cards->playCard($card_id);
        $kept = $this->cards->getCardsInLocation('draw', $player_id);
        $this->cards->moveAllCardsInLocation('draw', 'hand', $player_id, $player_id);

        self::notifyAllPlayers('log', clienttranslate('${player_name} discards a card'), array(
            'player_name' => self::getActivePlayerName(),
        ));
        self::notifyPlayer($player_id, 'discard', '', array(
            'discard' => $card,
            'keep' => $kept,
        ));

        $this->gamestate->nextState();

        //TODO: license bonus
        //      tuna allows discard from hand
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
            $player_id = self::activeNextPlayer();
            if ($player_id == self::getGameStateValue('first_player')) {
                // Back to first player => next phase
                $next_state = $this->nextPhase();
                if ($next_state == PHASE_AUCTION) {
                    // New round, advance first player token
                    $player_id = $this->rotateFirstPlayer();
                    if (self::getGameStateValue('final_round')) {
                        $next_state = "gameEnd";
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
            $this->drawCards($player_id);
        }

        // When possible automatically skip players without a valid play
        // but _NOT_ when it would reveal private information
        if ($next_state == PHASE_PROCESSING) {
            // Verify player has processing vessel license and at least one fish crate
            $license = $this->getLicenses($player_id, LICENSE_PROCESSING);
            $sql = "SELECT SUM(nbr_fish) FROM card WHERE card_location = 'table' ";
            $sql .= "AND card_location_arg = $player_id AND card_type = '" . CARD_BOAT ."'";
            if (count($license) == 0 || self::getUniqueValueFromDB($sql) == 0) {
                $next_state = 'cantPlay';
            }
        } else if ($next_state == PHASE_TRADING) {
            // Verify player has at least one fish crate on license
            $sql = "SELECT fish_crates FROM player WHERE player_id = $player_id";
            if (self::getUniqueValueFromDB($sql) == 0) {
                $next_state = 'cantPlay';
            }
        }
        //TODO: skip if no cards in hand to launch or hire

        if ($next_state != 'cantPlay') {
            self::notifyPlayer($player_id, 'possibleMoves', '', $this->possibleMoves($player_id, $next_state));
            // TODO: auto pass if no action (and would not reveal private info)
            self::giveExtraTime($player_id);
        }
        //TODO: notify if skipped?

        $this->gamestate->nextState($next_state);
    }

    function doFishing()
    {
        $fish = self::getGameStateValue('fish_crates');
        $players = self::loadPlayersBasicInfos();
        foreach ($players as $player_id => $player) {
            $boats = $this->getBoats($player_id);
            $boat_ids = array();
            foreach ($boats as $card_id => $boat) {
                if ($boat['has_captain'] && $boat['fish'] < 4) {
                    // Add fish crate to boat
                    $sql = "UPDATE card SET nbr_fish = nbr_fish + 1 WHERE card_id = $card_id";
                    self::DbQuery($sql);
                    $fish = self::incGameStateValue('fish_crates', -1);
                    $boat_ids[] = $card_id;
                }
            }

            //TODO: notify if zero?
            $msg = '${player_name} gains ${nbr_fish} fish crate(s)';
            self::notifyAllPlayers('fishing', $msg, array(
                'player_name' => $player['player_name'],
                'nbr_fish' => count($boat_ids),
                'player_id' => $player_id,
                'card_ids' => $boat_ids
            ));
        }

        if ($fish <= 0) {
            // No more fish crates, game is over!
            // TODO: notify
            return 'gameEnd';
        } else {
            // Next phase
            return $this->nextPhase();
        }
    }

    function drawCards($player_id)
    {
        $cards = $this->cards->pickCardsForLocation(2, 'deck', 'draw', $player_id);
        self::notifyPlayer($player_id, 'draw', '', array(
            'cards' => $cards,
        ));

        //TODO: license bonus
        //      tuna: extra draw/keep: 1=>2/2, 2=>3/2, 3=>3/3, 4=>4/3 plus can discard from handextra draw/keep: 1=>2/2, 2=>3/2, 3=>3/3, 4=>4/3 plus can discard from hand
    }

    function rotateFirstPlayer()
    {
        $player_id = self::getGameStateValue('first_player');
        $next_player = self::getNextPlayerTable();
        $first_player = $next_player[$player_id];
        self::setGameStateValue('first_player', $first_player);

        //TODO: notify for token

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
            self::DbQuery('UPDATE player SET auction_pass = 0 WHERE auction_done = 0');

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
                    self::DbQuery('UPDATE player SET auction_bid = 0, auction_pass = 0, auction_done = 0');
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
        if ($nbr_draw == 0) {
            // No license bought this round, remove all from game and redraw
            $this->cards->moveAllCardsInLocation('auction', 'box');
            $nbr_draw = $nbr_players;
        }

        // Draw new licenses
        $cards = $this->cards->pickCardsForLocation($nbr_draw, 'licenses', 'auction', 0, true);
        self::notifyAllPlayers('drawLicenses', '', array('cards' => $cards));

        if (count($cards) < $nbr_draw) {
            // Not enough cards left to fill license auction
            // This will be the final round
            self::setGameStateValue('final_round', 1);
            //TODO: notify
        }
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
