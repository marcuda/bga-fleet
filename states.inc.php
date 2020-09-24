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
 * states.inc.php
 *
 * fleet game states description
 *
 */

/*
   Game state machine is a tool used to facilitate game developpement by doing common stuff that can be set up
   in a very easy way from this configuration file.

   Please check the BGA Studio presentation about game state to understand this, and associated documentation.

   Summary:

   States types:
   _ activeplayer: in this type of state, we expect some action from the active player.
   _ multipleactiveplayer: in this type of state, we expect some action from multiple players (the active players)
   _ game: this is an intermediary state where we don't expect any actions from players. Your game logic must decide what is the next game state.
   _ manager: special type for initial and final state

   Arguments of game states:
   _ name: the name of the GameState, in order you can recognize it on your own code.
   _ description: the description of the current game state is always displayed in the action status bar on
                  the top of the game. Most of the time this is useless for game state with "game" type.
   _ descriptionmyturn: the description of the current game state when it's your turn.
   _ type: defines the type of game states (activeplayer / multipleactiveplayer / game / manager)
   _ action: name of the method to call when this game state become the current game state. Usually, the
             action method is prefixed by "st" (ex: "stMyGameStateName").
   _ possibleactions: array that specify possible player actions on this step. It allows you to use "checkAction"
                      method on both client side (Javacript: this.checkAction) and server side (PHP: self::checkAction).
   _ transitions: the transitions are the possible paths to go from a game state to another. You must name
                  transitions in order to use transition names in "nextState" PHP method, and use IDs to
                  specify the next game state for each transition.
   _ args: name of the method to call to retrieve arguments for this gamestate. Arguments are sent to the
           client side to be used on "onEnteringState" or to set arguments in the gamestate description.
   _ updateGameProgression: when specified, the game progression is updated (=> call to your getGameProgression
                            method).
*/

//    !! It is not a good idea to modify this file when a game is running !!

if (!defined("STATE_AUCTION")) {
    define("STATE_AUCTION", 2);
    define("STATE_LAUNCH", 3);
    define("STATE_HIRE", 4);
    define("STATE_FISHING", 5);
    define("STATE_PROCESSING", 6);
    define("STATE_TRADING", 7); // client only, but still used in logic
    define("STATE_DRAW", 8);
    define("STATE_NEXT_PLAYER", 9);
    define("STATE_FINAL_SCORE", 10);
    define("STATE_LAUNCH_HIRE", 11);
}
 
$machinestates = array(

    // The initial state. Please do not modify.
    1 => array(
        "name" => "gameSetup",
        "description" => "",
        "type" => "manager",
        "action" => "stGameSetup",
        "transitions" => array( "" => 2 )
    ),
    
    // All auction states
    // Bidding and winning handled in client
    STATE_AUCTION => array(
        "name" => "auction",
        "description" => clienttranslate('${actplayer} must bid or pass'),
        "descriptionmyturn" => clienttranslate('${you} may select a license to bid on'),
        "type" => "activeplayer",
        "possibleactions" => array("bid", "buyLicense", "pass"),
        "transitions" => array("" => STATE_NEXT_PLAYER)
    ),
    // Launch boats, client state for paying
    STATE_LAUNCH => array(
        "name" => "launch",
        "description" => clienttranslate('${actplayer} may launch a boat'),
        "descriptionmyturn" => clienttranslate('${you} may launch a boat'),
        "type" => "activeplayer",
        "possibleactions" => array("launchBoat", "pass"),
        "transitions" => array("" => STATE_NEXT_PLAYER)
    ),
    // Hire captains
    STATE_HIRE => array(
        "name" => "hire",
        "description" => clienttranslate('${actplayer} may hire a captain'),
        "descriptionmyturn" => clienttranslate('${you} may hire a captain'),
        "type" => "activeplayer",
        "possibleactions" => array("hireCaptain", "pass"),
        "transitions" => array("" => STATE_NEXT_PLAYER)
    ),
    STATE_LAUNCH_HIRE => array(
        "name" => "launchHire",
        "description" => clienttranslate('Other players may launch boats and/or hire captains'),
        "descriptionmyturn" => clienttranslate('${you} may launch a boat'),
        "type" => "multipleactiveplayer",        
        "action" => "stLaunchHire",
        "args" => "argsLaunchHire",
        "possibleactions" => array("launchBoat", "hireCaptain", "pass"),
        "transitions" => array("" => STATE_NEXT_PLAYER)
    ),
    // Process and trade fish crates
    STATE_PROCESSING => array(
        "name" => "processing",
        "description" => clienttranslate('Other players may process and trade fish crates'),
        "descriptionmyturn" => clienttranslate('${you} may process fish crates'),
        "type" => "multipleactiveplayer",
        "action" => "stProcessing",
        "args" => "argsProcessing",
        "possibleactions" => array("processFish", "tradeFish", "pass"),
        "transitions" => array("" => STATE_NEXT_PLAYER)
    ),
    // Draw and discard
    STATE_DRAW => array(
        "name" => "draw",
        "description" => clienttranslate('Other players must discard a card'),
        "descriptionmyturn" => clienttranslate('${you} must discard a card'),
        "type" => "multipleactiveplayer",
        "action" => "stDraw",
        "possibleactions" => array("discard"),
        "transitions" => array("" => STATE_NEXT_PLAYER)
    ),
    // Transition for all other states to determine next player and end game trigger
    STATE_NEXT_PLAYER => array(
        "name" => "nextPlayer",
        "type" => "game",
        "action" => "stNextPlayer",
        "updateGameProgression" => true,
        "transitions" => array(
            "auction" => STATE_AUCTION,
            "launch" => STATE_LAUNCH,
            "hire" => STATE_HIRE,
            "launchHire" => STATE_LAUNCH_HIRE,
            "processing" => STATE_PROCESSING,
            "draw" => STATE_DRAW,
            "cantPlay" => STATE_NEXT_PLAYER,
            "finalScore" => STATE_FINAL_SCORE,
        )
    ),
    // Tally end game bonus points
    STATE_FINAL_SCORE => array(
        "name" => "finalScore",
        "type" => "game",
        "action" => "stFinalScore",
        "transitions" => array("" => 99)
    ),

    // Final state.
    // Please do not modify (and do not overload action/args methods).
    99 => array(
        "name" => "gameEnd",
        "description" => clienttranslate("End of game"),
        "type" => "manager",
        "action" => "stGameEnd",
        "args" => "argGameEnd"
    )

);



