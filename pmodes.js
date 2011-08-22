// page modes loading and customization

require("google-search-results");
require("gmail"); // rebind conflictiing conkeror commands with the C-c prefix
require("reddit");
require('github');

undefine_key(github_keymap, "c");
define_key(github_keymap, "c", "copy");
google_search_bind_number_shortcuts();
