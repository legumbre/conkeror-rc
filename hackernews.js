/**
 * hackernews.js -- A Hacker News page-mode for Conkeror
 *
 * (C) Copyright 2011, 2012 Leonardo Etcheverry <leo@kalio.net>
 *
 * Usage: `j',`k':  move to the next/previous post or comment
 *        `h'    :  view the selected post comments
 *        `a'    :  post new reply/comment
 *        `,'    :  vote up the selected post/comment
 *
 * Note that there are actually two page-modes:
 *  - `hackernews-mode' deals with the list of posts (main view)
 *  - `hackernews-comments-mode' deals with a single post comments (comments view)
 *
 * If you change the default keybindings, remember to change the ones
 * for hackernews-comments-mode too if appropriate.
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
                "   background-color: #FFCD7D;" +
                "}" +
                ".current-comment > td.default {" +
                "   background-color: #FFCD7D;"   +
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
  _focus_element(I, post, ".title a");
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
  // $x("//tr[td[contains(@class,'title')]]")
  var doc = I.buffer.document;
  var xpr = xpath_find_any(doc, "//tr[td[contains(@class,'title')]]");
  var posts = [];
  var p;
  while (p = xpr.iterateNext())
    posts.push(p);

  return posts;
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
            "Select the next post.",
            function (I) {
              var next_post = _hackernews_next(I, _hackernews_post_filter, 1 /* down */, "current");
              _hackernews_focus_post(I, next_post);
            });
interactive("hackernews-prev-post",
            "Select the previous post.",
            function (I) {
              var prev_post = _hackernews_next(I, _hackernews_post_filter, -1 /* up */, "current");
              _hackernews_focus_post(I, prev_post);
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
              else
                alert("ooooops, no comments here");
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

interactive("hackernews-vote-up-comment",
            "Vote the selected comment up.",
            function (I) {
            var doc = I.buffer.document;
            var vote_up_link = doc.querySelector(".current-comment a[href^=vote]");
            if (vote_up_link)
              browser_object_follow(I.buffer, FOLLOW_DEFAULT, vote_up_link);
            });

interactive("hackernews-reply",
            "Reply to current Hacker News comment or post",
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

