#!/bin/bash

set -x
set -e

yarn build --firefox
cd build/firefox
web-ext build
web-ext sign --api-key='user:14369586:765' --api-secret='9a6ca71063b69cb5e82c75a672c27d705e1f06e507e6dab4a32bad77d01cbb76'
