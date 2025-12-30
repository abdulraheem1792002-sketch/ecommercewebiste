const express = require('express');
const { readData, writeData, generateId, getTimestamp } = require('../utils/helpers');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
const PRODUCTS_FILE = 'products.json';

/**
 * GET /api/products
 * Get all products with optional filtering
 */
router.get('/', (req, res) => {
    try {
        let products = readData(PRODUCTS_FILE);

        const {
            search,
            category,
            subcategory,
            brand,
            minPrice,
            maxPrice,
            sort,
            featured,
            limit,
            page = 1
        } = req.query;

        // Filter by search term
        if (search) {
            const searchLower = search.toLowerCase();
            products = products.filter(p =>
                p.name.toLowerCase().includes(searchLower) ||
                p.description.toLowerCase().includes(searchLower) ||
                p.tags.some(t => t.toLowerCase().includes(searchLower))
            );
        }

        // Filter by category
        if (category) {
            products = products.filter(p =>
                p.category.toLowerCase() === category.toLowerCase()
            );
        }

        // Filter by subcategory
        if (subcategory) {
            products = products.filter(p =>
                p.subcategory.toLowerCase() === subcategory.toLowerCase()
            );
        }

        // Filter by brand
        if (brand) {
            products = products.filter(p =>
                p.brand.toLowerCase() === brand.toLowerCase()
            );
        }

        // Filter by price range
        if (minPrice) {
            products = products.filter(p => p.price >= parseFloat(minPrice));
        }
        if (maxPrice) {
            products = products.filter(p => p.price <= parseFloat(maxPrice));
        }

        // Filter featured only
        if (featured === 'true') {
            products = products.filter(p => p.featured);
        }

        // Sort products
        if (sort) {
            switch (sort) {
                case 'price-asc':
                    products.sort((a, b) => a.price - b.price);
                    break;
                case 'price-desc':
                    products.sort((a, b) => b.price - a.price);
                    break;
                case 'name-asc':
                    products.sort((a, b) => a.name.localeCompare(b.name));
                    break;
                case 'name-desc':
                    products.sort((a, b) => b.name.localeCompare(a.name));
                    break;
                case 'rating':
                    products.sort((a, b) => b.rating - a.rating);
                    break;
                case 'newest':
                    products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    break;
                default:
                    break;
            }
        }

        // Get total count before pagination
        const totalProducts = products.length;

        // Pagination
        const pageSize = limit ? parseInt(limit) : 12;
        const pageNum = parseInt(page);
        const startIndex = (pageNum - 1) * pageSize;
        const paginatedProducts = products.slice(startIndex, startIndex + pageSize);

        res.json({
            products: paginatedProducts,
            pagination: {
                total: totalProducts,
                page: pageNum,
                pageSize: pageSize,
                totalPages: Math.ceil(totalProducts / pageSize)
            }
        });

    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to get products'
        });
    }
});

/**
 * GET /api/products/categories
 * Get all unique categories
 */
router.get('/categories', (req, res) => {
    try {
        const products = readData(PRODUCTS_FILE);

        const categories = [...new Set(products.map(p => p.category))];
        const subcategories = [...new Set(products.map(p => p.subcategory))];
        const brands = [...new Set(products.map(p => p.brand))];

        res.json({ categories, subcategories, brands });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get categories' });
    }
});

/**
 * GET /api/products/:id
 * Get single product by ID
 */
router.get('/:id', (req, res) => {
    try {
        const products = readData(PRODUCTS_FILE);
        const product = products.find(p => p.id === req.params.id);

        if (!product) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Product not found'
            });
        }

        // Get related products (same category, different product)
        const relatedProducts = products
            .filter(p => p.category === product.category && p.id !== product.id)
            .slice(0, 4);

        res.json({ product, relatedProducts });

    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to get product'
        });
    }
});

/**
 * POST /api/products
 * Create new product (admin only)
 */
router.post('/', requireAdmin, (req, res) => {
    try {
        const {
            name,
            description,
            price,
            originalPrice,
            category,
            subcategory,
            brand,
            images,
            stock,
            tags,
            specifications,
            featured
        } = req.body;

        // Validation
        if (!name || !description || !price || !category) {
            return res.status(400).json({
                error: 'Missing fields',
                message: 'Name, description, price, and category are required'
            });
        }

        const products = readData(PRODUCTS_FILE);

        const newProduct = {
            id: generateId(),
            name: name.trim(),
            description: description.trim(),
            price: parseFloat(price),
            originalPrice: originalPrice ? parseFloat(originalPrice) : parseFloat(price),
            category: category.trim(),
            subcategory: subcategory ? subcategory.trim() : '',
            brand: brand ? brand.trim() : '',
            images: images || [],
            stock: stock ? parseInt(stock) : 0,
            rating: 0,
            reviews: 0,
            featured: featured || false,
            tags: tags || [],
            specifications: specifications || {},
            createdAt: getTimestamp()
        };

        products.push(newProduct);
        writeData(PRODUCTS_FILE, products);

        res.status(201).json({
            message: 'Product created successfully',
            product: newProduct
        });

    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to create product'
        });
    }
});

/**
 * PUT /api/products/:id
 * Update product (admin only)
 */
router.put('/:id', requireAdmin, (req, res) => {
    try {
        const products = readData(PRODUCTS_FILE);
        const index = products.findIndex(p => p.id === req.params.id);

        if (index === -1) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Product not found'
            });
        }

        const updatedProduct = {
            ...products[index],
            ...req.body,
            id: products[index].id, // Prevent ID change
            createdAt: products[index].createdAt, // Preserve creation date
            updatedAt: getTimestamp()
        };

        products[index] = updatedProduct;
        writeData(PRODUCTS_FILE, products);

        res.json({
            message: 'Product updated successfully',
            product: updatedProduct
        });

    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to update product'
        });
    }
});

/**
 * DELETE /api/products/:id
 * Delete product (admin only)
 */
router.delete('/:id', requireAdmin, (req, res) => {
    try {
        const products = readData(PRODUCTS_FILE);
        const index = products.findIndex(p => p.id === req.params.id);

        if (index === -1) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Product not found'
            });
        }

        products.splice(index, 1);
        writeData(PRODUCTS_FILE, products);

        res.json({ message: 'Product deleted successfully' });

    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to delete product'
        });
    }
});

module.exports = router;
