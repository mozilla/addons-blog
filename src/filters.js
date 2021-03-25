const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const makeBetterSafe = ({ markAsSafe }) => {
  const { window } = new JSDOM('');
  const DOMPurify = createDOMPurify(window);

  return (value) => {
    if (!value) {
      return;
    }

    // eslint-disable-next-line consistent-return
    return markAsSafe(DOMPurify.sanitize(value.toString()));
  };
};

module.exports = {
  makeBetterSafe,
};
