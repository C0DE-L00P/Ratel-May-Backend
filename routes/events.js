const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController.js");
const multer = require("multer");
var path = require("path");

//multer configs

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/assets/events/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); //Appending extension
  },
});
const upload = multer({ storage: storage }).single("article_img");

//routes

router
  .route("/:id")
  .get(eventController.events_get_id)
  .put(upload, eventController.events_put_id)
  .delete(eventController.events_delete_id);

router
  .route("")
  .post(upload, eventController.events_post)
  .get(eventController.events_get);

module.exports = router;
