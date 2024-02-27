const jwt = require('jsonwebtoken');
const express = require('express');
const bcrypt = require('bcrypt');
const { db, secretKey } = require('../db');
const { authenticateToken } = require('../auth');



const PointController = express.Router();
// Point registration start
PointController.post('/point_reg', authenticateToken, async  (req, res) => {
    try {
        const { EventID } = req.body;
        const rankingPoints = req.body.rankingPoints;


        for (const { rank, points } of rankingPoints) {
            const insertEventRankingPointsQuery = 'INSERT INTO EventRankingPoints (Ranks, Points, EventID) VALUES (?, ?, ?)';
            await db.promise().execute(insertEventRankingPointsQuery, [rank, points, EventID]);
        }

        res.status(201).json({ message: 'Ranking points registered successfully' });
    } catch (error) {
        console.error('Error registering Ranking points', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// show Point start
PointController.get('/points', authenticateToken, async  (req, res) => {
    try {
        db.query('SELECT EventRankingPointsID, Ranks, Points, EventID FROM EventRankingPoints', (err, result) => {
            if (err) {
                console.error('Error fetching Ranking Point', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading Ranking Point:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// show Point end

// show Point by id start
PointController.get('/point/:id', authenticateToken, async (req, res) => {
    const EventRankingPointsID = req.params.id;

    if (!EventRankingPointsID) {
        return res.status(400).json({ error: true, message: 'Please provide EventRankingPointsID' });
    }

    try {
        db.query('SELECT Ranks, Points, EventID FROM EventRankingPoints WHERE EventRankingPointsID = ?', EventRankingPointsID, (err, result) => {
            if (err) {
                console.error('Error fetching Ranking Point', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading Ranking Point:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// show Point by id end

// update Point start
PointController.put('/point/:id', authenticateToken, async  (req, res) => {
    const EventRankingPointsID = req.params.id;
    const { Ranks, Points, EventID } = req.body;

    if (!EventRankingPointsID || !Ranks || !Points || !EventID) {
        return res.status(400).send({ error: true, message: 'Please provide Ranks, Points and EventID' });
    }

    try {
        db.query('UPDATE EventRankingPoints SET Ranks = ?, Points = ?, EventID =? WHERE EventRankingPointsID = ?', [Ranks, Points, EventID, EventRankingPointsID], (err, result) => {
            if (err) {
                console.error('Error updating Rank Point', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error updating Rank Point:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// update point end

// delete point start
PointController.delete('/point/:id', authenticateToken, async (req, res) => {
    const EventRankingPointsID = req.params.id;

    if (!EventRankingPointsID) {
        return res.status(400).send({ error: true, message: 'Please provide EventRankingPointsID' });
    }

    try {
        db.query('DELETE FROM EventRankingPoints WHERE EventRankingPointsID = ?', EventRankingPointsID, (err, result) => {
            if (err) {
                console.error('Error deleting Rank point', err);
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



module.exports = { PointController };