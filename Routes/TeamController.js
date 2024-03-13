const jwt = require('jsonwebtoken');
const express = require('express');
const bcrypt = require('bcrypt');
const { db, secretKey } = require('../db');
const { authenticateToken } = require('../auth');

const TeamController = express.Router();

// Team registration start
TeamController.post('/team_reg', authenticateToken, async (req, res) => {
    try {
        const { EventID, teams } = req.body; // Extracting EventID and teams array from the request body
        const UserID = req.user.UserID; // Assuming the user ID is stored in req.user.id after authentication

        // Iterating over each team object and inserting it into the database
        for (const team of teams) {
            const { TeamCode, TeamName } = team;

            const insertTeamsQuery = 'INSERT INTO Teams (TeamCode, TeamName, UserID, EventID) VALUES (?, ?, ?, ?)';
            await db.promise().execute(insertTeamsQuery, [TeamCode, TeamName, UserID, EventID]);
        }

        res.status(201).json({ message: 'Teams registered successfully' });
    } catch (error) {
        console.error('Error registering Teams', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
// Team registration end

// Show Teams start
TeamController.get('/teams', authenticateToken, async (req, res) => {
    try {
        db.query('SELECT TeamID, TeamCode, TeamName FROM Teams', (err, result) => {
            if (err) {
                console.error('Error fetching Teams', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading Teams:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Show Teams end

// Show Team by ID start
TeamController.get('/team/:id', authenticateToken, async (req, res) => {
    const TeamID = req.params.id;

    if (!TeamID) {
        return res.status(400).json({ error: true, message: 'Please provide Team_id' });
    }

    try {
        db.query('SELECT TeamID, TeamCode, TeamName FROM Teams WHERE TeamID = ?', TeamID, (err, result) => {
            if (err) {
                console.error('Error fetching Team', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading Team:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Show Team by ID end

// Show Teams by EventID start
TeamController.get('/teams/event/:eventId', authenticateToken, async (req, res) => {
    const eventId = req.params.eventId;

    if (!eventId) {
        return res.status(400).json({ error: true, message: 'Please provide Event ID' });
    }

    try {
        db.query('SELECT TeamID, TeamCode, TeamName FROM Teams WHERE EventID = ?', eventId, (err, result) => {
            if (err) {
                console.error('Error fetching Teams by EventID', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading Teams by EventID:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Show Teams by EventID end


// Update Team start
TeamController.put('/team/:id', authenticateToken, async (req, res) => {
    const TeamID = req.params.id;
    const { TeamCode, TeamName, EventID } = req.body;
    const UserID = req.user.UserID; // Assuming the user ID is stored in req.user.id after authentication

    if (!TeamID || !TeamCode || !TeamName || !EventID) {
        return res.status(400).send({ error: true, message: 'Please provide Team ID, Team code, Team name, and EventID' });
    }

    try {
        db.query('UPDATE Teams SET TeamCode = ?, TeamName = ?, UserID = ?, EventID = ? WHERE TeamID = ?', [TeamCode, TeamName, UserID, EventID, TeamID], (err, result) => {
            if (err) {
                console.error('Error updating Team', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error updating Team:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Update Team end

// Delete Team start
TeamController.delete('/team/:id', authenticateToken, async (req, res) => {
    const TeamID = req.params.id;

    if (!TeamID) {
        return res.status(400).send({ error: true, message: 'Please provide team_id' });
    }

    try {
        db.query('DELETE FROM Teams WHERE TeamID = ?', TeamID, (err, result) => {
            if (err) {
                console.error('Error deleting Team', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error deleting Team:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Delete Team end

module.exports = { TeamController };
