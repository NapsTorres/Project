const jwt = require('jsonwebtoken');
const express = require('express');
const bcrypt = require('bcrypt');
const { db, secretKey } = require('../db');
const { authenticateToken } = require('../auth');



const CategoryController = express.Router();

// Category registration start
CategoryController.post('/category_reg', authenticateToken, async  (req, res) => {
    try {
        const { CategoryName, UserID } = req.body;

        const insertCategoryQuery = 'INSERT INTO EventCategories (CategoryName, UserID) VALUES (?, ?)';
        await db.promise().execute(insertCategoryQuery, [CategoryName, UserID]);

        res.status(201).json({ message: 'Category registered successfully' });
    } catch (error) {
        console.error('Error Category', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
// Category registration end



module.exports = { CategoryController };