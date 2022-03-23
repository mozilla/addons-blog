/**
 * @jest-environment jsdom
 */
/* global document, window, navigator */
const fs = require('fs');

const { amoTracking } = require('../../src/assets/js/analytics');

describe(__filename, () => {
  it('defines window.amoTracking when loaded as a script', () => {
    const scriptEl = document.createElement('script');
    scriptEl.textContent = fs.readFileSync('src/assets/js/analytics.js');
    document.body.appendChild(scriptEl);

    expect(window.amoTracking).toBeDefined();
  });

  describe('amoTracking', () => {
    beforeEach(() => {
      delete window.doNotTrack;
      delete navigator.doNotTrack;
      delete navigator.msDoNotTrack;
    });

    it('can send a GA event', () => {
      window.ga = jest.fn();
      const category = 'some category';
      const action = 'some action';
      const label = 'some label';

      amoTracking.sendEvent({ category, action, label });

      expect(window.ga).toHaveBeenCalledWith('send', {
        hitType: 'event',
        eventCategory: category,
        eventAction: action,
        eventLabel: label,
      });
    });

    it('does not send a GA event when disabled', () => {
      window.ga = jest.fn();
      window.doNotTrack = '1';
      const category = 'some category';
      const action = 'some action';
      const label = 'some label';

      amoTracking.sendEvent({ category, action, label });

      expect(window.ga).not.toHaveBeenCalled();
    });

    it('is not enabled when window.doNotTrack is "1"', () => {
      window.doNotTrack = '1';

      expect(amoTracking.isEnabled()).toEqual(false);
    });

    it('is not enabled when navigator.doNotTrack is "1"', () => {
      navigator.doNotTrack = '1';

      expect(amoTracking.isEnabled()).toEqual(false);
    });

    it('is not enabled when navigator.doNotTrack is "yes"', () => {
      navigator.doNotTrack = 'yes';

      expect(amoTracking.isEnabled()).toEqual(false);
    });

    it('is not enabled when navigator.msDoNotTrack is "1"', () => {
      navigator.msDoNotTrack = '1';

      expect(amoTracking.isEnabled()).toEqual(false);
    });

    it('is enabled when doNotTrack is not set', () => {
      expect(amoTracking.isEnabled()).toEqual(true);
    });
  });
});
