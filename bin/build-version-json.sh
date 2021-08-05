#!/bin/bash

echo "$(dirname $0)"
cd $(dirname $0)/..

HASH=$(git --no-pager log --format=format:"%H" -1)

if [ "$AMO_BASE_URL" == "https://addons.mozilla.org" ]; then
    TAG=$(git describe --tags --abbrev=0 --match='20*.*.*')
elif [ "$AMO_BASE_URL" == "https://addons.allizom.org" ]; then
    TAG=$(git describe --tags --abbrev=0 --match='20*.*.*-stage')
else
    # No tag on -dev
    TAG=""
fi

printf '{"commit":"%s","version":"%s","source":"https://github.com/mozilla/addons-blog","buildtime":"%s"}\n' \
    "$HASH" \
    "$TAG" \
    "$(date --utc +%FT%T%Z)" \
    > version.json

cat version.json
