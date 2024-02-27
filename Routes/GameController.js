const jwt = require('jsonwebtoken');
const express = require('express');
const bcrypt = require('bcrypt');
const moment = require('moment');
const { db, secretKey } = require('../db');
const { authenticateToken } = require('../auth');



const GameController = express.Router();

// Function to map status integer to its corresponding meaning
function getStatusName(statusInt) {
    switch (statusInt) {
        case 0:
            return 'Pending';
        case 1:
            return 'Ongoing';
        case 2:
            return 'Ended';
        default:
            return 'Unknown';
    }
}

// Function to map outcome integer to its corresponding meaning
function getOutcomeName(outcomeInt) {
    switch (outcomeInt) {
        case 1:
            return 'Win';
        case 2:
            return 'Loss';
        default:
            return 'Unknown';
    }
}

async function updateEventLeaderboard(eventId) {
    try {
        if (!eventId) {
            throw new Error('Event ID is missing or undefined');
        }

        console.log('Updating event leaderboard for event ID:', eventId);
        
        // Fetch all departments participating in the event
        const [departments] = await db.promise().query(`
            SELECT d.DepartmentID, d.DepartmentName,
            COUNT(m.WinnerDepartmentID) AS TotalWins
            FROM Departments d
            LEFT JOIN Matchups m ON d.DepartmentID = m.WinnerDepartmentID AND m.EventID = ?
            GROUP BY d.DepartmentID
        `, [eventId]);

        console.log('Retrieved departments:', departments);

        // Retrieve event ranking points
        const [rankingPoints] = await db.promise().query('SELECT * FROM EventRankingPoints WHERE EventID = ?', [eventId]);

        console.log('Retrieved ranking points:', rankingPoints);

        // Map rank to points
        const rankToPoints = {};
        rankingPoints.forEach(point => {
            rankToPoints[point.Ranks] = point.Points;
        });

        console.log('Rank to points mapping:', rankToPoints);

        // Sort departments by total wins
        departments.sort((a, b) => b.TotalWins - a.TotalWins);

        console.log('Sorted departments:', departments);

        // Assign ranks and points to departments
        let currentRank = 1;
        let previousWins = null;
        departments.forEach((department, index) => {
            if (department.TotalWins !== previousWins) {
                previousWins = department.TotalWins;
                currentRank = index + 1;
            }
            const points = rankToPoints[currentRank] || 0; // Default points to 0 if not found in the mapping
            department.Rank = currentRank;
            department.Points = points;
        });

        console.log('Departments with rank and points:', departments);

        // Update event leaderboard table with new rankings
        for (const department of departments) {
            const departmentId = department.DepartmentID;
            const departmentRank = department.Rank;
            const departmentPoints = department.Points;
            await db.promise().execute('UPDATE EventLeaderboards SET Ranking = ?, Points = ? WHERE EventID = ? AND DepartmentID = ?', [departmentRank, departmentPoints, eventId, departmentId]);
        }

        console.log('Event leaderboard updated successfully');
    } catch (error) {
        console.error('Error updating event leaderboard:', error);
        throw error;
    }
}





async function updateWinnerDepartmentAndRankings(matchupId) {
    try {
        // Retrieve the EventID associated with the matchup
        const [matchup] = await db.promise().query('SELECT EventID FROM Matchups WHERE MatchupID = ?', [matchupId]);
        const eventId = matchup[0].EventID;

        // Update winner department for the matchup
        await updateWinnerDepartment(matchupId);

        // Update event leaderboard for the retrieved EventID
        await updateEventLeaderboard(eventId);
    } catch (error) {
        console.error('Error updating winner department and rankings:', error);
        throw error;
    }
}


async function updateWinnerDepartment(matchupId) {
    try {
        // Retrieve games for the matchup
        const [games] = await db.promise().query('SELECT Department1Score, Department2Score FROM Games WHERE MatchupID = ?', [matchupId]);
        
        // Retrieve the total number of games expected for this matchup
        const [matchup] = await db.promise().query('SELECT NumGames, EventID FROM Matchups WHERE MatchupID = ?', [matchupId]);
        const numGames = matchup[0].NumGames;
        const eventId = matchup[0].EventID;

        // Count wins for each department
        let department1Wins = 0;
        let department2Wins = 0;
        for (const game of games) {
            if (game.Department1Score > game.Department2Score) {
                department1Wins++;
            } else if (game.Department1Score < game.Department2Score) {
                department2Wins++;
            }
        }

        // Determine the winner department
        let winnerDepartmentId = null;
        if (department1Wins >= Math.ceil(numGames / 2)) {
            const [matchupInfo] = await db.promise().query('SELECT Department1ID FROM Matchups WHERE MatchupID = ?', [matchupId]);
            winnerDepartmentId = matchupInfo[0].Department1ID;
        } else if (department2Wins >= Math.ceil(numGames / 2)) {
            const [matchupInfo] = await db.promise().query('SELECT Department2ID FROM Matchups WHERE MatchupID = ?', [matchupId]);
            winnerDepartmentId = matchupInfo[0].Department2ID;
        }

        // Update the winner department for the matchup
        await db.promise().execute('UPDATE Matchups SET WinnerDepartmentID = ? WHERE MatchupID = ?', [winnerDepartmentId, matchupId]);

        // After updating the winner department, update the event leaderboard
        await updateEventLeaderboard(eventId);
    } catch (error) {
        console.error('Error updating winner department:', error);
        throw error;
    }
}


GameController.post('/create_game', authenticateToken, async  (req, res) => {
    try {
        const { MatchupID, GameNumber, GameDate, StartTime, EndTime, Status } = req.body;

        if (!MatchupID || !GameNumber || !GameDate || !StartTime || !EndTime || !Status) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const [matchup] = await db.promise().query('SELECT NumGames FROM Matchups WHERE MatchupID = ?', [MatchupID]);
        const numGames = matchup[0].NumGames;

        if (GameNumber > numGames) {
            return res.status(400).json({ message: `GameNumber cannot exceed NumGames (${numGames}) for the specified MatchupID` });
        }

        const formattedGameDate = moment(GameDate).format('YYYY-MM-DD');
        const formattedStartTime = moment(StartTime, 'HH:mm:ss').format('hh:mm A');
        const formattedEndTime = moment(EndTime, 'HH:mm:ss').format('hh:mm A');

        const insertGameQuery = `
            INSERT INTO Games (MatchupID, GameNumber, GameDate, StartTime, EndTime, Status)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        await db.promise().execute(insertGameQuery, [MatchupID, GameNumber, formattedGameDate, formattedStartTime, formattedEndTime, Status]);

        res.status(201).json({ message: 'Game created successfully' });
    } catch (error) {
        console.error('Error creating game:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

GameController.get('/games', authenticateToken, async  (req, res) => {
    try {
        const [games] = await db.promise().query('SELECT * FROM Games');

        const formattedGames = games.map(game => ({
            ...game,
            GameDate: moment(game.GameDate).format('YYYY-MM-DD'),
            StartTime: moment(game.StartTime, 'HH:mm:ss').format('hh:mm A'),
            EndTime: moment(game.EndTime, 'HH:mm:ss').format('hh:mm A'),
            Status: getStatusName(game.Status),
            Department1Outcome: getOutcomeName(game.Department1Outcome),
            Department2Outcome: getOutcomeName(game.Department2Outcome)
        }));

        res.status(200).json(formattedGames);
    } catch (error) {
        console.error('Error fetching games:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

GameController.get('/game/:id', authenticateToken, async  (req, res) => {
    try {
        const gameId = req.params.id;
        const [game] = await db.promise().query('SELECT * FROM Games WHERE GameID = ?', [gameId]);
        if (game.length === 0) {
            return res.status(404).json({ message: 'Game not found' });
        }
        
        const formattedGame = {
            ...game[0],
            GameDate: moment(game[0].GameDate).format('YYYY-MM-DD'),
            StartTime: moment(game[0].StartTime, 'HH:mm:ss').format('hh:mm A'),
            EndTime: moment(game[0].EndTime, 'HH:mm:ss').format('hh:mm A'),
            Status: getStatusName(game[0].Status),
            Department1Outcome: getOutcomeName(game[0].Department1Outcome),
            Department2Outcome: getOutcomeName(game[0].Department2Outcome)
        };

        res.status(200).json(formattedGame);
    } catch (error) {
        console.error('Error fetching game by ID:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

GameController.get('/games/event/:eventId', authenticateToken, async  (req, res) => {
    try {
        const eventId = req.params.eventId;
        const [games] = await db.promise().query('SELECT * FROM Games WHERE MatchupID IN (SELECT MatchupID FROM Matchups WHERE EventID = ?)', [eventId]);

        const formattedGames = games.map(game => ({
            ...game,
            GameDate: moment(game.GameDate).format('YYYY-MM-DD'),
            StartTime: moment(game.StartTime, 'HH:mm:ss').format('hh:mm A'),
            EndTime: moment(game.EndTime, 'HH:mm:ss').format('hh:mm A'),
            Status: getStatusName(game.Status),
            Department1Outcome: getOutcomeName(game.Department1Outcome),
            Department2Outcome: getOutcomeName(game.Department2Outcome)
        }));

        res.status(200).json(formattedGames);
    } catch (error) {
        console.error('Error fetching games by event:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

GameController.get('/games/matchup/:matchupId', authenticateToken, async  (req, res) => {
    try {
        const matchupId = req.params.matchupId;
        const [games] = await db.promise().query('SELECT * FROM Games WHERE MatchupID = ?', [matchupId]);

        const formattedGames = games.map(game => ({
            ...game,
            GameDate: moment(game.GameDate).format('YYYY-MM-DD'),
            StartTime: moment(game.StartTime, 'HH:mm:ss').format('hh:mm A'),
            EndTime: moment(game.EndTime, 'HH:mm:ss').format('hh:mm A'),
            Status: getStatusName(game.Status),
            Department1Outcome: getOutcomeName(game.Department1Outcome),
            Department2Outcome: getOutcomeName(game.Department2Outcome)
        }));

        res.status(200).json(formattedGames);
    } catch (error) {
        console.error('Error fetching games by matchup:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Route to update game details
GameController.put('/game/:id', authenticateToken, async  (req, res) => {
    try {
        const gameId = req.params.id;
        const { Status, Department1Score, Department2Score, GameDate, StartTime, EndTime } = req.body;

        // Validate request body
        if (!Status && Department1Score === undefined && Department2Score === undefined && !GameDate && !StartTime && !EndTime) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        // Retrieve current game details
        const [currentGame] = await db.promise().query('SELECT * FROM Games WHERE GameID = ?', [gameId]);
        if (currentGame.length === 0) {
            return res.status(404).json({ message: 'Game not found' });
        }
        const matchupId = currentGame[0].MatchupID;
        const eventId = currentGame[0].EventID; // Retrieve EventID from the current game

        // Build SQL query to update game details
        let query = 'UPDATE Games SET ';
        const queryParams = [];
        if (Status !== undefined) {
            query += 'Status = ?, ';
            queryParams.push(Status);
        }
        if (Department1Score !== undefined) {
            query += 'Department1Score = ?, ';
            queryParams.push(Department1Score);
        }
        if (Department2Score !== undefined) {
            query += 'Department2Score = ?, ';
            queryParams.push(Department2Score);
        }
        if (GameDate !== undefined) {
            query += 'GameDate = ?, ';
            queryParams.push(moment(GameDate).format('YYYY-MM-DD'));
        }
        if (StartTime !== undefined) {
            query += 'StartTime = ?, ';
            queryParams.push(StartTime ? moment(StartTime, 'HH:mm:ss').format('HH:mm:ss') : currentGame[0].StartTime);
        }
        if (EndTime !== undefined) {
            query += 'EndTime = ?, ';
            queryParams.push(moment(EndTime, 'HH:mm:ss').format('HH:mm:ss'));
        }
        query = query.slice(0, -2);
        query += ' WHERE GameID = ?';
        queryParams.push(gameId);

        // Execute SQL query to update game details
        await db.promise().execute(query, queryParams);

        // If both department scores are updated
        if (Department1Score !== undefined && Department2Score !== undefined) {
            let department1Outcome = '0';
            let department2Outcome = '0';

            if (Department1Score > Department2Score) {
                department1Outcome = '1';
                department2Outcome = '2';
            } else if (Department1Score < Department2Score) {
                department1Outcome = '2';
                department2Outcome = '1';
            } else {
                // If it's a tie, increment number of games for the matchup
                await db.promise().execute('UPDATE Matchups SET NumGames = NumGames + 1 WHERE MatchupID = ?', [matchupId]);
            }

            // Update game with department outcomes
            await db.promise().execute('UPDATE Games SET Department1Outcome = ?, Department2Outcome = ? WHERE GameID = ?', [department1Outcome, department2Outcome, gameId]);
        }

        // Update winner department and event rankings, passing the EventID
        await updateWinnerDepartmentAndRankings(matchupId); // Pass the MatchupID

        // Fetch and return updated game details
        const [updatedGame] = await db.promise().query('SELECT * FROM Games WHERE GameID = ?', [gameId]);

        res.status(200).json({ message: 'Game details updated successfully', updatedGame: updatedGame[0] });
    } catch (error) {
        console.error('Error updating game details:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = { GameController };