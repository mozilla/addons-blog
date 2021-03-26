const path = require('path');
const utils = require('util');
const { exec } = require('child_process');
const fs = require('fs');

const rimraf = require('rimraf');

const executeCommand = utils.promisify(exec);

describe(__filename, () => {
  const TESTPROJECT_BASE_DIR = path.join(__dirname, 'fixtures', 'testproject');
  const TESTPROJECT_BUILD_DIR = path.join(TESTPROJECT_BASE_DIR, 'build');

  const readGeneratedFile = (fileName) => {
    return fs.promises.readFile(
      path.join(TESTPROJECT_BUILD_DIR, fileName),
      'utf-8'
    );
  };

  describe('escaping', () => {
    beforeAll(async () => {
      await executeCommand(
        `./node_modules/.bin/eleventy --config=./eleventy.config.js`,
        {
          env: {
            ...process.env,
            NODE_ENV: 'test',
            ELEVENTY_CWD: TESTPROJECT_BASE_DIR,
          },
        }
      );
    });

    afterAll(() => {
      rimraf.sync(TESTPROJECT_BUILD_DIR);
    });

    it('applies a better safe filter', async () => {
      const content = await readGeneratedFile('unescaped.html');

      expect(content).toEqual('<p>ok</p>\n');
    });

    it('has autoescaping enabled by default', async () => {
      const content = await readGeneratedFile('escaped.html');

      expect(content).toEqual(
        '&lt;p&gt;ok&lt;/p&gt;&lt;script&gt;&lt;/script&gt;\n'
      );
    });
  });
});
