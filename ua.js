/* user agent switcher
 *
 *  got it from: https://github.com/technomancy/dotfiles/blob/master/.conkerorrc
 */
var user_agents = { "conkeror": "Mozilla/5.0 (X11; Linux x86_64; rv:8.0.1) " +
                    "Gecko/20100101 conkeror/1.0pre",
                  "chromium": "Mozilla/5.0 (X11; U; Linux x86_64; en-US) " +
                    "AppleWebKit/534.3 (KHTML, like Gecko) Chrome/6.0.472.63" +
                    " Safari/534.3",
                  "firefox": "Mozilla/5.0 (X11; Linux x86_64; rv:8.0.1) " +
                  "Gecko/20100101 Firefox/8.0.1",
                  "android": "Mozilla/5.0 (Linux; U; Android 2.2; en-us; " +
                  "Nexus One Build/FRF91) AppleWebKit/533.1 (KHTML, like " +
                  "Gecko) Version/4.0 Mobile Safari/533.1"};

var agent_completer = prefix_completer($completions = Object.keys(user_agents));

interactive("user-agent", "Pick a user agent from the list of presets",
            function(I) {
                var ua = (yield I.window.minibuffer.read(
                    $prompt = "Agent:",
                    $completer = agent_completer));
                set_user_agent(user_agents[ua]);
            });
