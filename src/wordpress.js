// Based on fetching + caching in https://github.com/samikeijonen/11ty-wp ❤️

const path = require('path');

const fetch = require('node-fetch');
const flatcache = require('flat-cache');
const { DateTime } = require('luxon');

const AMO_BASE_URL = process.env.AMO_BASE_URL || 'https://addons.mozilla.org';
const AMO_BLOG_BASE_URL = `${AMO_BASE_URL}/blog`;
const WORDPRESS_BASE_URL =
  process.env.WORDPRESS_BASE_URL || 'https://mozamo.wpengine.com';

async function getNumPages(endPoint) {
  const result = await fetch(endPoint, { method: 'HEAD' });
  return result.headers.get('x-wp-totalpages') || 1;
}

const fixInternalURLs = (content, { baseURL = WORDPRESS_BASE_URL } = {}) => {
  if (process.env.DONT_FIX_INTERNAL_URLS === '1') {
    return content;
  }

  const urlPattern = [
    // Make sure the URL pattern accepts both http:// and https://.
    baseURL.replace(/^https?:/, 'https?:'),
    // Do not replace URLs containing `/wp-content/`.
    '(?!/wp-content/)',
  ].join('');

  return content.replace(new RegExp(urlPattern, 'g'), AMO_BLOG_BASE_URL);
};

const createPost = ({
  author,
  id,
  slug,
  title,
  excerpt,
  date,
  modified,
  content,
  yoast_head,
  featured_media,
}) => {
  const permalink = `/blog/${DateTime.fromISO(date).toFormat(
    'y/LL/dd'
  )}/${slug}/`;

  return {
    author,
    id,
    slug,
    title: title.rendered,
    excerpt: fixInternalURLs(excerpt.rendered),
    date,
    modified,
    content: fixInternalURLs(content.rendered),
    permalink,
    absolutePermalink: `${AMO_BASE_URL}${permalink}`,
    seoHead: fixInternalURLs(yoast_head || ''),
    featuredImage: featured_media || null,
  };
};

async function fetchAll({ numPages, endPoint, type }) {
  const allPages = [];
  let allData = [];

  // eslint-disable-next-line no-console
  console.debug(`Fetching ${type} content from wordpress via REST API`);

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    // console.log(`${endPoint}&page=${pageNum}`);
    const page = fetch(`${endPoint}&page=${pageNum}`);
    allPages.push(page);
  }

  const results = await Promise.all(allPages);
  for (const result of results) {
    let json = await result.json();

    // Filter post data and only keep/cache what we care about.
    if (type === 'posts') {
      json = json
        .filter((item) => {
          return item.status === 'publish' && item.slug;
        })
        .map(createPost);
    }

    allData.push(json);
    allData = allData.flat();
  }

  return allData;
}

async function fetchData(type, endPoint) {
  if (process.env.BUILD_WORDPRESS_THEME === '1') {
    // eslint-disable-next-line no-console
    console.debug(
      "Not fetching any data because BUILD_WORDPRESS_THEME is set to '1'"
    );
    return {};
  }

  if (!endPoint.startsWith('/')) {
    throw new Error(`endPoint="${endPoint}" must start with a slash`);
  }

  const url = `${WORDPRESS_BASE_URL}${endPoint}`;
  // eslint-disable-next-line no-console
  console.debug(`URL for ${type}: ${url}`);

  const noCache = process.env.NO_CACHE === '1';
  if (noCache) {
    // eslint-disable-next-line no-console
    console.debug('Cache is disabled');
  }

  const cache = flatcache.load(type, path.resolve(__dirname, '../cache'));
  const date = new Date();
  // Key set to today's date so at most we should only be fetching everything
  // once per day.
  const key = `${date.getUTCFullYear()}-${
    date.getUTCMonth() + 1
  }-${date.getUTCDate()}`;
  const cachedData = cache.getKey(key);

  if (noCache || !cachedData) {
    const numPages = await getNumPages(url);
    const allData = await fetchAll({ numPages, endPoint: url, type });
    cache.setKey(key, allData);
    cache.save();
    return allData;
  }

  return cachedData;
}

const getMediaSize = ({ media, size }) => {
  if (!media || !media.media_details || !media.media_details.sizes) {
    return null;
  }

  return media.media_details.sizes[size] || null;
};

module.exports = {
  AMO_BASE_URL,
  AMO_BLOG_BASE_URL,
  WORDPRESS_BASE_URL,
  createPost,
  fetchData,
  fixInternalURLs,
  getMediaSize,
};
