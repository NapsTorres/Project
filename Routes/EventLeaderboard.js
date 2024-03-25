const jwt = require('jsonwebtoken');
const express = require('express');
const bcrypt = require('bcrypt');
const { db, secretKey } = require('../db');
const { authenticateToken } = require('../auth');

const EventLeaderboardController = express.Router();

// Get all event leaderboards
EventLeaderboardController.get('/eventleaderboards', authenticateToken, async  (req, res) => {
    try {
        // Query to fetch all event leaderboards with team codes
        const query = `
            SELECT l.*, t.TeamCode 
            FROM EventLeaderboards l
            INNER JOIN Teams t ON l.TeamID = t.TeamID
        `;
        const [leaderboards] = await db.promise().query(query);

        // Send event leaderboards as JSON response
        res.status(200).json(leaderboards);
    } catch (error) {
        console.error('Error fetching event leaderboards:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Get event leaderboard by event ID
EventLeaderboardController.get('/eventleaderboard/:eventId', authenticateToken, async  (req, res) => {
    try {
        const eventId = req.params.eventId;

        // Query to fetch event leaderboards for the specified event with team codes
        const query = `
            SELECT l.*, t.TeamCode 
            FROM EventLeaderboards l
            INNER JOIN Teams t ON l.TeamID = t.TeamID
            WHERE l.EventID = ?
        `;
        const [leaderboards] = await db.promise().query(query, [eventId]);

        // Check if any leaderboards were found
        if (leaderboards.length === 0) {
            return res.status(404).json({ message: 'Event leaderboards not found for the specified event' });
        }

        // Send event leaderboards for the specified event as JSON response
        res.status(200).json(leaderboards);
    } catch (error) {
        console.error('Error fetching event leaderboards by event ID:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = { EventLeaderboardController };
