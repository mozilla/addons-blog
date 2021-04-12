const { buildFooter } = require('addons-frontend-blog-utils');

const { AMO_BLOG_BASE_URL } = require('../wordpress');

module.exports = {
  siteTitle: 'Mozilla Add-ons Blog',
  baseURL: AMO_BLOG_BASE_URL,
  footer: buildFooter(),
};
