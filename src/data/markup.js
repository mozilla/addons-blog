const { buildFooter, buildHeader } = require('addons-frontend-blog-utils');

const { AMO_BASE_URL, getBaseApiURL } = require('../wordpress');

module.exports = {
  siteTitle: 'Firefox Add-ons Blog',
  siteDescription:
    'Download Firefox extensions and themes. They’re like apps for your browser. They can block annoying ads, protect passwords, change browser appearance, and more.',
  baseURL: AMO_BASE_URL,
  baseApiURL: getBaseApiURL(),
  footer: buildFooter(),
  header: buildHeader(),
};
