const express = require("express");
const router = express.Router();
const sessionController = require('../controllers/sessionController.js');
const authorized = require("../middlewares/authorized.js");
const authenticateToken = require("../middlewares/authToken.js");

router.route("/:id")
.get(sessionController.sessions_get_id)
.put(authenticateToken,authorized("instructor",["None","Supervisor","Admin"]),sessionController.sessions_put_id)
.delete(authenticateToken,authorized("instructor",["None","Supervisor","Admin"]),sessionController.sessions_delete_id)

router.route("")
.post(sessionController.sessions_post)
.get(sessionController.sessions_get);

router.route("/last").post(sessionController.sessions_post_last)

module.exports = router;