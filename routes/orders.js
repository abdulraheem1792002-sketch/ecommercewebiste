const express = require('express');
const { readData, writeData, generateId, getTimestamp } = require('../utils/helpers');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const ORDERS_FILE = 'orders.json';
const PRODUCTS_FILE = 'products.json';

/**
 * POST /api/orders
 * Create order from cart (checkout)
 */
router.post('/', requireAuth, (req, res) => {
    try {
        const { shippingAddress, paymentMethod = 'card' } = req.body;

        // Validate cart
        if (!req.session.cart || req.session.cart.length === 0) {
            return res.status(400).json({
                error: 'Empty cart',
                message: 'Your cart is empty'
            });
        }

        // Validate shipping address
        if (!shippingAddress || !shippingAddress.street || !shippingAddress.city ||
            !shippingAddress.state || !shippingAddress.zipCode) {
            return res.status(400).json({
                error: 'Invalid address',
                message: 'Please provide complete shipping address'
            });
        }

        const products = readData(PRODUCTS_FILE);
        const orders = readData(ORDERS_FILE);

        // Build order items and calculate totals
        const orderItems = [];
        let subtotal = 0;

        for (const cartItem of req.session.cart) {
            const product = products.find(p => p.id === cartItem.productId);

            if (!product) {
                return res.status(400).json({
                    error: 'Product not found',
                    message: `Product ${cartItem.productId} no longer exists`
                });
            }

            if (product.stock < cartItem.quantity) {
                return res.status(400).json({
                    error: 'Insufficient stock',
                    message: `Not enough stock for ${product.name}`
                });
            }

            orderItems.push({
                productId: product.id,
                name: product.name,
                price: product.price,
                quantity: cartItem.quantity,
                image: product.images[0] || ''
            });

            subtotal += product.price * cartItem.quantity;

            // Update product stock
            product.stock -= cartItem.quantity;
        }

        // Update products with new stock
        writeData(PRODUCTS_FILE, products);

        // Calculate totals
        const shipping = subtotal > 100 ? 0 : 9.99;
        const tax = subtotal * 0.08;
        const total = subtotal + shipping + tax;

        // Create order
        const order = {
            id: generateId(),
            orderNumber: `ORD-${Date.now().toString(36).toUpperCase()}`,
            userId: req.session.user.id,
            customerName: req.session.user.name,
            customerEmail: req.session.user.email,
            items: orderItems,
            shippingAddress,
            paymentMethod,
            subtotal: Math.round(subtotal * 100) / 100,
            shipping: Math.round(shipping * 100) / 100,
            tax: Math.round(tax * 100) / 100,
            total: Math.round(total * 100) / 100,
            status: 'pending',
            statusHistory: [
                {
                    status: 'pending',
                    timestamp: getTimestamp(),
                    note: 'Order placed'
                }
            ],
            createdAt: getTimestamp(),
            updatedAt: getTimestamp()
        };

        orders.push(order);
        writeData(ORDERS_FILE, orders);

        // Clear cart
        req.session.cart = [];

        res.status(201).json({
            message: 'Order placed successfully',
            order: {
                id: order.id,
                orderNumber: order.orderNumber,
                total: order.total,
                status: order.status
            }
        });

    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to create order'
        });
    }
});

/**
 * GET /api/orders
 * Get user's orders (or all orders for admin)
 */
router.get('/', requireAuth, (req, res) => {
    try {
        let orders = readData(ORDERS_FILE);

        // If not admin, filter to user's orders only
        if (req.session.user.role !== 'admin') {
            orders = orders.filter(o => o.userId === req.session.user.id);
        }

        // Sort by newest first
        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Optional status filter
        const { status } = req.query;
        if (status) {
            orders = orders.filter(o => o.status === status);
        }

        res.json({ orders });

    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to get orders'
        });
    }
});

/**
 * GET /api/orders/:id
 * Get single order details
 */
router.get('/:id', requireAuth, (req, res) => {
    try {
        const orders = readData(ORDERS_FILE);
        const order = orders.find(o => o.id === req.params.id);

        if (!order) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Order not found'
            });
        }

        // Check access (owner or admin)
        if (order.userId !== req.session.user.id && req.session.user.role !== 'admin') {
            return res.status(403).json({
                error: 'Access denied',
                message: 'You cannot view this order'
            });
        }

        res.json({ order });

    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to get order'
        });
    }
});

/**
 * PUT /api/orders/:id/status
 * Update order status (admin only)
 */
router.put('/:id/status', requireAdmin, (req, res) => {
    try {
        const { status, note } = req.body;

        const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                error: 'Invalid status',
                message: `Status must be one of: ${validStatuses.join(', ')}`
            });
        }

        const orders = readData(ORDERS_FILE);
        const orderIndex = orders.findIndex(o => o.id === req.params.id);

        if (orderIndex === -1) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Order not found'
            });
        }

        orders[orderIndex].status = status;
        orders[orderIndex].statusHistory.push({
            status,
            timestamp: getTimestamp(),
            note: note || `Status updated to ${status}`
        });
        orders[orderIndex].updatedAt = getTimestamp();

        writeData(ORDERS_FILE, orders);

        res.json({
            message: 'Order status updated',
            order: orders[orderIndex]
        });

    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to update order status'
        });
    }
});

module.exports = router;
