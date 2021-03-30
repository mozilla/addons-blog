const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const { buildStaticAddonCard } = require('@willdurand/addons-frontend-card');
const stringReplaceAsync = require('string-replace-async');

const ALLOWED_ATTRS_BY_TAG_FOR_HEAD_MARKUP = {
  meta: ['name', 'content', 'property'],
  link: ['rel', 'href'],
  script: ['type'],
};

const makeBetterSafe = ({ markAsSafe }) => {
  const { window } = new JSDOM('');
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

const makeBuildStaticAddonCards = ({
  _buildStaticAddonCard = buildStaticAddonCard,
} = {}) => async (value, callback) => {
  const regexp = /<div class="addon-card" data-addon-id="(\d+)"><\/div>/g;

  const content = await stringReplaceAsync(
    value.toString(),
    regexp,
    async (_, addonId) => {
      let html = '';

      try {
        html = await _buildStaticAddonCard({ addonId });
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

module.exports = {
  makeBetterSafe,
  makeBuildStaticAddonCards,
};
