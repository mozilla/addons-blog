#!/bin/bash

# This file is used to deploy addons-blog to an S3 bucket.
# You need to set the S3 bucket name in an environment variable named
# ADDONS_BLOG_BUCKET.

set -ex

# The src_dir is where the build artifacts are located. No trailing slash.
src_dir="dist/blog"

if [ ! -d "$src_dir" ]; then
    echo "Can't find /dist/ directory. Are you running from the correct"\
         "root directory?"
    exit 1
fi

if [ -z "$ADDONS_BLOG_BUCKET" ]; then
    echo "The S3 bucket is not set. Failing."
    exit 1
fi

if [ -n "$ADDONS_BLOG_BUCKET_PREFIX" ]; then
    ADDONS_BLOG_BUCKET="$ADDONS_BLOG_BUCKET/$ADDONS_BLOG_BUCKET_PREFIX"
fi

if [ -z "$AMO_BASE_URL" ]; then
  echo "The AMO base URL is not set. Failing."
  exit 1
fi

# The basic strategy is to sync all the files that need special attention
# first, and then sync everything else which will get defaults


# For short-lived assets; in seconds
TEN_MINUTES="600"

# For long-lived assets; in seconds
ONE_YEAR="31536000"

CSPSTATIC="\"content-security-policy\": \"default-src 'none'; "\
"base-uri 'none'; "\
"form-action 'none'; "\
"object-src 'none'\""

# Note about `connect-src`: we only use the AMO -prod API.
CSP="\"content-security-policy\": \"default-src 'none'; "\
"base-uri 'self'; "\
"connect-src https://addons.mozilla.org/api/ https://www.google-analytics.com/; "\
"font-src ${AMO_BASE_URL}/blog/assets/fonts/; "\
"form-action 'none'; "\
"frame-ancestors 'none'; "\
"img-src ${AMO_BASE_URL}/blog/assets/img/ data: https://addons.cdn.mozilla.net/user-media/ https://mozamo.wpengine.com/wp-content/ https://secure.gravatar.com/avatar/; "\
"object-src 'none'; "\
"script-src ${AMO_BASE_URL}/blog/assets/js/ https://www.google-analytics.com/analytics.js; "\
"style-src ${AMO_BASE_URL}/blog/assets/css/ 'unsafe-inline'\""
HSTS="\"strict-transport-security\": \"max-age=${ONE_YEAR}; includeSubDomains; preload\""
TYPE="\"x-content-type-options\": \"nosniff\""
XSS="\"x-xss-protection\": \"0\""
XFRAME="\"x-frame-options\": \"SAMEORIGIN\""
REFERRER="\"referrer-policy\": \"no-referrer-when-downgrade\""
ACAO="\"Access-Control-Allow-Origin\": \"*\""


# build version.json if it isn't provided
[ -e version.json ] || $(dirname $0)/build-version-json.sh

if [ -e version.json ]; then
    mv version.json "${src_dir}/__version__"
    # __version__ JSON; short cache
    aws s3 cp \
      --cache-control "max-age=${TEN_MINUTES}" \
      --content-type "application/json" \
      --metadata "{${ACAO}, ${CSPSTATIC}, ${HSTS}, ${TYPE}, ${XSS}, ${XFRAME}, ${REFERRER}}" \
      --metadata-directive "REPLACE" \
      --acl "public-read" \
      "${src_dir}/__version__" s3://${ADDONS_BLOG_BUCKET}/__version__
fi

# HTML; short cache
aws s3 sync \
  --cache-control "max-age=${TEN_MINUTES}" \
  --content-type "text/html" \
  --exclude "*" \
  --include "*.html" \
  --metadata "{${CSP}, ${HSTS}, ${TYPE}, ${XSS}, ${XFRAME}, ${REFERRER}}" \
  --metadata-directive "REPLACE" \
  --acl "public-read" \
  "$src_dir"/ s3://${ADDONS_BLOG_BUCKET}/

# JSON; short cache
aws s3 sync \
  --cache-control "max-age=${TEN_MINUTES}" \
  --content-type "application/json" \
  --exclude "*" \
  --include "*.json" \
  --metadata "{${ACAO}, ${CSPSTATIC}, ${HSTS}, ${TYPE}, ${XSS}, ${XFRAME}, ${REFERRER}}" \
  --metadata-directive "REPLACE" \
  --acl "public-read" \
  "$src_dir"/ s3://${ADDONS_BLOG_BUCKET}/

# SVG; cache forever, assign correct content-type
aws s3 sync \
  --cache-control "max-age=${ONE_YEAR}, immutable" \
  --content-type "image/svg+xml" \
  --exclude "*" \
  --include "*.svg" \
  --metadata "{${CSPSTATIC}, ${HSTS}, ${TYPE}, ${XSS}, ${XFRAME}, ${REFERRER}}" \
  --metadata-directive "REPLACE" \
  --acl "public-read" \
  "$src_dir"/ s3://${ADDONS_BLOG_BUCKET}/

# Everything else; cache forever, because it has hashes in the filenames
aws s3 sync \
  --delete \
  --cache-control "max-age=${ONE_YEAR}, immutable" \
  --metadata "{${CSPSTATIC}, ${HSTS}, ${TYPE}, ${XSS}, ${XFRAME}, ${REFERRER}}" \
  --metadata-directive "REPLACE" \
  --acl "public-read" \
  "$src_dir"/ s3://${ADDONS_BLOG_BUCKET}/

# HTML - `path/index.html` to `path` resources; short cache
for fn in $(find "$src_dir" -name 'index.html' -not -path "$src_dir"/index.html); do
  s3path=${fn#"$src_dir"/}
  s3path=${s3path%/index.html}
  aws s3 cp \
    --cache-control "max-age=${TEN_MINUTES}" \
    --content-type "text/html" \
    --exclude "*" \
    --include "*.html" \
    --metadata "{${CSP}, ${HSTS}, ${TYPE}, ${XSS}, ${XFRAME}, ${REFERRER}}" \
    --metadata-directive "REPLACE" \
    --website-redirect "/blog/${s3path}/" \
    --acl "public-read" \
    $fn s3://${ADDONS_BLOG_BUCKET}/${s3path}
done
