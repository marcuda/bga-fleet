/**
 *------
 * BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
 * fleet implementation : © <Your name here> <Your email address here>
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
    "ebg/stock"
],
function (dojo, declare) {
    return declare("bgagame.fleet", ebg.core.gamegui, {
        constructor: function(){
            console.log('fleet constructor');
              
            // Here, you can init the global variables of your user interface
            this.spectator = false;
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
            this.client_state_args = {};
            this.card_infos = null;
            this.player_coins = 0;
            this.player_tables = [];
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
            console.log( "Starting game setup" );

            this.card_infos = gamedatas.card_infos;
            this.player_coins = parseInt(gamedatas.coins);
            this.auction.high_bid = parseInt(gamedatas.auction_bid);
            this.auction.winner = parseInt(gamedatas.auction_winner);
            
            // Setting up player boards
            for( var player_id in gamedatas.players )
            {
                var player = gamedatas.players[player_id];
                         
                // TODO: Setting up players boards if needed
                var table = new ebg.stock();
                table.create(this, $('playertable_' + player_id), this.license_width, this.license_height);
                table.images_items_per_row = this.license_row_size;
                for (var i = 0; i < 10; i++) {
                    table.addItemType(i, i, g_gamethemeurl+'img/licenses.png', i);
                }
                table.setSelectionMode(0);
                this.player_tables[player_id] = table;

                // Auction
                var bid = parseInt(player.bid);
                if (parseInt(player.done)) {
                    dojo.addClass('playerbid_' + player_id + '_wrap', 'flt_auction_done');
                } else if (parseInt(player.pass)) {
                    bid = 'pass';
                }
                this.auction.bids[player_id] = bid;
            }

            // License Auction
            this.auction.card_id = parseInt(gamedatas.auction_card);
            this.auction.table = new ebg.stock();
            this.auction.table.create(this, $('auctiontable'), this.license_width, this.license_height);
            this.auction.table.images_items_per_row = this.license_row_size;
            for (var i = 0; i < 10; i++) {
                this.auction.table.addItemType(i, i, g_gamethemeurl+'img/licenses.png', i);
            }
            this.auction.table.setSelectionMode(0);
            this.auction.table.apparenceBorderWidth = '2px';
            console.log(this.auction.table);
            for (var i in gamedatas.auction) {
                var card = gamedatas.auction[i];
                this.auction.table.addToStockWithId(card.type_arg, card.id);
            }
            dojo.connect(this.auction.table, 'onChangeSelection', this, 'onAuctionSelectionChanged');

            this.license_counter = new ebg.counter();
            this.license_counter.create('licensecount');
            this.license_counter.setValue(gamedatas.cards['licenses']);
            this.boat_counter = new ebg.counter();
            this.boat_counter.create('boatcount');
            this.boat_counter.setValue(gamedatas.cards['deck']);
            this.fish_counter = new ebg.counter();
            this.fish_counter.create('fishcount');
            this.fish_counter.setValue(gamedatas.fish);
            
            // TODO: Set up your game interface here, according to "gamedatas"
            /*
            // Set up player table unless spectating
            this.playerTable = this.player_tables[this.player_id];
            if (this.playerTable === undefined) {
                // Spectator - hide player hand area
                this.spectator = true;
                dojo.style('myhand_wrap', 'display', 'none');
            } else {
                //TODO: onchangeselection
            }
            */

            console.log(gamedatas);
            // Player hand
            if (!this.spectator) { // Spectator has no hand element
                this.playerHand = new ebg.stock();
                this.playerHand.create(this, $('myhand'), this.boat_width, this.boat_height);
                this.playerHand.image_items_per_row = this.card_art_row_size;
                //for (var i = 9; i < 15; i++) {
                var type, pos;
                for (type = 9, pos = 0; pos < 7; type++, pos++) {
                    // Boat cards follow licenses in type order
                    this.playerHand.addItemType(type, type, g_gamethemeurl+'img/boats.png', pos);
                }
                this.playerHand.setSelectionMode(0);
                //this.playerHand.onItemCreate = dojo.hitch(this, 'setupNewCard');
                for (var i in gamedatas.hand) {
                    var card = gamedatas.hand[i];
                    this.playerHand.addToStockWithId(card.type_arg, card.id);
                }
                dojo.connect(this.playerHand, 'onChangeSelection', this, 'onPlayerHandSelectionChanged');
            }
 
            // Setup game notifications to handle (see "setupNotifications" method below)
            this.setupNotifications();

            console.log( "Ending game setup" );
        },
       

        ///////////////////////////////////////////////////
        //// Game & client states
        
        // onEnteringState: this method is called each time we are entering into a new game state.
        //                  You can use this method to perform some user interface changes at this moment.
        //
        onEnteringState: function( stateName, args )
        {
            console.log( 'Entering state: '+stateName );
            console.log(this.gamedatas.gamestate);
            
            switch( stateName )
            {
                case 'auction':
                    // Auction phase managed by client
                    // Set correct message and buttons base on current auction status
                    var debug = {
                        winner: this.auction.winner,
                        player: this.player_id,
                        card: this.auction.card_id,
                        bid: this.auction.high_bid
                    }
                    console.log(debug);
                    this.client_state_args = {};
                    if (this.auction.winner == this.player_id) {
                        // Current player won auction
                        this.setClientState('client_auctionWin', {
                            descriptionmyturn: _('${you} must discard cards to pay ') + '0/' + this.auction.high_bid
                            //TODO: fish crates
                        });
                    } else if (this.auction.card_id) {
                        // Bid on selected license
                        var card = this.auction.table.getItemById(this.auction.card_id);
                        var card_info = this.card_infos[card.type];
                        console.log(card);console.log(card_info);
                        this.setClientState('client_auctionBid', {
                            descriptionmyturn: _('${name}: ${you} must bid or pass'),
                            args: card_info
                        });
                    } else {
                        // Select license for bid
                        this.setClientState('client_auctionSelect', {
                            descriptionmyturn: _('${you} may choose a card to bid on')
                        });
                    }
                    break;
                case 'client_auctionSelect':
                    this.showActiveAuction();
                    this.auction.table.setSelectionMode(1);
                    //TODO: if last player change title to say buy vs bid?
                    break;
                case 'client_auctionBid':
                    this.showActiveAuction();
                    break;
                case 'client_auctionWin':
                    this.showActiveAuction();
                    // Player needs to select multiple cards to pay
                    this.playerHand.setSelectionMode(2);
                    break;
                case 'launch':
                case 'hire':
                case 'processing':
                case 'trading':
                case 'draw':
            
            /* Example:
            
            case 'myGameState':
            
                // Show some HTML block at this game state
                dojo.style( 'my_html_block_id', 'display', 'block' );
                
                break;
           */
           
           
            case 'dummmy':
                break;
            }
        },

        // onLeavingState: this method is called each time we are leaving a game state.
        //                 You can use this method to perform some user interface changes at this moment.
        //
        onLeavingState: function( stateName )
        {
            console.log( 'Leaving state: '+stateName );

            dojo.style('auctionbids', 'display', 'none');
            dojo.query('.flt_disabled').removeClass('flt_disabled');
            
            switch( stateName )
            {
                case 'auction':
                case 'client_auctionSelect':
                    this.auction.table.setSelectionMode(0);
                    break;
                case 'client_auctionBid':
                case 'client_auctionWin':
                    this.playerHand.setSelectionMode(0);
                    break;
                case 'launch':
                case 'hire':
                case 'processing':
                case 'trading':
                case 'draw':
            
            
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
            console.log( 'onUpdateActionButtons: '+stateName );
                      
            if( this.isCurrentPlayerActive() )
            {            
                switch( stateName )
                {
                    case 'client_auctionSelect':
                        this.addActionButton('button_1', _('Pass'), 'onPass');
                        break;
                    case 'client_auctionBid':
                        this.client_state_args.bid = this.auction.high_bid + 1;
                        console.log(this.client_state_args);
                        console.log(this.auction.high_bid);
                        console.log(this.player_coins);
                        if (this.player_coins >= this.client_state_args.bid) {
                            // Player has enough coins to continue bidding
                            this.addActionButton('button_1', '-1', 'onMinusOne', null, false, 'gray');
                            var color = this.player_coins == this.client_state_args.bid ? 'gray' : 'blue';
                            this.addActionButton('button_2', '+1', 'onPlusOne', null, false, color);
                            this.addActionButton('button_3', _('Bid') + ' (' + this.client_state_args.bid + ')', 'onBid');
                        }
                        this.addActionButton('button_4', _('Pass'), 'onPass');
                        break;
                    case 'client_auctionWin':
                        this.addActionButton('button_1', _('Discard selected'), 'onBuy', null, false, 'gray');
                        break;
                    case 'launch':
                        break;
                    case 'hire':
                        break;
                    case 'processing':
                        this.addActionButton('button_1', _('Done'), 'onProcess');
                        this.addActionButton('button_2', _('Pass'), 'onPass');
                        this.addActionButton('button_2', _('Cancel'), 'onCancel');
                        break;
                    case 'trading':
                        this.addActionButton('button_1', _('Trade'), 'onTrade');
                        this.addActionButton('button_2', _('Pass'), 'onPass');
                        break;
                    case 'draw':
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
            // Update bids table
            // Use player tables list to always get all players
            for (var player in this.player_tables) {
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
            //TODO: error message when unable to select auction
            var items = this.auction.table.getSelectedItems();

            if (items.length > 0) {
                if (this.checkAction('bid')) {
                    if (this.gamedatas.gamestate.name != 'client_auctionSelect') {
                        //TODO: error msg cannot select
                        //      this sould not happen!
                        return;
                    }

                    var card_info = this.card_infos[items[0].type];
                    var card_name = card_info['name'];
                    this.auction.card_id = items[0].id;
                    this.client_state_args.card_id = this.auction.card_id;
                    this.client_state_args.bid = card_info['cost'];
                    this.auction.high_bid = card_info['cost'];

                    // Update page title and buttons for bidding
                    // Do not change state to allow player to change selection
                    this.gamedatas.gamestate.descriptionmyturn = card_name + ': ' + _('${you} may open the bidding at ') + this.client_state_args.bid;
                    this.updatePageTitle();
                    this.removeActionButtons();
                    this.addActionButton('button_1', '-1', 'onMinusOne', null, false, 'gray');
                    this.addActionButton('button_2', '+1', 'onPlusOne');
                    this.addActionButton('button_3', _('Bid') + ' (' + this.client_state_args.bid + ')', 'onBid');
                    this.addActionButton('button_4', _('Pass'), 'onPass');

                } else {
                    // Cannot select new auction card
                    this.auction.table.unselectAll();
                }
            }
        },

        onPlayerHandSelectionChanged: function()
        {
            var items = this.playerHand.getSelectedItems();

            switch(this.gamedatas.gamestate.name)
            {
                case 'client_auctionWin':
                    var coins = 0;
                    for (var i in items) {
                        var card = items[i];
                        coins += this.card_infos[card.type]['coins'];
                    }
                    this.gamedatas.gamestate.descriptionmyturn = _('${you} must discard cards to pay ') + coins + '/' + this.auction.high_bid;
                    this.updatePageTitle();
                    this.removeActionButtons();
                    var color = coins >= this.auction.high_bid ? 'blue' : 'gray';
                    this.addActionButton('button_1', _('Discard selected'), 'onBuy', null, false, color);
                    break;
                default:
                    this.playerHand.unselectAll();
                    break;
            }
        },

        onPlayerTableSelectionChange: function()
        {
        },

        onPass: function(evt)
        {
            dojo.stopEvent(evt);
            if (!this.checkAction('pass'))
                return;

            this.ajaxAction('pass');
        },

        onPlusOne: function(evt)
        {
            dojo.stopEvent(evt);

            this.client_state_args.bid += 1;

            console.log('PLUS ONE: ' + this.client_state_args.bid);

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
            $('button_3').textContent = _('Bid') + ' (' + this.client_state_args.bid + ')';
        },

        onMinusOne: function(evt)
        {
            dojo.stopEvent(evt);

            this.client_state_args.bid -= 1;

            console.log('MINUS ONE: ' + this.client_state_args.bid);

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
            $('button_3').textContent = _('Bid') + ' (' + this.client_state_args.bid + ')';
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
            if (!this.checkAction('buyLicense'))
                return;

            var items = this.playerHand.getSelectedItems();
            this.client_state_args.card_ids = '';
            for (var i in items) {
                this.client_state_args.card_ids += items[i].id + ';';
            }

            //TODO: fish crates

            this.ajaxAction('buyLicense', this.client_state_args);
        },

        onProcess: function(evt)
        {
        },

        onTrade: function(evt)
        {
        },

        onDiscard: function(evt)
        {
        },

        
        /* Example:
        
        onMyMethodToCall1: function( evt )
        {
            console.log( 'onMyMethodToCall1' );
            
            // Preventing default browser reaction
            dojo.stopEvent( evt );

            // Check that this action is possible (see "possibleactions" in states.inc.php)
            if( ! this.checkAction( 'myAction' ) )
            {   return; }

            this.ajaxcall( "/fleet/fleet/myAction.html", { 
                                                                    lock: true, 
                                                                    myArgument1: arg1, 
                                                                    myArgument2: arg2,
                                                                    ...
                                                                 }, 
                         this, function( result ) {
                            
                            // What to do after the server call if it succeeded
                            // (most of the time: nothing)
                            
                         }, function( is_error) {

                            // What to do after the server call in anyway (success or failure)
                            // (most of the time: nothing)

                         } );        
        },        
        
        */

        
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
            console.log( 'notifications subscriptions setup' );
            
            // TODO: here, associate your game notifications with local methods
            
            // Example 1: standard notification handling
            // dojo.subscribe( 'cardPlayed', this, "notif_cardPlayed" );
            
            // Example 2: standard notification handling + tell the user interface to wait
            //            during 3 seconds after calling the method in order to let the players
            //            see what is happening in the game.
            // dojo.subscribe( 'cardPlayed', this, "notif_cardPlayed" );
            // this.notifqueue.setSynchronous( 'cardPlayed', 3000 );
            // 
            dojo.subscribe('pass', this, 'notif_pass');
            dojo.subscribe('auctionSelect', this, 'notif_auctionSelect');
            dojo.subscribe('auctionBid', this, 'notif_auctionBid');
            dojo.subscribe('auctionWin', this, 'notif_auctionWin');
            dojo.subscribe('buyLicense', this, 'notif_buyLicense');
            this.notifqueue.setSynchronous('buyLicense', 1000);
            dojo.subscribe('drawLicenses', this, 'notif_drawLicenses');
        },  
        
        // TODO: from this point and below, you can write your game notifications handling methods
        notif_pass: function (notif)
        {
            console.log('notify_pass');
            console.log(notif);
            this.auction.bids[parseInt(notif.args.player_id)] = 'pass';
        },

        notif_auctionSelect: function (notif)
        {
            console.log('notify_auctionSelect');
            console.log(notif);
            this.auction.card_id = parseInt(notif.args.card_id); //XXX all values coming back as string?
        },

        notif_auctionBid: function (notif)
        {
            console.log('notify_auctionBid');
            console.log(notif);
            this.auction.bids[parseInt(notif.args.player_id)] = parseInt(notif.args.bid);
            this.auction.high_bid = parseInt(notif.args.bid);
        },
        
        notif_auctionWin: function (notif)
        {
            console.log('notify_auctionWin');
            console.log(notif);
            this.auction.winner = parseInt(notif.args.player_id);
            this.auction.bids[this.auction.winner] = parseInt(notif.args.bid);
            this.auction.high_bid = parseInt(notif.args.bid);
        },

        notif_buyLicense: function (notif)
        {
            console.log('notify_buyLicense');
            console.log(notif);

            if (notif.args.player_id == this.player_id) {
                // Discard from hand
                for (var i in notif.args.card_ids) {
                    this.playerHand.removeFromStockById(notif.args.card_ids[i], 'boatcount');
                }
            } else {
                // Animate cards from other player
                // TODO
            }

            // Player takes license card
            this.player_tables[notif.args.player_id].addToStockWithId(
                notif.args.license_type,
                notif.args.license_id,
                this.auction.table.getItemDivId(notif.args.license_id)
            );
            this.auction.table.removeFromStockById(notif.args.license_id);

            // Remove player from auction
            dojo.addClass('playerbid_' + notif.args.player_id + '_wrap', 'flt_auction_done');

            // Reset auction globals
            this.auction.bids = [];
            this.auction.high_bid = 0;
            this.auction.card_id = 0;
            this.auction.winner = 0;
        },

        notif_drawLicenses: function (notif)
        {
            console.log('notify_drawLicenses');
            console.log(notif);

            for (var i in notif.args.cards) {
                var card = notif.args.cards[i];
                this.auction.table.addToStockWithId(card.type_arg, card.id, 'licensecount');
            }
        },

   });             
});
