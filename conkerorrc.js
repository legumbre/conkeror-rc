// -*- mode: js; -*-

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

// conkeror on mac X11 meta workaround
define_key(default_global_keymap, "x", "execute-extended-command");
define_key(content_buffer_normal_keymap, "x", "execute-extended-command");

// misc bindings
define_key(content_buffer_normal_keymap, "C-x 4 f", "follow-new-buffer");

// delicious posting
interactive("delicious-post",
            "bookmark the page via delicious",
            function (I) {
                check_buffer(I.buffer, content_buffer);
                let posturl = 'https://api.del.icio.us/v1/posts/add?&url=' +
                    encodeURIComponent(
                        load_spec_uri_string(
                            load_spec(I.buffer.top_frame))) +
                    '&description=' +
                    encodeURIComponent(
                        yield I.minibuffer.read(
                            $prompt = "name (required): ",
                            $initial_value = I.buffer.title)) +
                    '&tags=' +
                    encodeURIComponent(
                        yield I.minibuffer.read(
                            $prompt = "tags (space delimited): ")) +
                    '&extended=' +
                    encodeURIComponent(
                        yield I.minibuffer.read(
                        $prompt = "extended description: "));

                try {
                    var content = yield send_http_request(
                        load_spec({uri: posturl}));
                    I.window.minibuffer.message(content.responseText);
                } catch (e) { }
            });
define_key(default_global_keymap, "p", "delicious-post");

// current url QR code
interactive("qrcode", "Open QR code of current URL.",
           function qrcode(I) {
               I.window.minibuffer.message(I.window.content.location.href);
                I.window.content.location = 'http://chart.apis.google.com/chart?cht=qr&chs=300x300&chl=' +
                   encodeURIComponent(I.window.content.location.href);
               // encodeURIComponent(I.buffer.current_uri);
            });
define_key(content_buffer_normal_keymap, "Z", "qrcode");


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
function content_handler_doc_viewer (ctx) {
    ctx.abort(); // abort the download
    let uri = ctx.launcher.source.spec;
    let docviewuri = "http://docs.google.com/viewer?url=" + encodeURI(uri);
    ctx.frame.location = docviewuri;
}
content_handlers.set("application/pdf", content_handler_doc_viewer);


// random comments follow

/*  Mozilla calls Conkeror's keypress handler with an event object which has
    properties describing the event.  The property altKey is true if alt was
    pressed, and the property metaKey is true if the meta key was pressed.
    The meta key is defined by gtk as mod4.  Conkeror then uses one or the
    other of these properties to represent the "M" modifier, depending on the
    operating system.  You can do some basic diagnostics with a program, xrev,
    that is in Conkeror's contrib dir:

      cd conkeror/contrib/xrev
      xulrunner ./application.ini
*/

// I can get M to work in conkeror under x11-quartz.app with the following ~/xmodmap
//  clear mod1
//  clear mod2
//  add mod4 = Meta_L

// attempted fix at conkeror running under xulrunner-x11 in a mac
// modifiers.M = new modifier( function (event) { return event.metaKey; }, function (event) { event.metaKey = true; });

//  housekeeping: vacuuming sqlite DBs
//  find . -name '*.sqlite' -exec sqlite3 -batch -echo '{}' vacuum \;
