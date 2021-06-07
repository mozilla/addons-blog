const path = require('path');

const fs = require('fs-extra');
const pluginRss = require('@11ty/eleventy-plugin-rss');

const {
  convertToJsDate,
  getAuthor,
  getNextPost,
  getPrevPost,
  lastModifiedDate,
  makeBetterSafe,
  makeBuildStaticAddonCards,
  mediaGetFullURL,
  mediaGetMediumURL,
  readableDate,
  sitemapDate,
} = require('./src/filters');
const { createNunjucksEnvironment } = require('./src/nunjucks');

const cwd = process.env.ELEVENTY_CWD
  ? path.resolve(process.env.ELEVENTY_CWD)
  : __dirname;

const inputDir = path.relative(__dirname, path.join(cwd, 'src/content'));
const wpInputDir = path.relative(__dirname, path.join(cwd, 'src/wp-content'));
const outputDir = path.join(cwd, 'build');
const includeDirName = 'includes';

const buildWordpressTheme = process.env.BUILD_WORDPRESS_THEME === '1';

const nunjucksEnvironment = createNunjucksEnvironment({
  searchPaths: [path.join('src', includeDirName), cwd],
});
const { safe: markAsSafe } = nunjucksEnvironment.filters;

module.exports = function configure(eleventyConfig) {
  // Tell the config to not use gitignore for ignores.
  eleventyConfig.setUseGitIgnore(false);

  eleventyConfig.setLibrary('njk', nunjucksEnvironment);

  // For the WordPress theme, we don't want to override the `safe` filter
  // because we output PHP code that would get removed by DOMPurify otherwise.
  if (!buildWordpressTheme) {
    // Override the default `safe` Nunjucks filter to run DOMPurify.
    eleventyConfig.addNunjucksFilter('safe', makeBetterSafe({ markAsSafe }));
  }

  eleventyConfig.addNunjucksAsyncFilter(
    'buildStaticAddonCards',
    makeBuildStaticAddonCards()
  );

  eleventyConfig.addFilter('convertToJsDate', convertToJsDate);
  eleventyConfig.addFilter('getAuthor', getAuthor);
  eleventyConfig.addFilter('getNextPost', getNextPost);
  eleventyConfig.addFilter('getPrevPost', getPrevPost);
  eleventyConfig.addFilter('lastModifiedDate', lastModifiedDate);
  eleventyConfig.addFilter('mediaGetFullURL', mediaGetFullURL);
  eleventyConfig.addFilter('mediaGetMediumURL', mediaGetMediumURL);
  eleventyConfig.addFilter('readableDate', readableDate);
  eleventyConfig.addFilter('sitemapDate', sitemapDate);

  // We have integration tests that rely on a test project and it doesn't have
  // the files listed below so we don't copy those when executing the tests.
  if (process.env.NODE_ENV !== 'test') {
    // Explicitly copy through the built files needed.
    eleventyConfig.addPassthroughCopy({
      './src/assets/img/': 'blog/assets/img/',
      './src/assets/fonts/otf': 'blog/assets/fonts/otf',
      './src/assets/fonts/woff2': 'blog/assets/fonts/woff2',
    });

    if (buildWordpressTheme) {
      const blogUtils = './node_modules/addons-frontend-blog-utils';

      eleventyConfig.addPassthroughCopy({
        [`${wpInputDir}/screenshot.png`]: 'screenshot.png',
        // These blog/assets are used to build static add-on cards in WordPress.
        [`${wpInputDir}/addon-cards.js`]: 'blog/assets/js/addon-cards.js',
        [`${blogUtils}/web.js`]: 'blog/assets/js/addons-frontend-blog-utils.js',
        [`${blogUtils}/style.css`]:
          'blog/assets/css/addons-frontend-blog-utils.css',
      });
    } else {
      eleventyConfig.addPassthroughCopy({
        './src/content/robots.txt': 'blog/robots.txt',
      });
      // We want to copy the same file twice but it isn't possible, see:
      // https://github.com/11ty/eleventy/issues/924
      fs.copySync(
        './src/content/robots.txt',
        path.join(outputDir, 'robots.txt')
      );
    }

    let browserSyncConfig = {
      callbacks: {
        ready(err, bs) {
          bs.addMiddleware('*', (req, res) => {
            const content_404 = fs.readFileSync('./build/error.html');
            // Provides the 404 content without redirect.
            res.write(content_404);
            // Add 404 http status code in request header.
            res.writeHead(404);
            res.end();
          });
        },
      },
    };

    if (process.env.USE_HTTPS === '1') {
      browserSyncConfig = {
        ...browserSyncConfig,
        host: 'example.com',
        https: {
          key: './example.com-key.pem',
          cert: './example.com.pem',
        },
      };
    }

    eleventyConfig.setBrowserSyncConfig(browserSyncConfig);
  }

  // Plugins
  eleventyConfig.addPlugin(pluginRss);

  return {
    dir: {
      input: buildWordpressTheme ? wpInputDir : inputDir,
      output: outputDir,
      // The following are relative to the input dir.
      data: '../data/',
      includes: `../${includeDirName}/`,
      layouts: '../layouts/',
    },
  };
};
