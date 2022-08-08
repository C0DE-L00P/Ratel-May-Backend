const express = require("express");
const router = express.Router();
const studentController = require('../controllers/studentController.js')


router.route("/:id")
.get(studentController.students_get_id)
.put(studentController.students_put_id)
.delete(studentController.students_delete_id)


router.route("")
.post(studentController.students_post)
.get(studentController.students_get);

module.exports = router;