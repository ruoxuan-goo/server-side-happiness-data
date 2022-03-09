var express = require('express');
var router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');

/* POST register*/
router.post("/register", function (req, res, next) {
  //verify body
  const email = req.body.email
  const password = req.body.password
  if (!email || !password) {
    return res.status(400).json({
      error: true,
      message: "Request body incomplete, both email and password are required"
    });
    //add - check if they r the correct type, or email is a valid email
  }

  const queryUsers = req.db.from("users").select("*").where("email", "=", email)
  //determine if users exists in the table
  queryUsers
    .then((users) => {
      if (users.length > 0) {
        return res.status(409).json({
          error: true,
          message: "User already exists"
        })
      }

      //Insert user into DB
      const saltRounds = 10
      const hash = bcrypt.hashSync(password, saltRounds)
      return req.db.from("users").insert({ email, hash })
    })
    .then(() => {
      return res.status(201).json({ message: "User created" })
    }).catch((e) => {
      console.log(e)
    })
})

/* POST login*/
router.post("/login", function (req, res, next) {
  const email = req.body.email
  const password = req.body.password
  //verify body
  if (!email || !password) {
    return res.status(400).json({
      error: true,
      message: "Request body incomplete, both email and password are required"
    })
  }

  const queryUsers = req.db.from("users").select("*").where("email", "=", email)
  //determine if user already exists in the table
  queryUsers
    .then((users) => {
      if (users.length === 0) {
        return res.status(401).json({
          error: true,
          message: "Incorrect email or password"
        })
      }
      //compare password hashes
      const user = users[0]
      return bcrypt.compare(password, user.hash)
    })

    .then((match) => {
      if (!match) {
        return res.status(401).json({
          error: true,
          message: "Incorrect email or password"
        })
      }
      //create and return JWT token
      const secretKey = process.env.SECRET_KEY;
      const expires_in = 60 * 60 * 24 //1day
      const exp = Date.now() + expires_in * 1000
      const token = jwt.sign({ email, exp }, secretKey)
      res.status(200).json({
        token: token,
        token_type: "Bearer",
        expires_in: expires_in
      })
    })
    .catch((e) =>
      console.log(e)
    );
})

//authorize path
//if unauthorised soft fail will be false 
const authorize = (req, res, next, softFail = false) => {

  const secretKey = process.env.SECRET_KEY;
  const authorization = req.headers.authorization
  let token = null;

  //retrieve token
  if (authorization) {
    if (authorization.split(" ").length === 2
      && authorization.split(" ")[0] === 'Bearer') {
      token = authorization.split(" ")[1]

      //verify jwt and check expiration date
      try {
        const decoded = jwt.verify(token, secretKey)

        if (decoded.exp < Date.now()) {
          return res.status(401).json({ error: true, message: "JWT token has expired" });
        } else {
          //permit user to advance to route
          res.locals.decodedEmail = decoded.email;
          next()
        }
      } catch (e) {
        if (softFail) {
          next()
        } else {
          return res.status(401).json({ error: true, message: "Invalid JWT token" });
        }
      }
    } else {
      return res.status(401).json({ error: true, message: "Authorization header is malformed" });
    }

  } else if (!authorization && softFail) {
    res.locals.decodedEmail = null;
    next()
  }
  else {
    // no auth header && softfail is false
    return res.status(401).json({ error: true, message: "Authorization header ('Bearer token') not found" })
  }
}

/* GET profile*/
router.get("/:email/profile", (req, res, next) => authorize(req, res, next, true), function (req, res, next) {
  let query;

  //res.locals.decodedEmail will be
  //1. null if unauthed
  //2. equal to the path param is user requesting their own profile
  //3. not equal to the path param is a user is requesing someone elses profile
  if (res.locals.decodedEmail === req.params.email) {
    query = req.db.from('users').first("email", "firstName", "lastName", "dob", "address").where("email", '=', req.params.email)
  } else {
    query = req.db.from('users').first("email", "firstName", "lastName",).where("email", '=', req.params.email)
  }

  query
    .then((rows) => {
      if (rows === undefined) {
        return res.status(404).json({
          error: true,
          message: "User not found"
        })
      } else {
        return res.status(200).json(rows)
      }
    })
    .catch((err) => {
      console.log(err);
      return res.status(404).json({
        error: true,
        message: "User not found"
      })
    })
});

/* PUT profile*/
router.put('/:email/profile', authorize, function (req, res) {

  const firstName = req.body.firstName
  const lastName = req.body.lastName
  const dob = req.body.dob
  const address = req.body.address

  if (res.locals.decodedEmail !== req.params.email) {
    return res.status(403).json({ error: true, message: 'Forbidden' });
  }

  if (!firstName || !lastName || !dob || !address) {
    return res.status(400).json({ error: true, message: "Request body incomplete: firstName, lastName, dob and address are required." });
  }

  if (typeof firstName !== 'string' || typeof lastName !== 'string' || typeof address !== 'string') {
    return res.status(400).json({ error: true, message: "Request body invalid, firstName, lastName and address must be strings only." });
  }

  function isValidDate(dateString) {
    var regEx = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateString.match(regEx)) return false;  // Invalid format
    var d = new Date(dateString);
    var dNum = d.getTime();
    if (!dNum && dNum !== 0) return false; // NaN value, Invalid date

    return d.toISOString().slice(0, 10) === dateString;
  }

  if (!isValidDate(dob)) {
    return res.status(400).json({ error: true, message: "Invalid input: dob must be a real date in format YYYY-MM-DD." });
  }


  if (new Date(dob).getTime() >= Date.now()) {
    return res.status(400).json({ error: true, message: "Invalid input: dob must be a date in the past." });
  }

  let update = {
    "firstName": req.body.firstName,
    "lastName": req.body.lastName,
    "dob": req.body.dob,
    "address": req.body.address
  }

  req.db('users').where('email', '=', req.params.email).update(update)
    .then((rows) => {
      update = {
        "email": req.params.email,
        "firstName": req.body.firstName,
        "lastName": req.body.lastName,
        "dob": req.body.dob,
        "address": req.body.address
      }
      return res.status(200).json(update);
    }).catch(error => {
      console.log(error);
      return res.status(500).json({ message: 'Database error - not updated' });
    })
});

module.exports = router;
