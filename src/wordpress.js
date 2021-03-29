// Based on fetching + caching in https://github.com/samikeijonen/11ty-wp ❤️

const path = require('path');

const fetch = require('node-fetch');
const flatcache = require('flat-cache');
const { DateTime } = require('luxon');

async function getNumPages(endPoint) {
  const result = await fetch(endPoint, { method: 'HEAD' });
  return result.headers.get('x-wp-totalpages') || 1;
}

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

    // Filter post data and only cache what we care about.
    // This could be completely factored out if we can use
    // the graphql wordpress plugin.
    if (type === 'posts') {
      json = json
        .filter((item) => {
          return item.status === 'publish' && item.slug;
        })
        .map(
          ({
            author,
            id,
            slug,
            title,
            excerpt,
            date,
            modified,
            tags,
            content,
            categories,
          }) => {
            return {
              author,
              id,
              slug,
              title,
              excerpt,
              date,
              modified,
              tags,
              content,
              categories,
              postUrl: `/blog/${DateTime.fromISO(date).toFormat(
                'y/LL/dd'
              )}/${slug}/`,
            };
          }
        );
    }

    allData.push(json);
    allData = allData.flat();
  }

  return allData;
}

async function fetchData(type, endPoint) {
  const baseURL =
    process.env.WORDPRESS_BASE_URL || 'https://mozamo.wpengine.com';
  // eslint-disable-next-line no-console
  console.debug(`WordPress base URL: ${baseURL}`);

  const url = `${baseURL}/${endPoint}`;

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

module.exports = {
  fetchData,
};
