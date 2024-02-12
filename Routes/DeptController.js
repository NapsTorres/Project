const jwt = require('jsonwebtoken');
const express = require('express');
const bcrypt = require('bcrypt');
const { db, secretKey } = require('../db');
const { authenticateToken } = require('../auth');


const DeptController = express.Router();

// Dept registration start
DeptController.post('/dept_reg', async (req, res) => {
    try {
        const departments = req.body.departments; // Extracting departments array from the request body

        // Iterating over each department object and inserting it into the database
        for (const department of departments) {
            const { DepartmentCode, DepartmentName, UserID } = department;

            const insertDepartmentsQuery = 'INSERT INTO Departments (DepartmentCode, DepartmentName, UserID) VALUES (?, ?, ?)';
            await db.promise().execute(insertDepartmentsQuery, [DepartmentCode, DepartmentName, UserID]);
        }

        res.status(201).json({ message: 'Departments registered successfully' });
    } catch (error) {
        console.error('Error Department', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
// Dept registration end


// show Dept start
DeptController.get('/depts', (req, res) => {
    try {
        db.query('SELECT DepartmentID, DepartmentCode, DepartmentName FROM Departments', (err, result) => {
            if (err) {
                console.error('Error fetching Department', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading Department:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// show dept end

// show dept by id start
DeptController.get('/dept/:id', (req, res) => {
    const DepartmentID = req.params.id;

    if (!DepartmentID) {
        return res.status(400).json({ error: true, message: 'Please provide Department_id' });
    }

    try {
        db.query('SELECT DepartmentID, DepartmentCode, DepartmentName FROM Departments WHERE DepartmentID = ?', DepartmentID, (err, result) => {
            if (err) {
                console.error('Error fetching Department', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading Department:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// show dept by id end

// update dept start
DeptController.put('/dept/:id', async (req, res) => {
    const DepartmentID = req.params.id;
    const { DepartmentCode, DepartmentName, UserID } = req.body;

    if (!DepartmentID || !DepartmentCode || !DepartmentName || !UserID) {
        return res.status(400).send({ error: true, message: 'Please provide Department ID, Dept code, Dept name, and UserID' });
    }

    try {
        db.query('UPDATE Departments SET DepartmentCode = ?, DepartmentName = ?, UserID = ? WHERE DepartmentID = ?', [DepartmentCode, DepartmentName, UserID, DepartmentID], (err, result) => {
            if (err) {
                console.error('Error updating Department', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error updating Department:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// update dept end

// delete dept start
DeptController.delete('/dept/:id', (req, res) => {
    const DepartmentID = req.params.id;

    if (!DepartmentID) {
        return res.status(400).send({ error: true, message: 'Please provide dept_id' });
    }

    try {
        db.query('DELETE FROM Departments WHERE DepartmentID = ?', DepartmentID, (err, result) => {
            if (err) {
                console.error('Error deleting Department', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error deleting Department:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// delete dept end



module.exports = { DeptController };