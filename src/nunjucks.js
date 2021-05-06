const Nunjucks = require('nunjucks');

const createNunjucksEnvironment = ({ searchPaths }) => {
  return new Nunjucks.Environment(new Nunjucks.FileSystemLoader(searchPaths), {
    autoescape: true,
  });
};

module.exports = { createNunjucksEnvironment };
