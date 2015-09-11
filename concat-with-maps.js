var helpers = require('broccoli-kitchen-sink-helpers');
var CachingWriter = require('broccoli-caching-writer');
var path = require('path');
var fs = require('fs');
var ConcatWithSourcemap = require('fast-sourcemap-concat');

module.exports = ConcatWithMaps;
ConcatWithMaps.prototype = Object.create(CachingWriter.prototype);
ConcatWithMaps.prototype.constructor = ConcatWithMaps;
function ConcatWithMaps(inputNode, options) {
  if (!(this instanceof ConcatWithMaps)) return new ConcatWithMaps(inputNode, options);
  if (!options || !options.outputFile || !options.inputFiles) {
    throw new Error('inputFiles and outputFile options ware required');
  }

  CachingWriter.call(this, [inputNode], {
    inputFiles: options.inputFiles,
    annotation: options.annotation
  });

  this.inputFiles = options.inputFiles;
  this.outputFile = options.outputFile;
  this.allowNone = options.allowNone;
  this.header = options.header;
  this.headerFiles = options.headerFiles;
  this.footer = options.footer;
  this.footerFiles = options.footerFiles;
  this.separator = (options.separator != null) ? options.separator : '\n';

  this.encoderCache = {};
}

ConcatWithMaps.prototype.build = function() {
  var separator = this.separator;
  var firstSection = true;

  var concat = this.concat = new ConcatWithSourcemap({
    outputFile: path.join(this.outputPath, this.outputFile),
    sourceRoot: this.sourceRoot,
    baseDir: this.inputPaths[0],
    cache: this.encoderCache
  });

  function beginSection() {
    if (firstSection) {
      firstSection = false;
    } else {
      concat.addSpace(separator);
    }
  }

  if (this.header) {
    beginSection();
    concat.addSpace(this.header);
  }

  if (this.headerFiles) {
    this.headerFiles.forEach(function(hf) {
      beginSection();
      concat.addFile(hf);
    });
  }

  try {
    this.addFiles(this.inputPaths[0], beginSection);
  } catch(error) {
    // multiGlob is obtuse.
    if (!error.message.match("did not match any files") || !this.allowNone) {
      throw error;
    }
  }

  if (this.footer) {
    beginSection();
    concat.addSpace(this.footer);
  }
  if (this.footerFiles) {
    this.footerFiles.forEach(function(ff) {
      beginSection();
      concat.addFile(ff);
    });
  }
  return this.concat.end();
}

ConcatWithMaps.prototype.addFiles = function(inputPath, beginSection) {
  helpers.multiGlob(this.inputFiles, {
    cwd: inputPath,
    root: inputPath,
    nomount: false
  }).forEach(function(file) {
    var stat;
    try {
      stat = fs.statSync(path.join(inputPath, file));
    } catch(err) {}
    if (stat && !stat.isDirectory()) {
      beginSection();
      this.concat.addFile(file);
    }
  }.bind(this));
}
