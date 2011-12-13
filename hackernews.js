/**
 * hackernews.js -- A Hacker News page-mode for Conkeror
 * (based on pinboard.js)
 *
 * (C) Copyright 2011 Leonardo Etcheverry <leo@kalio.net>
 *
 * Usage: use j,k to move to the next/previous post. RET follows
 * the selected post. 
 *
 **/

in_module(null);
require("content-buffer.js");

/*
 * User stylesheet
 * Change highlight colors here.
 */
register_user_stylesheet(
    "data:text/css," +
        escape (
            "@-moz-document url-prefix(http://news.ycombinator.com/) {" +
                ".current {" +
                " // background-color: #CCCCCC !important;" +
                " // border: 1px dotted #C41 !important;"+
                " font-weight: bold !important;"+
                "}" +
            "}"
));


/*
 * Select the next item in a circular fashion, according to
 * `direction'. Selecting a post means adding the class "current"
 * to the selected td element.
 */
function _hackernews_next(I, direction) {
  var posts = Array.filter(I.buffer.document.getElementsByClassName("title"), function (p) { return p.getAttribute("align")!= "right" });
  var cp = posts.filter(function (p) { return (p.className.indexOf("current") >= 0); });

  var current = (cp.length != 0) ? cp[0] : posts[posts.length-1] ;
  var nexti = (posts.indexOf(current) + direction) % posts.length
  var next = posts[nexti]

  if (current)
    dom_remove_class(current, "current");
  dom_add_class(next, "current");

  return next;
}


function _hackernews_focus_selected(I, el) {
  var a = I.buffer.document.evaluate(
    '//*[contains(@class,"current")]//a',
    el, null, Ci.nsIDOMXPathResult.FIRST_ORDERED_NODE_TYPE, null);
  
  // focus the post's link anchor
  browser_set_element_focus(I.buffer, a.singleNodeValue, false);

  // scroll into view if necessary
  var boundRect = el.getBoundingClientRect();
  var win = I.buffer.focused_frame
  if (boundRect.top < 0 || boundRect.bottom > win.innerHeight)
    el.scrollIntoView();
}

/*
 * _on_hackernews_load will be called by the page-mode's $enable callback
 */
function _on_hackernews_load(buffer)
{
  _hackernews_fix_link_rel(buffer);
}

/**
 * Add link rel="next" to the "More" link
 * TODO: This should not be necessary once HN fixes its html.
 */
function _hackernews_fix_link_rel(buffer)
{
  var els = Array.filter(buffer.document.getElementsByClassName("title"), function (t) {return true});
  var more = buffer.document.evaluate('//a[text()="More"]', buffer.document, null, Ci.nsIDOMXPathResult.FIRST_ORDERED_NODE_TYPE, null);
  if (more.singleNodeValue) more.singleNodeValue.setAttribute("rel", "next");
}


/*
 * Interactive commands
 */
interactive("hackernews-next-post",
            "Highlight next hackernews item",
            function (I) { _hackernews_focus_selected(I, _hackernews_next(I, 1 /* down */)); });

interactive("hackernews-prev-post",
            "Highlight prev hackernews item",
            function (I) { _hackernews_focus_selected(I, _hackernews_next(I, -1 /* up */)); });

/*
 * keybindings
 */ 
define_keymap("hackernews_keymap", $display_name = "hackernews");
define_key(hackernews_keymap, "j", "hackernews-next-post");
define_key(hackernews_keymap, "k", "hackernews-prev-post");

var hackernews_modality = {
  normal: hackernews_keymap
};

define_page_mode("hackernews_mode", $display_name = "Hacker News",

                 $enable = function (buffer) {
                   buffer.content_modalities.push(hackernews_modality);
                   
                   if (buffer.browser.webProgress.isLoadingDocument)
                     /* arrange so that _on_hackernews_load callback is
                        called once the document is done loading. */
                     add_hook.call(buffer, "buffer_loaded_hook", _on_hackernews_load);
                   else
                     /* call it right now in case the page-mode
                      * document is already loaded (ie, someone M-x
                      * hackernews-mode manually) */
                     _on_hackernews_load(buffer);
                 },

                 $disable = function (buffer) {
                   // unregister hooks
                   remove_hook.call(buffer, "buffer_loaded_hook", _on_hackernews_load);
                   
                   var i = buffer.content_modalities.indexOf(hackernews_modality);
                   if (i > -1)
                     buffer.content_modalities.splice(i, 1);
                 },

                 $doc = "Hacker News page-mode: navigation for Hacker News." );

let (hackernews_re = build_url_regex($domain = "news.ycombinator",
                                   $allow_www = true,
                                   $tlds = ["com"])) {
  auto_mode_list.push([hackernews_re, hackernews_mode]);
}

provide("hackernews");

// Local Variables:
// js-indent-level: 2
// End:
