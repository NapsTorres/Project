// database//

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'isfe2'

});

db.connect((err) => {
    if(err) {
        console.error('Error connecting to MySQL:', err);
    } else {
        console.log('conneted to MySQL');
    }

});

//database//