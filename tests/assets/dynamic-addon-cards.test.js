/* global document */
const { buildStaticAddonCard } = require('addons-frontend-blog-utils');
const UAParser = require('ua-parser-js');

const {
  convertToUnavailableCard,
  updateAddonCard,
} = require('../../src/assets/js/dynamic-addon-cards');
const tabbyAddon = require('../fixtures/amo-api-response-tabby');

describe(__filename, () => {
  const mockFetch = ({ ok = true, jsonData = {} } = {}) => {
    return jest.spyOn(global, 'fetch').mockResolvedValue({
      ok,
      json: jest.fn().mockResolvedValue(jsonData),
    });
  };

  // The code we want to test in this file requires some HTML with static
  // add-on cards. We can reuse the code that we are using at build time here,
  // except that we mock the API call to generate a static add-on card in a
  // predictable manner.
  const loadStaticAddonCardInDocument = async ({ addon = tabbyAddon } = {}) => {
    const fetch = mockFetch({ jsonData: addon });
    const staticCard = await buildStaticAddonCard({ addonId: addon.id });
    fetch.mockRestore();

    document.body.innerHTML = `<div>${staticCard}</div>`;

    return document.querySelector('.StaticAddonCard');
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('convertToUnavailableCard', () => {
    it('changes the state of a card to "unavailable"', async () => {
      const card = await loadStaticAddonCardInDocument();
      expect(card.classList).not.toContain('StaticAddonCard--is-unavailable');

      convertToUnavailableCard(card);

      expect(card.classList).toContain('StaticAddonCard--is-unavailable');
    });
  });

  describe('updateAddonCard', () => {
    const userAgentsByPlatform = {
      android: {
        firefox70:
          'Mozilla/5.0 (Android 9; Mobile; rv:70.0) Gecko/70.0 Firefox/70.0',
      },
      mac: {
        chrome41:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2227.1 Safari/537.36',
        firefox69:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.13; rv:69.0) Gecko/20100101 Firefox/69.0',
      },
    };

    const _updateAddonCard = (
      card,
      { userAgent = userAgentsByPlatform.mac.chrome41 } = {}
    ) => {
      const parsedUserAgent = new UAParser(userAgent);

      return updateAddonCard(card, { parsedUserAgent });
    };

    it('calls the AMO API', async () => {
      const addon = { ...tabbyAddon };
      const card = await loadStaticAddonCardInDocument({ addon });
      const fetch = mockFetch({ jsonData: addon });

      await _updateAddonCard(card);

      expect(fetch).toHaveBeenCalledWith(
        `https://addons.mozilla.org/api/v5/addons/addon/${addon.id}/?lang=en-US&app=firefox`
      );
    });

    it('sets the app to firefox when OS is not Android', async () => {
      const card = await loadStaticAddonCardInDocument();
      const fetch = mockFetch();

      await _updateAddonCard(card, {
        userAgent: userAgentsByPlatform.mac.firefox69,
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('?lang=en-US&app=firefox')
      );
    });

    it('sets the app to android when OS is Android', async () => {
      const card = await loadStaticAddonCardInDocument();
      const fetch = mockFetch();

      await _updateAddonCard(card, {
        userAgent: userAgentsByPlatform.android.firefox70,
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('?lang=en-US&app=android')
      );
    });

    it('changes the state of a card to "unavailable" when the addonId is missing', async () => {
      const card = await loadStaticAddonCardInDocument();
      delete card.dataset.addonId;
      const fetch = mockFetch();

      await _updateAddonCard(card);

      expect(fetch).not.toHaveBeenCalled();
      expect(card.classList).toContain('StaticAddonCard--is-unavailable');
    });

    it('changes the state of a card to "unavailable" when the response is not OK', async () => {
      const card = await loadStaticAddonCardInDocument();
      mockFetch({ ok: false });

      await _updateAddonCard(card);

      expect(card.classList).toContain('StaticAddonCard--is-unavailable');
    });
  });
});
