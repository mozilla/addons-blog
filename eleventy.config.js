const path = require('path');
const fs = require('fs-extra');
const { DateTime } = require('luxon');

const syntaxHighlight = require('@11ty/eleventy-plugin-syntaxhighlight');
const xmlFiltersPlugin = require('eleventy-xml-plugin');

const slugify = require('./libs/slugify');
const md = require('./libs/markdown');
const nunjucksEnvironment = require('./libs/templates');

const inputDir = path.relative(__dirname, 'src/content');
const outputDir = path.relative(__dirname, 'build');

module.exports = function (eleventyConfig) {
  // Tell the config to not use gitignore for ignores.
  eleventyConfig.setUseGitIgnore(false);

  eleventyConfig.setLibrary('njk', nunjucksEnvironment);

  // Markdown instance in general plus for filter in templates.
  eleventyConfig.setLibrary('md', md);
  eleventyConfig.addFilter('markdownify', function (value) {
    return md.render(value.toString());
  });

  eleventyConfig.addFilter('luxon', (value, format) => {
    return DateTime.fromISO(value).toFormat(format);
  });

  eleventyConfig.addFilter('readableDate', (value) => {
    return DateTime.fromISO(value).toFormat('LLLL d, kkkk');
  });

  eleventyConfig.addFilter(
    'postCategories',
    (allCategories, postCategories) => {
      return allCategories.filter((item) => {
        return postCategories.includes(item.id);
      });
    }
  );

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
  eleventyConfig.addPassthroughCopy({
    './src/assets/js/basket-client.js': 'assets/js/basket-client.js',
  });

  eleventyConfig.setBrowserSyncConfig({
    callbacks: {
      ready: function (err, bs) {
        bs.addMiddleware('*', (req, res) => {
          const content_404 = fs.readFileSync('./build/404.html');
          // Provides the 404 content without redirect.
          res.write(content_404);
          // Add 404 http status code in request header.
          // res.writeHead(404, { "Content-Type": "text/html" });
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
      input: inputDir,
      output: outputDir,
      // The following are relative to the input dir.
      data: '../data/',
      includes: '../includes/',
      layouts: '../layouts/',
    },
  };
};
