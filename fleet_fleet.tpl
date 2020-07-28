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
    <div id="draw_wrap" class="flt_draw_area whiteblock">
        <h3>{DRAW_LABEL}</h3>
        <div id="drawarea"></div>
    </div>
    <div id="auction_top" class="flt_auction whiteblock">
        <div id="auction">
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
    </div>
    <div id="flt_counters">
        <div style="display: inline-block">
            <div id="licenseicon" class="flt_icon_license"></div>
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
            <div id="playerfish_{PLAYER_ID}" class="flt_fish_player"></div>
            <div id="playerlicenses_{PLAYER_ID}" style="display:flex; flex-wrap:wrap">
                <div id="license_{PLAYER_ID}_0" class="flt_license_zone"></div>
                <div id="license_{PLAYER_ID}_1" class="flt_license_zone"></div>
                <div id="license_{PLAYER_ID}_2" class="flt_license_zone"></div>
                <div id="license_{PLAYER_ID}_3" class="flt_license_zone"></div>
                <div id="license_{PLAYER_ID}_4" class="flt_license_zone"></div>
                <div id="license_{PLAYER_ID}_5" class="flt_license_zone"></div>
                <div id="license_{PLAYER_ID}_6" class="flt_license_zone"></div>
                <div id="license_{PLAYER_ID}_7" class="flt_license_zone"></div>
                <div id="license_{PLAYER_ID}_8" class="flt_license_zone"></div>
            </div>
        </div>
        &nbsp;
        <div class="whiteblock flt_player_table">
            <h3 style="color:#{PLAYER_COLOR}">{PLAYER_NAME}'s {BOATS}</h3>
            <div id="playerboats_{PLAYER_ID}"></div>
        </div>
    </div>
    <!-- END player -->
</div>
<div id="auction_bottom" class="flt_auction whiteblock" style="display:none;"></div>


<script type="text/javascript">

// Javascript HTML templates
var jstpl_boat = 
    '<div id="cardcontent_${id}">' +
        '<div id="captain_${id}" class="flt_boat flt_captain"></div>' +
        '<div id="fish_${id}" class="flt_fish_boat"></div>' +
    '</div>';
var jstpl_fish = '<div id="fish_${player_id}_${card_id}_${fish_id}" class="flt_icon_fish"></div>';
var jstpl_pfish = '<div id="${player_id}_fish_${fish_id}" class="flt_icon_fish"></div>';
var jstpl_player_board =
    '<div class="flt_board">' +
        '<img id="handcount_icon_p${id}" class="imgtext" src="${url}/img/hand.png">' +
        '<span id="handcount_p${id}">0</span>' +
        '&nbsp;' +
        '<div id="first_anchor_p${id}" style="height:28px; width:54px;">' +
            '<div id="first_player_p${id}" class="flt_boat_token"></div>' +
        '</div>' +
    '</div>';

var jstpl_license = '<div id="license_${player_id}_${card_type}_${card_id}" class="flt_license flt_lic_${card_type}"></div>';
/*
// Example:
var jstpl_some_game_item='<div class="my_game_item" id="my_game_item_${MY_ITEM_ID}"></div>';

*/

</script>  

{OVERALL_GAME_FOOTER}
