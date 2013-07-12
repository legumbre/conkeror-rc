/* Disable keydown/up events on specific sites */

require("key-kill"); // part of Conkeror since 0341e79
key_kill_mode.test.push(build_url_regexp($domain = "github"));
key_kill_mode.test.push(build_url_regexp($domain = "twitter"));
key_kill_mode.test.push(/\/\/.*slashdot\.org\//);
