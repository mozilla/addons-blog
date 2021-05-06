const path = require('path');

const {
  absoluteUrl,
  convertHtmlToAbsoluteUrls,
  dateToRfc3339,
} = require('@11ty/eleventy-plugin-rss');

const { createNunjucksEnvironment } = require('../../src/nunjucks');
const { createPost } = require('../../src/wordpress');
const {
  convertToJsDate,
  lastModifiedDate,
  makeBetterSafe,
} = require('../../src/filters');
const apiPost = require('../fixtures/apiPost');

describe(__filename, () => {
  const nunjucksEnvironment = createNunjucksEnvironment({
    searchPaths: [path.resolve(path.join(__dirname, '..', '..'))],
  });
  // This is how we override the `safe` plugin in the Eleventy configuration.
  const { safe: markAsSafe } = nunjucksEnvironment.filters;
  nunjucksEnvironment.addFilter('safe', makeBetterSafe({ markAsSafe }));
  // Some of our custom filters are required.
  nunjucksEnvironment.addFilter('lastModifiedDate', lastModifiedDate);
  nunjucksEnvironment.addFilter('convertToJsDate', convertToJsDate);
  // We have to fake some filters used in the template.
  nunjucksEnvironment.addFilter('url', (val) => val);
  nunjucksEnvironment.addFilter('getAuthor', (val) => val);
  // Add filters provided by eleventy-plugin-rss.
  nunjucksEnvironment.addFilter('dateToRfc3339', dateToRfc3339);
  nunjucksEnvironment.addFilter('absoluteUrl', absoluteUrl);
  // Ugh. Unfortunately, the Eleventy does not expose this logic so we have to
  // copy it :/
  nunjucksEnvironment.addFilter(
    'htmlToAbsoluteUrls',
    (htmlContent, base, callback) => {
      if (!htmlContent) {
        callback(null, '');
        return;
      }

      const posthtmlOptions = {
        // default PostHTML render options
        closingSingleTag: 'slash',
      };

      convertHtmlToAbsoluteUrls(htmlContent, base, posthtmlOptions).then(
        (html) => {
          callback(null, html);
        }
      );
    },
    true
  );

  it('renders a valid Atom feed', async () => {
    const content = '<p>ok</p><script></script>';
    const post = createPost({ ...apiPost, content: { rendered: content } });

    const atom = await new Promise((res, rej) => {
      nunjucksEnvironment.render(
        'src/content/feed.njk',
        {
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

    expect(atom).toContain('<feed xmlns="http://www.w3.org/2005/Atom">');
    // We expect the content to be sanitized and then escaped.
    expect(atom).toContain(
      '<content type="html">&lt;p&gt;ok&lt;/p&gt;</content>'
    );
  });
});
