// routes/emailRoutes.js
const express = require('express');
const router = express.Router();
const Email = require('../models/email');

// POST route to handle email submission
router.post('/submit-email', async (req, res) => {
    const { email } = req.body;

    try {
        // Check if email is already in the database
        const existingEmail = await Email.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        // Save new email to the database
        const newEmail = new Email({ email });
        await newEmail.save();

        res.status(201).json({ message: 'Email saved successfully' });
    } catch (error) {
        console.error('Error saving email:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
