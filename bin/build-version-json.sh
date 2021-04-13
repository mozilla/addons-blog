#!/bin/bash

echo "$(dirname $0)"
cd $(dirname $0)/..

HASH=$(git --no-pager log --format=format:"%H" -1)
TAG=$(git describe --tags)

printf '{"commit":"%s","version":"%s","source":"https://github.com/mozilla/addons-blog"}\n' \
    "$HASH" \
    "$TAG" \
    > version.json

cat version.json
