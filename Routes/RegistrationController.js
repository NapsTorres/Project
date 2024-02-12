const jwt = require('jsonwebtoken');
const express = require('express');
const bcrypt = require('bcrypt');
const { db, secretKey } = require('../db');
const { authenticateToken } = require('../auth');

const RegistrationController = express.Router();

// Create registration
RegistrationController.post('/registration', async (req, res) => {
    try {
        const { EventID, StudentID, Name, GenderID, DepartmentID, MedicalCertificate } = req.body;
        const insertRegistrationQuery = 'INSERT INTO Registrations (EventID, StudentID, Name, GenderID, DepartmentID, MedicalCertificate) VALUES (?, ?, ?, ?, ?, ?)';
        await db.promise().execute(insertRegistrationQuery, [EventID, StudentID, Name, GenderID, DepartmentID, MedicalCertificate]);
        res.status(201).json({ message: 'Registration created successfully' });
    } catch (error) {
        console.error('Error creating registration', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Get all registrations with gender and department codes
RegistrationController.get('/registrations', async (req, res) => {
    try {
        const query = `
            SELECT 
                r.RegistrationID, 
                r.EventID, 
                r.StudentID, 
                r.Name, 
                g.GenderCode AS Gender, 
                d.DepartmentCode AS Department, 
                r.MedicalCertificate
            FROM 
                Registrations r 
                JOIN Gender g ON r.GenderID = g.GenderID 
                JOIN Departments d ON r.DepartmentID = d.DepartmentID`;
        const [registrations] = await db.promise().query(query);
        res.status(200).json(registrations);
    } catch (error) {
        console.error('Error fetching registrations:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Get registration by ID with gender and department codes
RegistrationController.get('/registration/:id', async (req, res) => {
    const registrationId = req.params.id;
    try {
        const query = `
            SELECT 
                r.RegistrationID, 
                r.EventID, 
                r.StudentID, 
                r.Name, 
                g.GenderCode AS Gender, 
                d.DepartmentCode AS Department, 
                r.MedicalCertificate
            FROM 
                Registrations r 
                JOIN Gender g ON r.GenderID = g.GenderID 
                JOIN Departments d ON r.DepartmentID = d.DepartmentID 
            WHERE 
                r.RegistrationID = ?`;
        const [[registration]] = await db.promise().query(query, [registrationId]);
        if (!registration) {
            res.status(404).json({ message: 'Registration not found' });
        } else {
            res.status(200).json(registration);
        }
    } catch (error) {
        console.error('Error fetching registration:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Get registrations by Event ID with gender and department codes
RegistrationController.get('/registration/event/:eventId', async (req, res) => {
    const eventId = req.params.eventId;
    try {
        const query = `
            SELECT 
                r.RegistrationID, 
                r.EventID, 
                r.StudentID, 
                r.Name, 
                g.GenderCode AS Gender, 
                d.DepartmentCode AS Department, 
                r.MedicalCertificate
            FROM 
                Registrations r 
                JOIN Gender g ON r.GenderID = g.GenderID 
                JOIN Departments d ON r.DepartmentID = d.DepartmentID 
            WHERE 
                r.EventID = ?`;
        const [registrations] = await db.promise().query(query, [eventId]);
        if (!registrations || registrations.length === 0) {
            res.status(404).json({ message: 'Registrations not found for the given Event ID' });
        } else {
            res.status(200).json(registrations);
        }
    } catch (error) {
        console.error('Error fetching registrations by Event ID:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

RegistrationController.get('/registration/department/:departmentId', async (req, res) => {
    const departmentId = req.params.departmentId;
    try {
        const query = `
            SELECT 
                r.RegistrationID, 
                r.EventID, 
                r.StudentID, 
                r.Name, 
                g.GenderCode AS Gender, 
                d.DepartmentCode AS Department, 
                r.MedicalCertificate
            FROM 
                Registrations r 
                JOIN Gender g ON r.GenderID = g.GenderID 
                JOIN Departments d ON r.DepartmentID = d.DepartmentID 
            WHERE 
                r.DepartmentID = ?`;
        const [registrations] = await db.promise().query(query, [departmentId]);
        if (!registrations || registrations.length === 0) {
            res.status(404).json({ message: 'Registrations not found for the given Department ID' });
        } else {
            res.status(200).json(registrations);
        }
    } catch (error) {
        console.error('Error fetching registrations by Department ID:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Update registration
RegistrationController.put('/registration/:id', async (req, res) => {
    const registrationId = req.params.id;
    try {
        const { EventID, StudentID, Name, GenderID, DepartmentID, MedicalCertificate } = req.body;

        if (!EventID || !StudentID || !Name || !GenderID || !DepartmentID || !MedicalCertificate) {
            return res.status(400).send({ error: true, message: 'Please provide EventID, StudentID, Name, GenderID, DepartmentID, MedicalCertificate' });
        }

        const updateRegistrationQuery = 'UPDATE Registrations SET EventID = ?, StudentID = ?, Name = ?, GenderID = ?, DepartmentID = ?, MedicalCertificate = ? WHERE RegistrationID = ?';
        
        const [result] = await db.promise().execute(updateRegistrationQuery, [EventID, StudentID, Name, GenderID, DepartmentID, MedicalCertificate, registrationId]);
        
        if (result.affectedRows > 0) {
            res.status(200).json(result);
        } else {
            res.status(404).json({ error: true, message: 'Registration not found or no changes applied' });
        }
    } catch (error) {
        console.error('Error updating registration', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


// Delete registration
RegistrationController.delete('/registrations/:id', async (req, res) => {
    const registrationId = req.params.id;
    try {
        await db.promise().execute('DELETE FROM Registrations WHERE RegistrationID = ?', [registrationId]);
        res.status(200).json({ message: 'Registration deleted successfully' });
    } catch (error) {
        console.error('Error deleting registration', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = { RegistrationController };