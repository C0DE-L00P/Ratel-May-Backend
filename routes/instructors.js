const express = require("express");
const router = express.Router();
const instructorController = require('../controllers/instructorController.js')

router.route("/:id")
.get(instructorController.instructors_get_id)
.put(instructorController.instructors_put_id)
.delete(instructorController.instructors_delete_id)

router.route("")
.post(instructorController.instructors_post)
.get(instructorController.instructors_get);

module.exports = router;