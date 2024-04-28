const jwt = require('jsonwebtoken');
const express = require('express');
const bcrypt = require('bcrypt');
const { db, secretKey } = require('../db');
const { authenticateToken } = require('../auth');
const shuffle = require('lodash/shuffle'); // Import the shuffle function from lodash

const MatchupController = express.Router();

function generateRoundRobin(teamIDs) {
    const matchups = [];
    const numTeams = teamIDs.length;

    for (let i = 0; i < numTeams - 1; i++) {
        for (let j = i + 1; j < numTeams; j++) {
            matchups.push([teamIDs[i], teamIDs[j]]);
        }
    }

    return matchups;




async function isMatchupExists(EventID, team1, team2) {
    try {
        const [existingMatchup] = await db.promise().query(
            'SELECT COUNT(*) AS count FROM Matchups WHERE EventID = ? AND ((Team1ID = ? AND Team2ID = ?) OR (Team1ID = ? AND Team2ID = ?))',
            [EventID, team1, team2, team2, team1]
        );
        return existingMatchup[0].count > 0;
    } catch (error) {
        console.error('Error checking if matchup exists:', error);
        throw error;
    }
}


MatchupController.post('/generate_matchups', authenticateToken, async (req, res) => {
    try {
        const { EventID, NumGames } = req.body;

        if (!EventID || !NumGames) {
            return res.status(400).json({ message: 'EventID and NumGames are required' });
        }

        // Fetch teams participating in the event
        const [teams] = await db.promise().query('SELECT TeamID FROM Teams WHERE EventID = ?', [EventID]);

        if (teams.length < 2) {
            return res.status(400).json({ message: 'Not enough teams to generate match-ups' });
        }

        const teamIDs = teams.map(team => team.TeamID); // Use team IDs directly
        const roundRobinMatchups = generateRoundRobin(teamIDs);

        const insertMatchupsQuery = 'INSERT INTO Matchups (EventID, Team1ID, Team2ID, NumGames, WinnerTeamID) VALUES (?, ?, ?, ?, ?)';
        const insertLeaderboardQuery = 'INSERT INTO EventLeaderboards (EventID, TeamID, Ranking, Points) VALUES (?, ?, ?, ?)';

        // Insert teams into leaderboard with default points and rankings
        for (const teamID of teamIDs) {
            await db.promise().execute(insertLeaderboardQuery, [EventID, teamID, 0, 0]);
        }

        // Generate match-ups and insert into database
        for (const [team1, team2] of roundRobinMatchups) {
            const matchupExists = await isMatchupExists(EventID, team1, team2);
            if (!matchupExists) {
                await db.promise().execute(insertMatchupsQuery, [EventID, team1, team2, NumGames, null]);
            }
        }

        res.status(201).json({ message: 'Match-ups and rankings generated successfully' });
    } catch (error) {
        console.error('Error generating match-ups and rankings', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Fetch all match-ups
MatchupController.get('/matchups', authenticateToken, async (req, res) => {
    try {
        const matchups = await db.promise().query(`
            SELECT m.MatchupID, e.EventName, t1.TeamCode AS Team1Code, t2.TeamCode AS Team2Code, m.NumGames, m.WinnerTeamID
            FROM Matchups m
            INNER JOIN Events e ON m.EventID = e.EventID
            INNER JOIN Teams t1 ON m.Team1ID = t1.TeamID
            INNER JOIN Teams t2 ON m.Team2ID = t2.TeamID
        `);

        res.status(200).json(matchups[0]);
    } catch (error) {
        console.error('Error fetching match-ups:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Fetch a match-up by its ID
MatchupController.get('/matchup/:id', authenticateToken, async (req, res) => {
    const matchupId = req.params.id;
    try {
        const [matchup] = await db.promise().query('SELECT * FROM Matchups WHERE MatchupID = ?', [matchupId]);
        if (!matchup) {
            res.status(404).json({ message: 'Match-up not found' });
        } else {
            res.status(200).json(matchup);
        }
    } catch (error) {
        console.error('Error fetching match-up:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Fetch match-ups by event ID
MatchupController.get('/matchups/:eventID', authenticateToken, async (req, res) => {
    try {
        const { eventID } = req.params;

        // Fetch match-ups for the specified event from the database
        const query = 'SELECT * FROM Matchups WHERE EventID = ?';
        const [matchups] = await db.promise().query(query, [eventID]);

        res.status(200).json(matchups);
    } catch (error) {
        console.error('Error fetching match-ups by event:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Delete a match-up by its ID
MatchupController.delete('/matchups/:id', authenticateToken, async (req, res) => {
    const matchupId = req.params.id;
    try {
        await db.promise().execute('DELETE FROM Matchups WHERE MatchupID = ?', [matchupId]);
        res.status(200).json({ message: 'Match-up deleted successfully' });
    } catch (error) {
        console.error('Error deleting match-up:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = { MatchupController };
