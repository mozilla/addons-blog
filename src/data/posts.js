const { fetchData } = require('../wordpress');

const endPoint =
  'https://blog.mozilla.org/addons/wp-json/wp/v2/posts?orderby=date&order=desc&per_page=50';

module.exports = async function fetchPosts() {
  return fetchData('posts', endPoint);
};
