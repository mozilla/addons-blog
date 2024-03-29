/* global window */
const createDOMPurify = require('dompurify');
const { buildStaticAddonCard } = require('addons-frontend-blog-utils');
const stringReplaceAsync = require('string-replace-async');
const { DateTime } = require('luxon');

const { getMediaSize } = require('./wordpress');

const ALLOWED_ATTRS_BY_TAG_FOR_HEAD_MARKUP = {
  meta: ['name', 'content', 'property'],
  link: ['rel', 'href'],
  script: ['type'],
};

// Only load window from jsdom when it does not exist. In a node env, we expect
// `window` to be undefined all the time but we are using the "jsdom"
// environment in Jest, which already provides `window`. We don't want to load
// jsdom again when that is the case.
if (typeof window === 'undefined') {
  // eslint-disable-next-line global-require
  const { JSDOM } = require('jsdom');
  global.window = new JSDOM('').window;
}

const makeBetterSafe = ({ markAsSafe }) => {
  const DOMPurify = createDOMPurify(window);

  return (value, { isHeadMarkup = false } = {}) => {
    if (!value) {
      return undefined;
    }

    if (isHeadMarkup) {
      const domPurifyOptions = {
        WHOLE_DOCUMENT: true,
        // This is needed because `WHOLE_DOCUMENT` is required to sanitize
        // `meta` tags but DOMPurify will return the content inside
        // `<html><head>...</head></html>` instead of "just" the meta tags.
        RETURN_DOM: true,
        // This is needed to allow property values like `og:xyz`.
        ADD_URI_SAFE_ATTR: ['property'],
        ALLOWED_TAGS: Object.keys(ALLOWED_ATTRS_BY_TAG_FOR_HEAD_MARKUP),
        // We don't use `ALLOWED_ATTR` here because we want to allow different
        // attributes for the different allowed tags.
      };

      // By default, all non-standard attributes will be removed by DOMPurify.
      // This hook allows to mark some of these attributes as valid so that
      // they are kept.
      DOMPurify.addHook('uponSanitizeAttribute', (node, hookEvent) => {
        const allowedAttributes =
          ALLOWED_ATTRS_BY_TAG_FOR_HEAD_MARKUP[
            (node.tagName || '').toLowerCase()
          ] || [];

        if (allowedAttributes.includes(hookEvent.attrName)) {
          // eslint-disable-next-line no-param-reassign
          hookEvent.forceKeepAttr = true;
        }
      });

      // This hook sanitizes JSON+LD script tags.
      DOMPurify.addHook('uponSanitizeElement', (node, hookEvent) => {
        if (hookEvent.tagName === 'script') {
          if (node.getAttribute('type') !== 'application/ld+json') {
            node.remove();
          }

          try {
            // eslint-disable-next-line no-param-reassign
            node.textContent = JSON.stringify(JSON.parse(node.textContent));
          } catch (e) {
            // Remove invalid content if it cannot be parsed as JSON.
            // eslint-disable-next-line no-param-reassign
            node.textContent = '';
          }
        }
      });

      const html = DOMPurify.sanitize(value.toString(), domPurifyOptions);

      // Remove hooks when we don't need them anymore.
      DOMPurify.removeHook('uponSanitizeAttribute');
      DOMPurify.removeHook('uponSanitizeElement');

      return markAsSafe(html.querySelector('head').innerHTML);
    }

    return markAsSafe(DOMPurify.sanitize(value.toString()));
  };
};

const makeBuildStaticAddonCards =
  ({ _buildStaticAddonCard = buildStaticAddonCard, baseURL } = {}) =>
  async (value, callback) => {
    const regexp = /<div class="addon-card" data-addon-id="(.+?)"><\/div>/g;

    const content = await stringReplaceAsync(
      value.toString(),
      regexp,
      async (_, addonId) => {
        let html = '';

        try {
          html = await _buildStaticAddonCard({ addonId, baseURL });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(
            `Error while trying to build card for addonId=${addonId}: ${
              e.message || e
            }`
          );
        }

        return html;
      }
    );

    callback(null, content);
  };

const mediaGetURL = (allMedia, featuredMediaId, size) => {
  const media = allMedia.find((item) => {
    return featuredMediaId === item.id;
  });
  const mediaSize = getMediaSize({ media, size });

  return mediaSize ? mediaSize.source_url : '';
};

const mediaGetFullURL = (allMedia, featuredMediaId) => {
  return mediaGetURL(allMedia, featuredMediaId, 'full');
};

const mediaGetMediumURL = (allMedia, featuredMediaId) => {
  return mediaGetURL(allMedia, featuredMediaId, 'medium_large');
};

const convertToJsDate = (value) => {
  return DateTime.fromISO(value).toJSDate();
};

const lastModifiedDate = (allPosts) => {
  if (!allPosts.length) {
    return null;
  }

  const posts = [...allPosts];

  posts.sort((a, b) => {
    return convertToJsDate(b.modified) - convertToJsDate(a.modified);
  });

  return convertToJsDate(posts[0].modified);
};

const readableDate = (value) => {
  return DateTime.fromISO(value).toFormat('LLLL d, kkkk');
};

const sitemapDate = (value) => {
  return DateTime.fromJSDate(value).toISODate();
};

const getPost = (allPosts, currentPost, modifier) => {
  let postIndex;
  for (let i = 0; i < allPosts.length; i++) {
    if (allPosts[i].id === currentPost.id) {
      postIndex = i;
      break;
    }
  }

  if (postIndex >= 0 && allPosts && allPosts.length) {
    if (postIndex + modifier >= 0 && postIndex + modifier < allPosts.length) {
      return allPosts[postIndex + modifier];
    }
  }

  return null;
};

const getPrevPost = (allPosts, currentPost) => {
  return getPost(allPosts, currentPost, -1);
};

const getNextPost = (allPosts, currentPost) => {
  return getPost(allPosts, currentPost, 1);
};

const getAuthor = (allAuthors, postAuthor) => {
  const author = allAuthors.find((item) => {
    return postAuthor === item.id;
  });

  return author || null;
};

module.exports = {
  convertToJsDate,
  getAuthor,
  getNextPost,
  getPrevPost,
  lastModifiedDate,
  makeBetterSafe,
  makeBuildStaticAddonCards,
  mediaGetFullURL,
  mediaGetMediumURL,
  readableDate,
  sitemapDate,
};
