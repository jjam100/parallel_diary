#!/usr/bin/env node

'use strict';
const base64image = require('./')
const path = process.argv[2]

if (path) {
  base64image.stream(path).pipe(process.stdout)
} else {
  process.exit(1);
}
