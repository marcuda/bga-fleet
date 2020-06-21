{OVERALL_GAME_HEADER}

<!-- 
--------
-- BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
-- fleet implementation : © <Your name here> <Your email address here>
-- 
-- This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
-- See http://en.boardgamearena.com/#!doc/Studio for more information.
-------
-->


<div id="flt_game_area">
    <div id="draw_wrap" class="whiteblock" style="width:740px; display:none;">
        <h3>{DRAW_LABEL}</h3>
        <div id="drawarea"></div>
    </div>
    <div id="auction_wrap" class="flt_auction whiteblock">
        <h3>{AUCTION_LABEL}</h3>
        <div id="auctiontable"></div>
        <div id="auctionbids" style="display: none;">
            <b>Bids</b>
            <!-- BEGIN bid -->
            <div id="playerbid_{PLAYER_ID}_wrap">
                <div style="color:#{PLAYER_COLOR}">
                    <b>{PLAYER_NAME}</b>&nbsp;
                    <span id="playerbid_{PLAYER_ID}" style="color:black;">-</span>
                </div>
            </div>
            <!-- END bid -->
        </div>
    </div>
    <div id="flt_counters">
        <div style="display: inline-block">
            <div class="flt_icon_license"></div>
            <span id="licensecount"></span>
        </div>
        <div style="display: inline-block">
            <div class="flt_icon_boat"></div>
            <span id="boatcount"></span>
        </div>
        <div style="display: inline-block">
            <div id="fishicon" class="flt_icon_fish"></div>
            <span id="fishcount"></span>
        </div>
    </div>
</div>
<div id="myhand_wrap" class="whiteblock">
    <h3>{MY_HAND}</h3>
    <div id="myhand"></div>
</div>

<div id="playertables">
    <!-- BEGIN player -->
    <div id="playertable_{PLAYER_ID}_wrap" style="display:flex; flex-wrap:wrap">
        <div class="whiteblock flt_player_table">
            <h3 style="color:#{PLAYER_COLOR}">{PLAYER_NAME}'s {LICENSES}</h3>
            <div id="playerlicenses_{PLAYER_ID}"></div>
            <div id="playerfish_{PLAYER_ID}" style="width:180px;"></div>
        </div>
        &nbsp;
        <div class="whiteblock flt_player_table">
            <h3 style="color:#{PLAYER_COLOR}">{PLAYER_NAME}'s {BOATS}</h3>
            <div id="playerboats_{PLAYER_ID}"></div>
        </div>
    </div>
    <!-- END player -->
</div>


<script type="text/javascript">

// Javascript HTML templates
var jstpl_boat = 
    '<div id="card_content_${id}">' +
        '<div id="captain_${id}" class="flt_boat flt_captain"></div>' +
        '<div id="fish_${id}" class="flt_fish"></div>' +
    '</div>';
var jstpl_fish = '<div id="fish_${player_id}_${card_id}_${fish_id}" class="flt_icon_fish"></div>';
var jstpl_pfish = '<div id="${player_id}_fish_${fish_id}" class="flt_icon_fish"></div>';

/*
// Example:
var jstpl_some_game_item='<div class="my_game_item" id="my_game_item_${MY_ITEM_ID}"></div>';

*/

</script>  

{OVERALL_GAME_FOOTER}
