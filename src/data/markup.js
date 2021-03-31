const { buildFooter } = require('@willdurand/addons-frontend-card');

const { AMO_BLOG_BASE_URL } = require('../wordpress');

module.exports = {
  siteTitle: 'Mozilla Add-ons Blog',
  baseURL: AMO_BLOG_BASE_URL,
  footer: buildFooter(),
};
