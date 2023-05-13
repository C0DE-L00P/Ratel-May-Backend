const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController.js");
const authToken = require("../middlewares/authToken");
const authorized = require("../middlewares/authorized");

router
  .route("/:slug")
  .get(eventController.events_get_slug);

router.route('/:id')
  .put(
    authToken,
    authorized("instructor", ["Supervisor", "Admin"]),
    eventController.events_put_id
  )
  .delete(
    authToken,
    authorized("instructor", ["Supervisor", "Admin"]),
    eventController.events_delete_id
  );


router
  .route("")
  .get(eventController.events_get)
  .post(
    authToken,
    authorized("instructor", ["Supervisor", "Admin"]),
    eventController.events_post
  );

router.route("/subscripe/:email").get(eventController.events_get_subscripe);
router.route("/subscripe_request").post(eventController.events_post_subscripe_request);

module.exports = router;
