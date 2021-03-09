const { fetchData } = require('../wordpress');

const endPoint =
  'https://blog.mozilla.org/addons/wp-json/wp/v2/tags?&per_page=25';

module.exports = async function fetchPosts() {
  return fetchData('tags', endPoint);
};
