const { Router } = require('express');
var express = require('express');
var router = express.Router();
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require("../docs/swagger.json");

router.get('/', swaggerUi.setup(swaggerDocument));
router.use('/', swaggerUi.serve);

module.exports = router;

