const { Router } = require('express');
var express = require('express');
var router = express.Router();
const jwt = require('jsonwebtoken')

//authorize path
const authorize = (req, res, next) => {
    const authorization = req.headers.authorization
    let token = null;

    //retrieve token
    if (authorization) {
        if (authorization.split(" ").length === 2 && authorization.split(" ")[0] === 'Bearer') {
            token = authorization.split(" ")[1]
            console.log("Token: ", token)

            //verify jwt and check expiration date
            try {
                const secretKey = process.env.SECRET_KEY;
                const decoded = jwt.verify(token, secretKey)

                if (decoded.exp < Date.now()) {
                    return res.status(408).json({ error: true, message: "Request timeout. Token has expired" });
                }
                //permit user to advance to route
                next()

            } catch (e) {
                return res.status(401).json({ error: true, message: "Invalid JWT token" });
            }
        } else {
            return res.status(401).json({ error: true, message: "Authorization header is malformed" });
        }
    }
    else {
        return res.status(401).json({ error: true, message: "Authorization header ('Bearer token') not found" });
    }


}

//Handling exception middleware for factors
const factorsExceptions = (req, res, next) => {

    const year = req.params.year;
    const { country, limit, ...invalidquery } = req.query;

    function hasNumber(myString) {
        return /\d/.test(myString);
    }

    if (year && year.length !== 4 || isNaN(year)) {
        return res.status(400).json({ error: true, message: "Invalid year format. Format must be yyyy." });
    }

    else if (country && hasNumber(country))//country is invalid
    {
        return res.status(400).json({ error: true, message: "Invalid country format. Country query parameter cannot contain numbers." });
    }

    else if (limit && (limit < 0 || isNaN(limit) || limit % 1 !== 0)) {
        return res.status(400).json({ error: true, message: "Invalid limit query. Limit must be a positive number." });
    }

    else if (Object.keys(invalidquery).length > 0) {
        return res.status(400).json({ error: true, message: "Invalid query parameters. Only limit and country are permitted." });
    }

    else {
        next();
    }
}

/* GET factors/{year}. */
router.get("/:year", authorize, factorsExceptions, function (req, res, next) {

    let query;
    const year = req.params.year;
    const { limit, country } = req.query;

    if (year && limit && country) {
        query = req.db.from('rankings').select("rank", "country", "score", "economy", "family", "health", "freedom", "generosity", "trust").where({ year: year, country: country }).limit(limit).orderBy("year", "desc")
    } else if (year && limit) {
        query = req.db.from('rankings').select("rank", "country", "score", "economy", "family", "health", "freedom", "generosity", "trust").where('year', '=', year).orderBy("year", "desc").limit(limit)
    } else if (year && country) {
        query = req.db.from('rankings').select("rank", "country", "score", "economy", "family", "health", "freedom", "generosity", "trust").where({ year: year, country: country }).orderBy("year", "desc")
    } else {
        query = req.db.from('rankings').select("rank", "country", "score", "economy", "family", "health", "freedom", "generosity", "trust").where('year', '=', year).orderBy("year", "desc")
    }
    query
        .then((rows) => {
            return res.status(200).json(rows)
        })
        .catch((err) => {
            return res.json({ "Error": true, "Message": "Error executing MySQL query" })
        })
});

module.exports = router;
