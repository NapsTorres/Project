// authunticate start//

function authunticateToken(req, res, next){
    const token = req.headers.authorization

    if(!token){
        return res.status(401).json({error: 'Unathorized'});
    }

    jwt.verify(token, secretKey, (err, user) => {
        if (err) {
            return res.status(403).json({error: 'Forbiddine'});
        }

        req.user = user;
        next();
    });
}

// authunticate end//