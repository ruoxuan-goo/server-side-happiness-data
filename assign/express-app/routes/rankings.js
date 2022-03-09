const { Router } = require('express');
var express = require('express');
var router = express.Router();
const jwt = require('jsonwebtoken')

const rankingsExceptions = (req, res, next) => {

    const { year, country, ...invalidquery } = req.query;

    function hasNumber(myString) {
        return /\d/.test(myString);
    }

    if (year) {
        if (year.length !== 4 || isNaN(year)) {
            return res.status(400).json({ error: true, message: "Invalid year format. Format must be yyyy." });
        }
    }

    if (country) {
        if (hasNumber(country)) {
            return res.status(400).json({ error: true, message: "Invalid country format. Country query parameter cannot contain numbers." });
        }
    }

    if (Object.keys(invalidquery).length > 0) {
        return res.status(400).json({ error: true, message: "Invalid query parameters. Only year and country are permitted." });
    }

    next();
}

/* GET rankings. */
router.get("/", rankingsExceptions, function (req, res, next) {

    let query;
    const { year, country } = req.query;

    //check if string contains number
    function hasNumber(myString) {
        return /\d/.test(myString);
    }

    //handling errors
    if (year && country) {
        query = req.db.from('rankings').select("rank", "country", "score", "year").where({ year: year, country: country }).orderBy("year", "desc")
    } else if (year) {
        query = req.db.from('rankings').select("rank", "country", "score", "year").where('year', '=', year).orderBy("year", "desc")
    } else if (country) {
        query = req.db.from('rankings').select("rank", "country", "score", "year").where('country', '=', country).orderBy("year", "desc")
    } else {
        query = req.db.from('rankings').select("rank", "country", "score", "year").orderBy("year", "desc")
    }

    query
        .then((rows) => {
            return res.status(200).json(rows)
        })
        .catch((err) => {
            console.log(err);
            return res.json({ "Error": true, "Message": "Error in MySQL query" })
        })
});


module.exports = router;
