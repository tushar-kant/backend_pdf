// models/file.js

const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    filename: String,
    data: Buffer,
    contentType: String,
    dob: String, // Adding DOB field
    experience: String, // Adding experience field
    email: String, // Adding email field
    phoneNo: String, // Adding phone field
    CTC:String
}, { timestamps: true }); // Add timestamps option

const File = mongoose.model('File', fileSchema);

module.exports = File;
