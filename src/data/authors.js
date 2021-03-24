const { fetchData } = require('../wordpress');

const endPoint = '/wp-json/wp/v2/users?&per_page=25';

module.exports = async function fetchPosts() {
  return fetchData('authors', endPoint);
};
