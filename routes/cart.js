const express = require('express');
const { readData } = require('../utils/helpers');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const PRODUCTS_FILE = 'products.json';

/**
 * GET /api/cart
 * Get current cart
 */
router.get('/', (req, res) => {
    try {
        const cart = req.session.cart || [];
        const products = readData(PRODUCTS_FILE);

        // Enrich cart items with product details
        const cartItems = cart.map(item => {
            const product = products.find(p => p.id === item.productId);
            if (!product) return null;

            return {
                ...item,
                product: {
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    originalPrice: product.originalPrice,
                    image: product.images[0] || '',
                    stock: product.stock
                }
            };
        }).filter(Boolean);

        // Calculate totals
        const subtotal = cartItems.reduce((sum, item) =>
            sum + (item.product.price * item.quantity), 0
        );
        const shipping = subtotal > 100 ? 0 : 9.99;
        const tax = subtotal * 0.08; // 8% tax
        const total = subtotal + shipping + tax;

        res.json({
            items: cartItems,
            summary: {
                itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
                subtotal: Math.round(subtotal * 100) / 100,
                shipping: Math.round(shipping * 100) / 100,
                tax: Math.round(tax * 100) / 100,
                total: Math.round(total * 100) / 100
            }
        });

    } catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to get cart'
        });
    }
});

/**
 * POST /api/cart/add
 * Add item to cart
 */
router.post('/add', (req, res) => {
    try {
        const { productId, quantity = 1 } = req.body;

        if (!productId) {
            return res.status(400).json({
                error: 'Missing product',
                message: 'Product ID is required'
            });
        }

        // Verify product exists
        const products = readData(PRODUCTS_FILE);
        const product = products.find(p => p.id === productId);

        if (!product) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Product not found'
            });
        }

        // Check stock
        if (product.stock < quantity) {
            return res.status(400).json({
                error: 'Out of stock',
                message: 'Not enough stock available'
            });
        }

        // Initialize cart if needed
        if (!req.session.cart) {
            req.session.cart = [];
        }

        // Check if item already in cart
        const existingIndex = req.session.cart.findIndex(
            item => item.productId === productId
        );

        if (existingIndex > -1) {
            // Update quantity
            const newQuantity = req.session.cart[existingIndex].quantity + parseInt(quantity);

            if (newQuantity > product.stock) {
                return res.status(400).json({
                    error: 'Stock limit',
                    message: 'Cannot add more than available stock'
                });
            }

            req.session.cart[existingIndex].quantity = newQuantity;
        } else {
            // Add new item
            req.session.cart.push({
                productId,
                quantity: parseInt(quantity),
                addedAt: new Date().toISOString()
            });
        }

        res.json({
            message: 'Item added to cart',
            cartCount: req.session.cart.reduce((sum, item) => sum + item.quantity, 0)
        });

    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to add item to cart'
        });
    }
});

/**
 * PUT /api/cart/update
 * Update item quantity
 */
router.put('/update', (req, res) => {
    try {
        const { productId, quantity } = req.body;

        if (!productId || quantity === undefined) {
            return res.status(400).json({
                error: 'Missing fields',
                message: 'Product ID and quantity are required'
            });
        }

        if (!req.session.cart) {
            return res.status(404).json({
                error: 'Empty cart',
                message: 'Cart is empty'
            });
        }

        const itemIndex = req.session.cart.findIndex(
            item => item.productId === productId
        );

        if (itemIndex === -1) {
            return res.status(404).json({
                error: 'Not in cart',
                message: 'Item not found in cart'
            });
        }

        if (quantity <= 0) {
            // Remove item if quantity is 0 or less
            req.session.cart.splice(itemIndex, 1);
        } else {
            // Check stock
            const products = readData(PRODUCTS_FILE);
            const product = products.find(p => p.id === productId);

            if (product && quantity > product.stock) {
                return res.status(400).json({
                    error: 'Stock limit',
                    message: 'Quantity exceeds available stock'
                });
            }

            req.session.cart[itemIndex].quantity = parseInt(quantity);
        }

        res.json({
            message: 'Cart updated',
            cartCount: req.session.cart.reduce((sum, item) => sum + item.quantity, 0)
        });

    } catch (error) {
        console.error('Update cart error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to update cart'
        });
    }
});

/**
 * DELETE /api/cart/remove/:productId
 * Remove item from cart
 */
router.delete('/remove/:productId', (req, res) => {
    try {
        const { productId } = req.params;

        if (!req.session.cart) {
            return res.status(404).json({
                error: 'Empty cart',
                message: 'Cart is empty'
            });
        }

        const itemIndex = req.session.cart.findIndex(
            item => item.productId === productId
        );

        if (itemIndex === -1) {
            return res.status(404).json({
                error: 'Not in cart',
                message: 'Item not found in cart'
            });
        }

        req.session.cart.splice(itemIndex, 1);

        res.json({
            message: 'Item removed from cart',
            cartCount: req.session.cart.reduce((sum, item) => sum + item.quantity, 0)
        });

    } catch (error) {
        console.error('Remove from cart error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to remove item from cart'
        });
    }
});

/**
 * DELETE /api/cart/clear
 * Clear entire cart
 */
router.delete('/clear', (req, res) => {
    try {
        req.session.cart = [];
        res.json({ message: 'Cart cleared' });
    } catch (error) {
        console.error('Clear cart error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to clear cart'
        });
    }
});

module.exports = router;
