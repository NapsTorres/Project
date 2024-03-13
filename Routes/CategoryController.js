const jwt = require('jsonwebtoken');
const express = require('express');
const bcrypt = require('bcrypt');
const { db, secretKey } = require('../db');
const { authenticateToken } = require('../auth');

const CategoryController = express.Router();

// Category registration start
CategoryController.post('/category_reg', authenticateToken, async (req, res) => {
    try {
        // Extract the user ID from the request object after it's been populated by the authentication middleware
        const UserID = req.UserID;
        const { CategoryName } = req.body;

        const insertCategoryQuery = 'INSERT INTO EventCategories (CategoryName, UserID) VALUES (?, ?)';
        await db.promise().execute(insertCategoryQuery, [CategoryName, UserID]);

        res.status(201).json({ message: 'Category registered successfully' });
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Category registration end

// Fetch all categories
CategoryController.get('/categories', authenticateToken, async (req, res) => {
    try {
        const query = 'SELECT * FROM EventCategories';
        const [categories] = await db.promise().query(query);
        res.status(200).json(categories);
    } catch (error) {
        console.error('Error fetching categories', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = { CategoryController };
