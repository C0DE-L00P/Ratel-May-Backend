const multer = require("multer");
const path = require("path");

//multer configs

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log("requested", req);
    try {
      cb(null, "./public/assets/events/");
    } catch (error) {
      console.log("first catch");
      try {
        cb(null, "./assets/events/");
      } catch (error) {
        console.log("second catch");
        cb(null, "./");
      }
    }
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); //Appending extension
  },
});
const upload = multer({ storage: storage }).single("article_img");

module.exports = upload;
