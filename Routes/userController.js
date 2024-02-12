const jwt = require('jsonwebtoken');
const express = require('express');
const bcrypt = require('bcrypt');
const { db, secretKey } = require('../db');
const { authenticateToken } = require('../auth');



const userController = express.Router();

// register user start
userController.post('/register', async (req, res) => {
    try {
        const { Name, Username, Password, RoleID } = req.body;
        const hashedPassword = await bcrypt.hash(Password, 10);

        const insertUserQuery = 'INSERT INTO Users (Name, Username, Password, RoleID) VALUES (?, ?, ?, ?)';
        await db.promise().execute(insertUserQuery, [Name, Username, hashedPassword, RoleID]);

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Error registering users', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
// register user end

// log in user start
userController.post('/login', async (req, res) => {
    try {
        const { Username, Password } = req.body;

        const getUserQuery = 'SELECT * FROM Users WHERE Username = ?';
        const [rows] = await db.promise().execute(getUserQuery, [Username]);

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const user = rows[0];
        const passwordMatch = await bcrypt.compare(Password, user.Password); 

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const token = jwt.sign({ UserID: user.UserID, Username: user.Username }, secretKey, { expiresIn: '1h' });

        res.status(200).json({ token });
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// log in user end


// show users start
userController.get('/users', (req, res) => {
    try {
        db.query('SELECT RoleID, UserID, Name, Username FROM Users', (err, result) => {
            if (err) {
                console.error('Error fetching users:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading users:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// show users end

// show user by id start
userController.get('/user/:id', (req, res) => {
    const UserId = req.params.id;

    if (!UserId) {
        return res.status(400).json({ error: true, message: 'Please provide user_id' });
    }

    try {
        db.query('SELECT UserID, RoleID, Name, Username FROM Users WHERE UserID = ?', UserId, (err, result) => {
            if (err) {
                console.error('Error fetching user:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error loading user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// show user by id end

// update user by id start
userController.put('/user/:id', async (req, res) => {
    const UserID = req.params.id;
    const { Name, Username, Password, RoleID } = req.body;
    const hashedPassword = await bcrypt.hash(Password, 10);

    if (!UserID || !Name || !Username || !Password || !RoleID) {
        return res.status(400).json({ error: true, message: 'Please provide name, username, password, and roleID' });
    }

    try {
        db.query('UPDATE Users SET Name = ?, Username = ?, Password = ?, RoleID = ? WHERE UserID = ?', [Name, Username, hashedPassword, RoleID, UserID], (err, result) => {
            if (err) {
                console.error('Error updating user:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// update user by id end

// delete user by id start
userController.delete('/user/:id', (req, res) => {
    const UserId = req.params.id;

    if (!UserId) {
        return res.status(400).json({ error: true, message: 'Please provide user_id' });
    }

    try {
        db.query('DELETE FROM Users WHERE UserID = ?', UserId, (err, result) => {
            if (err) {
                console.error('Error deleting user:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// delete user by id end

 

module.exports = { userController };
