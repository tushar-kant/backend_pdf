// models/file.js

const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  filename: String,
  data: Buffer,
  contentType: String,
}, { timestamps: true }); // Add timestamps option

const File = mongoose.model('File', fileSchema);

module.exports = File;
