const markup = require('../../src/data/markup');

describe(__filename, () => {
  describe('footer', () => {
    it('exposes the footer HTML', () => {
      const { footer } = markup;

      expect(footer).toContain('<footer class="Footer">');
    });
  });
});
