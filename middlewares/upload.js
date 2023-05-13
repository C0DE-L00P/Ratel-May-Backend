const multer = require("multer"); 
const path = require("path");

// multer configuration
const storage = multer.diskStorage({
   // set the destination folder for uploaded files
  destination: function (req, file, cb) {
    try {
      cb(null, "./public/uploads/");
    } catch (error) {
      console.error('Error occurred during file upload:', error);
    }
  },

  // set the file name for the uploaded file
  filename: function (req, file, cb) { 
    cb(null, Date.now() + path.extname(file.originalname)); // current date + ".jpg" as filename stored
  },
});

// create a middleware function using multer that will handle a single file upload, with the field name "article_img"
const upload = multer({ storage: storage }).single("article_img"); 

module.exports = upload;