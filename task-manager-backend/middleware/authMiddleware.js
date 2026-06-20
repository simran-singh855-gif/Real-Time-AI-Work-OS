const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    let token = req.headers.authorization;

    if (!token) return res.status(401).json({ error: "Not authorized, no token" });

    try {
        // Token usually comes as "Bearer <token>"
        const actualToken = token.split(' ')[1]; 
        const decoded = jwt.verify(actualToken, 'YOUR_SECRET_KEY');
        
        req.user = decoded; // Now req.user.id is available in your controllers!
        next(); // Move to the next function
    } catch (err) {
        res.status(401).json({ error: "Token failed" });
    }
};

module.exports = { protect };