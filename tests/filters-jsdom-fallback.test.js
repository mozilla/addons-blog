/**
 * @jest-environment node
 */
// The rest of the filters tests run in the "jsdom" environment, where `window`
// is already defined. This file runs in the "node" environment (where `window`
// is undefined) to cover the fallback in `src/filters.js` that loads a DOM from
// jsdom. We mock jsdom so we don't have to load its (ESM-only) dependencies,
// which Jest cannot `require()` on Node < 24.9.
describe(__filename, () => {
  afterEach(() => {
    delete global.window;
    jest.resetModules();
    jest.unmock('jsdom');
  });

  it('loads `window` from jsdom when it is not already defined', () => {
    const fakeWindow = { document: {} };
    const JSDOM = jest.fn().mockImplementation(() => ({ window: fakeWindow }));
    jest.doMock('jsdom', () => ({ JSDOM }));

    expect(global.window).toBeUndefined();

    jest.isolateModules(() => {
      // eslint-disable-next-line global-require
      require('../src/filters');
    });

    expect(JSDOM).toHaveBeenCalledWith('');
    expect(global.window).toBe(fakeWindow);
  });
});
