// models/file.js

const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  filename: String,
  data: Buffer,
  contentType: String,
});

const File = mongoose.model('File', fileSchema);

module.exports = File;
