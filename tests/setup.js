global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

// jsdom does not provide a `fetch` implementation, which is needed since we
// replaced `node-fetch` with the native `fetch`. We polyfill it here so that
// tests running in the jsdom environment can spy on `global.fetch`.
require('whatwg-fetch');
