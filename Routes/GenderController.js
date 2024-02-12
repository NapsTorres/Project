const jwt = require('jsonwebtoken');
const express = require('express');
const bcrypt = require('bcrypt');
const { db, secretKey } = require('../db');
const { authenticateToken } = require('../auth');



const GenderController = express.Router();

// Gender registration start
GenderController.post('/gen_reg', async (req, res) => {
    try {
        const { GenderCode, GenderName, UserID } = req.body;

        const insertGenderQuery = 'INSERT INTO Gender (GenderCode, GenderName, UserID) VALUES (?, ?, ?)';
        await db.promise().execute(insertGenderQuery, [GenderCode, GenderName, UserID]);

        res.status(201).json({ message: 'Gender registered successfully' });
    } catch (error) {
        console.error('Error Gender', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
// Gender registration end



module.exports = { GenderController };