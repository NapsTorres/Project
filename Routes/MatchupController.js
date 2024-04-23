const jwt = require('jsonwebtoken');
const express = require('express');
const bcrypt = require('bcrypt');
const { db, secretKey } = require('../db');
const { authenticateToken } = require('../auth');
const shuffle = require('lodash/shuffle'); // Import the shuffle function from lodash

const MatchupController = express.Router();

function generateRoundRobin(teamIDs) {
    // Shuffle the team IDs to ensure different matchups each time
    const shuffledIDs = shuffle(teamIDs);

    const matchups = [];
    const numTeams = shuffledIDs.length;

    if (numTeams % 2 !== 0) {
        shuffledIDs.push(null); // Add a bye/null team if the number of teams is odd
    }

    const rounds = numTeams - 1;
    const halfTeams = numTeams / 2;

    for (let round = 0; round < rounds; round++) {
        const roundMatchups = [];
        const restTeam = shuffledIDs[0]; // Store the first team to give it a rest
        for (let team = 0; team < halfTeams; team++) {
            const team1 = shuffledIDs[team];
            const team2Index = (round + team) % (numTeams - 1); // Offset index by round to avoid self-matchup
            const team2 = shuffledIDs[team2Index === team ? numTeams - 1 : team2Index]; // If team2Index equals team, select the last team
            if (team1 !== null && team2 !== null && team1 !== team2) { // Ensure team1 and team2 are not null and not the same team
                roundMatchups.push([team1, team2]);
            }
        }
        matchups.push(roundMatchups);
        // Rotate the teams for the next round
        shuffledIDs.splice(1, 0, shuffledIDs.pop());
        // Put the restTeam back to the end to ensure it rests before the next match
        shuffledIDs.push(shuffledIDs.shift());
    }

    return matchups;
}

// Function to shuffle an array (Fisher-Yates shuffle)
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
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

        const insertMatchupsQuery = 'INSERT INTO Matchups (EventID, Team1ID, Team2ID, NumGames, WinnerTeamID, RestTime) VALUES (?, ?, ?, ?, ?, ?)';
        const insertLeaderboardQuery = 'INSERT INTO EventLeaderboards (EventID, TeamID, Ranking, Points) VALUES (?, ?, ?, ?)';

        // Insert teams into leaderboard with default points and rankings
        for (const teamID of teamIDs) {
            await db.promise().execute(insertLeaderboardQuery, [EventID, teamID, 0, 0]);
        }

        // Generate match-ups and insert into database
        for (let round = 0; round < roundRobinMatchups.length; round++) {
            const roundMatchups = roundRobinMatchups[round];
            const restTime = round + 1; // Rest time increases with each round
            for (const [team1, team2] of roundMatchups) {
                const matchupExists = await isMatchupExists(EventID, team1, team2);
                if (!matchupExists) {
                    await db.promise().execute(insertMatchupsQuery, [EventID, team1, team2, NumGames, null, restTime]);
                }
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
