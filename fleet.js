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
            // Example:
            // this.myGlobalValue = 0;
            this.spectator = false;
            this.auction = null;
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
            
            // Setting up player boards
            for( var player_id in gamedatas.players )
            {
                var player = gamedatas.players[player_id];
                         
                // TODO: Setting up players boards if needed
            }

            // License Auction
            this.auction = new ebg.stock();
            this.auction.create(this, $('auctiontable'), this.license_width, this.license_height);
            this.auction.images_items_per_row = this.license_row_size;
            for (var i = 0; i < 10; i++) {
                this.auction.addItemType(i, i, g_gamethemeurl+'img/licenses.png', i);
            }
            this.auction.setSelectionMode(0);
            for (var i in gamedatas.auction) {
                var card = gamedatas.auction[i];
                this.auction.addToStockWithId(card.type_arg, card.id);
            }

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
                //dojo.connect(this.playerHand, 'onChangeSelection', this, 'onPlayerHandSelectionChanged');
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
            
            switch( stateName )
            {
            
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
            
            switch( stateName )
            {
            
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


        ///////////////////////////////////////////////////
        //// Player's action
        
        /*
        
            Here, you are defining methods to handle player's action (ex: results of mouse click on 
            game objects).
            
            Most of the time, these methods:
            _ check the action is possible at this game state.
            _ make a call to the game server
        
        */
        
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
        },  
        
        // TODO: from this point and below, you can write your game notifications handling methods
        
        /*
        Example:
        
        notif_cardPlayed: function( notif )
        {
            console.log( 'notif_cardPlayed' );
            console.log( notif );
            
            // Note: notif.args contains the arguments specified during you "notifyAllPlayers" / "notifyPlayer" PHP call
            
            // TODO: play the card in the user interface.
        },    
        
        */
   });             
});
