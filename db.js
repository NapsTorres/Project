    const mysql = require('mysql2');

    const secretKey = 'napoleon-secret-key';

    const db = mysql.createConnection({
        host: 'sql6.freesqldatabase.com',
        user: 'sql6683367',
        password: 'T5fdtfaLMk',
        database: 'sql6683367',
    });

    function connectDB() {
        db.connect((err) => {
            if (err) {
                console.error('Error connecting to MySQL:', err);
            } else {
                console.log('Connected to MySQL');
            }
        });
    }

    module.exports = { db, secretKey, connectDB };