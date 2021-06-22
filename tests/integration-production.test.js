/* eslint  jest/no-standalone-expect: 0 */
const path = require('path');
const fs = require('fs');

describe(__filename, () => {
  const DIST_DIR = path.join(__dirname, '..', 'dist');
  // If the `SKIP_PRODUCTION_BUILD_TESTS` env variable is set (to `'1'`), we
  // skip the test cases below, otherwise we run them (the default).
  const maybeIt =
    process.env.SKIP_PRODUCTION_BUILD_TESTS === '1' ? it.skip : it;

  beforeEach(() => {
    if (!fs.existsSync(DIST_DIR)) {
      throw new Error(
        `"${DIST_DIR}" not found. You must run 'yarn build:production' first.`
      );
    }
  });

  maybeIt('has at least 2 blog posts', () => {
    const directories = fs
      .readdirSync(path.join(DIST_DIR, 'blog'), {
        withFileTypes: true,
      })
      .filter((entry) => entry.name !== 'assets' && entry.isDirectory());

    expect(directories.length).toBeGreaterThanOrEqual(2);
  });

  maybeIt('has an Atom feed', () => {
    expect(fs.existsSync(path.join(DIST_DIR, 'blog', 'feed.xml'))).toEqual(
      true
    );
  });

  maybeIt('has a sitemap', () => {
    expect(fs.existsSync(path.join(DIST_DIR, 'blog', 'sitemap.xml'))).toEqual(
      true
    );
  });
});
