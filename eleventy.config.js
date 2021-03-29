const path = require('path');

const fs = require('fs-extra');
const { DateTime } = require('luxon');
const xmlFiltersPlugin = require('eleventy-xml-plugin');
const Nunjucks = require('nunjucks');

const { makeBetterSafe } = require('./src/filters');

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

  eleventyConfig.addFilter('luxon', (value, format) => {
    return DateTime.fromISO(value).toFormat(format);
  });

  eleventyConfig.addFilter('readableDate', (value) => {
    return DateTime.fromISO(value).toFormat('LLLL d, kkkk');
  });

  eleventyConfig.addFilter('postAuthors', (allAuthors, postAuthor) => {
    return allAuthors.filter((item) => {
      return postAuthor === item.id;
    });
  });

  function getPost(allPosts, currentPost, modifier) {
    let postIndex;
    for (let i = 0; i < allPosts.length; i++) {
      if (allPosts[i].id === currentPost.id) {
        postIndex = i;
        break;
      }
    }

    if (postIndex >= 0 && allPosts && allPosts.length) {
      if (postIndex + modifier >= 0 && postIndex + modifier < allPosts.length) {
        return allPosts[postIndex + modifier];
      }
    }

    return null;
  }

  eleventyConfig.addFilter('getPrevPost', (allPosts, currentPost) => {
    return getPost(allPosts, currentPost, -1);
  });

  eleventyConfig.addFilter('getNextPost', (allPosts, currentPost) => {
    return getPost(allPosts, currentPost, 1);
  });

  // We have integration tests that rely on a test project and it doesn't have
  // the files listed below so we don't copy those when executing the tests.
  if (process.env.NODE_ENV !== 'test') {
    // Explicitly copy through the built files needed.
    eleventyConfig.addPassthroughCopy({
      './src/content/robots.txt': 'robots.txt',
      './src/assets/img/': 'assets/img/',
      './src/assets/fonts/': 'assets/fonts/',
    });

    if (buildWordpressTheme) {
      eleventyConfig.addPassthroughCopy({
        [`${wpInputDir}/screenshot.png`]: 'screenshot.png',
      });
    }

    eleventyConfig.setBrowserSyncConfig({
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
    });
  }

  // Plugins
  eleventyConfig.addPlugin(xmlFiltersPlugin);

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
