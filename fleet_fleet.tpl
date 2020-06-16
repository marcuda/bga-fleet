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
    <div id="auction_wrap" class="flt_auction whiteblock">
        <h3>{AUCTION_LABEL}</h3>
        <div id="auctiontable"></div>
        <div id="auctionbids">
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
            <div class="flt_icon_fish"></div>
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
    <div id="playertable_{PLAYER_ID}_wrap" class="whiteblock">
        <h3 style="color:#{PLAYER_COLOR}">{PLAYER_NAME}</h3>
        <div id="playertable_{PLAYER_ID}"></div>
    </div>
    <!-- END player -->
</div>


<script type="text/javascript">

// Javascript HTML templates

/*
// Example:
var jstpl_some_game_item='<div class="my_game_item" id="my_game_item_${MY_ITEM_ID}"></div>';

*/

</script>  

{OVERALL_GAME_FOOTER}
