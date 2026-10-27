#!/usr/bin/env python3
"""Local mock radio servers for developing/testing tunein-embed without real stations.

  python3 test/mock-server.py
    :8090  static files from the repo root (open http://localhost:8090/test/)
    :8091  Icecast-like:   /live.mp3, /status-json.xsl          (sends CORS headers)
    :8092  SHOUTcast-like: /stream, /stats?json=1, /currentsong, /7.html  (no CORS)

  Add ?drop=N to a stream URL to cut the connection after N seconds (tests reconnect).
  POST /report on :8090 prints the JSON body (used by the headless test pages).
"""
import json, os, subprocess, sys, threading, time
from http.server import SimpleHTTPRequestHandler, BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MP3 = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.tone.mp3')
SONGS = ['Neon Tide - Lanterns', 'The Paper Owls - Slow Orbit (Extended Mix)', 'Mira Vale - Glasshouse',
         'Kettle & Spoon - Saturday Static']

if not os.path.exists(MP3):
    # A wobbling chord so the visualizer has something to show.
    expr = '0.3*sin(2*PI*t*(220+40*sin(t)))+0.2*sin(2*PI*t*330)*sin(t*3)+0.15*sin(2*PI*t*880)*sin(t*7)'
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-f', 'lavfi', '-i', f'aevalsrc={expr}:s=44100:d=20',
                    '-b:a', '128k', MP3], check=True)
AUDIO = open(MP3, 'rb').read()


def song():
    return SONGS[int(time.time() // 20) % len(SONGS)]


class Radio(BaseHTTPRequestHandler):
    cors = True
    protocol_version = 'HTTP/1.0'

    def log_message(self, *a):
        pass

    def head(self, ctype, extra=()):
        self.send_response(200)
        self.send_header('Content-Type', ctype)
        self.send_header('Cache-Control', 'no-cache')
        if self.cors:
            self.send_header('Access-Control-Allow-Origin', '*')
        for k, v in extra:
            self.send_header(k, v)
        self.end_headers()

    def text(self, body, ctype='text/plain'):
        self.head(ctype)
        self.wfile.write(body.encode())

    def do_GET(self):
        u = urlparse(self.path)
        q = parse_qs(u.query)
        if u.path in ('/live.mp3', '/stream', '/;'):
            return self.stream(float(q.get('drop', ['0'])[0]))
        if u.path == '/status-json.xsl' and self.cors:
            src = {'listenurl': f'http://127.0.0.1:{self.server.server_port}/live.mp3', 'server_name': 'Mock Icecast',
                   'title': song(), 'listeners': 3}
            other = {'listenurl': f'http://127.0.0.1:{self.server.server_port}/other.mp3', 'title': 'Wrong - Mount'}
            return self.text(json.dumps({'icestats': {'source': [other, src]}}), 'application/json')
        if u.path == '/stats' and not self.cors:
            return self.text(json.dumps({'songtitle': song(), 'servertitle': 'Mock SHOUTcast'}), 'application/json')
        if u.path == '/currentsong' and not self.cors:
            return self.text(song())
        if u.path == '/7.html' and not self.cors:
            return self.text(f'<html><body>4,1,9,100,4,128,{song()}</body></html>', 'text/html')
        self.send_error(404)

    def stream(self, drop):
        self.head('audio/mpeg', [('icy-name', 'Mock')])
        start, pos, rate = time.time(), 0, 16000  # 128 kbps
        try:
            self.wfile.write(AUDIO[:64000])  # initial burst, like real servers
            pos = 64000
            while not drop or time.time() - start < drop:
                end = pos + rate // 4
                chunk = AUDIO[pos:end] if end <= len(AUDIO) else AUDIO[pos:] + AUDIO[:end - len(AUDIO)]
                pos = end % len(AUDIO)
                self.wfile.write(chunk)
                self.wfile.flush()
                time.sleep(0.25)
        except (BrokenPipeError, ConnectionResetError):
            pass


class NoCors(Radio):
    cors = False


class Static(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def log_message(self, *a):
        pass

    def do_POST(self):
        body = self.rfile.read(int(self.headers.get('Content-Length', 0))).decode()
        print('REPORT', body, flush=True)
        self.send_response(204)
        self.end_headers()


def serve(port, handler):
    ThreadingHTTPServer(('127.0.0.1', port), handler).serve_forever()


if __name__ == '__main__':
    for port, h in ((8091, Radio), (8092, NoCors)):
        threading.Thread(target=serve, args=(port, h), daemon=True).start()
    print('mock servers on :8090 (static) :8091 (icecast+cors) :8092 (shoutcast, no cors)', flush=True)
    try:
        serve(8090, Static)
    except KeyboardInterrupt:
        sys.exit(0)
