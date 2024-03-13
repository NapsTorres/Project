const jwt = require('jsonwebtoken');
const { secretKey } = require('./db');

function authenticateToken(req, res, next) {
    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    jwt.verify(token, secretKey, (err, decodedToken) => {
        if (err) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Extract user ID from decoded token and attach it to the request object
        req.userID = decodedToken.UserID;

        next();
    });
}

module.exports = { authenticateToken };
