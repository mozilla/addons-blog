const { makeBetterSafe } = require('../src/filters');

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

    it('allows meta tags when isHeadMarkup is true', () => {
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

    it('accepts no tags when isHeadMarkup is true', () => {
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

    it('allows link tags when isHeadMarkup is true', () => {
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

    it('allows json+ld scripts (only) when isHeadMarkup is true', () => {
      const markup =
        '<script type="application/ld+json">{"@context":"https://schema.org"}</script>';
      const betterSafe = makeBetterSafe({
        markAsSafe(content) {
          return content;
        },
      });

      expect(betterSafe(markup, { isHeadMarkup: true })).toEqual(markup);
    });

    it('disallows all other scripts when isHeadMarkup is true', () => {
      for (const markup of [
        '<script>{"@context":"https://schema.org"}</script>',
        '<script type="module"></script>',
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
