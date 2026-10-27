// Unit tests for metadata parsing. Run: npm test
import assert from 'node:assert/strict';
import { parseIcestats, parse7html, parseCustom } from '../src/metadata.js';
import { splitTitle } from '../src/util.js';

const t = (r) => ({ artist: r.artist, title: r.title });

assert.deepEqual(splitTitle('A - B - C'), { artist: 'A', title: 'B - C', text: 'A - B - C' });
assert.deepEqual(splitTitle('  Just a title '), { artist: '', title: 'Just a title', text: 'Just a title' });

const ice = {
  icestats: {
    source: [
      { listenurl: 'http://internal:8000/other', title: 'X - Y' },
      { listenurl: 'http://internal:8000/live', artist: 'Mira Vale', title: 'Glasshouse', server_name: 'Mock FM' },
    ],
  },
};
assert.deepEqual(t(parseIcestats(ice, 'https://radio.example.com/live')), { artist: 'Mira Vale', title: 'Glasshouse' });
assert.equal(parseIcestats(ice, 'https://radio.example.com/live').station, 'Mock FM');
assert.throws(() => parseIcestats(ice, 'https://radio.example.com/nope'));
// Single mount: used even if the path doesn't match (e.g. behind a proxy).
assert.equal(parseIcestats({ icestats: { source: { listenurl: 'http://a/b', title: 'P - Q' } } }, 'https://x/y').title, 'Q');

assert.equal(parse7html('<html><body>4,1,9,100,4,128,Kettle, Spoon - Static</body></html>').text, 'Kettle, Spoon - Static');
assert.throws(() => parse7html('<html>Not found</html>'));

// AzuraCast
assert.deepEqual(t(parseCustom([{ now_playing: { song: { artist: 'A', title: 'B', art: 'x.jpg' } } }])), { artist: 'A', title: 'B' });
assert.equal(parseCustom({ now_playing: { song: { artist: 'A', title: 'B', art: 'x.jpg' } } }).art, 'x.jpg');
// Radio.co
assert.deepEqual(t(parseCustom({ current_track: { title: 'A - B' } })), { artist: 'A', title: 'B' });
// Flat shapes
assert.deepEqual(t(parseCustom({ artist: 'A', title: 'B' })), { artist: 'A', title: 'B' });
assert.deepEqual(t(parseCustom({ song: 'A - B' })), { artist: 'A', title: 'B' });
assert.deepEqual(t(parseCustom({ songtitle: 'A - B' })), { artist: 'A', title: 'B' });
assert.deepEqual(t(parseCustom({ now_playing: 'A - B' })), { artist: 'A', title: 'B' });
assert.deepEqual(t(parseCustom('A - B')), { artist: 'A', title: 'B' });
assert.throws(() => parseCustom({ foo: 1 }));

console.log('parsers: all tests passed');
