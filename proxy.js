/*
 * (C) Copyright 2008 Alexander Reinwarth
 *
 * Some simple functions for handling conkeror's connection through a
 * proxy. For simplification it is assumed that http, https, ftp and
 * gopher use the same proxy and port.
 *
 * "Works for me"
 */
 
/* http://www.mail-archive.com/conkeror@mozdev.org/msg00952.html */
 
/*  Standard proxy host and port for proxy-host and proxy-port. */
 
// toggle proxy
interactive("proxy-toggle",
            "Toggle the proxy on and off.",
            function(I) {
              var proxytype = get_pref("network.proxy.type");
              user_pref("network.proxy.type", proxytype == 1 ? 0 : 1);
              I.minibuffer.message("proxy turned " + (proxytype == 1 ? "off" : "on"));
            });
 
interactive("proxy-host",
            "Change the HTTP proxy host.",
            function (I) {
              var hostnym;
              user_pref("network.proxy.http", hostnym = (yield I.minibuffer.read($prompt = "Host:")));
              I.minibuffer.message("host set to " + hostnym);
            });
 
 
define_variable("proxy_host","localhost",
                "Hostname which will be offered as a standard value by proxy-host");
define_variable("proxy_port","8080",
                "Port which will be offered as a standard value by proxy-host");
 
/* toggle proxy on/off */
interactive("proxy-toggle",
            "Toggle wether to use a proxy or not.",
            function(I) {
                user_pref("network.proxy.type", get_pref("network.proxy.type") == 1 ? 0 : 1);
                proxy_display_settings(I);
                // update the widget
                select_buffer_hook.run(I.buffer);
            });
 
/* set the proxy host */
function proxy_set_host(host){
    user_pref("network.proxy.http", host);
    user_pref("network.proxy.ssl", host);
    user_pref("network.proxy.ftp", host);
    user_pref("network.proxy.gopher", host);
}
 
interactive("proxy-host",
            "Change the proxy host.",
            function (I) {
                proxy_set_host((yield I.minibuffer.read($prompt = "Host:",
$initial_value=proxy_host)));
                proxy_display_settings(I);
                // update the widget
                select_buffer_hook.run(I.buffer);
            });
 
 
/* set the proxy port */
function proxy_set_port(port){
    user_pref("network.proxy.http_port", parseFloat(port));
    user_pref("network.proxy.ssl_port", parseFloat(port));
    user_pref("network.proxy.ftp_port", parseFloat(port));
    user_pref("network.proxy.gopher_port", parseFloat(port));
}
 
interactive("proxy-port",
            "Change the proxy port.",
            function (I){
                proxy_set_port((yield I.minibuffer.read($prompt = "Port:",
$initial_value=proxy_port))) ;
                proxy_display_settings(I);
                // update the widget
                select_buffer_hook.run(I.buffer);
            });
 
 
/* display current proxy settings */
 
function proxy_display_settings (I){
 
    I.window.minibuffer.message ((get_pref("network.proxy.http"))+ ":" +
                                 (get_pref("network.proxy.http_port"))+ ":" +
                                 (get_pref("network.proxy.type")  == 1 ? "on" : "off")
                                 );
}
 
interactive ("proxy-display-settings",
             "Display the current proxy settings",
             function (I){proxy_display_settings(I);}
             );
 
/* key bindings */
 
define_key(default_global_keymap, "C-c p t", "proxy-toggle");
define_key(default_global_keymap, "C-c p h", "proxy-host");
define_key(default_global_keymap, "C-c p p", "proxy-port");
define_key(default_global_keymap, "C-c p d", "proxy-display-settings");
 
 
/*
 * A simple modeline-widget displaying the proxy settings
 */
 
function proxy_widget(window){
    this.name = "proxy-widget";
    text_widget.call(this, window);
 
    // update the widget when select_buffer_hook is run
    this.add_hook("select_buffer_hook");
}
 
proxy_widget.prototype.__proto__ = text_widget.prototype;
 
proxy_widget.prototype.update = function () {
    this.view.text = get_pref("network.proxy.http")+":"
+get_pref("network.proxy.http_port")+":" +(get_pref("network.proxy.type") == 1 ?
"on" : "off");
};
 
/*
 * Add the widget to the modeline
 */
 
add_hook("mode_line_hook", mode_line_adder(proxy_widget));
 