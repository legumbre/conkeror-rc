// -*- mode: js; -*-

/** mozrepl init

    REMEMBER: to create ~/.mozrepl-conkeror.js:
    var conkeror = Cc["@conkeror.mozdev.org/application;1"].getService().wrappedJSObject;
    this.enter(conkeror);

    Reference:
    http://conkeror.org/MozRepl
    https://github.com/bard/mozrepl/wiki
    https://github.com/bard/mozrepl/wiki/Use-with-Conkeror
 */
let (mozrepl_init = get_home_directory()) {
    mozrepl_init.appendRelativePath(".mozrepl-conkeror.js");
    session_pref('extensions.mozrepl.initUrl', make_uri(mozrepl_init).spec);
}
/* start mozrepl */
if ('@hyperstruct.net/mozlab/mozrepl;1' in Cc) {
  var mozrepl = Cc['@hyperstruct.net/mozlab/mozrepl;1']
    .getService(Ci.nsIMozRepl);
  if (! mozrepl.isActive())
    mozrepl.start(4242);
}

// open urls in new buffers
url_remoting_fn=load_url_in_new_buffer;
// don't use a new window for downloads
download_buffer_automatic_open_target = OPEN_NEW_BUFFER_BACKGROUND;
// don't let C-x k kill the last buffer and conkeror
can_kill_last_buffer=false;

// url completion
// url_completion_use_history = true;
url_completion_use_bookmarks = false;

// don't show clock
remove_hook("mode_line_hook", mode_line_adder(clock_widget));

// add favicons
require("favicon");
add_hook("mode_line_hook", mode_line_adder(buffer_icon_widget), true);
read_buffer_show_icons = true;

// show buffer count in modeline
add_hook("mode_line_hook", mode_line_adder(buffer_count_widget), true);

// show loading buffer count widget
add_hook("mode_line_hook", mode_line_adder(loading_count_widget), true);

// conkeror on mac X11 meta workaround
define_key(default_global_keymap, "x", "execute-extended-command");
define_key(content_buffer_normal_keymap, "x", "execute-extended-command");
define_key(content_buffer_normal_keymap, "M-<","scroll-top-left");
define_key(content_buffer_normal_keymap, "M->","cmd_scrollBottom");

// misc bindings
define_key(content_buffer_normal_keymap, "C-x 4 f", "follow-new-buffer");

// pinboard posting
interactive("pinboard-post",
            "bookmark the page via pinboard",
            function (I) {
              check_buffer(I.buffer, content_buffer);
              let posturl = 'https:///api.pinboard.in/v1/posts/add';
              let url = load_spec_uri_string(load_spec(I.buffer.top_frame));
              let description = yield I.minibuffer.read( $prompt = "name (required): ",
                                                         $initial_value = I.buffer.title);
              let tags = yield I.minibuffer.read( $prompt = "tags (space delimited): ");
              let extended =  yield I.minibuffer.read( $prompt = "extended description: ",
                                                       $initial_value = I.buffer.top_frame.getSelection());

              // use the 'toread' tag to mark this post as 'to read'
              let toread = (tags.split(" ").indexOf("toread") < 0) ? "no" : "yes";

              posturl = posturl + '?' +
                '&url=' + encodeURIComponent(url) +
                '&description=' + encodeURIComponent(description) +
                '&tags=' + encodeURIComponent(tags) +
                '&extended=' + encodeURIComponent(extended) +
                '&toread=' + encodeURIComponent(toread);
              try {
                var content = yield send_http_request(
                  load_spec({uri: posturl}));
                I.window.minibuffer.message(content.responseText);
              } catch (e) { }
            });
define_key(default_global_keymap, "p", "pinboard-post");

// current url QR code
interactive("qrcode", "Open QR code of current URL.",
           function qrcode(I) {
               I.window.minibuffer.message(I.window.content.location.href);
                I.window.content.location = 'http://chart.apis.google.com/chart?cht=qr&chs=300x300&chl=' +
                   encodeURIComponent(I.window.content.location.href);
               // encodeURIComponent(I.buffer.current_uri);
            });
define_key(content_buffer_normal_keymap, "Z", "qrcode");

/* proxy configuration commands */
interactive("proxy-fing",
            "Toggle proxy.fing.edu.uy configuration",
            function (I) {
              proxy_set_host("proxy.fing.edu.uy");
              proxy_set_port(3128);
              user_pref("network.proxy.type", 0);
              co_call(call_interactively(I, "proxy-toggle"));
            });

interactive("proxy-ec2",
            "Toggle EC2 proxy configuration",
            function(I) {
              proxy_set_host("10.10.10.1");
              proxy_set_port(3128);
              user_pref("network.proxy.type", 0);
              co_call(call_interactively(I, "proxy-toggle"));
            });

// xkcd alt text
xkcd_add_title=true;

// misc commands

// delete annoying DOM nodes
interactive("delete", null,
    function (I) {
        var elem = yield read_browser_object(I);
        elem.parentNode.removeChild(elem);
    },
    $browser_object = browser_object_dom_node);
define_key(content_buffer_normal_keymap, "d", "delete");

// use Google Docs Viewer (http://docs.google.com/viewer) for pdf files
// TODO: add this as a option for content_handler_prompt (the default dialog)
//       or maybe override "view internally" the option to trigger this handler      
function content_handler_doc_viewer (ctx) {
    ctx.abort(); // abort the download
    let uri = ctx.launcher.source.spec;
    let docviewuri = "http://docs.google.com/viewer?url=" + encodeURI(uri);
    ctx.frame.location = docviewuri;

    // copy original url to clipboard
    writeToClipboard(uri);
    ctx.window.minibuffer.message("Copied: " + uri);
}
content_handlers.set("application/pdf", content_handler_doc_viewer);

// I can get M to work in conkeror under x11-quartz.app with the following ~/xmodmap
//  clear mod1
//  clear mod2
//  add mod4 = Meta_L
