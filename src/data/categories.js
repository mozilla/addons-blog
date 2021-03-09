const { fetchData } = require('../wordpress');

const endPoint =
  'https://blog.mozilla.org/addons/wp-json/wp/v2/categories?&per_page=25';

module.exports = async function fetchCategories() {
  return fetchData('categories', endPoint);
};
