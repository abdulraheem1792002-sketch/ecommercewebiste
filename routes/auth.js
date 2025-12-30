const express = require('express');
const bcrypt = require('bcrypt');
const { readData, writeData, generateId, isValidEmail, getTimestamp } = require('../utils/helpers');

const router = express.Router();
const USERS_FILE = 'users.json';

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({
                error: 'Missing fields',
                message: 'Name, email, and password are required'
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({
                error: 'Invalid email',
                message: 'Please provide a valid email address'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                error: 'Weak password',
                message: 'Password must be at least 6 characters'
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                error: 'Password mismatch',
                message: 'Passwords do not match'
            });
        }

        // Check if user already exists
        const users = readData(USERS_FILE);
        const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());

        if (existingUser) {
            return res.status(409).json({
                error: 'User exists',
                message: 'An account with this email already exists'
            });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create new user
        const newUser = {
            id: generateId(),
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role: users.length === 0 ? 'admin' : 'customer', // First user is admin
            avatar: null,
            phone: '',
            address: {
                street: '',
                city: '',
                state: '',
                zipCode: '',
                country: ''
            },
            createdAt: getTimestamp(),
            updatedAt: getTimestamp()
        };

        // Save user
        users.push(newUser);
        writeData(USERS_FILE, users);

        // Create session
        req.session.user = {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            avatar: newUser.avatar
        };

        // Initialize cart in session
        req.session.cart = [];

        res.status(201).json({
            message: 'Registration successful',
            user: req.session.user
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'An error occurred during registration'
        });
    }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                error: 'Missing fields',
                message: 'Email and password are required'
            });
        }

        // Find user
        const users = readData(USERS_FILE);
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

        if (!user) {
            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Invalid email or password'
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Invalid email or password'
            });
        }

        // Create session
        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar
        };

        // Initialize cart in session if not exists
        if (!req.session.cart) {
            req.session.cart = [];
        }

        res.json({
            message: 'Login successful',
            user: req.session.user
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'An error occurred during login'
        });
    }
});

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                error: 'Logout failed',
                message: 'Could not logout'
            });
        }
        res.json({ message: 'Logout successful' });
    });
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', (req, res) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({
            error: 'Not authenticated',
            message: 'Please login'
        });
    }

    res.json({
        user: req.session.user,
        cartCount: req.session.cart ? req.session.cart.length : 0
    });
});

module.exports = router;
