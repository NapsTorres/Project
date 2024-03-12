const jwt = require('jsonwebtoken');
const express = require('express');
const bcrypt = require('bcrypt');
const { db, secretKey } = require('../db');
const { authenticateToken } = require('../auth');

const CategoryController = express.Router();

// Category registration start
CategoryController.post('/category_reg', authenticateToken, async (req, res) => {
    try {
        const { CategoryName } = req.body;
        const token = req.headers.authorization.split(' ')[1]; // Extract token from authorization header
        const decodedToken = jwt.verify(token, 'napoleon-secret-key'); // Verify and decode the token
        const UserID = decodedToken.data.userId; // Extract user ID from the decoded token

        const insertCategoryQuery = 'INSERT INTO EventCategories (CategoryName, UserID) VALUES (?, ?)';
        await db.promise().execute(insertCategoryQuery, [CategoryName, UserID]);

        res.status(201).json({ message: 'Category registered successfully' });
    } catch (error) {
        console.error('Error Category', error);
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
