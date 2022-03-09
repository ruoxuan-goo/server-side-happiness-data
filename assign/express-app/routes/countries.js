const { Router } = require('express');
var express = require('express');
var router = express.Router();
const jwt = require('jsonwebtoken')

/* GET countries. */
router.get("/", function (req, res, next) {

    //check if query is present
    if (Object.keys(req.query).length !== 0) {
        return res.status(400).json({ error: true, message: "Invalid query parameters. Query parameters are not permitted." })
    }

    req.db.from('rankings').pluck("country").distinct().orderBy("country")
        .then((rows) => {
            return res.status(200).json(rows)
        })
        .catch((err) => {
            console.log(err);
            return res.json({ "Error": true, "Message": "Error in MySQL query" })
        })
});

module.exports = router;
