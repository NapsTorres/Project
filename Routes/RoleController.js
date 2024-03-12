const jwt = require('jsonwebtoken');
const express = require('express');
const bcrypt = require('bcrypt');
const { db, secretKey } = require('../db');
const { authenticateToken } = require('../auth');



const RoleController = express.Router();
// role registration start
RoleController.post('/role_reg', async  (req, res) => {
    try {
        const { RoleCode, RoleName } = req.body;

        const insertRoleQuery = 'INSERT INTO Roles (RoleCode, RoleName) VALUES (?, ?)';
        await db.promise().execute(insertRoleQuery, [RoleCode, RoleName]);

        res.status(201).json({ message: 'Role registered successfully' });
    } catch (error) {
        console.error('Error registering role', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
// role registration end

// show roles start
RoleController.get('/roles', authenticateToken, async (req, res) => {
    try {
        db.query('SELECT RoleID, RoleCode, RoleName FROM Roles', (err, result) => {
            if (err) {
                console.error('Error fetching roles', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading roles:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// show roles end

// show role by id start
RoleController.get('/role/:id', authenticateToken, async (req, res) => {
    const RoleId = req.params.id;

    if (!RoleId) {
        return res.status(400).json({ error: true, message: 'Please provide role_id' });
    }

    try {
        db.query('SELECT RoleID, RoleCode, RoleName FROM Roles WHERE RoleID = ?', RoleId, (err, result) => {
            if (err) {
                console.error('Error fetching role', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading role:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// show role by id end

// update role start
RoleController.put('/role/:id', authenticateToken, async  (req, res) => {
    const RoleId = req.params.id;
    const { RoleCode, RoleName } = req.body;

    if (!RoleId || !RoleCode || !RoleName) {
        return res.status(400).send({ error: true, message: 'Please provide role code and role name' });
    }

    try {
        db.query('UPDATE Roles SET RoleCode = ?, RoleName = ? WHERE RoleID = ?', [RoleCode, RoleName, RoleId], (err, result) => {
            if (err) {
                console.error('Error updating role', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error updating role:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// update role end

// delete role start
RoleController.delete('/role/:id', authenticateToken, async (req, res) => {
    const RoleId = req.params.id;

    if (!RoleId) {
        return res.status(400).send({ error: true, message: 'Please provide role_id' });
    }

    try {
        db.query('DELETE FROM Roles WHERE RoleID = ?', RoleId, (err, result) => {
            if (err) {
                console.error('Error deleting role', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error deleting role:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// delete role end




module.exports = { RoleController };