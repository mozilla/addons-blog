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
});
