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
                " background-color: #FFCD7D;" +
                " // padding: -1px;" +
                " // border: 1px dotted #ff6000 !important;"+
                "}" +
                ".current-comment > td.default{" +
                " // padding: -1px;" +
                " background-color: #FFCD7D;" +
                " // border: 1px dotted #ff6000 !important;"+
                "}" +
            "}"
));


/*
 * Select and return the next element among filtered nodes in a
 * circular fashion, according to `direction'. Selecting a post means
 * adding the class maker_class to the selected element.
 */
function _hackernews_next(I, dom_filter, direction, marker_class) {
  var nodes = dom_filter(I);
  var cp = nodes.filter(function (p) { return (p.className.indexOf(marker_class) >= 0); });

  var current = (cp.length != 0) ? cp[0] : nodes[nodes.length-1] ;
  var nexti = (nodes.indexOf(current) + direction) % nodes.length
  var next = nodes[nexti]

  if (current)
    dom_remove_class(current, marker_class);
  dom_add_class(next, marker_class);

  return next;
}

function _hackernews_focus_post(I, post) {
  _focus_element(I, post, "a");
}

function _hackernews_focus_comment(I, comm) {
  _focus_element(I, comm, "a[href ^= 'item']");
}

function _focus_element(I, el, selector) {
  var a = el.querySelector(selector);
  browser_set_element_focus(I.buffer, a, false);

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

function _hackernews_post_filter(I)
{
  return Array.filter(I.buffer.document.getElementsByClassName("title"),
                      function (p) { return p.getAttribute("align")!= "right" });
}

function _hackernews_comment_filter(I)
{
  // Note to future me: easily test xpath expressions with chrome's console:
  // $x("//tr[td[contains(@class,'default')]//span[contains(@class,'comhead')]]")

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
            "Focus next Hacker News post",
            function (I) {
              var next_post = _hackernews_next(I, _hackernews_post_filter, 1 /* down */, "current");
              _hackernews_focus_post(I, next_post);
            });
interactive("hackernews-prev-post",
            "Focus previous Hacker News post",
            function (I) { 
              var prev_post = _hackernews_next(I, _hackernews_post_filter, -1 /* up */, "current");
              _hackernews_focus_post(I, prev_post);
            });
/*
 * keybindings
 */ 
define_keymap("hackernews_keymap", $display_name = "HN");
define_key(hackernews_keymap, "j", "hackernews-next-post");
define_key(hackernews_keymap, "k", "hackernews-prev-post");
define_key(hackernews_keymap, "h", "hackernews-comments");

var hackernews_modality = {
  normal: hackernews_keymap
};

define_page_mode("hackernews_mode", 
                 function url_test(uri) {
                   /* We only want to enable this mode for either the
                      landing page (empty path) or the following pages
                      (path = "x?fnid=FOO").  

                      Note that the "comments" page (path =
                      "item?id=BAR") MUST fail this test; otherwise
                      both hackernews-mode and
                      hackernews-comments-mode would be enabled for
                      the comments page.
                    */ 
                   return ( uri.spec.match( build_url_regexp($domain = "news.ycombinator",
                                                             $allow_www = true,
                                                             $tlds = ["com"],
                                                             $path = /$/)) ||
                            uri.spec.match( build_url_regexp($domain = "news.ycombinator",
                                                             $allow_www = true,
                                                             $tlds = ["com"],
                                                             $path = /x\?.*$/)));
                 },
                 function enable(buffer) {
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
                 function disable(buffer) {
                   // unregister hooks
                   remove_hook.call(buffer, "buffer_loaded_hook", _on_hackernews_load);
                   
                   var i = buffer.content_modalities.indexOf(hackernews_modality);
                   if (i > -1)
                     buffer.content_modalities.splice(i, 1);
                 },
                 $display_name = "Hacker News",
                 $doc = "Hacker News page-mode: navigation for Hacker News." );

page_mode_activate(hackernews_mode);


/* helper page-mode for hackernews item view (comments)  */

interactive("hackernews-next-comment",
            "Focus next Hacker News comment",
            function (I) {
              var next_comment = _hackernews_next(I, _hackernews_comment_filter, 1 /* down */, "current-comment");
              _hackernews_focus_comment(I, next_comment);
            });
interactive("hackernews-prev-comment",
            "Focus previous Hacker News comment",
            function (I) { 
              var prev_comment = _hackernews_next(I, _hackernews_comment_filter, -1 /* down */, "current-comment");
              _hackernews_focus_comment(I, prev_comment);
            });

/* comments view keybindings*/
define_keymap("hackernews_comments_keymap", $display_name = "HN comments");
define_key(hackernews_comments_keymap, "j", "hackernews-next-comment");
define_key(hackernews_comments_keymap, "k", "hackernews-prev-comment");
// define_key(hackernews_comments_keymap, "a", "hackernews-reply");

var hackernews_comments_modality = {
  normal: hackernews_comments_keymap
};

function _on_hackernews_comments_load(buffer){}

define_page_mode("hackernews_comments_mode", 
                 build_url_regexp($domain = "news.ycombinator",
                                  $allow_www = true,
                                  $tlds = ["com"],
                                  $path = /item\?.*/),
                 function enable(buffer) {
                   buffer.content_modalities.push(hackernews_comments_modality);
                   
                   if (buffer.browser.webProgress.isLoadingDocument)
                     /* arrange so that _on_hackernews_load callback is
                        called once the document is done loading. */
                     add_hook.call(buffer, "buffer_loaded_hook", _on_hackernews_comments_load);
                   else
                     /* call it right now in case the page-mode
                      * document is already loaded (ie, someone M-x
                      * hackernews-mode manually) */
                     _on_hackernews_comments_load(buffer);
                 },
                 function disable(buffer) {
                   // unregister hooks
                   remove_hook.call(buffer, "buffer_loaded_hook", _on_hackernews_comments_load);
                   
                   var i = buffer.content_modalities.indexOf(hackernews_comments_modality);
                   if (i > -1)
                     buffer.content_modalities.splice(i, 1);
                 },
                 $display_name = "Hacker News comments",
                 $doc = "Hacker News comments page-mode: navigation for Hacker News posts comments." );
page_mode_activate(hackernews_comments_mode);

provide("hackernews");

