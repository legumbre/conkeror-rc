/**
 * pinboard.js -- A Pinboard page-mode for Conkeror
 *
 * (C) Copyright 2011 Leonardo Etcheverry <leo@kalio.net>
 *
 * Usage: use j,k to move to the next/previous bookmark. RET follows
 * the selected bookmark.  You should disable Pinboard's builtin key
 * shortcuts (under settings). They clash with Conkeror anyway.
 * 
 * TODO: 
 * - Implement page navigation ala rel="next"/"prev" (until
 *   pinboard.in fixes the links)
 * - Implement update commands (star, edit tags, etc.)
 * - Allow to opt between cirular bookmark motion and automatic next/prev page navigation
 * - Use a different color or some better way to highlight private bookmarks.
 * 
 **/

in_module(null);
require("content-buffer.js");

/* default Pinboard keys (IGNORE THIS FOR NOW).
 *
 * Since Pinboard uses keydown handlers directly, the site builtin
 * keyboard shortcuts are triggered even without enabling passthrough
 * in pinboard-mode-keymap.
 *
 * We keep this list for documentation purposes only.
 *

fallthrough_keys = ["?",    // show list of commands
                    "/",    // set focus in searchbox
                    "b",    // bulk edit
                    "j",    // earlier
                    "k",    // later
                    "g a",  // homepage
                    "g n",  // network
                    "g s",  // settings
                    "g t",  // tweets
                    "g u",  // unread
                    ]
*/

/*
 * User stylesheet
 * Change highlight colors here.
 */
register_user_stylesheet(
    "data:text/css," +
        escape (
            "@-moz-document url-prefix(http://pinboard.in/) {" +
                ".current {" +
                " background-color: #FFFFCC !important;" +
                " // border: 1px dotted #C41 !important;"+
                " border-right: 2px solid #C41 !important;"+
                "}" +
                ".private {" +
                " background: #ddd !important;" +
                "}" +
            "}"
));


/*
 * Select the next bookmark item in a circular fashion, according to
 * `direction'. Selecting a bookmark means adding the class "current"
 * to the selected bookmark element.
 */
function _pinboard_next(I, direction) {
  var bookmarks = Array.filter(I.buffer.document.getElementsByClassName("bookmark"), function (b) { return true });
  var cb = bookmarks.filter(function (b) { return (b.className.indexOf("current") >= 0); });

  var current = (cb.length != 0) ? cb[0] : bookmarks[bookmarks.length-1] ;
  var nexti = (bookmarks.indexOf(current) + direction) % bookmarks.length
  var next = bookmarks[nexti]

  if (current)
    dom_remove_class(current, "current");
  dom_add_class(next, "current");

  return next;
}


function _pinboard_focus_selected(I, el) {
  var a = I.buffer.document.evaluate(
    '//*[contains(@class,"current")]//a[contains(@class,"bookmark_title")]',
    el, null, Ci.nsIDOMXPathResult.FIRST_ORDERED_NODE_TYPE, null);
  
  // focus the bookmark's link anchor
  browser_set_element_focus(I.buffer, a.singleNodeValue, false);

  // scroll into view if necessary
  var boundRect = el.getBoundingClientRect();
  var win = I.buffer.focused_frame
  if (boundRect.top < 0 || boundRect.bottom > win.innerHeight)
    el.scrollIntoView();
}

/**
 * _on_pinboard_load will be called once the page is done loading.
 */
function _on_pinboard_load(buffer)
{
  _pinboard_fix_link_rel(buffer);
}

/**
 * Add link rel="next" and rel="prev" to "later" and "earlier" links
 * TODO: This should not be necessary once pinboard.in fixes its html.
 */
function _pinboard_fix_link_rel(buffer)
{
  var prev_link = buffer.document.getElementById("top_earlier");
  var next_link = buffer.document.getElementById("top_later");

  if (prev_link) prev_link.setAttribute("rel", "prev");
  if (next_link) next_link.setAttribute("rel", "next");
}


/*
 * Interactive commands
 */
interactive("pinboard-next-bookmark",
            "Highlight next pinboard bookmark",
            function (I) { _pinboard_focus_selected(I, _pinboard_next(I, 1 /* down */)); });

interactive("pinboard-prev-bookmark",
            "Highlight prev pinboard bookmark",
            function (I) { _pinboard_focus_selected(I, _pinboard_next(I, -1 /* up */)); });

/*
 * keybindings
 */ 
define_keymap("pinboard_keymap", $display_name = "pinboard");
define_key(pinboard_keymap, "j", "pinboard-next-bookmark");
define_key(pinboard_keymap, "k", "pinboard-prev-bookmark");

// Ignore this for now, see fallthrough_keys comment
// fallthrough_keys.map(function (key){define_key(pinboard_keymap, key, null, $fallthrough);});

var pinboard_modality = {
  normal: pinboard_keymap
};

define_page_mode("pinboard_mode", $display_name = "Pinboard",

                 $enable = function (buffer) {
                   buffer.content_modalities.push(pinboard_modality);
                   
                   // register hooks
                   add_hook.call(buffer, "buffer_dom_content_loaded_hook", _on_pinboard_load);
                 },

                 $disable = function (buffer) {
                   // unregister hooks
                   remove_hook.call(buffer, "buffer_dom_content_loaded_hook", _on_pinboard_load);
                   
                   var i = buffer.content_modalities.indexOf(pinboard_modality);
                   if (i > -1)
                     buffer.content_modalities.splice(i, 1);
                 },

                 $doc = "Pinboard page-mode: navigation for Pinboard bookmarks." );

let (pinboard_re = build_url_regex($domain = "pinboard",
                                   $allow_www = true,
                                   $tlds = ["in"])) {
  auto_mode_list.push([pinboard_re, pinboard_mode]);
}

provide("pinboard");

// Local Variables:
// js-indent-level: 2
// End:
