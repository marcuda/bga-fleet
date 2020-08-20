{OVERALL_GAME_HEADER}

<!-- 
--------
-- BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
-- Fleet implementation : © Dan Marcus <bga.marcuda@gmail.com>
-- 
-- This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
-- See http://en.boardgamearena.com/#!doc/Studio for more information.
-------
-->


<div id="flt_game_area">

    <!-- Table to display end game scoring -->
    <div id="final_score" class="whiteblock" style="display: none;">
        <h3>{FINAL_SCORE}</h3>
        <div id="score_table" class="flt_score_table">
            <table>
                <tbody>
                    <tr id="score_table_players">
                    <tr id="score_table_boat">
                    <tr id="score_table_license">
                    <tr id="score_table_fish">
                    <tr id="score_table_bonus">
                    <tr id="score_table_total">
                </tbody>
            </table>
        </div>
    </div>

    <!-- Drawn card area -->
    <div id="draw_wrap" class="flt_draw_area whiteblock">
        <h3>{DRAW_LABEL}</h3>
        <div id="drawarea"></div>
    </div>

    <!-- Auction block -->
    <div id="auction_top">
        <div id="auction" class="flt_auction whiteblock">
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

    <!-- Player hand and game counters -->
    <div style="display: flex;">
        <div id="myhand_wrap" class="whiteblock" style="flex: 1;">
            <h3>{MY_HAND}</h3>
            <div id="myhand"></div>
        </div>
        <div id="flt_counters" style="margin: 5px;">
            <div class="flt_counter">
                <div id="licenseicon" class="flt_icon_license"></div>
                <span id="licensecount"></span>
            </div>
            <div class="flt_counter">
                <div id="boaticon" class="flt_icon_boat"></div>
                <span id="boatcount"></span>
            </div>
            <div class="flt_counter">
                <div id="fishicon" class="flt_icon_fish"></div>
                <span id="fishcount"></span>
            </div>
        </div>
    </div>

    <!-- All player tables -->
    <div id="playertables">
        <!-- BEGIN player -->
        <div id="playertable_{PLAYER_ID}_wrap" style="display:flex; flex-wrap:wrap">
            <div class="whiteblock flt_player_table">
                <div>
                    <h3 style="color:#{PLAYER_COLOR}; display:inline-block; vertical-align:top;">{PLAYER_NAME}'s {LICENSES}</h3>
                    <div class="flt_fish_player">
                        <div id="playerfish_{PLAYER_ID}"></div>
                    </div>
                </div>
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

    <!-- Placeholder to move auction down -->
    <div id="auction_bottom"></div>

</div>


<script type="text/javascript">
// Javascript HTML templates

// Launched boat cards with captain and fish overlays
var jstpl_boat = 
    '<div class="flt_boat" style="background-position: -${x}px -${y}px;">' +
        '<div id="cardcontent_${id}">' +
            '<div id="captain_${id}" class="flt_boat flt_captain"></div>' +
            '<div id="fish_${id}" class="flt_fish_boat"></div>' +
        '</div>' +
    '</div>';

// Fish cube
var jstpl_fish = '<div id="fish_${player_id}_${card_id}_${fish_id}" class="flt_icon_fish"></div>';

// Processed fish cube
var jstpl_pfish = '<div id="${player_id}_fish_${fish_id}" class="flt_icon_fish"></div>';

// Player board icons
var jstpl_player_board =
    '<div class="flt_board">' +
        '<img id="handcount_icon_p${id}" class="imgtext" src="${url}/img/hand.png">' +
        '<span id="handcount_p${id}">0</span>' +
        '&nbsp;' +
        '<div id="first_anchor_p${id}" style="height:28px; width:54px;">' +
            '<div id="first_player_p${id}" class="flt_boat_token"></div>' +
        '</div>' +
    '</div>';

// License cards
var jstpl_license_zone = '<div id="license_${player_id}_${card_type}_${card_id}" class="flt_license" style="background-position: -${x}px -${y}px;"></div>';
var jstpl_license_stock = '<div class="flt_license" style="background-position: -${x}px -${y}px;"></div>';

// Final score table entries
var jstpl_table_header = '<th>${content}</th>';
var jstpl_table_cell = '<td>${content}</td>';
var jstpl_table_row = '<th>${label}</th>${content}';

// Card tootltips
var jstpl_card_tooltip =
    '<div class="flt_cardtooltip">' +
        '<h3>${name}</h3>' +
        '<hr/>' +
        '${text}' +
    '</div>';

</script>  

{OVERALL_GAME_FOOTER}
