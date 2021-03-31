const {
  makeBetterSafe,
  makeBuildStaticAddonCards,
  mediaGetFullURL,
} = require('../src/filters');

describe(__filename, () => {
  describe('makeBetterSafe', () => {
    it('returns a function', () => {
      const markAsSafe = jest.fn();

      expect(makeBetterSafe({ markAsSafe })).toBeInstanceOf(Function);
    });

    it('returns purified content', () => {
      const markup = "<p>text</p><script>alert(oops');</script>";
      const betterSafe = makeBetterSafe({
        markAsSafe(content) {
          return content;
        },
      });

      expect(betterSafe(markup)).toEqual('<p>text</p>');
    });

    it('marks content as safe', () => {
      const markAsSafe = jest.fn();
      const betterSafe = makeBetterSafe({ markAsSafe });
      const content = 'doesnt matter';

      betterSafe(content);

      expect(markAsSafe).toHaveBeenCalledWith(content);
    });

    it('handles falsey values', () => {
      const betterSafe = makeBetterSafe({
        markAsSafe(content) {
          return content;
        },
      });

      expect(betterSafe()).toEqual(undefined);
      expect(betterSafe(undefined)).toEqual(undefined);
      expect(betterSafe(null)).toEqual(undefined);
      expect(betterSafe('')).toEqual(undefined);
    });

    it('removes meta tags by default', () => {
      const markup =
        '<meta content="summary_large_image" name="twitter:card" some="attr">';
      const betterSafe = makeBetterSafe({
        markAsSafe(content) {
          return content;
        },
      });

      expect(betterSafe(markup)).toEqual('');
    });

    describe('isHeadMarkup = true', () => {
      it('allows meta tags', () => {
        const markup =
          '<meta content="summary_large_image" name="twitter:card" some="attr">';
        const betterSafe = makeBetterSafe({
          markAsSafe(content) {
            return content;
          },
        });

        expect(betterSafe(markup, { isHeadMarkup: true })).toEqual(
          '<meta content="summary_large_image" name="twitter:card">'
        );
      });

      it('accepts no tags', () => {
        const markup = '<!-- no content -->';
        const betterSafe = makeBetterSafe({
          markAsSafe(content) {
            return content;
          },
        });

        expect(betterSafe(markup, { isHeadMarkup: true })).toEqual('');
      });

      it('accepts property values starting with "og:"', () => {
        const markup =
          '<meta content="Mozilla Add-ons Blog" property="og:site_name">';
        const betterSafe = makeBetterSafe({
          markAsSafe(content) {
            return content;
          },
        });

        expect(betterSafe(markup, { isHeadMarkup: true })).toContain(
          'property="og:site_name"'
        );
      });

      it('sanitizes the value of the "content" attribute', () => {
        const badContent = '\\"><script>alert(1)</script><meta name=foo';
        const markup = `<meta content="${badContent}" property="og:site_name">`;
        const betterSafe = makeBetterSafe({
          markAsSafe(content) {
            return content;
          },
        });

        expect(betterSafe(markup, { isHeadMarkup: true })).toEqual(
          '<meta content="\\"><meta name="foo&quot;" property="og:site_name">'
        );
      });

      it('sanitizes the value of the "property" attribute', () => {
        const badContent = 'og:\\"><script>alert(1)</script><meta';
        const markup = `<meta property="${badContent}" name="foo">`;
        const betterSafe = makeBetterSafe({
          markAsSafe(content) {
            return content;
          },
        });

        expect(betterSafe(markup, { isHeadMarkup: true })).toEqual(
          '<meta property="og:\\">'
        );
      });
      it('allows link tags', () => {
        // The `content` attribute is only valid for `meta` tags so it should be
        // removed on `link` tags.
        const markup =
          '<link rel="canonical" href="some-url" content="invalid" />';
        const betterSafe = makeBetterSafe({
          markAsSafe(content) {
            return content;
          },
        });

        expect(betterSafe(markup, { isHeadMarkup: true })).toEqual(
          '<link rel="canonical" href="some-url">'
        );
      });

      it('allows json+ld scripts (only)', () => {
        const markup =
          '<script type="application/ld+json">{"@context":"https://schema.org"}</script>';
        const betterSafe = makeBetterSafe({
          markAsSafe(content) {
            return content;
          },
        });

        expect(betterSafe(markup, { isHeadMarkup: true })).toEqual(markup);
      });

      it('handles two type attributes for a script tag', () => {
        const markup =
          '<script type="application/ld+json" type="text/javascript">alert("oops 1")</script>';

        const betterSafe = makeBetterSafe({
          markAsSafe(content) {
            return content;
          },
        });

        expect(betterSafe(markup, { isHeadMarkup: true })).toEqual(
          '<script type="application/ld+json"></script>'
        );
      });

      it('disallows all other scripts', () => {
        for (const markup of [
          '<script>{"@context":"https://schema.org"}</script>',
          '<script type="module"></script>',
          '<script type="text/javascript" type="application/ld+json">alert("oops 2")</script>',
        ]) {
          const betterSafe = makeBetterSafe({
            markAsSafe(content) {
              return content;
            },
          });

          expect(betterSafe(markup, { isHeadMarkup: true })).toEqual('');
        }
      });
    });
  });

  describe('makeBuildStaticAddonCards', () => {
    const STATIC_ADDON_CARD = '<!-- static add-on card -->';

    it('returns a function', () => {
      expect(makeBuildStaticAddonCards()).toBeInstanceOf(Function);
    });

    it('handles content without an add-on card', async () => {
      const content = 'some content';
      const callback = jest.fn();
      const _buildStaticAddonCard = jest.fn();

      await makeBuildStaticAddonCards({ _buildStaticAddonCard })(
        content,
        callback
      );

      expect(callback).toHaveBeenCalledWith(null, content);
      expect(_buildStaticAddonCard).not.toHaveBeenCalled();
    });

    it('calls the card library to generate a card', async () => {
      const addonId = '1234';
      const content = `<div class="addon-card" data-addon-id="${addonId}"></div>`;
      const callback = jest.fn();
      const _buildStaticAddonCard = jest
        .fn()
        .mockReturnValue(STATIC_ADDON_CARD);

      await makeBuildStaticAddonCards({ _buildStaticAddonCard })(
        content,
        callback
      );

      expect(callback).toHaveBeenCalledWith(null, STATIC_ADDON_CARD);
      expect(_buildStaticAddonCard).toHaveBeenCalledWith({ addonId });
    });

    it('can replace multiple add-on cards', async () => {
      const addonIds = ['12', '34', '56'];
      const content = addonIds
        .map(
          (addonId) =>
            `<div class="addon-card" data-addon-id="${addonId}"></div>`
        )
        .join('\n');
      const callback = jest.fn();
      const _buildStaticAddonCard = jest
        .fn()
        .mockReturnValue(STATIC_ADDON_CARD);

      await makeBuildStaticAddonCards({ _buildStaticAddonCard })(
        content,
        callback
      );

      expect(callback).toHaveBeenCalledWith(
        null,
        [STATIC_ADDON_CARD, STATIC_ADDON_CARD, STATIC_ADDON_CARD].join('\n')
      );
      for (const addonId of addonIds) {
        expect(_buildStaticAddonCard).toHaveBeenCalledWith({ addonId });
      }
    });

    it('handles errors coming from the addons-frontend-card library', async () => {
      const addonId = '1';
      const content = [
        'content before',
        `<div class="addon-card" data-addon-id="${addonId}"></div>`,
        'content after',
      ].join('\n');
      const callback = jest.fn();
      const _buildStaticAddonCard = jest.fn().mockImplementation(() => {
        throw new Error('error coming from the addons-frontend-card library');
      });

      await makeBuildStaticAddonCards({ _buildStaticAddonCard })(
        content,
        callback
      );

      expect(callback).toHaveBeenCalledWith(
        null,
        'content before\n\ncontent after'
      );
      expect(_buildStaticAddonCard).toHaveBeenCalledWith({ addonId });
    });
  });

  describe('mediaGetFullURL', () => {
    it('returns an empty string when the feature image does not exist', () => {
      const allMedia = [];

      const sourceURL = mediaGetFullURL(allMedia, 123);

      expect(sourceURL).toEqual('');
    });

    it('returns an empty string when the feature image does not have media details', () => {
      const featuredImage = 123;
      const allMedia = [{ id: featuredImage }];

      const sourceURL = mediaGetFullURL(allMedia, featuredImage);

      expect(sourceURL).toEqual('');
    });

    it('returns an empty string when the feature image does not have sizes', () => {
      const featuredImage = 123;
      const allMedia = [{ id: featuredImage, media_details: {} }];

      const sourceURL = mediaGetFullURL(allMedia, featuredImage);

      expect(sourceURL).toEqual('');
    });

    it('returns an empty string when the feature image does not have a "full" size', () => {
      const featuredImage = 123;
      const allMedia = [{ id: featuredImage, media_details: { sizes: {} } }];

      const sourceURL = mediaGetFullURL(allMedia, featuredImage);

      expect(sourceURL).toEqual('');
    });

    it('returns the source URL of the featured image (full size)', () => {
      const featuredImage = 123;
      const expectedSourceURL = 'https://example.com/full.png';
      const allMedia = [
        {
          id: featuredImage,
          media_details: {
            sizes: {
              full: { source_url: expectedSourceURL },
            },
          },
        },
      ];

      const sourceURL = mediaGetFullURL(allMedia, featuredImage);

      expect(sourceURL).toEqual(expectedSourceURL);
    });
  });
});
