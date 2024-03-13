
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { connectDB } = require('./db');
const { authenticateToken } = require('./auth');
const { userController } = require('./Routes/userController');
const { RoleController } = require('./Routes/RoleController');
const { TeamController } = require('./Routes/TeamController');
const { GenderController } = require('./Routes/GenderController');
const { CategoryController } = require('./Routes/CategoryController');
const { EventController } = require('./Routes/EventController');
const { PointController } = require('./Routes/PointController');
const { MatchupController } = require('./Routes/MatchupController');
const { GameController } = require('./Routes/GameController');
const { RegistrationController } = require('./Routes/RegistrationController');
const { EventLeaderboardController } = require('./Routes/EventLeaderboard');
const { RankingsController } = require('./Routes/RankingsController');

const app = express();
app.use(bodyParser.json());
app.use(cors());


const PORT = process.env.PORT || 3001;

connectDB();

app.use('/api', userController);
app.use('/api', RoleController);
app.use('/api', TeamController);
app.use('/api', GenderController);
app.use('/api', CategoryController);
app.use('/api', EventController);
app.use('/api', PointController);
app.use('/api', MatchupController);
app.use('/api', GameController);
app.use('/api', RegistrationController);
app.use('/api', EventLeaderboardController);
app.use('/api', RankingsController);

app.get('/', (req, res) => {
    res.json({ message: 'Restful API Backend Using ExpressJS' });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
