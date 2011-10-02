/**
 * (C) Copyright 2011 Leonardo Etcheverry
 *
 **/

/**
   Pinboard builtin keybindings are:

    ?   show list of commands
    /   set focus in searchbox
    b   bulk edit
    j   earlier
    k   later


    g a homepage
    g n network
    g s settings
    g t tweets
    g u unread

 **/


in_module(null);

require("content-buffer.js");

define_keymap("pinboard_keymap", $display_name = "pinboard");

// default pinboard keys
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


fallthrough_keys.map(function (key){define_key(pinboard_keymap, key, null, $fallthrough);});

// define_key(pinboard_keymap, "j", null, $fallthrough);
// define_key(pinboard_keymap, "k", null, $fallthrough);

var pinboard_modality = {
  normal: pinboard_keymap
};

define_page_mode("pinboard_mode", $display_name = "Pinboard",
                 $enable = function (buffer) {
                   buffer.content_modalities.push(pinboard_modality);
                 },
                 $disable = function (buffer) {
                   var i = buffer.content_modalities.indexOf(pinboard_modality);
                   if (i > -1)
                     buffer.content_modalities.splice(i, 1);
                 });

let (pinboard_re = build_url_regex($domain = "pinboard",
                                   $allow_www = true,
                                   $tlds = ["in"])) {
  auto_mode_list.push([pinboard_re, pinboard_mode]);
}

provide("pinboard");


