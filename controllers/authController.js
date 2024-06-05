const User = require('../models/user');
const crypto = require('crypto');

const authController = {
    // Method for handling user login requests
    login: async (req, res) => {
        // Login logic
        const { username, password } = req.body;

        try {
            // Find user by username and password
            const user = await User.findOne({ username, password });
            if (user) {
                res.status(200).json({ message: 'Login successful' });
            } else {
                res.status(401).json({ message: 'Invalid username or password' });
            }
        } catch (error) {
            console.error('Error during login:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    },

    // Method for handling user registration requests
    register: async (req, res) => {
        // Registration logic
        const { username, password, email } = req.body;

        try {
            // Check if the username or email already exists
            const existingUser = await User.findOne({ $or: [{ username }, { email }] });
            if (existingUser) {
                return res.status(400).json({ error: 'Username or email already exists' });
            }

            // Create a new user instance
            const newUser = new User({ username, password, email });

            // Save the new user to the database
            await newUser.save();

            res.status(201).json({ message: 'User registered successfully' });
        } catch (error) {
            console.error('Error during registration:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    },
    forgotPassword: async (req, res) => {
        // Forgot password logic
        const { email } = req.body;

        try {
            // Find user by email
            const user = await User.findOne({ email });
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Generate reset token
            const resetToken = crypto.randomBytes(20).toString('hex');
            user.resetPasswordToken = resetToken;
            // Set token expiration (e.g., 1 hour)
            await user.save();

            // Send email with reset link
            // Replace the placeholder EMAIL_RESET_LINK with the actual link to your reset password page
            const resetLink = `http://localhost:5173/#/reset-password?token=${resetToken}`;
            // Send the email with the reset link to the user's email address

            res.status(200).json({ resetToken });
        } catch (error) {
            console.error('Error during password reset request:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    },

    // Method for handling reset password requests
    resetPassword: async (req, res) => {
        // Reset password logic
        const { token, newPassword } = req.body;

        try {
            // Find user by reset token
            const user = await User.findOne({ resetPasswordToken: token });

            if (!user) {
                return res.status(400).json({ error: 'Invalid or expired token' });
            }

            // Update user's password
            user.password = newPassword;
            // Clear reset token and expiration
            user.resetPasswordToken = undefined;
            await user.save();

            res.status(200).json({ message: 'Password reset successfully' });
        } catch (error) {
            console.error('Error during password reset:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    },
   
};

module.exports = authController;
