const express = require("express");
const router = express.Router();
const contactController = require("../controllers/contactController.js");
const authToken = require('../middlewares/authToken')
const authorized = require('../middlewares/authorized')
const upload = require('../middlewares/upload')

router
  .route("")
  .post(contactController.contacts_post)
  .get(contactController.contacts_get);

module.exports = router;