const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    resetPasswordToken: { type: String },

    email: { type: String, required: true, unique: true }
}, { timestamps: true }); // Add timestamps option

const User = mongoose.model('User', userSchema);

module.exports = User;
