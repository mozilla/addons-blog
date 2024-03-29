const {
  AMO_BLOG_BASE_URL,
  WORDPRESS_BASE_URL,
  createPost,
  fixInternalURLs,
  getBaseApiURL,
  getMediaSize,
} = require('../src/wordpress');
const apiPost = require('./fixtures/apiPost');

describe(__filename, () => {
  describe('createPost', () => {
    it('creates an internal post object', () => {
      const post = createPost(apiPost);
      const permalink = `/blog/${apiPost.slug}/`;

      expect(post).toEqual({
        author: apiPost.author,
        id: apiPost.id,
        slug: apiPost.slug,
        title: apiPost.title.rendered,
        excerpt: apiPost.excerpt.rendered,
        date: apiPost.date,
        modified: apiPost.modified,
        content: apiPost.content.rendered,
        permalink,
        absolutePermalink: `https://addons.mozilla.org${permalink}`,
        seoHead: apiPost.yoast_head,
        featuredImage: null,
      });
    });

    it('exposes a featuredImage prop', () => {
      const featured_media = 123;
      const post = createPost({ ...apiPost, featured_media });

      expect(post).toEqual(
        expect.objectContaining({ featuredImage: featured_media })
      );
    });

    it('handles no Yoast data', () => {
      const post = createPost({ ...apiPost, yoast_head: null });

      expect(post).toEqual(expect.objectContaining({ seoHead: '' }));
    });

    it('replaces internal URLs', () => {
      const post = createPost({
        ...apiPost,
        excerpt: {
          rendered: `some <a href="${WORDPRESS_BASE_URL}/foo">link</a>`,
        },
        content: {
          rendered:
            `some <a href="${WORDPRESS_BASE_URL}/foo">link</a>` +
            ` and non-HTTPS URL: ${WORDPRESS_BASE_URL.replace(
              'https',
              'http'
            )}/bar`,
        },
        yoast_head: `<meta content="${WORDPRESS_BASE_URL}/2021/03/24/blog-post-lorem-ipsum-001/" property="og:url">`,
      });

      expect(post.excerpt).toEqual(
        `some <a href="${AMO_BLOG_BASE_URL}/foo">link</a>`
      );
      expect(post.content).toEqual(
        `some <a href="${AMO_BLOG_BASE_URL}/foo">link</a>` +
          ` and non-HTTPS URL: https://addons.mozilla.org/blog/bar`
      );
      expect(post.seoHead).toEqual(
        `<meta content="${AMO_BLOG_BASE_URL}/2021/03/24/blog-post-lorem-ipsum-001/" property="og:url">`
      );
    });
  });

  describe('fixInternalURLs', () => {
    let env;

    beforeEach(() => {
      env = { ...process.env };
    });

    afterEach(() => {
      process.env = env;
    });

    it('does not replace internal URLs when DONT_FIX_INTERNAL_URL is set', () => {
      process.env.DONT_FIX_INTERNAL_URLS = '1';

      expect(fixInternalURLs(apiPost.excerpt.rendered)).toEqual(
        apiPost.excerpt.rendered
      );
    });

    it('replaces the WORDPRESS_BASE_URL with the AMO_BLOG_BASE_URL', () => {
      expect(
        fixInternalURLs(
          [
            `${WORDPRESS_BASE_URL}/foo`,
            `${WORDPRESS_BASE_URL}/bar`,
            `${WORDPRESS_BASE_URL}/`,
          ].join('\n')
        )
      ).toEqual(
        [
          `${AMO_BLOG_BASE_URL}/foo`,
          `${AMO_BLOG_BASE_URL}/bar`,
          `${AMO_BLOG_BASE_URL}/`,
        ].join('\n')
      );
    });

    it('skips /wp-content/ URLs', () => {
      expect(fixInternalURLs(`${WORDPRESS_BASE_URL}/wp-content/`)).toEqual(
        `${WORDPRESS_BASE_URL}/wp-content/`
      );
      expect(
        fixInternalURLs(`${WORDPRESS_BASE_URL}/wp-content/foobar`)
      ).toEqual(`${WORDPRESS_BASE_URL}/wp-content/foobar`);
      expect(
        fixInternalURLs(`${WORDPRESS_BASE_URL}/wp-content/foobar/image.png`)
      ).toEqual(`${WORDPRESS_BASE_URL}/wp-content/foobar/image.png`);
    });

    it('replaces non-HTTPS URLs', () => {
      const baseURL = 'http://example.com';

      expect(fixInternalURLs(`link: ${baseURL}/foo`, { baseURL })).toEqual(
        `link: ${AMO_BLOG_BASE_URL}/foo`
      );
    });
  });

  describe('getMediaSize', () => {
    it('returns null when media is falsey', () => {
      const media = null;

      expect(getMediaSize({ media, size: 'full' })).toEqual(null);
    });

    it('returns null when media.media_details is falsey', () => {
      const media = {};

      expect(getMediaSize({ media, size: 'full' })).toEqual(null);
    });

    it('returns null when media.media_details.sizes is falsey', () => {
      const media = { media_details: {} };

      expect(getMediaSize({ media, size: 'full' })).toEqual(null);
    });

    it('returns null when media size does not exist', () => {
      const media = { media_details: { sizes: {} } };

      expect(getMediaSize({ media, size: 'full' })).toEqual(null);
    });

    it('returns the media size', () => {
      const media = { media_details: { sizes: { full: 'some size' } } };

      expect(getMediaSize({ media, size: 'full' })).toEqual('some size');
    });
  });

  describe('getBaseApiURL', () => {
    const devURL = 'https://addons-dev.allizom.org';
    const prodURL = 'https://addons.mozilla.org';

    it('returns the dev URL when AMO_BASE_URL is dev', () => {
      expect(getBaseApiURL(devURL)).toEqual(devURL);
    });

    it('returns the prod URL when AMO_BASE_URL is stage', () => {
      expect(getBaseApiURL('https://addons.allizom.org')).toEqual(prodURL);
    });

    it('returns the prod URL by default', () => {
      expect(getBaseApiURL()).toEqual(prodURL);
    });
  });
});
