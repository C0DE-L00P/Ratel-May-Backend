const express = require("express");
const router = express.Router();
const instructorController = require('../controllers/instructorController.js');
const authorized = require("../middlewares/authorized.js");
const authenticateToken = require("../middlewares/authToken.js");

router.route("/:id")
.get(instructorController.instructors_get_id)
.put(authenticateToken,instructorController.instructors_put_id)
.delete(authenticateToken,authorized("instructor","Admin"),instructorController.instructors_delete_id)

router.route("")
.post(authenticateToken,authorized("instructor","Admin"),instructorController.instructors_post)
.get(instructorController.instructors_get);

module.exports = router;