# addons-blog

[![CircleCI](https://circleci.com/gh/mozilla/addons-blog.svg?style=svg)](https://circleci.com/gh/mozilla/addons-blog)

This is the AMO Blog, which uses WP as a headless CMS with 11ty as a static generator.
## Getting started

1. clone the project
2. run `yarn` to install the dependencies
3. run `yarn start` to build the blog and serve it locally

For other tasks, take a look at the available commands in the section below.

## Available commands

In the project directory, you can run the following commands. There are a few commands not mentioned here (see `package.json`) but those are only used by internal processes.

### `yarn prettier`

This runs [Prettier][] to automatically format the entire codebase.

### `yarn prettier-dev`

This runs [Prettier][] on only your changed files. This is intended for development.

### `yarn build`

This is the _base_ command for building the content of the blog in the `build/` directory.

### `yarn build:debug`

This is similar to `yarn build:serve` but with Eleventy debug logs turned on.

### `yarn build:production`

This builds the blog in production mode, which essentially optimizes the different assets.

### `yarn build:serve`

This starts a web server to serve the blog on local port `8081`.

### `yarn build:wptheme`

This command builds a WordPress theme that is used on our WP instance (mainly for previews).

### `yarn start`

This starts a web server to serve the blog on local port `8081` as well as watchers for the assets (JS/CSS files). Any change made will rebuild the blog and update it automatically. This command is for development purposes.

### `yarn start:debug`

This is similar to `yarn start` but with Eleventy debug logs turned on.

### `yarn start:nocache`

This is similar to `yarn start` but the WordPress API results won't be cached locally.

### `yarn start:https`

This is similar to `yarn start` but it configures the development server to serve the blog using the `example.com` domain and with HTTPS enabled. This is useful when one wants to interact with the `mozAddonManager` locally (note: the `extensions.webapi.testing` pref should be set to `true`).

**Important:** you need to generate development certificates with [mkcert][]:

```
mkcert example.com
```

Note: if you never used `mkcert` before, you also need to install the local CA with `mkcert -install`

The site is available at: https://example.com:8081/

### `yarn sass:build`

This compiles the Sass files and generates a `styles.css` file.

### `yarn sass:watch`

This starts a watcher to rebuild the CSS files automatically.

### `yarn script:build`

This compiles the JavaScript files and generates a `bundle.js` file.

### `yarn script:watch`

This starts a watcher to rebuild the JS files automatically.

## Environment variables

This project relies on the following environment variables for configuration:

- `AMO_BASE_URL`: the base URL of AMO (default: `https://addons.mozilla.org`)
- `BUILD_WORDPRESS_THEME`: build the WordPress theme instead of the blog when set to `'1'` (default: unset)
- `DONT_FIX_INTERNAL_URLS`: do not rewrite internal URLs when set to `'1'` (default: unset)
- `ELEVENTY_CWD`: the current working directory for Eleventy (default: the project's root directory)
- `ELEVENTY_ENV`: the Eleventy environment, used by the build scripts
- `NO_CACHE`: skip cache when set to `'1'` (default: unset)
- `USE_HTTPS`: serves the blog using HTTPS locally when set to `'1'` (default: unset)
- `WORDPRESS_BASE_URL`: the base URL of the WordPress instance (default: `https://mozamo.wpengine.com`)

## Production builds

The Eleventy process and the JS and CSS builds happen in series. Then a 3rd `asset-pipeline` process initiates and takes the built content from `./build` directory and runs it through various optimizations.

During these optimizations, the following takes place:

- Binary files are versioned with hashes in the file names.
- References to these file in CSS and JS are updated.
- CSS and JS are minified.
- The HTML is processed to update the references to the assets new hash-based filenames.

All of this means that we can serve the site with far-future `Expires` headers. If the resource is in the browser's cache, the browser won't even make a request for it. To break the cache, the resource's URL needs to change. When something is updated and the script is re-run, the hash in the filename will change, so the new filename won't be cached and the browser will know to fetch it. This helps the site be fast.

Whilst the `asset-pipline` script is custom, it leverages a lot of existing libs where possible, these include Terser, postHTML, postCSS, and various plugins.

### Asset paths

For the `asset-pipeline` script to do its thing, all you need to do is refer to all assets with a path beginning with `/blog/assets/`. If you do that, everything else is handled for you ✨

## Deployment strategy

Currently, we use a "simple" deployment strategy based on git tags and Circle CI to deploy this blog. We have three different tag patterns:

- `<year>.<month>.<date>-stage` (e.g., `2021.07.22-stage`): these tags will be deployed to our [-stage instance][stage]
- `<year>.<month>.<date>` (e.g., `2021.07.22`): these tags will be deployed to our [-prod instance][prod]
- `x.y.z` (e.g., `1.3.0`): this is the `version` in the `package.json` and it is used to version the WordPress theme that can be constructed in this project

Each deployment will fetch the content from the (headless) WordPress instance, which ensures that the most recent content will be deployed. The Editorial team uses the WordPress instance to prepare blog posts and decides when to mark them as "visible" (or public). When we publish the blog through a tag, we pull the content available to it at that point in time.

### -dev

All commits on the `main` branch are automatically deployed to our [-dev instance][dev]. The content of the blog might not always be up-to-date.

#### How to redeploy -dev?

Either push a new commit to the `main` branch or go to [the Circle CI page][circle-addons-blog], select the `main` branch and re-run the most recent `default-workflow` workflow.

### -stage

As mentioned previously, git tags matching `<year>.<month>.<date>-stage` will be automatically deployed to our [-stage instance][stage].

In addition, we automatically update -stage every 3 hours using a CRON task configured in Circle CI (see `autodeploy-stage` workflow in the [Circle CI configuration](.circleci/config.yml)). This task looks for the most recent git tag matching the pattern above and deploy it. As mentioned previously, the content is fetched from the WordPress API every time.

#### How to redeploy -stage?

Either wait up to 3 hours or go to [the Circle CI page][circle-addons-blog] and re-run the `autodeploy-stage` workflow (or the most recent "stage" tag).

### -prod

**Important:** when deploying to production, please deploy to -stage first.

Git tags matching `<year>.<month>.<date>` will be automatically deployed to our [-prod instance][prod].

A git tag for production should point to a commit already tagged for stage so that we can deploy the exact same commit in both environments:

```
# an example from `git log`

commit 68da8f1d4ea536f7890012ab2b4c39299a853cc5 (tag: 2021.07.22-stage, tag: 2021.07.22)
Author: William Durand <will+git@drnd.me>
Date:   Mon Jul 19 11:39:56 2021 +0200

    Use Node 14 (#265)
```

#### How to redeploy -prod?

Go to [the Circle CI page][circle-addons-blog] and re-run the `default-workflow` workflow for the most recent "prod" tag.

### About the WordPress theme

This project is also able to build a WordPress theme for the WordPress instance. Use `npm version` to create new releases and run `yarn build:wptheme` to build a ZIP file containing the theme. Finally, push the commit and tag (created with `npm version`) and make a [GitHub Release][gh-release], including the ZIP file as an asset.

**Important:** it is generally a good idea to update the WordPress theme when a new version of `addons-frontend-blog-utils` has been merged. Once the ZIP file containing the theme has been generated and published as described above, a user with elevated privileges should _manually_ update the theme on the WordPress instance. This is usually a safe operation that consists in uploading the ZIP file in `Dashboard > Appearance > Themes`.

[prettier]: https://prettier.io/
[mkcert]: https://github.com/FiloSottile/mkcert
[dev]: https://addons-dev.allizom.org/blog/
[stage]: https://addons.allizom.org/blog/
[prod]: https://addons.mozilla.org/blog/
[circle-addons-blog]: https://app.circleci.com/pipelines/github/mozilla/addons-blog
[gh-release]: https://github.com/mozilla/addons-blog/releases
