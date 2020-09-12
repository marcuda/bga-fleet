/**
 *------
 * BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
 * Fleet implementation : © Dan Marcus <bga.marcuda@gmail.com>
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 *
 * fleet.js
 *
 * fleet user interface script
 * 
 * In this file, you are describing the logic of your user interface, in Javascript language.
 *
 */

define([
    "dojo","dojo/_base/declare",
    "ebg/core/gamegui",
    "ebg/counter",
    "ebg/stock",
    "ebg/zone"
],
function (dojo, declare) {
    return declare("bgagame.fleet", ebg.core.gamegui, {
        constructor: function(){
            this.debug = false; // enable console logs if true

            if (this.debug) console.log('fleet constructor');
              
            // Here, you can init the global variables of your user interface
            this.auction = {bids:[]};    // object to track all auction status
            this.player_hand = null;     // stock component for player's hand
            this.boat_width = 100;       // card width, boats
            this.boat_height = 143;      // card height, boats
            this.boat_row_size = 7;      // sprite image cards per row, boats
            this.license_width = 175;    // card width, licenses
            this.license_height = 122;   // card height, licenses
            this.license_row_size = 5;   // sprite image cards per row, licenses
            this.fish_cube_size = 30;    // fish cube width/height
            this.license_counter = null; // counter for license deck
            this.boat_counter = null;    // counter for boat deck
            this.discard_counter = null; // counter for boat discard pile
            this.fish_counter = null;    // counter for fish cubes
            this.coin_counter = null;    // counter for current player coins
            this.hand_counters = [];     // counters for all players cards in hand
            this.client_state_args = {}; // arguments for all client states
            this.card_infos = null;      // additional card details
            this.player_coins = 0;       // number of coins available to spend
            this.player_licenses = [];   // stock components for all players licenses in play
            this.player_boats = [];      // stock components for all players boats in play
            this.possible_moves = null;  // objects to highlight as possible plays when active
            this.fish_zones = [];        // zone components for each boats fish area
            this.player_fish = [];       // zone components for each player's processed fish area
            this.discount = 0;           // transaction discount from played Shrimp Licenses
            this.gone_fishing = false;   // true if game option to use Gone Fishing is enabled
            this.constants = null;       // game constants
        },
        
        /*
            setup:
            
            This method must set up the game user interface according to current game situation specified
            in parameters.
            
            The method is called each time the game interface is displayed to a player, ie:
            _ when the game starts
            _ when a player refreshes the game page (F5)
            
            "gamedatas" argument contains all datas retrieved by your "getAllDatas" PHP method.
        */
        
        setup: function( gamedatas )
        {
            if (this.debug) console.log( "Starting game setup" );
            if (this.debug) console.log(gamedatas);

            // Various infos
            this.card_infos = gamedatas.card_infos;
            this.player_coins = parseInt(gamedatas.coins);
            this.auction.high_bid = parseInt(gamedatas.auction_bid);
            this.auction.winner = parseInt(gamedatas.auction_winner);
            this.possible_moves = gamedatas.moves;
            this.discount = parseInt(gamedatas.discount);
            this.gone_fishing = gamedatas.gone_fishing;
            this.constants = gamedatas.constants;

            // Setting up player boards
            for( var player_id in gamedatas.players )
            {
                // Player board
                var player = gamedatas.players[player_id];
                player.url = g_gamethemeurl;
                var player_board_div = $('player_board_' + player_id);
                dojo.place(this.format_block('jstpl_player_board', player), player_board_div);
                this.addTooltip('handcount_p' + player_id, _('Number of cards in hand'), '');
                this.addTooltip('handcount_icon_p' + player_id, _('Number of cards in hand'), '');
                this.addTooltip('first_player_p' + player_id, _('Starting player'), '');

                this.hand_counters[player_id] = new ebg.counter();
                this.hand_counters[player_id].create('handcount_p' + player_id);
                this.hand_counters[player_id].setValue(gamedatas.hand_cards[player_id] || 0);
                         
                // Player license cards
                // Create elements
                this.player_licenses[player_id] = [];
                for (var i = 0; i < 9; i++) {
                    var zone = new ebg.zone();
                    zone.create(this, 'license_' + player_id + '_' + i, this.license_width, this.license_height);
                    zone.setPattern('diagonal');
                    zone.autowidth = true;
                    zone.item_margin = 10;
                    this.addTooltipHtml('license_' + player_id + '_' + i, this.getCardTooltip(i));
                    this.player_licenses[player_id][i] = zone;
                }
                // Add owned licenses
                var licenses = gamedatas.licenses[player_id];
                for (var i in licenses) {
                    var card = licenses[i];
                    this.addPlayerLicense(player_id, card.type_arg, card.id, null);
                }

                // Player processed fish
                this.player_fish[player_id] = new ebg.zone();
                this.player_fish[player_id].create(this, 'playerfish_' + player_id,
                    this.fish_cube_size, this.fish_cube_size);
                this.player_fish[player_id].setPattern('horizontalfit');
                for (var i = 0; i < parseInt(gamedatas.processed_fish[player_id]); i++) {
                    this.processFishCube(null, player_id);
                }
                this.addTooltip('playerfish_' + player_id, _('Processed fish crates: $1 ea.'), '');

                // Player boat cards
                this.player_boats[player_id] = this.createStockBoat('playerboats_' + player_id, false);
                var boats = gamedatas.boats[player_id];
                for (var i in boats) {
                    var card = boats[i];
                    this.player_boats[player_id].addToStockWithId(card.type_arg, card.id);
                    if (parseInt(card.has_captain)) {
                        dojo.style('captain_' + card.id, 'display', 'block');
                    }

                    // Fish cubes
                    this.createFishZone(card.id);
                    for (var j = 0; j < parseInt(card.fish); j++) {
                        this.addFishCube(card.id, player_id);
                    }
                }
                dojo.connect(this.player_boats[player_id], 'onChangeSelection', this, 'onPlayerBoatsSelectionChanged');

                // Auction bid
                var bid = parseInt(player.bid);
                if (parseInt(player.done)) {
                    dojo.addClass('playerbid_' + player_id + '_wrap', 'flt_auction_done');
                } else if (parseInt(player.pass)) {
                    bid = 'pass';
                }
                this.auction.bids[player_id] = bid;
            }

            // First player token
            dojo.addClass('first_player_p' + gamedatas.first_player, 'flt_first_player');

            // Player coins
            if (!this.isSpectator) { // Spectator can't see anyone's coins
                this.coin_counter = new ebg.counter();
                this.coin_counter.create('coincount_p' + this.player_id);
                this.coin_counter.setValue(this.player_coins - this.discount);
                if (this.discount > 0) {
                    dojo.byId('discount_p' + this.player_id).textContent = '+' + this.discount;
                }
                this.addTooltip('coincount_icon_p' + this.player_id, _('Available money (+ any Shrimp bonus)'), '');
                this.addTooltip('coincount_p' + this.player_id, _('Available money (+ any Shrimp bonus)'), '');
                this.addTooltip('discount_p' + this.player_id, _('Available money (+ any Shrimp bonus)'), '');
            }

            // License Auction
            this.auction.card_id = parseInt(gamedatas.auction_card);
            this.auction.table = this.createStockLicense('auctiontable');
            this.auction.table.centerItems = true;
            for (var i in gamedatas.auction) {
                var card = gamedatas.auction[i];
                this.auction.table.addToStockWithId(card.type_arg, card.id);
            }
            dojo.connect(this.auction.table, 'onChangeSelection', this, 'onAuctionSelectionChanged');
            if (gamedatas.gamestate.name.indexOf('auction') == -1) {
                // Not auction phase, set table at bottom
                // TODO: player option
                dojo.place('auction', 'auction_bottom');
            }

            // Game counters
            // License deck
            this.license_counter = new ebg.counter();
            this.license_counter.create('licensecount');
            this.setCounterValue(this.license_counter, gamedatas.cards['licenses'] || 0);
            this.addTooltip('licenseicon', _('Number license cards remaining'), '');
            this.addTooltip('licensecount', _('Number license cards remaining'), '');
            // Boat deck
            this.boat_counter = new ebg.counter();
            this.boat_counter.create('boatcount');
            this.setCounterValue(this.boat_counter, gamedatas.cards['deck'] || 0);
            this.discard_counter = new ebg.counter();
            this.discard_counter.create('discardcount');
            this.setCounterValue(this.discard_counter, gamedatas.cards['discard'] || 0);
            this.addTooltip('boaticon', _('Number boat cards in deck / discard pile (automatically reshuffled)'), '');
            this.addTooltip('boatcount', _('Number boat cards in deck / discard pile (automatically reshuffled)'), '');
            this.addTooltip('discardcount', _('Number boat cards in deck / discard pile (automatically reshuffled)'), '');
            // Fish cubes
            this.fish_counter = new ebg.counter();
            this.fish_counter.create('fishcount');
            this.setCounterValue(this.fish_counter, gamedatas.fish_cubes);
            this.addTooltip('fishicon', _('Number fish crates remaining'), '');
            this.addTooltip('fishcount', _('Number fish crates remaining'), '');

            // Check for final round
            if (!gamedatas.cards['licenses']) {
                // Highlight empty deck
                dojo.style('licenseicon', {'opacity': '0.5', 'border': 'none'});
                dojo.style('licensecount', {'color': 'red', 'font-weight': 'bold'});
            }
            
            // Player hand
            if (!this.isSpectator) { // Spectator has no hand element
                this.player_hand = this.createStockBoat('myhand', true);
                this.player_hand.vertical_overlap = 0; // remove space for captains
                for (var i in gamedatas.hand) {
                    var card = gamedatas.hand[i];
                    this.player_hand.addToStockWithId(card.type_arg, card.id);
                }
                for (var i in gamedatas.draw) { // draw cards also show in hand
                    var card = gamedatas.draw[i];
                    this.player_hand.addToStockWithId(card.type_arg, card.id);
                }
                dojo.connect(this.player_hand, 'onChangeSelection', this, 'onPlayerHandSelectionChanged');
            } else {
                // Hide player hand area for spectator
                dojo.style('myhand_wrap', 'display', 'none');
            }
 
            // Setup game notifications to handle (see "setupNotifications" method below)
            this.setupNotifications();

            if (this.debug) console.log( "Ending game setup" );
        },
       

        ///////////////////////////////////////////////////
        //// Game & client states
        
        // onEnteringState: this method is called each time we are entering into a new game state.
        //                  You can use this method to perform some user interface changes at this moment.
        //
        onEnteringState: function( stateName, args )
        {
            if (this.debug) console.log( 'Entering state: '+stateName );
            if (this.debug) console.log(this.gamedatas.gamestate);

            // Highlight available actions and remove auction (will be displayed if needed)
            this.showPossibleMoves();
            this.hideAuction(stateName);

            switch( stateName )
            {
                case 'auction':
                    // Auction phase managed by client
                    // Set correct message and buttons based on current auction status
                    if (this.debug) {
                        var obj = {
                            winner: this.auction.winner,
                            player: this.player_id,
                            card: this.auction.card_id,
                            bid: this.auction.high_bid
                        }
                        console.log(obj);
                    }

                    this.client_state_args = {};
                    if (this.auction.winner) {
                        // Player won license auction
                        if (this.isCurrentPlayerActive()) {
                            // Current player is winner and must pay
                            this.client_state_args.fish_crates = 0;
                            this.client_state_args.cost = this.auction.high_bid - this.discount;
                            if (this.client_state_args.cost <= 0) {
                                // Shrimp discount enough that license is free (unlikely)
                                this.buyAction('buyLicense');
                            } else {
                                // Client state to pay cost
                                var desc = _('${you} must discard cards to pay');
                                desc += ' 0/' + this.client_state_args.cost
                                this.setClientState('client_auctionWin', {
                                    descriptionmyturn: desc
                                });
                            }
                        } else {
                            // Other player, just update title
                            var desc = _('${actplayer} must discard to pay');
                            desc += ' ' + this.auction.high_bid;
                            this.gamedatas.gamestate.description = desc;
                            this.updatePageTitle();
                        }
                    } else if (this.auction.card_id) {
                        // Active auction
                        // Client state to bid on selected license
                        var card = this.auction.table.getItemById(this.auction.card_id);
                        var card_info = this.card_infos[card.type];
                        if (this.debug) console.log(card);
                        if (this.debug) console.log(card_info);
                        var desc = _(card_info.name) + ': ' + _('${you} must bid or pass');
                        this.setClientState('client_auctionBid', {
                            descriptionmyturn: desc,
                            args: card_info
                        });
                    } else {
                        // First player to act in the round
                        // Client state to select license for bid
                        this.setClientState('client_auctionSelect', {
                            descriptionmyturn: _('${you} may select a license to bid on')
                        });
                    }
                    break;
                case 'client_auctionSelect':
                    // Player must select a card from auction table or pass
                    this.showActiveAuction();
                    this.auction.table.setSelectionMode(1);
                    break;
                case 'client_auctionBid':
                    // Player must bid or pass; all actions in status bar
                    this.showActiveAuction();
                    break;
                case 'client_auctionWin':
                    // Player must select card(s)/fish from hand
                    this.showActiveAuction();
                    this.safeSetSelectionMode(this.player_hand, 2);
                    this.client_state_args.fish_crates = 0;
                    break;
                case 'launch':
                    // Player may select card from hand
                    this.client_state_args = {};
                    this.safeSetSelectionMode(this.player_hand, 1);
                    break;
                case 'client_launchPay':
                    // Player must select card(s)/fish from hand
                    this.safeSetSelectionMode(this.player_hand, 2);
                    this.client_state_args.fish_crates = 0;
                    break;
                case 'hire':
                    // Player may select card from hand and boat in play
                    this.client_state_args = {};
                    this.safeSetSelectionMode(this.player_hand, 1);
                    this.safeSetSelectionMode(this.player_boats[this.player_id], 1);
                    break;
                case 'processing':
                    // Player may select fish from multiple boats
                    this.client_state_args = {fish_ids:[]};
                    break;
                case 'client_trading':
                    // Player may trade a fish crate
                    // Simple true/false action
                    break;
                case 'draw':
                    // Multiactive state but players not yet activated
                    // Handle in onUpdateActionButtons
                    break;
            }
        },

        // onLeavingState: this method is called each time we are leaving a game state.
        //                 You can use this method to perform some user interface changes at this moment.
        //
        onLeavingState: function( stateName )
        {
            if (this.debug) console.log( 'Leaving state: '+stateName );

            // Clear all selections
            this.auction.table.setSelectionMode(0);
            this.safeSetSelectionMode(this.player_hand, 0);
            this.safeSetSelectionMode(this.player_boats[this.player_id], 0);

            // Remove all highlights and other activated styling
            dojo.style('auctionbids', 'display', 'none');
            dojo.query('.flt_disabled').removeClass('flt_disabled');
            dojo.query('.flt_fish_selected').removeClass('flt_fish_selected');
            dojo.query('.flt_fish_selectable').removeClass('flt_fish_selectable');
            dojo.query('.flt_selectable').removeClass('flt_selectable');
            dojo.query('.flt_icon_fish').style('cursor', 'default');

            switch( stateName )
            {
                default:
                    // No special logic for any state
                    break;
            }               
        }, 

        // onUpdateActionButtons: in this method you can manage "action buttons" that are displayed in the
        //                        action status bar (ie: the HTML links in the status bar).
        //        
        onUpdateActionButtons: function( stateName, args )
        {
            if (this.debug) console.log( 'onUpdateActionButtons: '+stateName );
            if (this.debug) console.log(args);
                      
            if( this.isCurrentPlayerActive() )
            {            
                switch( stateName )
                {
                    case 'client_auctionSelect':
                        // Options: Pass/Go Fishin', depending on game options
                        if (this.gone_fishing) {
                            this.addActionButton('button_1', _("Go fishin' (pass)"), 'onPass');
                        } else {
                            this.addActionButton('button_1', _('Pass'), 'onPass');
                        }
                        break;
                    case 'client_auctionBid':
                        // Options: -1, +1, Bid, Pass
                        this.client_state_args.bid = this.auction.high_bid + 1; // minimum bid
                        if (this.debug) console.log(this.client_state_args);
                        if (this.debug) console.log(this.auction.high_bid);
                        if (this.debug) console.log(this.player_coins);
                        if (this.player_coins >= this.client_state_args.bid) {
                            // Player has enough coins to continue bidding
                            this.addActionButton('button_1', '-1', 'onMinusOne', null, false, 'gray');
                            var color = this.player_coins == this.client_state_args.bid ? 'gray' : 'blue';
                            this.addActionButton('button_2', '+1', 'onPlusOne', null, false, color);
                            this.addActionButton('button_3', _('Bid') + ': ' + this.client_state_args.bid, 'onBid');
                        }
                        this.addActionButton('button_4', _('Pass'), 'onPass');
                        break;
                    case 'client_auctionWin':
                        // Options: Discard selected
                        this.addActionButton('button_1', _('Discard selected'), 'onBuy', null, false, 'gray');
                        break;
                    case 'launch':
                        // Options: Pass
                        this.addActionButton('button_1', _('Pass'), 'onPass');
                        break;
                    case 'client_launchPay':
                        // Options: Discard selected, Cancel
                        this.addActionButton('button_1', _('Discard selected'), 'onBuy', null, false, 'gray');
                        this.addActionButton('button_2', _('Cancel'), 'onCancel', null, false, 'red');
                        break;
                    case 'hire':
                        // Options: Pass
                        this.addActionButton('button_1', _('Pass'), 'onPass');
                        break;
                    case 'processing':
                        // Multiactive state handling
                        this.possible_moves = args.moves;
                        this.showPossibleMoves();

                        if (args.trade) {
                            // Player passed processing and may trade
                            this.setClientState('client_trading', {
                                descriptionmyturn: _('${you} may trade a fish crate'),
                                args: args,
                            });
                        } else {
                            // Options: Pass, Cancel
                            this.addActionButton('button_1', _('Pass'), 'onProcess');
                            this.addActionButton('button_2', _('Cancel'), 'onCancel', null, false, 'red');
                        }
                        break;
                    case 'client_trading':
                        // Options: Trade, Pass
                        this.addActionButton('button_1', _('Trade'), 'onTrade');
                        this.addActionButton('button_2', _('Pass'), 'onPass');
                        break;
                    case 'draw':
                        // Options: NONE

                        // Not buttons, but due to timing of multiactive
                        // state cannot apply this logic in onEnteringState
                        // Highlight cards and set selection
                        this.showPossibleMoves();
                        this.safeSetSelectionMode(this.player_hand, 1);
                        break;
                }
            }
        },        

        ///////////////////////////////////////////////////
        //// Utility methods
        
        /*
         * Safely account for Spectator when manipulating stock selections
         * Needed for player hand and boats
         */
        safeSetSelectionMode: function(stock, mode)
        {
            if (!this.isSpectator) {
                stock.setSelectionMode(mode);
            }
        },

        /*
         * Set a counter value without going negative
         */
        setCounterValue: function(counter, val)
        {
            if (val < 0) {
                val = 0;
            }
            counter.setValue(val);
        },

        /*
         * Increment (pos/neg) a counter value without going negative
         */
        incCounterValue: function(counter, inc)
        {
            var val = counter.incValue(inc);
            if (val < 0) {
                counter.setValue(0);
            }
            return val <= 0;
        },

        /*
         * Build and display final score table
         */
        showFinalScore: function(args)
        {
            // Build color player names TODO: is there a builtin for this?
            var players = [];
            for (var player_id in this.gamedatas.players) {
                var player = this.gamedatas.players[player_id];
                player.name
                player.color
                players[player_id] = '<!--PNS--><span class="playername" style="color:#'+player.color+';">'+player.name+'</span><!--PNE-->';
            }

            // Populate score tables rows
            this.buildScoreRow('players', '', 'header', players)
            this.buildScoreRow('boat', _('Boats'), 'cell', args.boat)
            this.buildScoreRow('license', _('Licenses'), 'cell', args.license)
            this.buildScoreRow('fish', _('Fish'), 'cell', args.fish)
            this.buildScoreRow('bonus', _('Bonus'), 'cell', args.bonus)
            this.buildScoreRow('total', _('TOTAL'), 'header', args.total)

            // Display table
            dojo.style('final_score', 'display', 'block');
        },

        /*
         * Build scores for each player into a table row
         */
        buildScoreRow: function(row, label, jstpl, data)
        {
            var cells = '';
            for (var player_id in this.gamedatas.players) {
                // Add cell data player by player
                cells += this.format_block('jstpl_table_' + jstpl, {content: data[player_id]});
            }

            // Combine cells into row and set HTML
            var html = this.format_block('jstpl_table_row', {label: label, content: cells});
            dojo.byId('score_table_' + row).innerHTML = html;
        },

        /*
         * Put a license card onto the player's table
         */
        addPlayerLicense: function(player_id, card_type, card_id, src)
        {
            var zone_div = 'license_' + player_id + '_' + card_type;
            var license_div = zone_div + '_' + card_id;

            // Ensure player license zone is visible
            dojo.style(zone_div, 'display', 'inline-block');

            // Create player license object
            dojo.place(this.format_block('jstpl_license_zone', {
                player_id: player_id,
                card_type: card_type,
                card_id: card_id,
                x: this.license_width * (card_type % this.license_row_size),
                y: this.license_height * Math.floor(card_type / this.license_row_size),
            }), zone_div);

            if (src !== null) {
                // Place license on auction source
                this.placeOnObject(license_div, src);
            }

            // Add license
            this.player_licenses[player_id][card_type].placeInZone(license_div);

            // Show number hint if more than one license of this type owned
            var nbr_lic = this.player_licenses[player_id][card_type].getItemNumber();
            if (nbr_lic > 1) {
                dojo.query('div[id^="' + zone_div + '_"] > div').forEach(function(node) {
                    dojo.style(node, 'display', 'block');
                    node.textContent = '(' + nbr_lic + ')';
                });
            }
        },

        /*
         * Highligh all playable items identified by the server
         */
        showPossibleMoves: function()
        {
            // Only for active player
            if (!this.isCurrentPlayerActive() || this.possible_moves.length == 0)
                return;

            if (this.debug) console.log("POSSIBLE MOVES");
            if (this.debug) console.log(this.possible_moves);
            if (this.debug) console.log(this.gamedatas.gamestate.name);

            // Most states highlight cards and/or fish
            // Determine which by state and use helper functions to activate
            switch(this.gamedatas.gamestate.name)
            {
                case 'client_auctionSelect':
                    // Auction cards
                    this.updateSelectableCards(this.auction.table, true);
                    break;
                case 'client_auctionWin':
                    // Player hand and fish
                    this.updateSelectableCards(this.player_hand, false);
                    this.updateSelectableFish(this.player_id + '_fish_');
                    break;
                case 'launch':
                    // Player hand
                    this.updateSelectableCards(this.player_hand, true);
                    break;
                case 'client_launchPay':
                    // Player hand and fish
                    this.updateSelectableCards(this.player_hand, false);
                    this.updateSelectableFish(this.player_id + '_fish_');
                    break;
                case 'hire':
                    // Player hand and boats
                    this.updateSelectableCards(this.player_hand, true);
                    this.updateSelectableCards(this.player_boats[this.player_id], true);
                    break;
                case 'processing':
                    // Boat fish
                    this.updateSelectableFish('fish_' + this.player_id + '_');
                    break;
                case 'client_trading':
                    // Processed fish
                    this.updateSelectableFish(this.player_id + '_fish_');
                    break;
                case 'draw':
                    // Player hand
                    this.updateSelectableCards(this.player_hand, true);
                    break;
            }
        },

        /*
         * Highlight valid cards in a stock component, or all available
         */
        updateSelectableCards: function(stock, validate)
        {
            // Remove additional highlight on selected items
            var items = stock.getSelectedItems();
            for (var i in items) {
                var div = stock.getItemDivId(items[i].id);
                dojo.removeClass(div, 'flt_selectable');
            }

            // Highlight all (valid) others as blue possible moves
            items = stock.getUnselectedItems();
            for (var i in items) {
                var card = this.possible_moves[items[i].id];
                if (validate) {
                    // Skip if card is not given or not marked playable
                    if (card === undefined)
                        continue
                    if (card.hasOwnProperty('can_play') && !card.can_play)
                        continue
                }

                // Highlight
                var div = stock.getItemDivId(items[i].id);
                dojo.addClass(div, 'flt_selectable');
            }
        },

        /*
         * Highlight fish cubes for selection by element id
         */
        updateSelectableFish: function(prefix)
        {
            // id prefex determines which player and if fish are processed or not
            dojo.query('div[id^="' + prefix + '"]').forEach(function(node) {
                if (this.debug) console.log(node);
                if (!dojo.hasClass(node, 'flt_fish_selected')) {
                    // Highlight any fish not already selected
                    // Include cursor since these are not in a stock
                    dojo.addClass(node, 'flt_fish_selectable');
                    dojo.style(node, 'cursor', 'pointer');
                }
            });
        },

        /*
         * Create a zone for fish cubes on a launched boat
         */
        createFishZone: function(id)
        {
            if (this.debug) console.log('CREATE FISH: ' + id);
            if (this.debug) console.log($('fish_' + id));
            var zone = new ebg.zone();
            zone.create(this, 'fish_' + id, this.fish_cube_size, this.fish_cube_size);
            zone.setPattern('horizontalfit');
            this.fish_zones[id] = zone;
        },

        /*
         * Place a fish cube into the zone on the given card
         */
        addFishCube: function(card_id, player_id)
        {
            if (!this.fish_zones[card_id]) {
                // Zone creation as needed
                this.createFishZone(card_id);
            }

            // Verify boat capacity
            var nbr_fish = this.fish_zones[card_id].getItemNumber();
            if (nbr_fish == 4) {
                // This should not happen under normal circumstances
                this.showMessage('ERROR: Boat fish crates maxed out', 'error');
                return;
            }

            // Create and place cube
            var fish_div = 'fish_' + player_id + '_' + card_id + '_' + nbr_fish;
            dojo.place(this.format_block('jstpl_fish',
                {player_id:player_id, card_id:card_id, fish_id:nbr_fish}), 'fish_' + card_id);
            this.placeOnObject(fish_div, 'fishicon');
            this.fish_zones[card_id].placeInZone(fish_div);

            if (player_id == this.player_id) {
                // Player may be able to interact with this element later
                dojo.connect($(fish_div), 'onclick', this, 'onClickFishCube');
            }

            this.addTooltip(fish_div, _('Fish crate: +1VP'), '');
        },

        /*
         * Move fish cube from given card into player's processed fish zone
         */
        processFishCube: function(card_id, player_id)
        {
            if (card_id !== null) {
                // Get/verify fish cube id/number
                var card_fish = this.fish_zones[card_id].getItemNumber() - 1;
                if (card_fish < 0) {
                    // This should not happen under normal circumstances
                    this.showMessage('ERROR: No fish crates to process', 'error');
                    return;
                }

                // Fish cube to remove
                var src = 'fish_' + player_id + '_' + card_id + '_' + card_fish;
            } else {
                // No card specified (i.e. initial setup)
                var src = 'fishicon';
            }

            // Processed fish id
            var nbr_fish = this.player_fish[player_id].getItemNumber();
            var dest = player_id + '_fish_' + nbr_fish;

            // Create and place fish cube
            dojo.place(this.format_block('jstpl_pfish',
                {player_id:player_id, card_id:card_id, fish_id:nbr_fish}), 'playerfish_' + player_id);
            this.placeOnObject(dest, src);
            this.player_fish[player_id].placeInZone(dest);

            if (card_id !== null) {
                // Remove from previous location
                this.fish_zones[card_id].removeFromZone(src, true);
            }

            if (player_id == this.player_id) {
                // Player will be able to interact with this element later
                dojo.connect($(dest), 'onclick', this, 'onClickFishCube');
            }

            // This action can be taken mutiple times in one turn
            // Ensure normal sound is played as pieces move
            playSound('move');
        },

        /*
         * Remove a fish cube from the player's processed fish zone
         */
        removeFishCube: function(player_id)
        {
            // Get fish id and verify
            var zone = this.player_fish[player_id];
            var nbr_fish = zone.getItemNumber() - 1;
            if (nbr_fish < 0) {
                // This should not happen under normal circumstances
                this.showMessage("ERROR: No fish cubes to trade", 'error');
                return;
            }

            // Remove fish cube from game
            var fish_div = player_id + '_fish_' + nbr_fish;
            zone.removeFromZone(fish_div, true, 'site-logo');
        },

        /*
         * Create stock component for license cards
         */
        createStockLicense: function (div_id)
        {
            var stock = new ebg.stock();
            stock.create(this, $(div_id), this.license_width, this.license_height);
            stock.image_items_per_row = this.license_row_size;
            for (var i = 0; i < 10; i++) {
                stock.addItemType(i, i, '', i);
            }
            stock.setSelectionMode(0);
            stock.onItemCreate = dojo.hitch(this, 'setupLicenseDiv');
            stock.apparenceBorderWidth = '3px';
            return stock;
        },

        /*
         * Create stock component for boat cards
         */
        createStockBoat: function (div_id, is_hand)
        {
            var stock = new ebg.stock();
            stock.create(this, $(div_id), this.boat_width, this.boat_height);
            stock.image_items_per_row = this.card_art_row_size;
            var type, pos;
            for (type = 9, pos = 0; pos < 7; type++, pos++) {
                // Boat cards follow licenses in type order
                stock.addItemType(type, type, '', pos);
            }
            stock.setSelectionMode(0);
            stock.apparenceBorderWidth = '3px';

            // Set different tooltip depending on where the card is
            if (is_hand) {
                stock.onItemCreate = dojo.hitch(this, 'setupBoatDivHand');
            } else {
                stock.onItemCreate = dojo.hitch(this, 'setupBoatDivTable');
            }

            // Make room below card for captain cards to offset
            stock.vertical_overlap = -15;
            stock.use_vertical_overlap_as_offset = false;

            return stock;
        },

        /*
         * Add tooltip to license card
         */
        setupLicenseDiv: function(card_div, card_type_id, card_id)
        {
            this.addTooltipHtml(card_div.id, this.getCardTooltip(card_type_id));
            dojo.place(this.format_block('jstpl_license_stock', {
                x: this.license_width * (card_type_id % this.license_row_size),
                y: this.license_height * Math.floor(card_type_id / this.license_row_size),
            }), card_div.id);
        },

        /*
         * Add tooltip to boat card in hand
         */
        setupBoatDivHand: function(card_div, card_type_id, card_id)
        {
            this.setupBoatDiv(card_div, card_type_id, card_id, true);
        },

        /*
         * Add tooltip to launched boat card
         */
        setupBoatDivTable: function(card_div, card_type_id, card_id)
        {
            this.setupBoatDiv(card_div, card_type_id, card_id, false);
        },

        /*
         * Add tooltip to boat card depending on location
         */
        setupBoatDiv: function(card_div, card_type_id, card_id, is_hand)
        {
            if (is_hand) {
                this.addTooltipHtml(card_div.id, this.getCardTooltip(card_type_id, is_hand));
            } else {
                // Simple tooltips for launched boats
                var card = this.card_infos[card_type_id];
                this.addTooltip(card_div.id, _(card.name) + ': +' + card.points + _('VP'), '');
            }

            var player_id = parseInt(card_div.id.split('_')[1]);
            var id = card_id.split('_');
            id = id[id.length - 1];
            dojo.place(this.format_block('jstpl_boat', {
                id: id,
                x: this.boat_width * (card_type_id - 9),
                y: 0,
            }), card_div.id);
        },

        /*
         * Generate HTML tooltip for given card
         */
        getCardTooltip: function (card_type_id, is_hand)
        {
            // Get card info and copy to modify
            var card = dojo.clone(this.card_infos[card_type_id]);
            card.name = _(card.name); // i18n in template

            // Set tooltip text based on card type
            var txt = '';
            if (card.type == 'boat') {
                txt += "<p><b>" + _("Cost") + ":</b> $" + card.cost + "</p>";
                txt += "<p><b>" + _("Launch") + "</b> => " + card.points + _("VP") + "</p>";
                txt += "<p><b>" + _("Discard") + "</b> => $" + card.coins + "</p>";

                card.x = 2 * this.boat_width * (card_type_id - 9);
                card.y = 0;
            } else if (card.type == 'license') {
                txt += "<p><b>" + _("Min Cost") + ":</b> $" + card.cost + "</p>";
                txt += "<p>+" + card.points + _("VP") + "</p>";

                card.x = 2 * this.license_width * (card_type_id % this.license_row_size);
                card.y = 2 * this.license_height * Math.floor(card_type_id / this.license_row_size);
            } else if (card.type == 'bonus') {
                txt += "<p><b>" + _("Discard") + "</b> => $" + card.coins + "</p>";
                card.type = 'boat'; // for art class
                card.x = 2 * this.boat_width * (card_type_id - 9);
                card.y = 0;
            }

            // Add any special bonus text
            txt +=  _(card.text);
            card.text = txt;

            return this.format_block("jstpl_card_tooltip", card);
        },

        /*
         * Convenience method for executing ajax actions
         * Ensures lock is always set
         */
        ajaxAction: function (action, args)
        {
            if (!args) {
                args = [];
            }
            if (!args.hasOwnProperty('lock')) {
                args.lock = true;
            }
            var name = this.game_name;
            this.ajaxcall('/' + name + '/' + name + '/' + action + '.html',
                          args, this, function (result) {});
        },

        /*
         * Ensure the auction table is visible with updated information
         */
        showActiveAuction: function ()
        {
            //TODO: player option
            var node = $('auction').parentNode.id;
            if (node != 'auction_top') {
                // Slide auction block to top of screen
                dojo.place('auction', 'auction_top');
                this.placeOnObject('auction', 'auction_bottom');
                this.slideToObject('auction', 'auction_top').play();
                this.resetAuction();//TODO:double check after adding player option
            }

            // Update bids table
            // Use player tables list to always get all players
            for (var player in this.player_licenses) {
                var txt = this.auction.bids[player];
                if (!txt) {
                    txt = '-';
                }
                $('playerbid_' + player).textContent = txt;
            }

            // Show bids
            dojo.style('auctionbids', 'display', 'block');

            if (this.auction.card_id) {
                // Highlight currently selected license and fade others
                dojo.query('#auctiontable > .stockitem').addClass('flt_disabled');
                dojo.removeClass(this.auction.table.getItemDivId(this.auction.card_id), 'flt_disabled');
                this.auction.table.selectItem(this.auction.card_id);
            }
        },

        /*
         * Reset and move auction table out of the way when not needed
         */
        hideAuction: function(state)
        {
            if (state.indexOf('auction') != -1 || state == 'nextPlayer')  {
                // Do nothing if in auction or transition state
                return;
            }

            //TODO: player option
            var node = $('auction').parentNode.id;
            if (node != 'auction_bottom') {
                // Slide auction block to bottom of screen after other animation is complete
                var _this = this;
                setTimeout(function() {
                    // Can't just use animation delay because the placing needs to be delayed as well
                    dojo.place('auction', 'auction_bottom');
                    _this.placeOnObject('auction', 'auction_top');
                    _this.slideToObject('auction', 'auction_bottom').play();
                }, 1000);

                // Reset bidders for next round
                dojo.query('.flt_auction_done').removeClass('flt_auction_done');
                this.resetAuction();
            }
        },

        /*
         * Clear all auction variables
         */
        resetAuction: function(player_id)
        {
            if (player_id !== undefined) {
                // Remove player from auction
                dojo.addClass('playerbid_' + player_id + '_wrap', 'flt_auction_done');
            }

            // Reset auction globals
            this.auction.bids = [];
            this.auction.high_bid = 0;
            this.auction.card_id = 0;
            this.auction.winner = 0;
            this.auction.table.unselectAll();
        },

        ///////////////////////////////////////////////////
        //// Player's action
        
        /*
         * Player clicks card in auction stock
         */
        onAuctionSelectionChanged: function()
        {
            // Update highlights
            this.showPossibleMoves();
            var items = this.auction.table.getSelectedItems();

            if (items.length > 0) {
                if (this.checkAction('bid')) {
                    // Player can bid and selects card to bid on

                    // Verify state (should not be possible otherwise)
                    if (this.gamedatas.gamestate.name != 'client_auctionSelect') {
                        this.showMessage("ERROR: Invalid game state for bidding", 'error');
                        return;
                    }

                    // Verify player can bid
                    if (!this.possible_moves[items[0].id]) {
                        this.showMessage(_('You cannot afford the minimum cost for this license'), 'error');
                        this.auction.table.unselectAll();
                        return;
                    }

                    // Store selected card info
                    var card_info = this.card_infos[items[0].type];
                    var card_name = card_info['name'];
                    this.auction.card_id = items[0].id;
                    this.client_state_args.card_id = this.auction.card_id;
                    this.client_state_args.bid = card_info['cost'];

                    // Bid logic sets min at high_bid+1 so reduce it by one to start
                    // This will sort itself out through the bid action
                    this.auction.high_bid = card_info['cost'] - 1;

                    // Update page title and buttons for bidding
                    // Do not change state to allow player to change selection
                    this.gamedatas.gamestate.descriptionmyturn = _(card_name) + ': ' + _('${you} may open the bidding at') + ' ' + this.client_state_args.bid;
                    this.updatePageTitle();
                    this.removeActionButtons();
                    this.addActionButton('button_1', '-1', 'onMinusOne', null, false, 'gray');
                    this.addActionButton('button_2', '+1', 'onPlusOne');
                    this.addActionButton('button_3', _('Bid') + ': ' + this.client_state_args.bid, 'onBid');
                    if (this.gone_fishing) {
                        this.addActionButton('button_4', _("Go fishin' (pass)"), 'onPass');
                    } else {
                        this.addActionButton('button_4', _('Pass'), 'onPass');
                    }
                } else {
                    // Cannot select new auction card
                    this.auction.table.unselectAll();
                }
            } else if (this.checkAction('bid', true)) {
                // First player undid selection, change title and buttons back original options
                this.gamedatas.gamestate.descriptionmyturn = _('${you} may select a license to bid on'),
                this.updatePageTitle();
                this.removeActionButtons();
                if (this.gone_fishing) {
                    this.addActionButton('button_1', _("Go fishin' (pass)"), 'onPass');
                } else {
                    this.addActionButton('button_1', _('Pass'), 'onPass');
                }
            }
        },

        /*
         * Player discards a card
         */
        discardAction: function(card)
        {
            if (!this.checkAction('discard'))
                return;

            // Take discard action
            this.client_state_args.card_id = card.id;
            this.ajaxAction('discard', this.client_state_args);
        },

        /*
         * Update title and buttons based on current selections
         */
        updateBuy: function()
        {
            var items = this.player_hand.getSelectedItems();
            if (this.debug) console.log('UPDATE BUY');
            if (this.debug) console.log(items);

            // Count coins from currently selected cards and fish
            var coins = 0;
            for (var i in items) {
                var card = items[i];
                coins += this.card_infos[card.type]['coins'];
            }
            coins += this.client_state_args.fish_crates;

            // Update text with coins and enable button if it's enough to pay cost
            this.gamedatas.gamestate.descriptionmyturn = _('${you} must discard cards to pay') + ' ' + coins + '/' + this.client_state_args.cost;
            this.updatePageTitle();
            this.removeActionButtons();
            var color = coins >= this.client_state_args.cost ? 'blue' : 'gray';
            this.addActionButton('button_1', _('Discard selected'), 'onBuy', null, false, color);
            this.addActionButton('button_2', _('Cancel'), 'onCancel', null, false, 'red');
        },

        /*
         * Player clicks a card in their hand stock
         */
        onPlayerHandSelectionChanged: function()
        {
            // Update highlights
            this.showPossibleMoves();
            var items = this.player_hand.getSelectedItems();

            if (this.debug) console.log('hand select ' + this.gamedatas.gamestate.name);
            if (this.debug) console.log(items);

            // Every state does something different with cards in hand
            switch(this.gamedatas.gamestate.name)
            {
                case 'client_auctionWin':
                    // Cards used to pay cost, update count
                    this.updateBuy();
                    break;
                case 'launch':
                    // Card to be played as launched boat
                    if (this.checkAction('launchBoat') && items.length > 0) {
                        // Verify card
                        var card = items[0];
                        if (this.debug) console.log('launch select');
                        if (this.debug) console.log(card);
                        if (!this.possible_moves[card.id].can_play) {
                            // Not a valid boat to launch
                            this.showMessage(this.possible_moves[card.id].error, 'error');
                        } else {
                            // Clone info to modify properties
                            var card_info = dojo.clone(this.card_infos[card.type]);
                            if (this.debug) console.log(card_info);
                            card_info.cost -= this.discount; // Shrimp License reduction
                            if (this.debug) console.log(card_info);

                            // Store selected launch details
                            this.client_state_args.boat_id = card.id;
                            this.client_state_args.cost = card_info.cost;
                            this.client_state_args.boat_type = card.type;

                            // Update coin count for launched boat
                            this.coin_counter.incValue(-card_info.coins);

                            // Play boat card from hand
                            this.player_boats[this.player_id].addToStockWithId(
                                card.type,
                                card.id,
                                this.player_hand.getItemDivId(card.id)
                            );
                            this.player_hand.removeFromStockById(card.id);

                            if (card_info.cost <= 0) {
                                // Shrimp discount enough that launch is free, take action
                                this.buyAction('launchBoat');
                            } else {
                                // Play sound manually as card moves since no action is taken yet
                                playSound('move');

                                // Change client state to allow player to pay
                                var desc = _(card_info.name) + ': ' + _('${you} must discard cards to pay') + ' 0/${cost}';
                                this.setClientState('client_launchPay', {
                                    descriptionmyturn: desc,
                                    args: card_info
                                });
                            }
                        }
                    }

                    // Clear selection, always
                    this.player_hand.unselectAll();
                    break;
                case 'client_launchPay':
                    // Cards used to pay cost, update count
                    this.updateBuy();
                    break;
                case 'hire':
                    // Card played onto another boat as captain
                    if (items.length > 0 && this.checkAction('hireCaptain')) {
                        // Verify card can be played
                        if (!this.possible_moves[items[0].id]) {
                            this.showMessage(_('That card cannot be used to captain'), 'error');
                            this.player_hand.unselectAll();
                            break;
                        }

                        // Store selected card details
                        this.client_state_args.card_id = items[0].id;

                        if (this.client_state_args.boat_id) {
                            // Boat also selected, take action
                            this.hireCaptain();
                        }
                    } else {
                        // No selection, clear any stored card
                        delete this.client_state_args.card_id;
                    }
                    break;
                case 'draw':
                    // Card is discarded immediately
                    if (items.length > 0) {
                        if (!this.possible_moves[items[0].id]) {
                            this.showMessage(_('You must discard one of the two cards just drawn'), 'error');
                        } else {
                            this.discardAction(items[0]);
                        }
                    }
                    this.player_hand.unselectAll();
                    break;
                default:
                    // Other states have no interaction with player hand
                    this.player_hand.unselectAll();
                    break;
            }
        },

        /*
         * Player clicks on card in their boat stock during Hire Captains
         */
        onPlayerBoatsSelectionChanged: function()
        {
            // Update highlights
            this.showPossibleMoves();
            var items = this.player_boats[this.player_id].getSelectedItems();

            if (items.length > 0 && this.checkAction('hireCaptain')) {
                // Verify boat needs captain
                if (!this.possible_moves[items[0].id]) {
                    this.showMessage(_('That boat already has a captain'), 'error');
                    this.player_boats[this.player_id].unselectAll();
                    return;
                }

                // Store selected card details
                this.client_state_args.boat_id = items[0].id;

                if (this.client_state_args.card_id) {
                    // Captain also selected, take action
                    this.hireCaptain();
                }
            } else {
                // No selection, clear any stored card
                delete this.client_state_args.boat_id;
            }
        },

        /*
         * Player clicks on a fish cube somewhere
         */
        onClickFishCube: function(evt)
        {
            // Determine which type of fish cube clicked
            var div = evt.target.id;
            var is_processed = div.split('_')[0] == 'fish' ? false : true;

            var state = this.gamedatas.gamestate.name;
            if (this.debug) console.log('PROC FISH: ' + state);
            if (state == 'processing') { // Fish processed and moved to license area
                if (!this.checkAction('processFish', true)) {
                    // Ignore click if not the right time
                    return;
                }

                // Allow click to fall thru to card above
                dojo.stopEvent(evt);

                if (is_processed) {
                    // Wrong type
                    this.showMessage(_('You may only process fish crates from boats'), 'error');
                    return;
                }

                // Verify cube and its boat
                var cube = evt.currentTarget.id;
                var boat_id = cube.split('_')[2];
                if (this.client_state_args.fish_ids[boat_id]) {
                    this.showMessage(_('You may only process one fish crate per boat'), 'error');
                    return;
                }

                // Store id and animate fish cube
                this.client_state_args.fish_ids[boat_id] = true;
                this.processFishCube(boat_id, this.player_id);
                this.coin_counter.incValue(1);

                // Remove highlight from remaining fish on this boat
                dojo.query('div[id^="fish_' + this.player_id + '_' + boat_id + '_"]').removeClass('flt_fish_selectable');

                if (dojo.query('.flt_fish_selectable').length == 0) {
                    // All possible fish are processed, automatically take action
                    this.onProcess();
                }
            } else if (state == 'client_trading') { // Fish traded for card(s)
                if (!is_processed) {
                    // Wrong type
                    this.showMessage(_('You may only trade processed fish crates'), 'error');
                    return;
                }

                // Take action
                this.onTrade(evt);
            } else if (state == 'client_auctionWin' || state == 'client_launchPay') {
                // Fish used as coins for purchase
                if (!this.checkAction('buyLicense', true) && !this.checkAction('launchBoat', true))
                    return;

                dojo.stopEvent(evt);

                if (!is_processed) {
                    // Wrong type
                    this.showMessage(_('You may only trade processed fish crates'), 'error');
                    return;
                }

                // Update highlights
                dojo.toggleClass(evt.currentTarget, 'flt_fish_selectable');
                dojo.toggleClass(evt.currentTarget, 'flt_fish_selected');

                // Store number fish and update buy status
                this.client_state_args.fish_crates = dojo.query('.flt_fish_selected').length;
                this.updateBuy();
            }
        },

        /*
         * Player clicks 'Pass' button
         */
        onPass: function(evt)
        {
            dojo.stopEvent(evt);
            if (!this.checkAction('pass'))
                return;

            if (this.gamedatas.gamestate.name == 'client_auctionSelect') {
                // Player chooses to pass auction phase
                this.resetAuction(this.player_id);
            }

            // Take action
            this.client_state_args = {};
            this.ajaxAction('pass');
        },

        /*
         * Player clicks '+1' button
         */
        onPlusOne: function(evt)
        {
            dojo.stopEvent(evt);

            // Increment bid
            this.client_state_args.bid += 1;

            if (this.debug) console.log('PLUS ONE: ' + this.client_state_args.bid);

            // Verify bid is at/below max
            var max_bid = this.player_coins;
            if (this.client_state_args.bid > max_bid) {
                this.showMessage(_('You cannot bid more than ') + max_bid, 'error');
                this.client_state_args.bid = max_bid;
            }

            // Update buttons if at min/max bid
            if (this.client_state_args.bid == max_bid) {
                // "Disable" +1 button
                dojo.removeClass('button_2', 'bgabutton_blue');
                dojo.addClass('button_2', 'bgabutton_gray');
            }
            if (this.client_state_args.bid < max_bid) {
                // "Enabe" -1 button
                dojo.removeClass('button_1', 'bgabutton_gray');
                dojo.addClass('button_1', 'bgabutton_blue');
            }

            // Update button text with current bid
            $('button_3').textContent = _('Bid') + ': ' + this.client_state_args.bid;
        },

        /*
         * Player clicks '-1' button
         */
        onMinusOne: function(evt)
        {
            dojo.stopEvent(evt);

            // Decrement bid
            this.client_state_args.bid -= 1;

            if (this.debug) console.log('MINUS ONE: ' + this.client_state_args.bid);

            // Verify bid is at/above min
            var min_bid = this.auction.high_bid + 1;
            if (this.client_state_args.bid < min_bid) {
                this.showMessage(_('You must bid at least ') + min_bid, 'error');
                this.client_state_args.bid = min_bid;
            }

            // Update buttons if at min/max bid
            if (this.client_state_args.bid == min_bid) {
                // "Disable" -1 button
                dojo.removeClass('button_1', 'bgabutton_blue');
                dojo.addClass('button_1', 'bgabutton_gray');
            }
            if (this.client_state_args.bid < this.player_coins) {
                // "Enabe" +1 button
                dojo.removeClass('button_2', 'bgabutton_gray');
                dojo.addClass('button_2', 'bgabutton_blue');
            }

            // Update button text with current bid
            $('button_3').textContent = _('Bid') + ': ' + this.client_state_args.bid;
        },

        /*
         * Player clicks 'Bid' button
         */
        onBid: function(evt)
        {
            dojo.stopEvent(evt);
            if (!this.checkAction('bid'))
                return;

            // Take action
            this.ajaxAction('bid', this.client_state_args);
        },

        /*
         * Player clicks 'Discard selected' button
         */
        onBuy: function(evt)
        {
            dojo.stopEvent(evt);

            // Determine action from state
            var state = this.gamedatas.gamestate.name;
            if (state == 'client_auctionWin') {
                var action = 'buyLicense';
            } else if (state == 'client_launchPay') {
                var action = 'launchBoat';
            } else {
                // This should not happen under normal circumstances
                this.showMessage('ERROR: Impossible buy action', 'error');
                return;
            }

            // Take action
            this.buyAction(action);
        },

        /*
         * Player takes buy action from clicking button or automatically
         */
        buyAction: function(action)
        {
            if (!this.checkAction(action))
                return;

            // Store selected cards
            var items = this.player_hand.getSelectedItems();
            this.client_state_args.card_ids = '';
            for (var i in items) {
                this.client_state_args.card_ids += items[i].id + ';';
            }

            // Selected fish cubes and those actually removed may differ for ease of bookkeeping
            // Remove selection early to avoid confusion
            dojo.query('.flt_fish_selected').removeClass('flt_fish_selected')

            // Take action
            this.ajaxAction(action, this.client_state_args);
        },

        /*
         * Player selects both card in hand and on board
         */
        hireCaptain: function()
        {
            if (!this.checkAction('hireCaptain'))
                return;

            if (this.debug) console.log(this.client_state_args);

            // Take actions
            this.ajaxAction('hireCaptain', this.client_state_args);
        },

        /*
         * Player clicks 'Pass' button during Processing
         */
        onProcess: function(evt)
        {
            if (!this.checkAction('processFish'))
                return;

            // Store ids of any fish player selected
            this.client_state_args.card_ids = '';
            for (var id in this.client_state_args.fish_ids) {
                this.client_state_args.card_ids += id + ';';
            }

            // Take action
            this.ajaxAction('processFish', this.client_state_args);

            // Move immediately to trading
            this.setClientState('client_trading', {
                descriptionmyturn: _('${you} may trade a fish crate'),
                args: {'moves': [true]},
            });
        },

        /*
         * Player clicks 'Trade' button or fish cube
         */
        onTrade: function(evt)
        {
            if (!this.checkAction('tradeFish', true)) {
                // Ignore click if not the right time
                return;
            }

            // Allow click to fall thru to card above
            dojo.stopEvent(evt);

            // Take action
            this.ajaxAction('tradeFish', null);
        },

        /*
         * Player clicks 'Cancel' button
         */
        onCancel: function(evt)
        {
            dojo.stopEvent(evt);

            // Undo any previous actions from this state
            var state = this.gamedatas.gamestate.name;
            if (this.debug) console.log('CANCEL: ' + state);

            if (state == 'client_launchPay') {
                // Undo boat launch
                // Move boat back from table to hand
                var card_id = this.client_state_args.boat_id
                this.player_hand.addToStockWithId(
                    this.client_state_args.boat_type,
                    this.client_state_args.boat_id,
                    this.player_boats[this.player_id].getItemDivId(this.client_state_args.boat_id)
                );
                this.player_boats[this.player_id].removeFromStockById(this.client_state_args.boat_id);
                this.coin_counter.incValue(this.card_infos[this.client_state_args.boat_type].coins);
                delete this.client_state_args.boat_id; // clear args
            } else if (state == 'processing') {
                if (this.debug) console.log('UNDO PROC');
                // Undo fish crate processing
                // Move fish back from license area to boat
                // To simplify things this just discards the processed fish and re-adds new ones
                // (without actually taking them from the pile - this is just visual)
                for (var card_id in this.client_state_args.fish_ids) {
                    if (this.debug) console.log('READD FISH ' + card_id);
                    this.removeFishCube(this.player_id);
                    this.addFishCube(card_id, this.player_id);
                    this.coin_counter.incValue(-1);
                }
            }

            // Unselect any fish cubes
            dojo.query('.flt_fish_selected').removeClass('flt_fish_selected')

            // Manually play sound as elements move
            playSound('move');

            // Reset to main state
            this.restoreServerGameState();
        },
        
        ///////////////////////////////////////////////////
        //// Reaction to cometD notifications

        /*
            setupNotifications:
            
            In this method, you associate each of your game notifications with your local method to handle it.
            
            Note: game notification names correspond to "notifyAllPlayers" and "notifyPlayer" calls in
                  your fleet.game.php file.
        
        */
        setupNotifications: function()
        {
            if (this.debug) console.log( 'notifications subscriptions setup' );
            
            dojo.subscribe('firstPlayer', this, 'notif_firstPlayer');
            this.notifqueue.setSynchronous('firstPlayer', 1000);
            dojo.subscribe('pass', this, 'notif_pass');
            dojo.subscribe('possibleMoves', this, 'notif_possibleMoves');
            dojo.subscribe('auctionSelect', this, 'notif_auctionSelect');
            dojo.subscribe('auctionBid', this, 'notif_auctionBid');
            dojo.subscribe('auctionWin', this, 'notif_auctionWin');
            dojo.subscribe('buyLicense', this, 'notif_buyLicense');
            this.notifqueue.setSynchronous('buyLicense', 1000);
            dojo.subscribe('drawLicenses', this, 'notif_drawLicenses');
            this.notifqueue.setSynchronous('drawLicense', 500);
            dojo.subscribe('launchBoat', this, 'notif_launchBoat');
            dojo.subscribe('hireCaptain', this, 'notif_hireCaptain');
            this.notifqueue.setSynchronous('hireCaptain', 750);
            dojo.subscribe('fishing', this, 'notif_fishing');
            this.notifqueue.setSynchronous('fishing', 1000);
            dojo.subscribe('processFish', this, 'notif_processFish');
            dojo.subscribe('tradeFish', this, 'notif_tradeFish');
            dojo.subscribe('drawLog', this, 'notif_drawLog');
            dojo.subscribe('draw', this, 'notif_draw');
            this.notifqueue.setSynchronous('draw', 1000);
            dojo.subscribe('discardLog', this, 'notif_discardLog');
            dojo.subscribe('discard', this, 'notif_discard');
            this.notifqueue.setSynchronous('discard', 500);
            dojo.subscribe('finalRound', this, 'notif_finalRound');
            this.notifqueue.setSynchronous('finalRound', 1500);
            dojo.subscribe('bonusScore', this, 'notif_bonusScore');
            dojo.subscribe('finalScore', this, 'notif_finalScore');
        },  
        
        /*
         * Message when first player token rotates
         */
        notif_firstPlayer: function(notif)
        {
            if (this.debug) console.log('notify_firstPlayer');
            if (this.debug) console.log(notif);

            var durration = 1000; // 1s animation

            // Clear existing token
            dojo.query('.flt_first_player').removeClass('flt_first_player');
            var curr = 'first_anchor_p' + notif.args.current_player_id;
            var next = 'first_anchor_p' + notif.args.next_player_id;

            // Create temporary token to animate rotation
            var tmp = '<div id="tmp_first_token" style="z-index:99" class="flt_icon_first flt_first_player"></div>';
            this.slideTemporaryObject(tmp, 'overall_player_board_' + notif.args.current_player_id, curr, next, durration, 0);

            // Show token for next player after animation finishes
            setTimeout(function() {
                dojo.addClass('first_player_p' + notif.args.next_player_id, 'flt_first_player');
            }, durration);
        },

        /*
         * Message when player passes
         */
        notif_pass: function (notif)
        {
            if (this.debug) console.log('notify_pass');
            if (this.debug) console.log(notif);

            if (notif.args.in_auction) {
                // Player passes during auction
                this.auction.bids[parseInt(notif.args.player_id)] = 'pass';
                if (notif.args.auction_done) {
                    // Player passes entirely
                    this.resetAuction(notif.args.player_id);
                    if (notif.args.card) {
                        // Player chose Gone Fishin'
                        this.hand_counters[notif.args.player_id].incValue(1);
                        if (notif.args.player_id == this.player_id) {
                            this.player_hand.addToStockWithId(notif.args.card.type_arg, notif.args.card.id, 'boatcount');
                            this.coin_counter.incValue(2);
                        }
                    }
                }
            }
        },

        /*
         * Private message with possible moves for active player
         */
        notif_possibleMoves: function (notif)
        {
            if (this.debug) console.log('notify_possibleMoves');
            if (this.debug) console.log(notif);
            this.possible_moves = notif.args.moves;
            this.player_coins = parseInt(notif.args.coins);
            this.coin_counter.setValue(this.player_coins - this.discount);
        },

        /*
         * Message when player chooses card for auction
         */
        notif_auctionSelect: function (notif)
        {
            if (this.debug) console.log('notify_auctionSelect');
            if (this.debug) console.log(notif);
            this.auction.card_id = parseInt(notif.args.card_id);
        },

        /*
         * Message when player bids in auction
         */
        notif_auctionBid: function (notif)
        {
            if (this.debug) console.log('notify_auctionBid');
            if (this.debug) console.log(notif);
            this.auction.bids[parseInt(notif.args.player_id)] = parseInt(notif.args.bid);
            this.auction.high_bid = parseInt(notif.args.bid);
        },
        
        /*
         * Message when player wins auction
         */
        notif_auctionWin: function (notif)
        {
            if (this.debug) console.log('notify_auctionWin');
            if (this.debug) console.log(notif);
            this.auction.winner = parseInt(notif.args.player_id);
            this.auction.bids[this.auction.winner] = parseInt(notif.args.bid);
            this.auction.high_bid = parseInt(notif.args.bid);
        },

        /*
         * Message when player buys license from auction
         */
        notif_buyLicense: function (notif)
        {
            if (this.debug) console.log('notify_buyLicense');
            if (this.debug) console.log(notif);

            if (notif.args.player_id == this.player_id) {
                // Discard from hand
                for (var i in notif.args.card_ids) {
                    // Update coin count for spent cards
                    var card = this.player_hand.getItemById(notif.args.card_ids[i]);
                    this.coin_counter.incValue(-this.card_infos[card.type].coins);
                    // Do not update display to avoid ghosting
                    this.player_hand.removeFromStockById(notif.args.card_ids[i], 'boatcount', true);
                }
                this.player_hand.updateDisplay(); // now update everything

                // Update coin count for spent fish
                this.coin_counter.incValue(-notif.args.nbr_fish);

                // Check for bonuses
                if (notif.args.license_type == this.constants.shrimp) {
                    // Each Shrimp Licenses increases transaction discount
                    this.discount += 1;
                    dojo.byId('discount_p' + this.player_id).textContent = '+' + this.discount;
                }
            } else {
                // Animate cards from other player
                this.slideTemporaryObject(this.format_block('jstpl_captain', {id:999}),
                    'flt_counters', 'player_board_' + notif.args.player_id, 'boaticon');
            }

            // Remove any traded fish crates
            for (var i = 0; i < parseInt(notif.args.nbr_fish); i++) {
                this.removeFishCube(notif.args.player_id);
            }

            // Remove discards from hand count
            this.hand_counters[notif.args.player_id].incValue(-notif.args.card_ids.length);
            this.discard_counter.incValue(notif.args.discards - this.discard_counter.getValue());

            // Player takes license card
            var src = this.auction.table.getItemDivId(notif.args.license_id);
            this.addPlayerLicense(notif.args.player_id, notif.args.license_type, notif.args.license_id, src)
            this.auction.table.removeFromStockById(notif.args.license_id);

            // Score VP from license
            this.scoreCtrl[notif.args.player_id].incValue(notif.args.points);

            // Clear auction vars
            this.resetAuction(notif.args.player_id);
        },

        /*
         * Message when new cards are drawn into auction
         */
        notif_drawLicenses: function (notif)
        {
            if (this.debug) console.log('notify_drawLicenses');
            if (this.debug) console.log(notif);

            if (notif.args.discard) {
                // Discards all current cards
                this.auction.table.removeAllTo('site-logo');
            }

            // Add new card(s)
            for (var i in notif.args.cards) {
                var card = notif.args.cards[i];
                this.auction.table.addToStockWithId(card.type_arg, card.id, 'licensecount');
                if (this.incCounterValue(this.license_counter, -1)) {
                    // Last license drawn, highlight empty deck
                    dojo.style('licenseicon', {'opacity': '0.5', 'border': 'none'});
                    dojo.style('licensecount', {'color': 'red', 'font-weight': 'bold'});
                }
            }
        },
        
        /*
         * Message when a player launches a boat
         */
        notif_launchBoat: function (notif)
        {
            if (this.debug) console.log('notify_launchBoat');
            if (this.debug) console.log(notif);

            if (notif.args.player_id == this.player_id) {
                // Play launch boat from hand if not already done (i.e. replay)
                if (!$(this.player_boats[this.player_id].getItemDivId(notif.args.boat_id))) {
                    this.player_boats[this.player_id].addToStockWithId(
                        notif.args.boat_type,
                        notif.args.boat_id,
                        this.player_hand.getItemDivId(notif.args.boat_id)
                    );

                    this.player_hand.removeFromStockById(notif.args.boat_id);
                }

                // Update coin count for spent fish
                this.coin_counter.incValue(-notif.args.nbr_fish);

                // Discard from hand
                for (var i in notif.args.card_ids) {
                    // Update coin count for spent cards
                    var card = this.player_hand.getItemById(notif.args.card_ids[i]);
                    this.coin_counter.incValue(-this.card_infos[card.type].coins);

                    // Do not update display to avoid ghosting
                    this.player_hand.removeFromStockById(notif.args.card_ids[i], 'boatcount', true);
                }
                this.player_hand.updateDisplay(); // now update everything
            } else {
                // Animate cards from other player
                // Boat
                this.player_boats[notif.args.player_id].addToStockWithId(
                    notif.args.boat_type,
                    notif.args.boat_id,
                    'overall_player_board_' + notif.args.player_id
                );
                // Discard
                if (notif.args.nbr_cards != 0) {
                    this.slideTemporaryObject(this.format_block('jstpl_captain', {id:999}),
                        'flt_counters', 'player_board_' + notif.args.player_id, 'boaticon');
                }
            }

            // Remove discards and launch from hand count
            this.hand_counters[notif.args.player_id].incValue(-notif.args.card_ids.length-1);
            this.discard_counter.incValue(notif.args.discards - this.discard_counter.getValue());

            // Score VP from boat
            this.scoreCtrl[notif.args.player_id].incValue(notif.args.points);

            // Remove any traded fish crates
            for (var i = 0; i < parseInt(notif.args.nbr_fish); i++) {
                this.removeFishCube(notif.args.player_id);
            }
        },

        /*
         * Message when player hires a captain
         */
        notif_hireCaptain: function (notif)
        {
            if (this.debug) console.log('notify_hireCaptain');
            if (this.debug) console.log(notif);

            // Prepare to show captain card back after animations
            // Need to set display and use opacity so div exists for animations
            dojo.style('captain_' + notif.args.boat_id, 'opacity', '0');
            dojo.style('captain_' + notif.args.boat_id, 'display', 'block');

            if (notif.args.player_id == this.player_id) {
                // Update coin count for used captain
                var card = this.player_hand.getItemById(notif.args.card_id);
                this.coin_counter.incValue(-this.card_infos[card.type].coins);

                // Flip card over
                var div = this.player_hand.getItemDivId(notif.args.card_id);
                var node = dojo.query('#' + div + ' > .flt_boat_wrap')[0];
                node.style['transform'] = 'rotateY(180deg)';

                // Player plays card onto boat (delay for flip anim)
                var _this = this;
                setTimeout(function() {
                    _this.player_hand.removeFromStockById(notif.args.card_id, 'captain_' + notif.args.boat_id);
                }, 500);

                var delay = 950;
            } else {
                // Animate cards from other player
                // Do it the hard way because slideTemporaryObject does not line up correctly
                dojo.place(this.format_block('jstpl_captain', {id:999}), 'player_board_' + notif.args.player_id);
                this.placeOnObject('tmp_captain_999', 'player_board_' + notif.args.player_id);
                this.slideToObjectAndDestroy('tmp_captain_999', 'captain_' + notif.args.boat_id, 500, 0);
                var delay = 500;
            }

            // Show captain card after animations
            setTimeout(function() {
                dojo.style('captain_' + notif.args.boat_id, 'opacity', '1');
            }, delay);

            // Remove captain card from hand count
            this.hand_counters[notif.args.player_id].incValue(-1);
        },

        /*
         * Message when fish cubes are distributed
         */
        notif_fishing: function (notif)
        {
            if (this.debug) console.log('notify_fishing');
            if (this.debug) console.log(notif);

            // Add fish too boat card(s)
            for (var i in notif.args.card_ids) {
                this.addFishCube(notif.args.card_ids[i], notif.args.player_id);
            }

            // Update counter
            if (this.incCounterValue(this.fish_counter, -notif.args.nbr_fish)) {
                // Last fish crate taken
                dojo.style('fishicon', 'opacity', '0.5');
                dojo.style('fishcount', {'color': 'red', 'font-weight': 'bold'});
            }

            // Score 1 VP per fish crate
            this.scoreCtrl[notif.args.player_id].incValue(notif.args.nbr_fish);
        },

        /*
         * Message when player proceses a fish crate
         */
        notif_processFish: function (notif)
        {
            if (this.debug) console.log('notify_processFish');
            if (this.debug) console.log(notif);

            if (this.client_state_args.fish_ids == undefined ||
                this.client_state_args.fish_ids[notif.args.card_ids[0]] == undefined)
            {
                // Current player already moved fish and has record of it in fish_ids
                // Other players (or during replay) need to play moves
                for (var i in notif.args.card_ids) {
                    this.processFishCube(notif.args.card_ids[i], notif.args.player_id);
                }
            }

            // Score -1 VP per fish crate removed
            this.scoreCtrl[notif.args.player_id].incValue(-notif.args.nbr_fish);
        },

        /*
         * Message when player trades a processed fish crate
         */
        notif_tradeFish: function (notif)
        {
            if (this.debug) console.log('notify_tradeFish');
            if (this.debug) console.log(notif);

            this.removeFishCube(notif.args.player_id);
            if (notif.args.player_id == this.player_id) {
                this.coin_counter.incValue(-1);
            }
            // Card draw handled separately
        },

        /*
         * Private message when player draws card(s)
         */
        notif_draw: function (notif)
        {
            if (this.debug) console.log('notify_draw');
            if (this.debug) console.log(notif);

            // Add cards
            for (var i in notif.args.cards) {
                var card = notif.args.cards[i];
                this.player_hand.addToStockWithId(card.type_arg, card.id, 'boatcount');
                this.coin_counter.incValue(this.card_infos[card.type_arg].coins);
            }
        },

        /*
         * Message when any player draws cards
         * No card details provided
         */
        notif_drawLog: function (notif)
        {
            if (this.debug) console.log('notify_drawLog');
            if (this.debug) console.log(notif);

            // Update deck counter
            if (notif.args.shuffle) {
                this.boat_counter.setValue(notif.args.deck_nbr);
                this.discard_counter.setValue(0);
            } else {
                this.boat_counter.incValue(-notif.args.nbr);
            }

            // Update player hand counter
            this.hand_counters[notif.args.player_id].incValue(notif.args.nbr);

            if (notif.args.player_id != this.player_id) {
                // Animate draw for other players
                this.slideTemporaryObject(this.format_block('jstpl_captain', {id:999}),
                    'flt_counters', 'boaticon', 'player_board_' + notif.args.player_id);
            }
        },

        /*
         * Message when any player discards a card
         */
        notif_discardLog: function (notif)
        {
            if (this.debug) console.log('notify_discardLog');
            if (this.debug) console.log(notif);

            // Update player hand counter
            this.hand_counters[notif.args.player_id].incValue(-1);
            this.discard_counter.incValue(1);
            // since this is multiactive do not animate to simplify things
        },

        /*
         * Private message when player discards a card
         */
        notif_discard: function (notif)
        {
            if (this.debug) console.log('notify_discard');
            if (this.debug) console.log(notif);

            // Discard selected
            var card = this.player_hand.getItemById(notif.args.discard.id);
            this.player_hand.removeFromStockById(notif.args.discard.id, 'boaticon');
            this.coin_counter.incValue(-this.card_infos[notif.args.discard.type_arg].coins);

            // Multiactive state may not move on immediately
            // Clear highlights manually as soon as possible
            dojo.query('.flt_selectable').removeClass('flt_selectable');
        },

        /*
         * Message when final round is triggered
         */
        notif_finalRound: function(notif)
        {
            if (this.debug) console.log('notif_finalRound');
            if (this.debug) console.log(notif);

            // Alert players
            this.showMessage(_('This is the last round!'), 'info');

            // Highlight empty license deck
            dojo.style('licenseicon', 'opacity', '0.5');
            dojo.style('licensecount', {'color': 'red', 'font-weight': 'bold'});
        },

        /*
         * Message when bonus points are computed
         */
        notif_bonusScore: function(notif)
        {
            if (this.debug) console.log('notif_bonusScore');
            if (this.debug) console.log(notif);
            // Log message and update score
            this.scoreCtrl[notif.args.player_id].incValue(notif.args.points);
        },

        /*
         * Message when final scores are computed
         */
        notif_finalScore: function(notif)
        {
            if (this.debug) console.log('notif_finalScore');
            if (this.debug) console.log(notif);

            // Display final scores by category in table
            this.showFinalScore(notif.args);
        },
   });             
});
