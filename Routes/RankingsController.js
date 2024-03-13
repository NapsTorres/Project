const jwt = require('jsonwebtoken');
const express = require('express');
const bcrypt = require('bcrypt');
const { db, secretKey } = require('../db');
const { authenticateToken } = require('../auth');

const RankingsController = express.Router();

// Route to get department rankings
RankingsController.get('/department_rankings', async (req, res) => {
    try {
        // SQL query to get department rankings with total points across all events
        const query = `
            SELECT d.DepartmentID, d.DepartmentCode, d.DepartmentName, 
                   SUM(el.Points) AS TotalPoints,
                   RANK() OVER (ORDER BY SUM(el.Points) DESC) AS Ranking
            FROM Departments d
            LEFT JOIN EventLeaderboards el ON d.DepartmentID = el.DepartmentID
            GROUP BY d.DepartmentID, d.DepartmentCode, d.DepartmentName;
        `;
        
        console.log('Executing query:', query);

        // Execute the query
        const [rankings] = await db.promise().query(query);

        console.log('Department rankings:', rankings);

        // Send the department rankings as JSON response
        res.status(200).json(rankings);
    } catch (error) {
        console.error('Error fetching department rankings:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = { RankingsController };
