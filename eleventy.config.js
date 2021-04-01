const path = require('path');

const fs = require('fs-extra');
const Nunjucks = require('nunjucks');
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
} = require('./src/filters');

const cwd = process.env.ELEVENTY_CWD
  ? path.resolve(process.env.ELEVENTY_CWD)
  : __dirname;

const inputDir = path.relative(__dirname, path.join(cwd, 'src/content'));
const wpInputDir = path.relative(__dirname, path.join(cwd, 'src/wp-content'));
const outputDir = path.join(cwd, 'build');
const includeDirName = 'includes';

const buildWordpressTheme = process.env.BUILD_WORDPRESS_THEME === '1';

const nunjucksEnvironment = new Nunjucks.Environment(
  new Nunjucks.FileSystemLoader([path.join('src', includeDirName), cwd]),
  { autoescape: true }
);
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

  // We have integration tests that rely on a test project and it doesn't have
  // the files listed below so we don't copy those when executing the tests.
  if (process.env.NODE_ENV !== 'test') {
    // Explicitly copy through the built files needed.
    eleventyConfig.addPassthroughCopy({
      './src/assets/img/': 'assets/img/',
      './src/assets/fonts/': 'assets/fonts/',
    });

    if (buildWordpressTheme) {
      const addonsFrontendCardPath =
        './node_modules/@willdurand/addons-frontend-card';

      eleventyConfig.addPassthroughCopy({
        [`${wpInputDir}/screenshot.png`]: 'screenshot.png',
        // These assets are used to build static add-on cards in WordPress.
        [`${wpInputDir}/addon-cards.js`]: 'assets/js/addon-cards.js',
        [`${addonsFrontendCardPath}/web.js`]: 'assets/js/addons-frontend-card.js',
        [`${addonsFrontendCardPath}/style.css`]: 'assets/css/addons-frontend-card.css',
      });
    } else {
      eleventyConfig.addPassthroughCopy({
        './src/content/robots.txt': 'robots.txt',
      });
    }

    let browserSyncConfig = {
      callbacks: {
        ready(err, bs) {
          bs.addMiddleware('*', (req, res) => {
            const content_404 = fs.readFileSync('./build/404.html');
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
