<?php
/**
 *------
 * BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
 * fleet implementation : © <Your name here> <Your email address here>
 *
 * This code has been produced on the BGA studio platform for use on https://boardgamearena.com.
 * See http://en.doc.boardgamearena.com/Studio for more information.
 * -----
 * 
 * fleet.action.php
 *
 * fleet main action entry point
 *
 *
 * In this file, you are describing all the methods that can be called from your
 * user interface logic (javascript).
 *       
 * If you define a method "myAction" here, then you can call it from your javascript code with:
 * this.ajaxcall( "/fleet/fleet/myAction.html", ...)
 *
 */
  
  
class action_fleet extends APP_GameAction
{ 
    // Constructor: please do not modify
    public function __default()
    {
        if( self::isArg( 'notifwindow') )
        {
            $this->view = "common_notifwindow";
            $this->viewArgs['table'] = self::getArg( "table", AT_posint, true );
        }
        else
        {
            $this->view = "fleet_fleet";
            self::trace( "Complete reinitialization of board game" );
        }
    } 

    function getNumberList($arg, $required=true)
    {
        // Get number list argument
        $numbers_raw = self::getArg($arg, AT_numberlist, $required);

        // Remove trailing ;
        if (substr($numbers_raw, -1) == ';') {
            $numbers_raw = substr($numbers_raw, 0, -1);
        }

        if ($numbers_raw == '') {
            $numbers = array();
        } else {
            $numbers = explode(';', $numbers_raw);
        }

        return $numbers;
    }
    
    public function pass()
    {
        self::setAjaxMode();
        $result = $this->game->pass();
        self::ajaxResponse();
    }

    public function bid()
    {
        self::setAjaxMode();
        $bid = self::getArg("bid", AT_posint, true); // amount to bid
        $card_id = self::getArg("card_id", AT_posint, false, -1); // license card id
        $result = $this->game->bid($bid, $card_id);
        self::ajaxResponse();
    }

    public function buyLicense()
    {
        self::setAjaxMode();
        $card_ids = $this->getNumberList("card_ids"); // cards discarded for payment
        $fish_crates = self::getArg("fish_crates", AT_posint, false, 0); // fish crates discarded for payment
        $result = $this->game->buyLicense($card_ids, $fish_crates);
        self::ajaxResponse();
    }

    public function launchBoat()
    {
        self::setAjaxMode();
        $boat_id = self::getArg("boat_id", AT_posint, true); // card id for boat to launch
        $card_ids = $this->getNumberList("card_ids"); // cards discarded for payment
        $fish_crates = self::getArg("fish_crates", AT_posint, false, 0); // fish crates discarded for payment
        $result = $this->game->launchBoat($boat_id, $card_ids, $fish_crates);
        self::ajaxResponse();
    }

    public function hireCaptain()
    {
        self::setAjaxMode();
        $boat_id = self::getArg("boat_id", AT_posint, true); // card id of boat to captain
        $card_id = self::getArg("card_id", AT_posint, true); // id of card to use as captain
        $result = $this->game->hireCaptain($boat_id, $card_id);
        self::ajaxResponse();
    }

    public function processFish()
    {
        self::setAjaxMode();
        $card_ids = $this->getNumberList("card_ids"); // card ids for boats to process
        $result = $this->game->processFish($card_ids);
        self::ajaxResponse();
    }

    public function tradeFish()
    {
        self::setAjaxMode();
        $result = $this->game->tradeFish();
        self::ajaxResponse();
    }

    public function discard()
    {
        self::setAjaxMode();
        $card_id = self::getArg("card_id", AT_posint, true); // id of card to discard
        $result = $this->game->discard($card_id);
        self::ajaxResponse();
    }

}


