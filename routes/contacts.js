const express = require("express");
const router = express.Router();
const contactController = require("../controllers/contactController.js");
const authToken = require('../middlewares/authToken')
const authorized = require('../middlewares/authorized')

router
  .route("/:id")
  .get(contactController.contacts_get_id)
  .put(contactController.contacts_put_id)
  .delete(contactController.contacts_delete_id)

router
  .route("")
  .post(contactController.contacts_post)
  .get(contactController.contacts_get);

module.exports = router;