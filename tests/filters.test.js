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
  });
});
