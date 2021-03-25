const path = require('path');

const fs = require('fs-extra');
const { DateTime } = require('luxon');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const syntaxHighlight = require('@11ty/eleventy-plugin-syntaxhighlight');
const xmlFiltersPlugin = require('eleventy-xml-plugin');
const Nunjucks = require('nunjucks');

const slugify = require('./libs/slugify');

const inputDir = path.relative(__dirname, 'src/content');
const wpInputDir = path.relative(__dirname, 'src/wp-content');
const outputDir = path.relative(__dirname, 'build');

const buildWordpressTheme = process.env.BUILD_WORDPRESS_THEME === '1';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
const defaultNunjucksEnv = new Nunjucks.Environment();

module.exports = function (eleventyConfig) {
  // Tell the config to not use gitignore for ignores.
  eleventyConfig.setUseGitIgnore(false);

  // Override the default `safe` Nunjucks filter to run DOMPurify.
  eleventyConfig.addNunjucksFilter('safe', (value) => {
    if (!value) {
      return;
    }

    return defaultNunjucksEnv.filters.safe(
      DOMPurify.sanitize(value.toString())
    );
  });

  eleventyConfig.addFilter('luxon', (value, format) => {
    return DateTime.fromISO(value).toFormat(format);
  });

  eleventyConfig.addFilter('readableDate', (value) => {
    return DateTime.fromISO(value).toFormat('LLLL d, kkkk');
  });

  eleventyConfig.addFilter('postAuthors', (allAuthors, postAuthor) => {
    return allAuthors.filter((item) => {
      return postAuthor == item.id;
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
  }

  eleventyConfig.addFilter('getPrevPost', (allPosts, currentPost) => {
    return getPost(allPosts, currentPost, -1);
  });

  eleventyConfig.addFilter('getNextPost', (allPosts, currentPost) => {
    return getPost(allPosts, currentPost, 1);
  });

  eleventyConfig.addFilter('slugify', slugify);

  // Explicitly copy through the built files needed.
  eleventyConfig.addPassthroughCopy({
    './src/content/robots.txt': 'robots.txt',
  });
  eleventyConfig.addPassthroughCopy({ './src/assets/img/': 'assets/img/' });
  eleventyConfig.addPassthroughCopy({ './src/assets/fonts/': 'assets/fonts/' });

  if (buildWordpressTheme) {
    eleventyConfig.addPassthroughCopy({
      [`${wpInputDir}/screenshot.png`]: 'screenshot.png',
    });
  }

  eleventyConfig.setBrowserSyncConfig({
    callbacks: {
      ready: function (err, bs) {
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

  // Plugins
  eleventyConfig.addPlugin(xmlFiltersPlugin);
  eleventyConfig.addPlugin(syntaxHighlight);

  return {
    dir: {
      input: buildWordpressTheme ? wpInputDir : inputDir,
      output: outputDir,
      // The following are relative to the input dir.
      data: '../data/',
      includes: '../includes/',
      layouts: '../layouts/',
    },
  };
};
