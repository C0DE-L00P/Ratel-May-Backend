const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController.js");
const authToken = require("../middlewares/authToken");
const authorized = require("../middlewares/authorized");
const upload = require("../middlewares/upload");

router
  .route("/:id")
  .get(eventController.events_get_id)
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
  .post(
    authToken,
    authorized("instructor", ["Supervisor", "Admin"]),
    eventController.events_post
  )
  .get(eventController.events_get);

router.route("/subscripe/:email").get(eventController.events_get_subscripe);
router.route("/subscripe_request").post(eventController.events_post_subscripe_request);

module.exports = router;
