/*
  mobile twitter mode
   - adds rel="next" to the "Load older tweets" button
*/

require ("content-buffer.js");

define_page_mode("mobile_twitter_mode",
                 build_url_regexp($domain = "mobile.twitter",
                                  $allow_www = true,
                                  $tlds = ["com"])
                 ,
                 function enable (buffer) {
                   if (buffer.browser.webProgress.isLoadingDocument)
                     add_hook.call(buffer, "buffer_loaded_hook", twitter_when_loaded);
                   else
                     /* call it right now in case the page-mode
                      * document is already loaded (ie, someone M-x
                      * mobile-twitter-mode manually) */
                     twitter_when_loaded(buffer);
                 }
                 ,
                 function disable (buffer) {
                   // unregister hooks
                   remove_hook.call(buffer, "buffer_loaded_hook", twitter_when_loaded);

                 },
                 $display_name = "Mobile Twitter",
                 $doc = "Twitter page-mode for mobile.twitter.com");

function twitter_when_loaded (buffer) {
  // add rel="next" to the "Load older tweets" link
  var moreTweets = buffer.document.querySelector('div.w-button-more a');
  if (moreTweets) {
    moreTweets.setAttribute('rel', 'next');
  }
}

page_mode_activate(mobile_twitter_mode);

provide("m-twitter");
