const { DateTime } = require('luxon');

const {
  AMO_BLOG_BASE_URL,
  DEFAULT_WORDPRESS_BASE_URL,
  createPost,
} = require('../src/wordpress');
const apiPost = require('./fixtures/apiPost');

describe(__filename, () => {
  describe('createPost', () => {
    it('creates an internal post object', () => {
      const post = createPost(apiPost);

      expect(post).toEqual({
        author: apiPost.author,
        id: apiPost.id,
        slug: apiPost.slug,
        title: apiPost.title.rendered,
        excerpt: apiPost.excerpt.rendered,
        date: apiPost.date,
        modified: apiPost.modified,
        content: apiPost.content.rendered,
        permalink: `/blog/${DateTime.fromISO(apiPost.date).toFormat(
          'y/LL/dd'
        )}/${apiPost.slug}/`,
        seoHead: apiPost.yoast_head,
      });
    });

    it('replaces internal URLs', () => {
      const post = createPost({
        ...apiPost,
        excerpt: {
          rendered: `some <a href="${DEFAULT_WORDPRESS_BASE_URL}/foo">link</a>`,
        },
        content: {
          rendered:
            `some <a href="${DEFAULT_WORDPRESS_BASE_URL}/foo">link</a>` +
            ` and non-HTTPS URL: ${DEFAULT_WORDPRESS_BASE_URL.replace(
              'https',
              'http'
            )}/bar`,
        },
        yoast_head: `<meta content="${DEFAULT_WORDPRESS_BASE_URL}/2021/03/24/blog-post-lorem-ipsum-001/" property="og:url">`,
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
});
