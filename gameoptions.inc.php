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
 * gameoptions.inc.php
 *
 * fleet game options description
 * 
 * In this file, you can define your game options (= game variants).
 *   
 * Note: If your game has no variant, you don't have to modify this file.
 *
 * Note²: All options defined in this file should have a corresponding "game state labels"
 *        with the same ID (see "initGameStateLabels" in fleet.game.php)
 *
 * !! It is not a good idea to modify this file when a game is running !!
 *
 */

$game_options = array(

    /*
    
    // note: game variant ID should start at 100 (ie: 100, 101, 102, ...). The maximum is 199.
    100 => array(
                'name' => totranslate('my game option'),    
                'values' => array(

                            // A simple value for this option:
                            1 => array( 'name' => totranslate('option 1') )

                            // A simple value for this option.
                            // If this value is chosen, the value of "tmdisplay" is displayed in the game lobby
                            2 => array( 'name' => totranslate('option 2'), 'tmdisplay' => totranslate('option 2') ),

                            // Another value, with other options:
                            //  description => this text will be displayed underneath the option when this value is selected to explain what it does
                            //  beta=true => this option is in beta version right now.
                            //  nobeginner=true  =>  this option is not recommended for beginners
                            3 => array( 'name' => totranslate('option 3'), 'description' => totranslate('this option does X'), 'beta' => true, 'nobeginner' => true )
                        )
            )

    */
    100 => array(
        'name' => totranslate("Gone Fishin'"),
        'values' => array(
            1 => array(
                'name' => totranslate('Yes'),
                'tmdisplay' => totranslate("Gone Fishin'"),
                'description' => totranslate("Include expansion card Gone Fishin'"),
            ),
            2 => array('name' => totranslate('No')),
        ),
    ),
    101 => array(
        'name' => totranslate("Automatic Passing"),
        'values' => array(
            1 => array(
                'name' => totranslate("Standard"),
                'description' => totranslate("Only use public info to skip players that cannot play"),
            ),
            2 => array(
                'name' => totranslate("Fast"),
                'tmdisplay' => totranslate("Fast passing"),
                'description' => totranslate("Always skip players that cannot play, even if it may reveal private info"),
            ),
        ),
    ),
    102 => array(
        'name' => totranslate("Launch & Hire Phase"),
        'values' => array(
            1 => array(
                'name' => totranslate("Sequential"),                
            ),
            2 => array(
                'name' => totranslate("Simultaneous"),
                'tmdisplay' => totranslate("Simultaneous launch & hire")
            ),
        ),
    ),
);


