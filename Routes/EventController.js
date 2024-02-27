const jwt = require('jsonwebtoken');
const express = require('express');
const bcrypt = require('bcrypt');
const moment = require('moment');
const { db, secretKey } = require('../db');
const { authenticateToken } = require('../auth');



const EventController = express.Router();
// Event registration start
EventController.post('/event_reg', authenticateToken, async (req, res) => {
    try {
        const { EventName, EventDate, Location, MaxStudentsPerDept, CategoryID } = req.body;
        const UserID = req.user.UserID;
        const formattedEventDate = moment.utc(EventDate).format('YYYY-MM-DD');

        const insertEventsQuery = 'INSERT INTO Events (EventName, EventDate, Location, MaxStudentsPerDept, CategoryID, UserID) VALUES (?, ?, ?, ?, ?, ?)';
        await db.promise().execute(insertEventsQuery, [EventName, formattedEventDate, Location, MaxStudentsPerDept, CategoryID, UserID]);

        res.status(201).json({ message: 'Event registered successfully' });
    } catch (error) {
        console.error('Error Event', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Event registration end

// show Event start
EventController.get('/events', authenticateToken, async (req, res) => {
    try {
        db.query('SELECT EventID, EventName, DATE_FORMAT(EventDate, "%Y-%m-%d") AS EventDate, Location, MaxStudentsPerDept, CategoryID, UserID FROM Events', (err, result) => {
            if (err) {
                console.error('Error fetching Event', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading Event:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// show Event end


// show Event by id start
EventController.get('/event/:id', authenticateToken, async (req, res) => {
    const EventID = req.params.id;

    if (!EventID) {
        return res.status(400).json({ error: true, message: 'Please provide Event ID' });
    }

    try {
        db.query('SELECT EventName, DATE_FORMAT(EventDate, "%Y-%m-%d") AS EventDate, Location, MaxStudentsPerDept, CategoryID, UserID FROM Events WHERE EventID = ?', EventID, (err, result) => {
            if (err) {
                console.error('Error fetching Event', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading Event:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// show Event by id end


// update event start
EventController.put('/event/:id', authenticateToken, async  (req, res) => {
    const EventID = req.params.id;
    const { EventName, EventDate, Location, MaxStudentsPerDept, CategoryID} = req.body;

    if (!EventID || !EventName || !EventDate || !Location || !MaxStudentsPerDept || !CategoryID ) {
        return res.status(400).send({ error: true, message: 'Please provide EventName, EventDate, Location, MaxStudentsPerDept, CategoryID' });
    }

    try {
        db.query('UPDATE Events SET EventName = ?, EventDate = ?, Location = ?, MaxStudentsPerDept = ?, CategoryID = ? WHERE EventID = ?', [EventName, EventDate, Location, MaxStudentsPerDept, CategoryID, EventID], (err, result) => {
            if (err) {
                console.error('Error updating Event', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error updating Event:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// update Event end

// delete Event start
EventController.delete('/event/:id', authenticateToken, async (req, res) => {
    const EventID = req.params.id;

    if (!EventID) {
        return res.status(400).send({ error: true, message: 'Please provide EventID' });
    }

    try {
        db.query('DELETE FROM Events WHERE EventID = ?', EventID, (err, result) => {
            if (err) {
                console.error('Error deleting Event', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error deleting Event:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// delete event end



module.exports = { EventController };