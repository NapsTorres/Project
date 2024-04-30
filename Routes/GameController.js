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
        
        // Fetch all teams participating in the event
        const [teams] = await db.promise().query(`
            SELECT t.TeamID, t.TeamName,
            COUNT(m.WinnerTeamID) AS TotalWins
            FROM Teams t
            LEFT JOIN Matchups m ON t.TeamID = m.WinnerTeamID AND m.EventID = ?
            GROUP BY t.TeamID
        `, [eventId]);

        console.log('Retrieved teams:', teams);

        // Retrieve event ranking points
        const [rankingPoints] = await db.promise().query('SELECT * FROM EventRankingPoints WHERE EventID = ?', [eventId]);

        console.log('Retrieved ranking points:', rankingPoints);

        // Map rank to points
        const rankToPoints = {};
        rankingPoints.forEach(point => {
            rankToPoints[point.Ranks] = point.Points;
        });

        console.log('Rank to points mapping:', rankToPoints);

        // Sort teams by total wins
        teams.sort((a, b) => b.TotalWins - a.TotalWins);

        console.log('Sorted teams:', teams);

        // Assign ranks and points to teams
        let currentRank = 1;
        let previousWins = null;
        teams.forEach((team, index) => {
            if (team.TotalWins !== previousWins) {
                previousWins = team.TotalWins;
                currentRank = index + 1;
            }
            const points = rankToPoints[currentRank] || 0; // Default points to 0 if not found in the mapping
            team.Rank = currentRank;
            team.Points = points;
        });

        console.log('Teams with rank and points:', teams);

        // Update event leaderboard table with new rankings
        for (const team of teams) {
            const teamId = team.TeamID;
            const teamRank = team.Rank;
            const teamPoints = team.Points;
            await db.promise().execute('UPDATE EventLeaderboards SET Ranking = ?, Points = ? WHERE EventID = ? AND TeamID = ?', [teamRank, teamPoints, eventId, teamId]);
        }

        console.log('Event leaderboard updated successfully');
    } catch (error) {
        console.error('Error updating event leaderboard:', error);
        throw error;
    }
}





async function updateWinnerTeamAndRankings(matchupId) {
    try {
        // Retrieve the EventID associated with the matchup
        const [matchup] = await db.promise().query('SELECT EventID FROM Matchups WHERE MatchupID = ?', [matchupId]);
        const eventId = matchup[0].EventID;

        // Update winner team for the matchup
        await updateWinnerTeam(matchupId);

        // Update event leaderboard for the retrieved EventID
        await updateEventLeaderboard(eventId);
    } catch (error) {
        console.error('Error updating winner team and rankings:', error);
        throw error;
    }
}


async function updateWinnerTeam(matchupId) {
    try {
        // Retrieve games for the matchup
        const [games] = await db.promise().query('SELECT Team1Score, Team2Score FROM Games WHERE MatchupID = ?', [matchupId]);
        
        // Retrieve the total number of games expected for this matchup
        const [matchup] = await db.promise().query('SELECT NumGames, EventID FROM Matchups WHERE MatchupID = ?', [matchupId]);
        const numGames = matchup[0].NumGames;
        const eventId = matchup[0].EventID;

        // Count wins for each team
        let team1Wins = 0;
        let team2Wins = 0;
        for (const game of games) {
            if (game.Team1Score > game.Team2Score) {
                team1Wins++;
            } else if (game.Team1Score < game.Team2Score) {
                team2Wins++;
            }
        }

        // Determine the winner team
        let winnerTeamId = null;
        if (team1Wins >= Math.ceil(numGames / 2)) {
            const [matchupInfo] = await db.promise().query('SELECT Team1ID FROM Matchups WHERE MatchupID = ?', [matchupId]);
            winnerTeamId = matchupInfo[0].Team1ID;
        } else if (team2Wins >= Math.ceil(numGames / 2)) {
            const [matchupInfo] = await db.promise().query('SELECT Team2ID FROM Matchups WHERE MatchupID = ?', [matchupId]);
            winnerTeamId = matchupInfo[0].Team2ID;
        }

        // Update the winner team for the matchup
        await db.promise().execute('UPDATE Matchups SET WinnerTeamID = ? WHERE MatchupID = ?', [winnerTeamId, matchupId]);

        // After updating the winner team, update the event leaderboard
        await updateEventLeaderboard(eventId);
    } catch (error) {
        console.error('Error updating winner team:', error);
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
            Team1Outcome: getOutcomeName(game.Team1Outcome),
            Team2Outcome: getOutcomeName(game.Team2Outcome)
        }));

        res.status(200).json(formattedGames);
    } catch (error) {
        console.error('Error fetching games:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

GameController.get('/games', authenticateToken, async (req, res) => {
    try {
        const gamesQuery = `
            SELECT g.*, e.EventName, t1.TeamName AS Team1Name, t2.TeamName AS Team2Name
            FROM Games g
            INNER JOIN Matchups m ON g.MatchupID = m.MatchupID
            INNER JOIN Events e ON m.EventID = e.EventID
            INNER JOIN Teams t1 ON m.Team1ID = t1.TeamID
            INNER JOIN Teams t2 ON m.Team2ID = t2.TeamID
        `;
        const [games] = await db.promise().query(gamesQuery);

        const formattedGames = games.map(game => ({
            ...game,
            GameDate: moment(game.GameDate).format('YYYY-MM-DD'),
            StartTime: moment(game.StartTime, 'HH:mm:ss').format('hh:mm A'),
            EndTime: moment(game.EndTime, 'HH:mm:ss').format('hh:mm A'),
            Status: getStatusName(game.Status),
            Team1Outcome: getOutcomeName(game.Team1Outcome),
            Team2Outcome: getOutcomeName(game.Team2Outcome)
        }));

        res.status(200).json(formattedGames);
    } catch (error) {
        console.error('Error fetching games:', error);
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
            Team1Outcome: getOutcomeName(game.Team1Outcome),
            Team2Outcome: getOutcomeName(game.Team2Outcome)
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
            Team1Outcome: getOutcomeName(game.Team1Outcome),
            Team2Outcome: getOutcomeName(game.Team2Outcome)
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
        const { Status, Team1Score, Team2Score, GameDate, StartTime, EndTime } = req.body;

        // Validate request body
        if (!Status && Team1Score === undefined && Team2Score === undefined && !GameDate && !StartTime && !EndTime) {
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
        if (Team1Score !== undefined) {
            query += 'Team1Score = ?, ';
            queryParams.push(Team1Score);
        }
        if (Team2Score !== undefined) {
            query += 'Team2Score = ?, ';
            queryParams.push(Team2Score);
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

        // If both team scores are updated
        if (Team1Score !== undefined && Team2Score !== undefined) {
            let team1Outcome = '0';
            let team2Outcome = '0';

            if (Team1Score > Team2Score) {
                team1Outcome = '1';
                team2Outcome = '2';
            } else if (Team1Score < Team2Score) {
                team1Outcome = '2';
                team2Outcome = '1';
            } else {
                // If it's a tie, increment number of games for the matchup
                await db.promise().execute('UPDATE Matchups SET NumGames = NumGames + 1 WHERE MatchupID = ?', [matchupId]);
            }

            // Update game with team outcomes
            await db.promise().execute('UPDATE Games SET Team1Outcome = ?, Team2Outcome = ? WHERE GameID = ?', [team1Outcome, team2Outcome, gameId]);
        }

        // Update winner team and event rankings, passing the EventID
        await updateWinnerTeamAndRankings(matchupId); // Pass the MatchupID

        // Fetch and return updated game details
        const [updatedGame] = await db.promise().query('SELECT * FROM Games WHERE GameID = ?', [gameId]);

        res.status(200).json({ message: 'Game details updated successfully', updatedGame: updatedGame[0] });
    } catch (error) {
        console.error('Error updating game details:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = { GameController };
