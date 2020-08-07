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
 * material.inc.php
 *
 * fleet game material description
 *
 * Here, you can describe the material of your game with PHP variables.
 *   
 * This file is loaded in your game logic class constructor, ie these variables
 * are available everywhere in your game logic code.
 *
 */

// Constants
if (!defined("LICENSE_SHRIMP")) {
    // Card type_args
    define("LICENSE_SHRIMP", 0);
    define("LICENSE_COD", 1);
    define("LICENSE_LOBSTER", 2);
    define("LICENSE_TUNA", 3);
    define("LICENSE_PROCESSING", 4);
    define("LICENSE_PUB", 5);
    define("LICENSE_CRAB_C", 6);
    define("LICENSE_CRAB_F", 7);
    define("LICENSE_CRAB_L", 8);
    define("BOAT_SHRIMP", 9);
    define("BOAT_LOBSTER", 10);
    define("BOAT_PROCESSING", 11);
    define("BOAT_COD", 12);
    define("BOAT_TUNA", 13);
    define("BOAT_CRAB", 14);
    define("GONE_FISHING", 15);

    // Card types
    define("CARD_LICENSE", 'license');
    define("CARD_BOAT", 'boat');
    define("CARD_BONUS", 'bonus');

    // Phases
    define("PHASE_AUCTION", "auction");
    define("PHASE_LAUNCH", "launch");
    define("PHASE_HIRE", "hire");
    define("PHASE_FISHING", "fishing");
    define("PHASE_PROCESSING", "processing");
    define("PHASE_TRADING", "trading");
    define("PHASE_DRAW", "draw");
}

// Convenience array of different card types
$this->license_types = array(
    LICENSE_SHRIMP,
    LICENSE_COD,
    LICENSE_LOBSTER,
    LICENSE_TUNA,
    LICENSE_PROCESSING,
    LICENSE_PUB,
    LICENSE_CRAB_C,
    LICENSE_CRAB_F,
    LICENSE_CRAB_L,
);

$this->premium_license_types = array(
    LICENSE_PUB,
    LICENSE_CRAB_C,
    LICENSE_CRAB_F,
    LICENSE_CRAB_L,
);

$this->boat_types = array(
    BOAT_SHRIMP,
    BOAT_LOBSTER,
    BOAT_PROCESSING,
    BOAT_COD,
    BOAT_TUNA,
    BOAT_CRAB,
);


// License and boat cards together
$this->card_types = array(
    LICENSE_SHRIMP => array(
        'name' => clienttranslate('Shrimp License'),
        'type' => CARD_LICENSE,
        'cost' => 4,
        'points' => 4,
        'nbr' => 4,
        'text' => clienttranslate('<p>$1 off every transaction for each Shrimp License</p>'),
    ),
    LICENSE_COD => array(
        'name' => clienttranslate('Cod License'),
        'type' => CARD_LICENSE,
        'cost' => 4,
        'points' => 4,
        'nbr' => 4,
        'text' => clienttranslate('<p>May launch 2 boats per Launch Boats phase</p><p>Draw bonus, after Launch Boats:</p><p>+1 card for each Cod License if player launches any boats</p>'),
    ),
    LICENSE_LOBSTER => array(
        'name' => clienttranslate('Lobster License'),
        'type' => CARD_LICENSE,
        'cost' => 5,
        'points' => 3,
        'nbr' => 4,
        'text' => clienttranslate('<p>May captain 2 boats per Hire Captains phase</p><p>Draw bonus, after Hire Captains:</p><p>With 1 license +1/2 cards for 1-3/4+ captained boats</p><p>With 2+ licenses +1/2/3 cards for 1-2/3-6/7+ captained boats'),
    ),
    LICENSE_TUNA => array(
        'name' => clienttranslate('Tuna License'),
        'type' => CARD_LICENSE,
        'cost' => 5,
        'points' => 3,
        'nbr' => 4,
        'text' => clienttranslate('<p>May discard any card in hand</p><p>Draw bonus:</p><p>With 1 license draw 2, keep 2</p><p>With 2 licenses draw 3, keep 2</p><p>With 3 licenses draw 3, keep 3</p><p>With 4 licenses draw 4, keep 3</p>'),
    ),
    LICENSE_PROCESSING => array(
        'name' => clienttranslate('Processing Vessel License'),
        'type' => CARD_LICENSE,
        'cost' => 5,
        'points' => 3,
        'nbr' => 4,
        'text' => clienttranslate('<p>May process 1 crate of fish from each boat.</p><p>Processed fish crates are worth $1 and 0VP.</p><p>Draw bonus, after Processing:</p><p>Trade 1 processed fish crate for +1 card for each Processing Vessel License</p>'),
    ),
    LICENSE_PUB => array(
        'name' => clienttranslate("Fisherman's Pub"),
        'type' => CARD_LICENSE,
        'cost' => 10,
        'points' => 10,
        'nbr' => 3,
        'text' => clienttranslate('<p>High VP but no boats or other bonus</p>'),
    ),
    LICENSE_CRAB_C => array(
        'name' => clienttranslate('King Crab License'),
        'type' => CARD_LICENSE,
        'cost' => 10,
        'points' => 5,
        'nbr' => 1,
        'text' => clienttranslate('<p>End game: +1VP for each captain (max 10VP)</p>'),
    ),
    LICENSE_CRAB_F => array(
        'name' => clienttranslate('King Crab License'),
        'type' => CARD_LICENSE,
        'cost' => 10,
        'points' => 5,
        'nbr' => 1,
        'text' => clienttranslate('<p>End game: +1VP for every 3 fish crates (max 10VP)</p>'),
    ),
    LICENSE_CRAB_L => array(
        'name' => clienttranslate('King Crab License'),
        'type' => CARD_LICENSE,
        'cost' => 10,
        'points' => 5,
        'nbr' => 1,
        'text' => clienttranslate('<p>End game: +2/4/5/6/8/10VP for 2/3/4/5/6/7 different licenses</p><p>All King Crab Licenses count as the same type when scoring this bonus'),
    ),
    BOAT_SHRIMP => array(
        'name' => clienttranslate('Shrimp Boat'),
        'type' => CARD_BOAT,
        'license' => LICENSE_SHRIMP,
        'cost' => 1,
        'points' => 1,
        'coins' => 2,
        'nbr' => 20,
        'text' => '',
    ),
    BOAT_LOBSTER => array(
        'name' => clienttranslate('Lobster Boat'),
        'type' => CARD_BOAT,
        'license' => LICENSE_LOBSTER,
        'cost' => 2,
        'points' => 2,
        'coins' => 2,
        'nbr' => 20,
        'text' => '',
    ),
    BOAT_PROCESSING => array(
        'name' => clienttranslate('Processing Vessel'),
        'type' => CARD_BOAT,
        'license' => LICENSE_PROCESSING,
        'cost' => 2,
        'points' => 2,
        'coins' => 2,
        'nbr' => 20,
        'text' => '',
    ),
    BOAT_COD => array(
        'name' => clienttranslate('Cod Boat'),
        'type' => CARD_BOAT,
        'license' => LICENSE_COD,
        'cost' => 2,
        'points' => 2,
        'coins' => 1,
        'nbr' => 12,
        'text' => '',
    ),
    BOAT_TUNA => array(
        'name' => clienttranslate('Tuna Boat'),
        'type' => CARD_BOAT,
        'license' => LICENSE_TUNA,
        'cost' => 1,
        'points' => 1,
        'coins' => 3,
        'nbr' => 12,
        'text' => '',
    ),
    BOAT_CRAB => array(
        'name' => clienttranslate('King Crab Boat'),
        'type' => CARD_BOAT,
        'license' => array(LICENSE_CRAB_C, LICENSE_CRAB_F, LICENSE_CRAB_L),
        'cost' => 3,
        'points' => 3,
        'coins' => 1,
        'nbr' => 12,
        'text' => '',
    ),
    GONE_FISHING => array(
        'name' => clienttranslate("Gone Fishin'"),
        'type' => CARD_BONUS,
        'license' => null,
        'cost' => 0,
        'points' => 2,
        'coins' => 2,
        'nbr' => 20,
        'text' => clienttranslate('<p>Cannot captain</p><p>End game: +2VP if still in hand'),
    ),
);
