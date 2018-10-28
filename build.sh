#!/bin/bash

set -x
set -e

yarn build --firefox
web-ext build -s build/firefox -a dist
web-ext sign -s build/firefox -a dist \
    --api-key='user:14369586:765' --api-secret='9a6ca71063b69cb5e82c75a672c27d705e1f06e507e6dab4a32bad77d01cbb76'

yarn build
cd build/chrome
zip -r ../../dist/basket-chrome.zip .
cd -
