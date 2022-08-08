const express = require("express");
const router = express.Router();
const feedbackController = require('../controllers/feedbackController.js')

router.route("/:id")
.get(feedbackController.feedbacks_get_id)
// .put(feedbackController.feedbacks_put_id)
// .delete(feedbackController.feedbacks_delete_id)

router.route("")
.post(feedbackController.feedbacks_post)
.get(feedbackController.feedbacks_get);

module.exports = router;