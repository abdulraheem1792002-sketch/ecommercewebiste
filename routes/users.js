const express = require('express');
const bcrypt = require('bcrypt');
const { readData, writeData, getTimestamp, isValidEmail } = require('../utils/helpers');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const USERS_FILE = 'users.json';

/**
 * GET /api/users/profile
 * Get current user's profile
 */
router.get('/profile', requireAuth, (req, res) => {
    try {
        const users = readData(USERS_FILE);
        const user = users.find(u => u.id === req.session.user.id);

        if (!user) {
            return res.status(404).json({
                error: 'Not found',
                message: 'User not found'
            });
        }

        // Return user without password
        const { password, ...userProfile } = user;
        res.json({ user: userProfile });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to get profile'
        });
    }
});

/**
 * PUT /api/users/profile
 * Update current user's profile
 */
router.put('/profile', requireAuth, async (req, res) => {
    try {
        const { name, email, phone, address } = req.body;

        const users = readData(USERS_FILE);
        const userIndex = users.findIndex(u => u.id === req.session.user.id);

        if (userIndex === -1) {
            return res.status(404).json({
                error: 'Not found',
                message: 'User not found'
            });
        }

        // Validate email if changed
        if (email && email !== users[userIndex].email) {
            if (!isValidEmail(email)) {
                return res.status(400).json({
                    error: 'Invalid email',
                    message: 'Please provide a valid email address'
                });
            }

            // Check if email already exists
            const emailExists = users.find(
                u => u.email.toLowerCase() === email.toLowerCase() && u.id !== req.session.user.id
            );

            if (emailExists) {
                return res.status(409).json({
                    error: 'Email exists',
                    message: 'This email is already in use'
                });
            }
        }

        // Update user
        if (name) users[userIndex].name = name.trim();
        if (email) users[userIndex].email = email.toLowerCase().trim();
        if (phone !== undefined) users[userIndex].phone = phone.trim();
        if (address) {
            users[userIndex].address = {
                ...users[userIndex].address,
                ...address
            };
        }
        users[userIndex].updatedAt = getTimestamp();

        writeData(USERS_FILE, users);

        // Update session
        req.session.user.name = users[userIndex].name;
        req.session.user.email = users[userIndex].email;

        // Return updated user without password
        const { password, ...userProfile } = users[userIndex];
        res.json({
            message: 'Profile updated successfully',
            user: userProfile
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to update profile'
        });
    }
});

/**
 * PUT /api/users/password
 * Change password
 */
router.put('/password', requireAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                error: 'Missing fields',
                message: 'All password fields are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                error: 'Weak password',
                message: 'New password must be at least 6 characters'
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                error: 'Password mismatch',
                message: 'New passwords do not match'
            });
        }

        const users = readData(USERS_FILE);
        const userIndex = users.findIndex(u => u.id === req.session.user.id);

        if (userIndex === -1) {
            return res.status(404).json({
                error: 'Not found',
                message: 'User not found'
            });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, users[userIndex].password);

        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Invalid password',
                message: 'Current password is incorrect'
            });
        }

        // Hash and save new password
        const saltRounds = 10;
        users[userIndex].password = await bcrypt.hash(newPassword, saltRounds);
        users[userIndex].updatedAt = getTimestamp();

        writeData(USERS_FILE, users);

        res.json({ message: 'Password changed successfully' });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to change password'
        });
    }
});

module.exports = router;
