/* hackernews.js -- A Hacker News page-mode for Conkeror

 Copyright (C) 2011, 2012 Leonardo Etcheverry <leo@kalio.net>

 This program is free software; you can redistribute it and/or
 modify it under the terms of the GNU General Public License
 as published by the Free Software Foundation; either version 2
 of the License, or (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program; if not, write to the Free Software
 Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.

*/

/*
  Usage : `j',`k':  move to the next/previous post or comment
  `h'   :  view the selected post comments
  `a'   :  post new reply/comment
  `,'   :  vote up the selected post/comment

  Note that there are actually two page-modes:
  - `hackernews-mode' deals with the list of posts (main view)
  - `hackernews-comments-mode' deals with a single post (comments view)

  If you change the default keybindings, remember to change the ones
  for hackernews-comments-mode too if appropriate.
*/

require("content-buffer.js");

define_variable("hackernews_end_behavior", "page",
    "Controls the behavior of hackernews-next-post and "+
    "hackernews-prev-post when at the last post of the page.  "+
    "Possible values are: 'stop', 'wrap' and 'page'."+
    "  'stop' means not change the selected post."+
    "  'wrap' means to wrap around to the first post in the page."+
    "  'page' means to advance to the next page. ");

/*
 * User stylesheet
 * Change highlight colors here.
 */
register_user_stylesheet(
    "data:text/css," +
        escape (
          "@-moz-document url-prefix(http://news.ycombinator.com/) {" +
            ".current {" +
            "   -moz-animation: 2s flash;" +
            "   background-color: #FCEDCC;" +
            "}" +
            "@-moz-keyframes flash { " +
            "   0%  { background-color: inherit; }" +
            "   20% { background-color: #FFCD7D; }" +
            "  100% { background-color: #FCEDCC; }" +
            "}" +
            ".current-comment > td.default {" +
            "   -moz-animation: 2s flash;" +
            "   background-color: #FCEDCC;" +
            "}" +
            "}"
));


/* Find the next item using the `dom_filter' function and select it by
 * adding the class `marker_class' to it.  When the last item is
 * reached, the behavior is controlled by the hackernews_end_behavior
 * variable.
 */
function hackernews_next_item (I, dom_filter, marker_class) {
    var doc = I.buffer.document;
    var items = dom_filter(I);
    var sel_items = items.filter(function (p) { return (p.className.indexOf(marker_class) >= 0); });
    var current   = sel_items.length ? sel_items[0] : null;
    var current_i = current ? items.indexOf(current) : -1;

    var next_i    = current_i + 1;
    var next_page = null;

    switch (hackernews_end_behavior) {
    case "stop":
        next_i = (next_i < items.length) ? next_i : (items.length - 1);
        break;
    case "wrap":
        next_i = next_i % items.length;
        break;
    case "page":
        if (next_i == items.length) { // at the last item
            next_page = doc.querySelector("a[rel^=next]");
            next_i = current_i;       // stay at the last item
        }
        break;
    }

    // advance to the next page if necessary
    if (next_page) {
        browser_object_follow(I.buffer, FOLLOW_DEFAULT, next_page);
        return next_page;
    }

    // select the next item by adding marker_class
    var next = items[next_i]
    if (current)
        dom_remove_class(current, marker_class);
    dom_add_class(next, marker_class);

    return next;
}

/* Find the previous item using the `dom_filter' function and select
 * it by adding the class `marker_class' to it.
 */
function hackernews_prev_item (I, dom_filter, marker_class) {
    var items = dom_filter(I);
    var sel_items = items.filter(function (p) { return (p.className.indexOf(marker_class) >= 0); });
    var current   = sel_items.length ? sel_items[0] : null;
    var current_i = current ? items.indexOf(sel_items[0]) : items.length;

    var prev_i = current_i - 1;

    switch (hackernews_end_behavior) {
    case "stop":
        prev_i = (prev_i >= 0) ? prev_i : 0;
        break;
    case "wrap":
        prev_i = (prev_i % items.length + items.length) % items.length;
        break;
    case "page":
        // same as 'stop' since there's no prev page in HN
        // TODO: fix this if HN ever publishes such a link
        prev_i = (prev_i >= 0) ? prev_i : 0;
        break;
    }
    var prev = items[prev_i];
    if (current)
        dom_remove_class(current, marker_class);
    dom_add_class(prev, marker_class);
    return prev;
}


function hackernews_focus_post (I, post) {
    hackernews_focus(I, post, ".title a");
}

function hackernews_focus_comment (I, comm) {
    hackernews_focus(I, comm, "a[href ^= 'item']");
}

function hackernews_focus (I, el, selector) {
    var a = el.querySelector(selector);
    browser_set_element_focus(I.buffer, a, false);

    // scroll into view if necessary
    var boundRect = el.getBoundingClientRect();
    var win = I.buffer.focused_frame
    if (boundRect.top < 0 || boundRect.bottom > win.innerHeight)
        el.scrollIntoView();
}

/*
 * hackernews_when_loaded will be called by the page-mode's $enable callback
 */
function hackernews_when_loaded (buffer) {
    hackernews_fix_link_rel(buffer);
}

/*
 * Add link rel="next" to the "More" link
 * TODO: This should not be necessary once HN fixes its html.
 */
function hackernews_fix_link_rel (buffer) {
    var more = buffer.document.evaluate('//a[text()="More"]', buffer.document, null, Ci.nsIDOMXPathResult.FIRST_ORDERED_NODE_TYPE, null);
    if (more.singleNodeValue) more.singleNodeValue.setAttribute("rel", "next");
}

function _hackernews_post_filter (I) {
    var doc = I.buffer.document;
    var xpr = xpath_find_any(doc, "//tr[td[contains(@class,'title')]]");
    var posts = [];
    var p;
    while (p = xpr.iterateNext())
        posts.push(p);

    return posts;
}

function _hackernews_comment_filter (I) {
    var doc = I.buffer.document;
    var xpr = xpath_find_any(doc, "//tr[td[contains(@class,'default')]//span[contains(@class,'comhead')]]");
    var comments = [];
    var c;
    while (c = xpr.iterateNext())
        comments.push(c);

    return comments;
}

/*
 * Interactive commands
 */
interactive("hackernews-next-post",
    "Select the next post.",
    function (I) {
        var next_post = hackernews_next_item(I, _hackernews_post_filter, "current");
        if (next_post) hackernews_focus_post(I, next_post);
    });

interactive("hackernews-prev-post",
    "Select the previous post.",
    function (I) {
        var prev_post = hackernews_prev_item(I, _hackernews_post_filter, "current");
        if (prev_post) hackernews_focus_post(I, prev_post);
    });

interactive("hackernews-vote-up-post",
    "Vote the selected post up.",
    function (I) {
        var doc = I.buffer.document;
        var vote_up_link = doc.querySelector(".current a[href^=vote]");
        if (vote_up_link)
            browser_object_follow(I.buffer, FOLLOW_DEFAULT, vote_up_link);
    });

interactive("hackernews-view-comments",
    "View comments for the selected post.",
    function (I) {
        var doc = I.buffer.document;
        var comments_link = doc.querySelector("tr.current+tr a[href^=item]");
        if (comments_link)
            browser_object_follow(I.buffer, FOLLOW_DEFAULT, comments_link);
    });

/*
 * keybindings
 */
define_keymap("hackernews_keymap", $display_name = "HN");
define_key(hackernews_keymap, "j", "hackernews-next-post");
define_key(hackernews_keymap, "k", "hackernews-prev-post");
define_key(hackernews_keymap, "h", "hackernews-view-comments");
define_key(hackernews_keymap, ",", "hackernews-vote-up-post");

var hackernews_modality = {
    normal: hackernews_keymap
};

define_page_mode("hackernews_mode",
    function url_test (uri) {
        /* We only want to enable this mode for either the landing
           page (empty path) or the following pages (path =
           "x?fnid=FOO").

           Note that the "comments" page (path = "item?id=BAR") MUST
           fail this test; otherwise both hackernews-mode and
           hackernews-comments-mode would be enabled for the comments
           page.
        */
        return ( uri.spec.match( build_url_regexp($domain = "news.ycombinator",
                                                  $allow_www = true,
                                                  $tlds = ["com"],
                                                  $path = /$/)) ||
                 uri.spec.match( build_url_regexp($domain = "news.ycombinator",
                                                  $allow_www = true,
                                                  $tlds = ["com"],
                                                  $path = /new.*/)) ||
                 uri.spec.match( build_url_regexp($domain = "news.ycombinator",
                                                  $allow_www = true,
                                                  $tlds = ["com"],
                                                  $path = /x\?.*$/)));
    },
    function enable (buffer) {
        buffer.content_modalities.push(hackernews_modality);

        if (buffer.browser.webProgress.isLoadingDocument)
            /* arrange so that hackernews_when_loaded callback is
               called once the document is done loading. */
            add_hook.call(buffer, "buffer_loaded_hook", hackernews_when_loaded);
        else
            /* call it right now in case the page-mode
             * document is already loaded (ie, someone M-x
             * hackernews-mode manually) */
            hackernews_when_loaded(buffer);
    },
    function disable (buffer) {
        // unregister hooks
        remove_hook.call(buffer, "buffer_loaded_hook", hackernews_when_loaded);

        var i = buffer.content_modalities.indexOf(hackernews_modality);
        if (i > -1)
            buffer.content_modalities.splice(i, 1);
    },
    $display_name = "Hacker News",
    $doc = "Hacker News page-mode: navigation for Hacker News." );

page_mode_activate(hackernews_mode);


/* helper page-mode for hackernews item view (comments)  */

interactive("hackernews-next-comment",
    "Focus next Hacker News comment.",
    function (I) {
        var next_comment = hackernews_next_item(I, _hackernews_comment_filter, "current-comment");
        if (next_comment) hackernews_focus_comment(I, next_comment);
    });

interactive("hackernews-prev-comment",
    "Focus previous Hacker News comment",
    function (I) {
        var prev_comment = hackernews_prev_item(I, _hackernews_comment_filter, "current-comment");
        if (prev_comment) hackernews_focus_comment(I, prev_comment);
    });

interactive("hackernews-vote-up-comment",
    "Vote the selected comment up.",
    function (I) {
        var doc = I.buffer.document;
        var vote_up_link = doc.querySelector(".current-comment a[href^=vote]");
        if (vote_up_link)
            browser_object_follow(I.buffer, FOLLOW_DEFAULT, vote_up_link);
    });

interactive("hackernews-reply",
    "Reply to current Hacker News comment or post.",
    function (I) {
        var doc = I.buffer.document;
        var reply_link         = doc.querySelector(".current-comment a[href ^= 'reply']");
        var top_level_textarea = doc.querySelector("textarea[name ^= 'text']");

        /* if no current comment selected, follow to top level textarea */
        var target = reply_link || top_level_textarea;
        if (target)
            browser_object_follow(I.buffer, FOLLOW_DEFAULT, target);
    });

/* comments view keybindings*/
define_keymap("hackernews_comments_keymap", $display_name = "HN comments");
define_key(hackernews_comments_keymap, "j", "hackernews-next-comment");
define_key(hackernews_comments_keymap, "k", "hackernews-prev-comment");
define_key(hackernews_comments_keymap, "a", "hackernews-reply");
define_key(hackernews_comments_keymap, ",", "hackernews-vote-up-comment");

var hackernews_comments_modality = {
    normal: hackernews_comments_keymap
};

define_page_mode("hackernews_comments_mode",
    build_url_regexp($domain = "news.ycombinator",
                     $allow_www = true,
                     $tlds = ["com"],
                     $path = /item\?.*/),
    function enable (buffer) {
        buffer.content_modalities.push(hackernews_comments_modality);
    },
    function disable (buffer) {
        var i = buffer.content_modalities.indexOf(hackernews_comments_modality);
        if (i > -1)
            buffer.content_modalities.splice(i, 1);
    },
    $display_name = "Hacker News comments",
    $doc = "Hacker News comments page-mode: navigation for Hacker News posts comments.");

page_mode_activate(hackernews_comments_mode);

provide("hackernews");
