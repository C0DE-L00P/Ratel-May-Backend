const express = require("express");
const router = express.Router();
const sessionController = require('../controllers/sessionController.js')

router.route("/:id")
.get(sessionController.sessions_get_id)
.put(sessionController.sessions_put_id)
.delete(sessionController.sessions_delete_id)

router.route("")
.post(sessionController.sessions_post)
.get(sessionController.sessions_get);

module.exports = router;