const path = require('path');
const Nunjucks = require('nunjucks');

module.exports = ((eleventyConfig) => {
  let nunjucksEnvironment = new Nunjucks.Environment(
    [new Nunjucks.FileSystemLoader('includes')],
    { autoescape: true }
  );
})();
