/* global document, window */
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
      ios: {
        firefox1iPad:
          'Mozilla/5.0 (iPad; CPU iPhone OS 8_3 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) FxiOS/1.0 Mobile/12F69 Safari/600.1.4',
      },
    };

    const _updateAddonCard = (
      card,
      { userAgent = userAgentsByPlatform.mac.chrome41 } = {}
    ) => {
      const parsedUserAgent = new UAParser(userAgent);

      return updateAddonCard(card, { parsedUserAgent });
    };

    const expectDisabledInstallButton = ({ getFirefoxButton, downloadURL }) => {
      const button = getFirefoxButton.querySelector('.GetFirefoxButton-button');

      expect(button.classList).toContain('Button--disabled');
      expect(button.getAttribute('aria-disabled')).toEqual('true');
      expect(button.getAttribute('href')).toEqual(downloadURL);

      const event = new window.MouseEvent('click');
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
      button.dispatchEvent(event);
      expect(preventDefaultSpy).toHaveBeenCalled();
    };

    const expectEnabledInstallButton = ({ getFirefoxButton }) => {
      const button = getFirefoxButton.querySelector('.GetFirefoxButton-button');
      expect(button.classList).not.toContain('Button--disabled');

      const event = new window.MouseEvent('click');
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
      button.dispatchEvent(event);
      expect(preventDefaultSpy).not.toHaveBeenCalled();
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

    it('converts the "GetFirefox" button to an install button when UserAgent is Firefox', async () => {
      const downloadURL = 'https://example.org/addon.xpi';
      const addon = {
        ...tabbyAddon,
        current_version: {
          ...tabbyAddon.current_version,
          files: [{ ...tabbyAddon.current_version.files[0], url: downloadURL }],
        },
      };
      const card = await loadStaticAddonCardInDocument({ addon });
      const getFirefoxButton = card.querySelector('.GetFirefoxButton');
      mockFetch({ jsonData: addon });

      expect(getFirefoxButton.classList).toContain('GetFirefoxButton--new');
      expect(
        getFirefoxButton.querySelector('.GetFirefoxButton-callout')
      ).not.toBeNull();

      await _updateAddonCard(card, {
        userAgent: userAgentsByPlatform.mac.firefox69,
      });

      expect(getFirefoxButton.classList).not.toContain('GetFirefoxButton--new');
      expect(
        getFirefoxButton.querySelector('.GetFirefoxButton-callout')
      ).toBeNull();

      const button = getFirefoxButton.querySelector('.GetFirefoxButton-button');
      expect(button.classList).toContain('Button--action');
      expect(button.innerText).toEqual('Add to Firefox');
      expect(button.getAttribute('href')).toEqual(downloadURL);
    });

    it('disables the install button for Firefox for iOS', async () => {
      const card = await loadStaticAddonCardInDocument();
      const getFirefoxButton = card.querySelector('.GetFirefoxButton');
      mockFetch();

      await _updateAddonCard(card, {
        userAgent: userAgentsByPlatform.ios.firefox1iPad,
      });

      expectDisabledInstallButton({ getFirefoxButton, downloadURL: '' });
    });

    it('disables the install button when there is no current version', async () => {
      const addon = { ...tabbyAddon, current_version: null };
      const card = await loadStaticAddonCardInDocument({ addon });
      const getFirefoxButton = card.querySelector('.GetFirefoxButton');
      mockFetch({ jsonData: addon });

      await _updateAddonCard(card, {
        userAgent: userAgentsByPlatform.mac.firefox69,
      });

      expectDisabledInstallButton({ getFirefoxButton, downloadURL: '' });
    });

    it('disables the install button when current version file is falsey', async () => {
      const addon = {
        ...tabbyAddon,
        current_version: {
          ...tabbyAddon.current_version,
          files: null,
        },
      };
      const card = await loadStaticAddonCardInDocument({ addon });
      const getFirefoxButton = card.querySelector('.GetFirefoxButton');
      mockFetch({ jsonData: addon });

      await _updateAddonCard(card, {
        userAgent: userAgentsByPlatform.mac.firefox69,
      });

      expectDisabledInstallButton({ getFirefoxButton, downloadURL: '' });
    });

    it('disables the install button when there is no current version file', async () => {
      const addon = {
        ...tabbyAddon,
        current_version: {
          ...tabbyAddon.current_version,
          files: [],
        },
      };
      const card = await loadStaticAddonCardInDocument({ addon });
      const getFirefoxButton = card.querySelector('.GetFirefoxButton');
      mockFetch({ jsonData: addon });

      await _updateAddonCard(card, {
        userAgent: userAgentsByPlatform.mac.firefox69,
      });

      expectDisabledInstallButton({ getFirefoxButton, downloadURL: '' });
    });

    it('disables the install button when there is no download URL', async () => {
      const addon = {
        ...tabbyAddon,
        current_version: {
          ...tabbyAddon.current_version,
          files: [{ ...tabbyAddon.current_version.files[0], url: null }],
        },
      };
      const card = await loadStaticAddonCardInDocument({ addon });
      const getFirefoxButton = card.querySelector('.GetFirefoxButton');
      mockFetch({ jsonData: addon });

      await _updateAddonCard(card, {
        userAgent: userAgentsByPlatform.mac.firefox69,
      });

      expectDisabledInstallButton({ getFirefoxButton, downloadURL: '' });
    });

    describe('Firefox for Android', () => {
      it('disables the install button when add-on is not promoted', async () => {
        const addon = { ...tabbyAddon, promoted: null };
        const card = await loadStaticAddonCardInDocument({ addon });
        const getFirefoxButton = card.querySelector('.GetFirefoxButton');
        mockFetch({ jsonData: addon });

        await _updateAddonCard(card, {
          userAgent: userAgentsByPlatform.android.firefox70,
        });

        expectDisabledInstallButton({
          getFirefoxButton,
          downloadURL: addon.current_version.files[0].url,
        });
      });

      it('disables the install button when add-on is not recommended for Android', async () => {
        const addon = {
          ...tabbyAddon,
          promoted: {
            apps: ['firefox'],
            category: 'recommended',
          },
        };
        const card = await loadStaticAddonCardInDocument({ addon });
        const getFirefoxButton = card.querySelector('.GetFirefoxButton');
        mockFetch({ jsonData: addon });

        await _updateAddonCard(card, {
          userAgent: userAgentsByPlatform.android.firefox70,
        });

        expectDisabledInstallButton({
          getFirefoxButton,
          downloadURL: addon.current_version.files[0].url,
        });
      });

      it('disables the install button when add-on is promoted for Android but not recommended', async () => {
        const addon = {
          ...tabbyAddon,
          promoted: {
            apps: ['android'],
            category: 'line',
          },
        };
        const card = await loadStaticAddonCardInDocument({ addon });
        const getFirefoxButton = card.querySelector('.GetFirefoxButton');
        mockFetch({ jsonData: addon });

        await _updateAddonCard(card, {
          userAgent: userAgentsByPlatform.android.firefox70,
        });

        expectDisabledInstallButton({
          getFirefoxButton,
          downloadURL: addon.current_version.files[0].url,
        });
      });

      it('disables the install button when add-on is recommended for Android but there is no compatibility data', async () => {
        const addon = {
          ...tabbyAddon,
          current_version: {
            ...tabbyAddon.current_version,
            compatibility: {},
          },
          promoted: {
            apps: ['android'],
            category: 'recommended',
          },
        };
        const card = await loadStaticAddonCardInDocument({ addon });
        const getFirefoxButton = card.querySelector('.GetFirefoxButton');
        mockFetch({ jsonData: addon });

        await _updateAddonCard(card, {
          userAgent: userAgentsByPlatform.android.firefox70,
        });

        expectDisabledInstallButton({
          getFirefoxButton,
          downloadURL: addon.current_version.files[0].url,
        });
      });

      it('enables the install button when add-on is recommended for Android', async () => {
        const addon = {
          ...tabbyAddon,
          promoted: {
            apps: ['android'],
            category: 'recommended',
          },
        };
        const card = await loadStaticAddonCardInDocument({ addon });
        const getFirefoxButton = card.querySelector('.GetFirefoxButton');
        mockFetch({ jsonData: addon });

        await _updateAddonCard(card, {
          userAgent: userAgentsByPlatform.android.firefox70,
        });

        expectEnabledInstallButton({ getFirefoxButton });
      });
    });
  });
});
