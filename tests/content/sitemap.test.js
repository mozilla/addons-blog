const path = require('path');

const { createNunjucksEnvironment } = require('../../src/nunjucks');
const { createPost } = require('../../src/wordpress');
const { convertToJsDate, sitemapDate } = require('../../src/filters');
const apiPost = require('../fixtures/apiPost');

describe(__filename, () => {
  const nunjucksEnvironment = createNunjucksEnvironment({
    searchPaths: [path.resolve(path.join(__dirname, '..', '..'))],
  });
  nunjucksEnvironment.addFilter('convertToJsDate', convertToJsDate);
  nunjucksEnvironment.addFilter('sitemapDate', sitemapDate);

  it('renders a sitemap', async () => {
    const post = createPost({ ...apiPost });
    const entry = { url: '/blog/', date: new Date() };

    const sitemap = await new Promise((res, rej) => {
      nunjucksEnvironment.render(
        'src/content/sitemap.njk',
        {
          collections: {
            all: [entry],
          },
          posts: [post],
        },
        (err, output) => {
          if (err) {
            rej(err);
          }

          res(output);
        }
      );
    });

    expect(sitemap).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'
    );
    expect(sitemap.match(/<url>/g)).toHaveLength(2);
    expect(sitemap).toContain(
      [
        '  <url>',
        `    <loc>${entry.url}</loc>`,
        `    <lastmod>${sitemapDate(entry.date)}</lastmod>`,
        '  </url>',
      ].join('\n')
    );
    expect(sitemap).toContain(
      [
        '  <url>',
        `    <loc>${post.absolutePermalink}</loc>`,
        `    <lastmod>${sitemapDate(convertToJsDate(post.modified))}</lastmod>`,
        '  </url>',
      ].join('\n')
    );
  });
});
