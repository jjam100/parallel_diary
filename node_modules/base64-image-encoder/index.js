'use strict';
const fs = require('fs')
const path = require('path')
const through2 = require('through2')
const got = require('got')

function base64(url) {
  return new Promise(function(resolve, reject) {
    let result = []
    base64.stream(url).on('data', function(data) {
      result.push(data)
    }).on('end', function() {
      resolve(result.join())
    }).on('error', reject)
  })
}

base64.stream = function(url) {
  let readStream

  if (url.indexOf('http://') === 0 ||
    url.indexOf('https://') === 0) {
    readStream = got.stream(url)
  } else if (path.isAbsolute(url)) {
    readStream = fs.createReadStream(url)
  } else {
    readStream = fs.createReadStream(path.join(__dirname, url))
  }

  return readStream.pipe(through2(function(chunk, enc, callback) {
    this.push(new Buffer(chunk).toString('base64'))
    callback()
  }))
}

module.exports = base64
