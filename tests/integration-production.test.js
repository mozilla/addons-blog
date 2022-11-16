/* eslint  jest/no-standalone-expect: 0 */
const path = require('path');
const fs = require('fs');
const { JSDOM } = require('jsdom');

const { AMO_BASE_URL } = require('../src/wordpress');

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

  const getAllPostDirectories = () => {
    return fs
      .readdirSync(path.join(DIST_DIR, 'blog'), {
        withFileTypes: true,
      })
      .filter((entry) => entry.name !== 'assets' && entry.isDirectory());
  };

  const getPostHTML = (slug) => {
    return fs.readFileSync(
      path.join(DIST_DIR, 'blog', slug, 'index.html'),
      'utf-8'
    );
  };

  maybeIt('has at least 2 blog posts', () => {
    const directories = getAllPostDirectories();

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

  maybeIt('has a a css', () => {
    // Grab the index page
    const html = getPostHTML('');
    const dom = new JSDOM(html);
    const stylesheetUrl = dom.window.document.querySelector(
      'link[rel=stylesheet]'
    ).href;

    expect(stylesheetUrl).toMatch(/^\/blog\/.*$/);
    expect(fs.existsSync(path.join(DIST_DIR, stylesheetUrl))).toEqual(true);

    // Our stylesheet should integrate addons-frontend-blog-utils instead of importing
    // it.
    const stylesheetContents = fs.readFileSync(
      path.join(DIST_DIR, stylesheetUrl),
      'utf-8'
    );
    expect(stylesheetContents).not.toContain('@import');
  });

  describe('blog post', () => {
    maybeIt('renders a Pocket button', () => {
      // eslint-disable-next-line no-unused-vars
      const [first, ...others] = getAllPostDirectories();
      const slug = first.name;
      const html = getPostHTML(slug);
      const url = `${AMO_BASE_URL}/blog/${slug}/`;

      expect(html).toContain(
        `https://widgets.getpocket.com/v1/popup?url=${encodeURIComponent(url)}`
      );
    });
  });
});
