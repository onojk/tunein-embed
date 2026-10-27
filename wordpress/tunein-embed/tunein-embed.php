<?php
/**
 * Plugin Name: tunein-embed Radio Player
 * Plugin URI:  https://github.com/onojk/tunein-embed
 * Description: Live Icecast / SHOUTcast radio player. Use the shortcode [radio_player src="https://example.com/stream" title="My Station"].
 * Version:     1.0.0
 * Author:      Jonathan Kendall
 * License:     MIT
 * License URI: https://opensource.org/licenses/MIT
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** Where the player script and iframe page are loaded from. Override with the filters below. */
const TUNEIN_EMBED_SCRIPT = 'https://cdn.jsdelivr.net/gh/onojk/tunein-embed@1/dist/player.js';
const TUNEIN_EMBED_IFRAME = 'https://onojk.github.io/tunein-embed/embed.html';

/**
 * [radio_player src="..." title="..." meta="auto" theme="dark" visualizer="lines" art="itunes"
 *               logo="..." history="on" accent="#ff4f6d" mode="script|iframe" height="150"]
 */
function tunein_embed_shortcode( $atts ) {
	$a = shortcode_atts(
		array(
			'src'        => '',
			'title'      => '',
			'meta'       => 'auto',
			'theme'      => 'dark',
			'visualizer' => 'lines',
			'art'        => '',
			'logo'       => '',
			'history'    => 'off',
			'poll'       => '',
			'volume'     => '',
			'cors'       => '',
			'accent'     => '',
			'mode'       => 'script',
			'height'     => '',
		),
		$atts,
		'radio_player'
	);

	if ( '' === $a['src'] ) {
		return current_user_can( 'edit_posts' ) ? '<p><em>[radio_player] is missing src="..."</em></p>' : '';
	}

	$urls  = array( 'src', 'logo' );
	$pairs = array();
	foreach ( array( 'src', 'title', 'meta', 'theme', 'visualizer', 'art', 'logo', 'history', 'poll', 'volume', 'cors' ) as $key ) {
		if ( '' === $a[ $key ] ) {
			continue;
		}
		$is_url        = in_array( $key, $urls, true ) || ( 'meta' === $key && preg_match( '#^(https?:)?//#', $a[ $key ] ) );
		$pairs[ $key ] = $is_url ? esc_url_raw( $a[ $key ] ) : sanitize_text_field( $a[ $key ] );
	}
	$accent = sanitize_hex_color( $a['accent'] );

	if ( 'iframe' === $a['mode'] ) {
		if ( $accent ) {
			$pairs['accent'] = $accent;
		}
		$height = absint( $a['height'] ) ? absint( $a['height'] ) : ( 'off' === $a['history'] ? 150 : 330 );
		$url    = add_query_arg( array_map( 'rawurlencode', $pairs ), apply_filters( 'tunein_embed_iframe_url', TUNEIN_EMBED_IFRAME ) );
		return sprintf(
			'<iframe src="%s" title="%s" style="width:100%%;height:%dpx;border:0" allow="autoplay; encrypted-media" loading="lazy"></iframe>',
			esc_url( $url ),
			esc_attr( $pairs['title'] ?? 'Radio player' ),
			$height
		);
	}

	wp_enqueue_script( 'tunein-embed', apply_filters( 'tunein_embed_script_url', TUNEIN_EMBED_SCRIPT ), array(), '1', true );
	$html = '<radio-player';
	foreach ( $pairs as $key => $value ) {
		$html .= sprintf( ' %s="%s"', $key, esc_attr( $value ) );
	}
	if ( $accent ) {
		$html .= sprintf( ' style="--rp-accent:%s"', esc_attr( $accent ) );
	}
	return $html . '></radio-player>';
}
add_shortcode( 'radio_player', 'tunein_embed_shortcode' );
