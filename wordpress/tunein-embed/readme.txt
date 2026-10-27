=== tunein-embed Radio Player ===
Contributors: onojk
Tags: radio, icecast, shoutcast, audio player, stream
Requires at least: 5.0
Tested up to: 6.6
Requires PHP: 7.4
Stable tag: 1.0.0
License: MIT

Live Icecast / SHOUTcast radio player with now-playing info, album art and a visualizer.

== Installation ==

1. Copy the `tunein-embed` folder into `wp-content/plugins/` (or zip it and use Plugins > Add New > Upload).
2. Activate "tunein-embed Radio Player".
3. Add a Shortcode block with:

    [radio_player src="https://example.com:8443/stream" title="My Station"]

== Shortcode attributes ==

src, title, meta (auto|off|URL), theme (dark|light|auto), visualizer (lines|bars|off),
art (itunes|off), logo (image URL), history (off|on|open), poll (seconds), volume (0-1),
cors (auto|on|off), accent (#hex colour).

mode="iframe" renders an <iframe> instead of loading the script (use it if a caching or
security plugin strips scripts); height="150" sets the iframe height in px.

Your stream URL must be https:// on an https:// site. See the full README:
https://github.com/onojk/tunein-embed

== Filters ==

tunein_embed_script_url - change where player.js is loaded from (e.g. a self-hosted copy).
tunein_embed_iframe_url - change the embed.html URL used by mode="iframe".
