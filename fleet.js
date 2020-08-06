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
            this.auction = {bids:[]};
            this.playerHand = null;
            this.boat_width = 100;
            this.boat_height = 143;
            this.boat_row_size = 7;
            this.license_width = 180;
            this.license_height = 125;
            this.license_row_size = 5;
            this.license_counter = null;
            this.boat_counter = null;
            this.fish_counter = null;
            this.hand_counters = [];
            this.client_state_args = {};
            this.card_infos = null;
            this.player_coins = 0;
            this.player_licenses = [];
            this.player_boats = [];
            this.possible_moves = null;
            this.fish_zones = [];
            this.player_fish = [];
            this.draw_table = null;
            this.discount = 0;
            this.hand_discard = false;
            this.gone_fishing = false;
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

            this.card_infos = gamedatas.card_infos;
            this.player_coins = parseInt(gamedatas.coins);
            this.auction.high_bid = parseInt(gamedatas.auction_bid);
            this.auction.winner = parseInt(gamedatas.auction_winner);
            this.possible_moves = gamedatas.moves;
            this.discount = parseInt(gamedatas.discount);
            this.hand_discard = gamedatas.hand_discard;
            this.gone_fishing = gamedatas.gone_fishing;
            
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
                this.player_licenses[player_id] = [];
                for (var i = 0; i < 9; i++) {
                    var zone = new ebg.zone();
                    zone.create(this, 'license_' + player_id + '_' + i, this.license_width, this.license_height);
                    zone.setPattern('diagonal');
                    zone.autowidth = true;
                    this.addTooltipHtml('license_' + player_id + '_' + i, this.getCardTooltip(i));
                    this.player_licenses[player_id][i] = zone;
                }
                var licenses = gamedatas.licenses[player_id];
                for (var i in licenses) {
                    var card = licenses[i];
                    this.addPlayerLicense(player_id, card.type_arg, card.id, null);
                }

                // Player processed fish
                this.player_fish[player_id] = new ebg.zone();
                this.player_fish[player_id].create(this, 'playerfish_' + player_id, 30, 30); //TODO: width/height
                this.player_fish[player_id].setPattern('horizontalfit');
                for (var i = 0; i < parseInt(gamedatas.processed_fish[player_id]); i++) {
                    this.processFishCube(null, player_id);
                }

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

                // Auction
                var bid = parseInt(player.bid);
                if (parseInt(player.done)) {
                    dojo.addClass('playerbid_' + player_id + '_wrap', 'flt_auction_done');
                } else if (parseInt(player.pass)) {
                    bid = 'pass';
                }
                this.auction.bids[player_id] = bid;
            }

            // First player
            dojo.addClass('first_player_p' + gamedatas.first_player, 'flt_first_player');

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

            // Draw area
            this.draw_table = this.createStockBoat('drawarea', true);
            this.draw_table.vertical_overlap = 0; // remove space for captains
            for (var i in gamedatas.draw) {
                var card = gamedatas.draw[i];
                this.draw_table.addToStockWithId(card.type_arg, card.id);
            }
            dojo.connect(this.draw_table, 'onChangeSelection', this, 'onDrawSelectionChanged');

            this.license_counter = new ebg.counter();
            this.license_counter.create('licensecount');
            this.setCounterValue(this.license_counter, gamedatas.cards['licenses'] || 0);
            if (!gamedatas.cards['licenses']) {
                // Final round
                dojo.style('licenseicon', {'opacity': '0.5', 'border': 'none'});
                dojo.style('licensecount', {'color': 'red', 'font-weight': 'bold'});
            }
            this.boat_counter = new ebg.counter();
            this.boat_counter.create('boatcount');
            this.setCounterValue(this.boat_counter, gamedatas.cards['deck'] || 0);
            this.fish_counter = new ebg.counter();
            this.fish_counter.create('fishcount');
            this.setCounterValue(this.fish_counter, gamedatas.fish_cubes);
            
            // Player hand
            if (!this.isSpectator) { // Spectator has no hand element
                this.playerHand = this.createStockBoat('myhand', true);
                this.playerHand.vertical_overlap = 0; // remove space for captains
                for (var i in gamedatas.hand) {
                    var card = gamedatas.hand[i];
                    this.playerHand.addToStockWithId(card.type_arg, card.id);
                }
                dojo.connect(this.playerHand, 'onChangeSelection', this, 'onPlayerHandSelectionChanged');
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

            this.showPossibleMoves();
            this.hideAuction(stateName);

            switch( stateName )
            {
                case 'auction':
                    // Auction phase managed by client
                    // Set correct message and buttons base on current auction status
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
                        // Bid on selected license
                        var card = this.auction.table.getItemById(this.auction.card_id);
                        var card_info = this.card_infos[card.type];
                        if (this.debug) console.log(card);
                        if (this.debug) console.log(card_info);
                        this.setClientState('client_auctionBid', {
                            descriptionmyturn: _('${name}: ${you} must bid or pass'),
                            args: card_info
                        });
                    } else {
                        // Select license for bid
                        this.setClientState('client_auctionSelect', {
                            descriptionmyturn: _('${you} may select a license to bid on')
                        });
                    }
                    break;
                case 'client_auctionSelect':
                    this.showActiveAuction();
                    this.auction.table.setSelectionMode(1);
                    //TODO: if last player change title to say buy vs bid?
                    //TODO: possible actions
                    break;
                case 'client_auctionBid':
                    this.showActiveAuction();
                    break;
                case 'client_auctionWin':
                    this.showActiveAuction();
                    // Player needs to select multiple cards to pay
                    this.safeSetSelectionMode(this.playerHand, 2);
                    break;
                case 'launch':
                    this.client_state_args = {};
                    this.safeSetSelectionMode(this.playerHand, 1);
                    break;
                case 'client_launchPay':
                    this.safeSetSelectionMode(this.playerHand, 2);
                    this.client_state_args.fish_crates = 0;
                    break;
                case 'hire':
                    this.client_state_args = {};
                    this.safeSetSelectionMode(this.playerHand, 1);
                    this.safeSetSelectionMode(this.player_boats[this.player_id], 1);
                    break;
                case 'processing':
                    this.client_state_args = {fish_ids:[]};
                    break;
                case 'trading':
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

            this.auction.table.setSelectionMode(0);
            this.safeSetSelectionMode(this.playerHand, 0);
            this.safeSetSelectionMode(this.player_boats[this.player_id], 0);
            this.draw_table.setSelectionMode(0);
            dojo.style('auctionbids', 'display', 'none');
            dojo.query('.flt_disabled').removeClass('flt_disabled');
            dojo.query('.flt_fish_selected').removeClass('flt_fish_selected');
            dojo.query('.flt_fish_selectable').removeClass('flt_fish_selectable');
            dojo.query('.flt_selectable').removeClass('flt_selectable');
            dojo.query('.flt_icon_fish').style('cursor', 'default');

            switch( stateName )
            {
                case 'auction':
                    break;
                case 'client_auctionSelect':
                    //TODO: clear auction vars if passed here
                    break;
                case 'client_auctionBid':
                    break;
                case 'client_auctionWin':
                    break;
                case 'launch':
                    break;
                case 'hire':
                    break;
                case 'processing':
                    break;
                case 'trading':
                    break;
                case 'draw':
                    //TODO: make this smooth
                    dojo.style('draw_wrap', 'display', 'none');
                    break;
            
            
            /* Example:
            
            case 'myGameState':
            
                // Hide the HTML block we are displaying only during this game state
                dojo.style( 'my_html_block_id', 'display', 'none' );
                
                break;
           */
           
           
            case 'dummmy':
                break;
            }               
        }, 

        // onUpdateActionButtons: in this method you can manage "action buttons" that are displayed in the
        //                        action status bar (ie: the HTML links in the status bar).
        //        
        onUpdateActionButtons: function( stateName, args )
        {
            if (this.debug) console.log( 'onUpdateActionButtons: '+stateName );
                      
            if( this.isCurrentPlayerActive() )
            {            
                switch( stateName )
                {
                    case 'client_auctionSelect':
                        if (this.gone_fishing) {
                            this.addActionButton('button_1', _("Go fishin' (pass)"), 'onPass');
                        } else {
                            this.addActionButton('button_1', _('Pass'), 'onPass');
                        }
                        break;
                    case 'client_auctionBid':
                        this.client_state_args.bid = this.auction.high_bid + 1;
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
                        this.addActionButton('button_1', _('Discard selected'), 'onBuy', null, false, 'gray');
                        break;
                    case 'launch':
                        this.addActionButton('button_1', _('Pass'), 'onPass');
                        break;
                    case 'client_launchPay':
                        this.addActionButton('button_1', _('Discard selected'), 'onBuy', null, false, 'gray');
                        this.addActionButton('button_2', _('Cancel'), 'onCancel', null, false, 'red');
                        break;
                    case 'hire':
                        this.addActionButton('button_1', _('Pass'), 'onPass');
                        break;
                    case 'processing':
                        this.addActionButton('button_1', _('Pass'), 'onProcess');
                        this.addActionButton('button_2', _('Cancel'), 'onCancel', null, false, 'red');
                        break;
                    case 'trading':
                        this.addActionButton('button_1', _('Trade'), 'onTrade');
                        this.addActionButton('button_2', _('Pass'), 'onPass');
                        break;
                    case 'draw':
                        // Not buttons, but cannot apply this logic in onEnteringState
                        // Highlight cards
                        this.possible_moves = [true];
                        this.showPossibleMoves();

                        // Set correct selection area
                        if (this.hand_discard) {
                            this.safeSetSelectionMode(this.playerHand, 1);
                        } else {
                            dojo.style('draw_wrap', 'display', 'block');
                            this.draw_table.setSelectionMode(1);
                        }
                        break;
            
/*               
                 Example:
 
                 case 'myGameState':
                    
                    // Add 3 action buttons in the action status bar:
                    
                    this.addActionButton( 'button_1_id', _('Button 1 label'), 'onMyMethodToCall1' ); 
                    this.addActionButton( 'button_2_id', _('Button 2 label'), 'onMyMethodToCall2' ); 
                    this.addActionButton( 'button_3_id', _('Button 3 label'), 'onMyMethodToCall3' ); 
                    break;
*/
                }
            }
        },        

        ///////////////////////////////////////////////////
        //// Utility methods
        
        /*
        
            Here, you can defines some utility methods that you can use everywhere in your javascript
            script.
        
        */

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
         * Generate HTML tooltip for given card
         */
        getCardTooltip: function (card_type_id, is_hand)
        {
            // Get card info and copy to modify
            var card = dojo.clone(this.card_infos[card_type_id]);

            // Set tooltip text based on card type
            var txt = '';
            if (card.type == 'boat') {
                if (is_hand) {
                    txt += "<p><b>" + _("Cost") + ":</b> $" + card.cost + "</p>";
                    txt += "<p><b>" + _("Launch") + "</b> => " + card.points + _("VP") + "</p>";
                    txt += "<p><b>" + _("Discard") + "</b> => $" + card.coins + "</p>";
                } else {
                    txt += "<p>+" + card.points + _("VP") + "</p>";
                }
            } else if (card.type == 'license') {
                txt += "<p><b>" + _("Min Cost") + ":</b> $" + card.cost + "</p>";
                txt += "<p>+" + card.points + _("VP") + "</p>";
            } else if (card.type == 'bonus') {
                txt += "<p><b>" + _("Discard") + "</b> => $" + card.coins + "</p>";
            }

            // Add any special bonus text
            txt +=  _(card.text);
            card.text = txt;

            return this.format_block("jstpl_card_tooltip", card);
        },

        showFinalScore: function(args)
        {
            // Build color player names
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

        buildScoreRow: function(row, label, jstpl, data)
        {
            var cells = '';
            for (var player_id in this.gamedatas.players) {
                cells += this.format_block('jstpl_table_' + jstpl, {content: data[player_id]});
            }
            var html = this.format_block('jstpl_table_row', {label: label, content: cells});
            dojo.byId('score_table_' + row).innerHTML = html;
        },

        addPlayerLicense: function(player_id, card_type, card_id, src)
        {
            var zone_div = 'license_' + player_id + '_' + card_type;
            var license_div = zone_div + '_' + card_id;

            // Ensure player license zone is visible
            dojo.style(zone_div, 'display', 'inline-block');

            // Create player license object
            dojo.place(this.format_block('jstpl_license',
                {player_id:player_id, card_type:card_type, card_id:card_id}), zone_div);

            if (src !== null) {
                // Place license on auction source
                this.placeOnObject(license_div, src);
            }

            this.player_licenses[player_id][card_type].placeInZone(license_div);
        },

        setCounterValue: function(counter, val)
        {
            if (val < 0) {
                val = 0;
            }
            counter.setValue(val);
        },

        incCounterValue: function(counter, inc)
        {
            var val = counter.incValue(inc);
            if (val < 0) {
                counter.setValue(0);
            }
            return val <= 0;
        },

        showPossibleMoves: function()
        {
            if (!this.isCurrentPlayerActive() || this.possible_moves.length == 0)
                return;

            if (this.debug) console.log("POSSIBLE MOVES");
            if (this.debug) console.log(this.possible_moves);
            if (this.debug) console.log(this.gamedatas.gamestate.name);

            switch(this.gamedatas.gamestate.name)
            {
                case 'client_auctionSelect':
                    this.updateSelectableCards(this.auction.table, true);
                    break;
                case 'client_auctionWin':
                    this.updateSelectableCards(this.playerHand, false);
                    this.updateSelectableFish(this.player_id + '_fish_');
                    break;
                case 'launch':
                    this.updateSelectableCards(this.playerHand, true);
                    break;
                case 'client_launchPay':
                    this.updateSelectableCards(this.playerHand, false);
                    this.updateSelectableFish(this.player_id + '_fish_');
                    break;
                case 'hire':
                    this.updateSelectableCards(this.playerHand, true);
                    this.updateSelectableCards(this.player_boats[this.player_id], true);
                    break;
                case 'processing':
                    this.updateSelectableFish('fish_' + this.player_id + '_');
                    break;
                case 'trading':
                    this.updateSelectableFish(this.player_id + '_fish_');
                    break;
                case 'draw':
                    if (this.hand_discard) {
                        this.updateSelectableCards(this.playerHand, false);
                    } else {
                        this.updateSelectableCards(this.draw_table, false);
                    }
                    break;
            }
        },

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
                    if (card === undefined)
                        continue
                    if (card.hasOwnProperty('can_play') && !card.can_play)
                        continue
                }
                var div = stock.getItemDivId(items[i].id);
                dojo.addClass(div, 'flt_selectable');
            }
        },

        updateSelectableFish: function(prefix)
        {
            //TODO: make this highlight more interesting/visible
            dojo.query('div[id^="' + prefix + '"]').forEach(function(node) {
                if (this.debug) console.log(node);
                if (!dojo.hasClass(node, 'flt_fish_selected')) {
                    dojo.addClass(node, 'flt_fish_selectable');
                    dojo.style(node, 'cursor', 'pointer');
                }
            });
        },

        createFishZone: function(id)
        {
            if (this.debug) console.log('CREATE FISH: ' + id);
            if (this.debug) console.log($('fish_' + id));
            var zone = new ebg.zone();
            zone.create(this, 'fish_' + id, 30, 30); //TODO: width/height
            zone.setPattern('horizontalfit');
            this.fish_zones[id] = zone;
        },

        addFishCube: function(card_id, player_id)
        {
            if (!this.fish_zones[card_id]) {
                // JIT zone creation
                this.createFishZone(card_id);
            }

            var nbr_fish = this.fish_zones[card_id].getItemNumber();
            if (nbr_fish == 4) {
                this.showMessage(_('Boat fish crates maxed out'), 'error');//TODO
                return;
            }

            var fish_div = 'fish_' + player_id + '_' + card_id + '_' + nbr_fish;
            dojo.place(this.format_block('jstpl_fish',
                {player_id:player_id, card_id:card_id, fish_id:nbr_fish}), 'fish_' + card_id);
            this.placeOnObject(fish_div, 'fishicon');
            this.fish_zones[card_id].placeInZone(fish_div);
            if (player_id == this.player_id) {
                dojo.connect($(fish_div), 'onclick', this, 'onClickFishCube');
            }
        },

        processFishCube: function(card_id, player_id)
        {
            if (card_id !== null) {
                var card_fish = this.fish_zones[card_id].getItemNumber() - 1;
                if (card_fish < 0) {
                    this.showMessage(_('No fish crates to process'), 'error');//TODO
                    return;
                }

                var src = 'fish_' + player_id + '_' + card_id + '_' + card_fish;
            } else {
                var src = 'fishicon';
            }

            var nbr_fish = this.player_fish[player_id].getItemNumber();
            var dest = player_id + '_fish_' + nbr_fish;

            dojo.place(this.format_block('jstpl_pfish',
                {player_id:player_id, card_id:card_id, fish_id:nbr_fish}), 'playerfish_' + player_id);
            this.placeOnObject(dest, src);
            this.player_fish[player_id].placeInZone(dest);

            if (card_id !== null) {
                this.fish_zones[card_id].removeFromZone(src, true);
            }

            if (player_id == this.player_id) {
                dojo.connect($(dest), 'onclick', this, 'onClickFishCube');
            }

            playSound('move');
        },

        removeFishCube: function(player_id)
        {
            var zone = this.player_fish[player_id];
            var nbr_fish = zone.getItemNumber() - 1;
            if (nbr_fish < 0) {
                // Shouldn't be able to get here?
                alert("ERROR: no fish cubes to trade");
                return;
            }

            var fish_div = player_id + '_fish_' + nbr_fish;
            zone.removeFromZone(fish_div, true, 'site-logo');//TODO: discard area
        },

        createStockLicense: function (div_id)
        {
            var stock = new ebg.stock();
            stock.create(this, $(div_id), this.license_width, this.license_height);
            stock.image_items_per_row = this.license_row_size;
            for (var i = 0; i < 10; i++) {
                stock.addItemType(i, i, g_gamethemeurl+'img/licenses.png', i);
            }
            stock.setSelectionMode(0);
            stock.onItemCreate = dojo.hitch(this, 'setupLicenseDiv');
            stock.apparenceBorderWidth = '2px';
            return stock;
        },

        createStockBoat: function (div_id, is_hand)
        {
            var stock = new ebg.stock();
            stock.create(this, $(div_id), this.boat_width, this.boat_height);
            stock.image_items_per_row = this.card_art_row_size;
            var type, pos;
            for (type = 9, pos = 0; pos < 7; type++, pos++) {
                // Boat cards follow licenses in type order
                stock.addItemType(type, type, g_gamethemeurl+'img/boats.png', pos);
            }
            stock.setSelectionMode(0);
            if (is_hand) {
                stock.onItemCreate = dojo.hitch(this, 'setupBoatDivHand');
            } else {
                stock.onItemCreate = dojo.hitch(this, 'setupBoatDivTable');
            }
            stock.setSelectionAppearance('class');
            // make room for captain cards
            stock.vertical_overlap = -15;
            stock.use_vertical_overlap_as_offset = false;
            return stock;
        },

        setupLicenseDiv: function(card_div, card_type_id, card_id)
        {
            this.addTooltipHtml(card_div.id, this.getCardTooltip(card_type_id));
        },

        setupBoatDivHand: function(card_div, card_type_id, card_id)
        {
            this.setupBoatDiv(card_div, card_type_id, card_id, true);
        },

        setupBoatDivTable: function(card_div, card_type_id, card_id)
        {
            this.setupBoatDiv(card_div, card_type_id, card_id, false);
        },

        setupBoatDiv: function(card_div, card_type_id, card_id, is_hand)
        {
            this.addTooltipHtml(card_div.id, this.getCardTooltip(card_type_id, is_hand));
            var player_id = parseInt(card_div.id.split('_')[1]);
            var id = card_id.split('_');
            id = id[id.length - 1];
            dojo.place(this.format_block('jstpl_boat', {id:id}), card_div.id);
        },

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

        hideAuction: function(state)
        {
            if (state.indexOf('auction') != -1 || state == 'nextPlayer')  {
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
        
            Here, you are defining methods to handle player's action (ex: results of mouse click on 
            game objects).
            
            Most of the time, these methods:
            _ check the action is possible at this game state.
            _ make a call to the game server
        
        */

        onAuctionSelectionChanged: function()
        {
            this.showPossibleMoves();
            var items = this.auction.table.getSelectedItems();

            if (items.length > 0) {
                if (this.checkAction('bid')) {
                    if (this.gamedatas.gamestate.name != 'client_auctionSelect') {
                        //TODO: error msg cannot select
                        //      this sould not happen!
                        return;
                    }

                    if (!this.possible_moves[items[0].id]) {
                        this.showMessage(_('You cannot afford the minimum cost for this license'), 'error');
                        this.auction.table.unselectAll();
                        return;
                    }

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
                    this.gamedatas.gamestate.descriptionmyturn = card_name + ': ' + _('${you} may open the bidding at ') + this.client_state_args.bid;
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
                // First player undid selection, change title back
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

        onDrawSelectionChanged: function()
        {
            var items = this.draw_table.getSelectedItems();

            if (items.length > 0) {
                this.discardAction(items[0]);
                this.draw_table.unselectAll();
            }
        },

        discardAction: function(card)
        {
            if (!this.checkAction('discard'))
                return;

            this.client_state_args.card_id = card.id;
            this.ajaxAction('discard', this.client_state_args);
        },

        updateBuy: function()
        {
            var items = this.playerHand.getSelectedItems();
            if (this.debug) console.log('UPDATE BUY');
            if (this.debug) console.log(items);
            var coins = 0;
            for (var i in items) {
                var card = items[i];
                coins += this.card_infos[card.type]['coins'];
            }
            coins += this.client_state_args.fish_crates;
            this.gamedatas.gamestate.descriptionmyturn = _('${you} must discard cards to pay ') + coins + '/' + this.client_state_args.cost;
            this.updatePageTitle();
            this.removeActionButtons();
            var color = coins >= this.client_state_args.cost ? 'blue' : 'gray';
            this.addActionButton('button_1', _('Discard selected'), 'onBuy', null, false, color);
            this.addActionButton('button_2', _('Cancel'), 'onCancel', null, false, 'red');
        },

        onPlayerHandSelectionChanged: function()
        {
            this.showPossibleMoves();

            var items = this.playerHand.getSelectedItems();

            if (this.debug) console.log('hand select ' + this.gamedatas.gamestate.name);
            if (this.debug) console.log(items);
            switch(this.gamedatas.gamestate.name)
            {
                case 'client_auctionWin':
                    this.updateBuy();
                    break;
                case 'launch':
                    if (this.checkAction('launchBoat') && items.length > 0) {
                        var card = items[0];
                        if (this.debug) console.log('launch select');
                        if (this.debug) console.log(card);
                        if (!this.possible_moves[card.id].can_play) {
                            this.showMessage(this.possible_moves[card.id].error, 'error');
                        } else {
                            var card_info = dojo.clone(this.card_infos[card.type]);
                            if (this.debug) console.log(card_info);
                            card_info.cost -= this.discount; // Shrimp License reduction
                            if (this.debug) console.log(card_info);
                            this.client_state_args.boat_id = card.id;
                            this.client_state_args.cost = card_info.cost;
                            this.client_state_args.boat_type = card.type;

                            // Play boat card from hand
                            this.player_boats[this.player_id].addToStockWithId(
                                card.type,
                                card.id,
                                this.playerHand.getItemDivId(card.id)
                            );
                            this.playerHand.removeFromStockById(card.id);
                            playSound('move');

                            if (card_info.cost <= 0) {
                                // Shrimp discount enough launch is free
                                this.buyAction('launchBoat');
                            } else {
                                this.setClientState('client_launchPay', {
                                    descriptionmyturn: _('${name}: ${you} must discard cards to pay 0/${cost}'),
                                    args: card_info
                                });
                            }
                        }
                    }
                    this.playerHand.unselectAll();
                    break;
                case 'client_launchPay':
                    this.updateBuy();
                    break;
                case 'hire':
                    if (this.checkAction('hireCaptain') && items.length > 0) {
                        if (!this.possible_moves[items[0].id]) {
                            this.showMessage(_('That card cannot be used to captain'), 'error');
                            this.playerHand.unselectAll();
                            break;
                        }
                        this.safeSetSelectionMode(this.player_boats[this.player_id], 1);
                        this.client_state_args.card_id = items[0].id;
                        if (this.client_state_args.boat_id) {
                            this.hireCaptain();
                        }
                    } else {
                        delete this.client_state_args.card_id;
                    }
                    break;
                case 'draw':
                    if (items.length > 0) {
                        this.discardAction(items[0]);
                    }
                    this.playerHand.unselectAll();
                    break;
                default:
                    this.playerHand.unselectAll();
                    break;
            }
        },

        onPlayerBoatsSelectionChanged: function()
        {
            this.showPossibleMoves();

            var items = this.player_boats[this.player_id].getSelectedItems();

            if (items.length > 0 && this.checkAction('hireCaptain')) {
                if (!this.possible_moves[items[0].id]) {
                    this.showMessage(_('That boat already has a captain'), 'error');
                    this.player_boats[this.player_id].unselectAll();
                    return;
                }
                this.client_state_args.boat_id = items[0].id;
                if (this.client_state_args.card_id) {
                    this.hireCaptain();
                }
            } else {
                delete this.client_state_args.boat_id;
            }
        },

        onClickFishCube: function(evt)
        {
            // Determine which type of fish cube clicked
            var div = evt.target.id;
            var is_processed = div.split('_')[0] == 'fish' ? false : true;

            var state = this.gamedatas.gamestate.name;
            if (this.debug) console.log('PROC FISH: ' + state);
            if (state == 'processing') {
                if (!this.checkAction('processFish', true)) {
                    // Ignore click if not the right time
                    return;
                }

                // Allow click to fall thru to card above
                dojo.stopEvent(evt);

                if (is_processed) {
                    this.showMessage(_('You may only process fish crates from boats'), 'error');
                    return;
                }

                var cube = evt.currentTarget.id;
                var boat_id = cube.split('_')[2];
                if (this.client_state_args.fish_ids[boat_id]) {
                    this.showMessage(_('You may only process one fish crate per boat'), 'error');
                    return;
                }

                // Record id and animate fish cube
                this.client_state_args.fish_ids[boat_id] = true;
                this.processFishCube(boat_id, this.player_id);

                // Remove highlight from remaining fish on this boat
                dojo.query('div[id^="fish_' + this.player_id + '_' + boat_id + '_"]').removeClass('flt_fish_selectable');

                if (dojo.query('.flt_fish_selectable').length == 0) {
                    // All possible fish are processed, automatically move on
                    this.onProcess();
                }
            } else if (state == 'trading') {
                if (!is_processed) {
                    this.showMessage(_('You may only trade processed fish crates'), 'error');
                    return;
                }

                this.onTrade(evt);
            } else if (state == 'client_auctionWin' || state == 'client_launchPay') {
                if (!this.checkAction('buyLicense', true) && !this.checkAction('launchBoat', true))
                    return;
                dojo.stopEvent(evt);

                if (!is_processed) {
                    this.showMessage(_('You may only trade processed fish crates'), 'error');
                    return;
                }

                dojo.toggleClass(evt.currentTarget, 'flt_fish_selectable');
                dojo.toggleClass(evt.currentTarget, 'flt_fish_selected');
                this.client_state_args.fish_crates = dojo.query('.flt_fish_selected').length;
                this.updateBuy();
                //Pay $1
            }
        },

        onPass: function(evt)
        {
            dojo.stopEvent(evt);
            if (!this.checkAction('pass'))
                return;

            if (this.gamedatas.gamestate.name == 'client_auctionSelect') {
                // Player chooses to pass auction phase
                this.resetAuction(this.player_id);
            }

            this.client_state_args = {};
            this.ajaxAction('pass');
        },

        onPlusOne: function(evt)
        {
            dojo.stopEvent(evt);

            this.client_state_args.bid += 1;

            if (this.debug) console.log('PLUS ONE: ' + this.client_state_args.bid);

            var max_bid = this.player_coins;
            if (this.client_state_args.bid > max_bid) {
                this.showMessage(_('You cannot bid more than ') + max_bid, 'error');
                this.client_state_args.bid = max_bid;
            }

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

        onMinusOne: function(evt)
        {
            dojo.stopEvent(evt);

            this.client_state_args.bid -= 1;

            if (this.debug) console.log('MINUS ONE: ' + this.client_state_args.bid);

            var min_bid = this.auction.high_bid + 1;
            if (this.client_state_args.bid < min_bid) {
                this.showMessage(_('You must bid at least ') + min_bid, 'error');
                this.client_state_args.bid = min_bid;
            }

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

        onBid: function(evt)
        {
            dojo.stopEvent(evt);
            if (!this.checkAction('bid'))
                return;

            this.ajaxAction('bid', this.client_state_args);
        },

        onBuy: function(evt)
        {
            dojo.stopEvent(evt);

            //TODO: prevent player spending too much?

            var state = this.gamedatas.gamestate.name;
            if (state == 'client_auctionWin') {
                var action = 'buyLicense';
            } else if (state == 'client_launchPay') {
                var action = 'launchBoat';
            } else {
                this.showMessage('Impossible buy action', 'error');
                return;
            }

            this.buyAction(action);
        },

        buyAction: function(action)
        {
            if (!this.checkAction(action))
                return;

            var items = this.playerHand.getSelectedItems();
            this.client_state_args.card_ids = '';
            for (var i in items) {
                this.client_state_args.card_ids += items[i].id + ';';
            }

            // Selected and traded fish crates may differ for ease of bookkeeping
            // Remove selection early to avoid confusion
            dojo.query('.flt_fish_selected').removeClass('flt_fish_selected')

            this.ajaxAction(action, this.client_state_args);
        },

        hireCaptain: function()
        {
            if (!this.checkAction('hireCaptain'))
                return;

            if (this.debug) console.log(this.client_state_args);
            this.ajaxAction('hireCaptain', this.client_state_args);
        },

        onProcess: function(evt)
        {
            if (!this.checkAction('processFish'))
                return;

            if (this.client_state_args.fish_ids.length > 0) {
                this.client_state_args.card_ids = '';
                for (var id in this.client_state_args.fish_ids) {
                    this.client_state_args.card_ids += id + ';';
                }
                this.ajaxAction('processFish', this.client_state_args);
            } else {
                this.onPass(evt);
            }
        },

        onTrade: function(evt)
        {
            if (!this.checkAction('tradeFish', true)) {
                // Ignore click if not the right time
                return;
            }

            // Allow click to fall thru to card above
            dojo.stopEvent(evt);

            this.ajaxAction('tradeFish', null);
        },

        onCancel: function(evt)
        {
            dojo.stopEvent(evt);

            var state = this.gamedatas.gamestate.name;
            if (this.debug) console.log('CANCEL: ' + state);
            if (state == 'client_launchPay') {
                // Undo boat launch
                var card_id = this.client_state_args.boat_id
                this.playerHand.addToStockWithId(
                    this.client_state_args.boat_type,
                    this.client_state_args.boat_id,
                    this.player_boats[this.player_id].getItemDivId(this.client_state_args.boat_id)
                );
                this.player_boats[this.player_id].removeFromStockById(this.client_state_args.boat_id);
                delete this.client_state_args.boat_id;
            } else if (state == 'processing') {
                if (this.debug) console.log('UNDO PROC');
                // Undo fish crate processing
                for (var card_id in this.client_state_args.fish_ids) {
                    if (this.debug) console.log('READD FISH ' + card_id);
                    this.removeFishCube(this.player_id);
                    this.addFishCube(card_id, this.player_id);
                }
            }

            // Unselect any fish cubes
            dojo.query('.flt_fish_selected').removeClass('flt_fish_selected')

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
            
            // TODO: here, associate your game notifications with local methods
            
            // Example 1: standard notification handling
            // dojo.subscribe( 'cardPlayed', this, "notif_cardPlayed" );
            
            // Example 2: standard notification handling + tell the user interface to wait
            //            during 3 seconds after calling the method in order to let the players
            //            see what is happening in the game.
            // dojo.subscribe( 'cardPlayed', this, "notif_cardPlayed" );
            // this.notifqueue.setSynchronous( 'cardPlayed', 3000 );
            // 
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
            this.notifqueue.setSynchronous('hireCaptain', 500);
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
        
        // TODO: from this point and below, you can write your game notifications handling methods
        notif_firstPlayer: function(notif)
        {
            var durration = 1000; // 1s animation

            // Clear existing token
            dojo.query('.flt_first_player').removeClass('flt_first_player');
            var curr = 'first_anchor_p' + notif.args.current_player_id;
            var next = 'first_anchor_p' + notif.args.next_player_id;

            // Create temporary token to animate rotation
            var tmp = '<div id="tmp_first_token" style="z-index:99" class="flt_boat_token flt_first_player"></div>';
            this.slideTemporaryObject(tmp, 'overall_player_board_' + notif.args.current_player_id, curr, next, durration, 0);

            // Show token for next player after animation finishes
            setTimeout(function() {
                dojo.addClass('first_player_p' + notif.args.next_player_id, 'flt_first_player');
            }, durration);
        },

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
                            this.playerHand.addToStockWithId(notif.args.card.type_arg, notif.args.card.id, 'boatcount');
                        }
                    }
                }
            }
        },

        notif_possibleMoves: function (notif)
        {
            if (this.debug) console.log('notify_possibleMoves');
            if (this.debug) console.log(notif);
            this.possible_moves = notif.args.moves;
            this.player_coins = notif.args.coins;
        },

        notif_auctionSelect: function (notif)
        {
            if (this.debug) console.log('notify_auctionSelect');
            if (this.debug) console.log(notif);
            this.auction.card_id = parseInt(notif.args.card_id); //XXX all values coming back as string?
        },

        notif_auctionBid: function (notif)
        {
            if (this.debug) console.log('notify_auctionBid');
            if (this.debug) console.log(notif);
            this.auction.bids[parseInt(notif.args.player_id)] = parseInt(notif.args.bid);
            this.auction.high_bid = parseInt(notif.args.bid);
        },
        
        notif_auctionWin: function (notif)
        {
            if (this.debug) console.log('notify_auctionWin');
            if (this.debug) console.log(notif);
            this.auction.winner = parseInt(notif.args.player_id);
            this.auction.bids[this.auction.winner] = parseInt(notif.args.bid);
            this.auction.high_bid = parseInt(notif.args.bid);
        },

        notif_buyLicense: function (notif)
        {
            if (this.debug) console.log('notify_buyLicense');
            if (this.debug) console.log(notif);

            if (notif.args.player_id == this.player_id) {
                // Discard from hand
                for (var i in notif.args.card_ids) {
                    this.playerHand.removeFromStockById(notif.args.card_ids[i], 'boatcount', true);
                }
                this.playerHand.updateDisplay();

                if (notif.args.license_type == 0) { //TODO: constants
                    // Each Shrimp Licenses increases transaction discount
                    this.discount += 1;
                } else if (notif.args.license_type == 3) {
                    // Any Tuna License allows discard from hand
                    this.hand_discard = true;
                }
            } else {
                // Animate cards from other player
                // TODO
            }

            // Remove any traded fish crates
            for (var i = 0; i < parseInt(notif.args.nbr_fish); i++) {
                this.removeFishCube(notif.args.player_id);
            }

            // Remove discards from hand count
            this.hand_counters[notif.args.player_id].incValue(-notif.args.card_ids.length);

            // Player takes license card
            var src = this.auction.table.getItemDivId(notif.args.license_id);
            this.addPlayerLicense(notif.args.player_id, notif.args.license_type, notif.args.license_id, src)
            this.auction.table.removeFromStockById(notif.args.license_id);

            // Score VP from license
            this.scoreCtrl[notif.args.player_id].incValue(notif.args.points);

            this.resetAuction(notif.args.player_id);
        },

        notif_drawLicenses: function (notif)
        {
            if (this.debug) console.log('notify_drawLicenses');
            if (this.debug) console.log(notif);

            if (notif.args.discard) {
                this.auction.table.removeAllTo('site-logo'); //TODO: discard pile
            }

            for (var i in notif.args.cards) {
                var card = notif.args.cards[i];
                this.auction.table.addToStockWithId(card.type_arg, card.id, 'licensecount');
                if (this.incCounterValue(this.license_counter, -1)) {
                    // Last license drawn
                    dojo.style('licenseicon', {'opacity': '0.5', 'border': 'none'});
                    dojo.style('licensecount', {'color': 'red', 'font-weight': 'bold'});
                }
            }
        },
        
        notif_launchBoat: function (notif)
        {
            if (this.debug) console.log('notify_launchBoat');
            if (this.debug) console.log(notif);

            if (notif.args.player_id == this.player_id) {
                // Discard from hand
                for (var i in notif.args.card_ids) {
                    this.playerHand.removeFromStockById(notif.args.card_ids[i], 'boatcount', true);
                }
                this.playerHand.updateDisplay();
                // Boat already played during client state
            } else {
                // Animate cards from other player
                // TODO: discards?
                this.player_boats[notif.args.player_id].addToStockWithId(
                    notif.args.boat_type,
                    notif.args.boat_id,
                    'overall_player_board_' + notif.args.player_id
                );
            }

            // Remove discards and launch from hand count
            this.hand_counters[notif.args.player_id].incValue(-notif.args.card_ids.length-1);

            // Score VP from boat
            this.scoreCtrl[notif.args.player_id].incValue(notif.args.points);

            // Remove any traded fish crates
            for (var i = 0; i < parseInt(notif.args.nbr_fish); i++) {
                this.removeFishCube(notif.args.player_id);
            }
        },

        notif_hireCaptain: function (notif)
        {
            if (this.debug) console.log('notify_hireCaptain');
            if (this.debug) console.log(notif);

            // Show card back for captian
            // TODO: timing, card flip anim?
            dojo.style('captain_' + notif.args.boat_id, 'display', 'block');

            if (notif.args.player_id == this.player_id) {
                // Player plays card onto boat
                var card = this.playerHand.getItemById(notif.args.card_id);
                this.playerHand.removeFromStockById(notif.args.card_id, 'captain_' + notif.args.boat_id);
            } else {
                // Animate cards from other player
                // TODO
            }

            // Remove captain card from hand count
            this.hand_counters[notif.args.player_id].incValue(-1);
        },

        notif_fishing: function (notif)
        {
            if (this.debug) console.log('notify_fishing');
            if (this.debug) console.log(notif);

            for (var i in notif.args.card_ids) {
                this.addFishCube(notif.args.card_ids[i], notif.args.player_id);
            }

            if (this.incCounterValue(this.fish_counter, -notif.args.nbr_fish)) {
                // Last fish crate taken
                dojo.style('fishicon', 'opacity', '0.5');
                dojo.style('fishcount', {'color': 'red', 'font-weight': 'bold'});
            }

            // Score 1 VP per fish crate
            this.scoreCtrl[notif.args.player_id].incValue(notif.args.nbr_fish);
        },

        notif_processFish: function (notif)
        {
            if (this.debug) console.log('notify_processFish');
            if (this.debug) console.log(notif);

            if (notif.args.player_id != this.player_id) {
                // Active player already moved cubes
                for (var i in notif.args.card_ids) {
                    this.processFishCube(notif.args.card_ids[i], notif.args.player_id);
                }
            }

            // Score -1 VP per fish crate removed
            this.scoreCtrl[notif.args.player_id].incValue(-notif.args.nbr_fish);
        },

        notif_tradeFish: function (notif)
        {
            if (this.debug) console.log('notify_tradeFish');
            if (this.debug) console.log(notif);

            this.removeFishCube(notif.args.player_id);
            // Card draw handled separately
        },

        notif_draw: function (notif)
        {
            if (this.debug) console.log('notify_draw');
            if (this.debug) console.log(notif);

            // This notif happens before state change
            // Ensure stock is visible to receive cards
            if (!notif.args.to_hand) {
                dojo.style('draw_wrap', 'display', 'block');
            }

            var stock = notif.args.to_hand ? this.playerHand : this.draw_table;
            for (var i in notif.args.cards) {
                var card = notif.args.cards[i];
                stock.addToStockWithId(card.type_arg, card.id, 'boatcount');
            }
        },

        notif_drawLog: function (notif)
        {
            if (this.debug) console.log('notify_drawLog');
            if (this.debug) console.log(notif);

            // Update deck counter
            if (notif.args.shuffle) {
                this.boat_counter.setValue(notif.args.deck_nbr);
            } else {
                this.boat_counter.incValue(-notif.args.nbr);
            }

            // Update player hand counter
            if (notif.args.to_hand) {
                this.hand_counters[notif.args.player_id].incValue(notif.args.nbr);
            }
            //TODO: animate draw for other players?
        },

        notif_discardLog: function (notif)
        {
            if (this.debug) console.log('notify_discardLog');
            if (this.debug) console.log(notif);

            // Update player hand counter
            if (notif.args.in_hand) {
                this.hand_counters[notif.args.player_id].incValue(-1);
            } else {
                // Draw phase where card not discarded is taken into hand
                this.hand_counters[notif.args.player_id].incValue(1);
            }
            //TODO: animate draw for other players?
        },

        notif_discard: function (notif)
        {
            if (this.debug) console.log('notify_discard');
            if (this.debug) console.log(notif);

            // Discard selected
            var stock = notif.args.in_hand ? this.playerHand : this.draw_table;
            var card = stock.getItemById(notif.args.discard.id);
            stock.removeFromStockById(notif.args.discard.id, 'site-logo'); //TODO: discard area

            if (!notif.args.in_hand) {
                // Move kept card to hand
                var card = notif.args.keep;
                this.playerHand.addToStockWithId(card.type_arg, card.id, this.draw_table.getItemDivId(card.id));
                this.draw_table.removeFromStockById(card.id);
            }
        },

        notif_finalRound: function(notif)
        {
            if (this.debug) console.log('notif_finalRound');
            if (this.debug) console.log(notif);
            this.showMessage(_('This is the last round!'), 'info');
            dojo.style('licenseicon', 'opacity', '0.5');
            dojo.style('licensecount', {'color': 'red', 'font-weight': 'bold'});
        },

        notif_bonusScore: function(notif)
        {
            if (this.debug) console.log('notif_bonusScore');
            if (this.debug) console.log(notif);
            this.scoreCtrl[notif.args.player_id].incValue(notif.args.points);
        },

        notif_finalScore: function(notif)
        {
            if (this.debug) console.log('notif_finalScore');
            if (this.debug) console.log(notif);
            this.showFinalScore(notif.args);
        },
   });             
});
