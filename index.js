require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const fetch = require("node-fetch");
const app = express();
const logger = require("morgan");
const cors = require("cors");
const Util = require("./models/utilSchema.js");
const { cloudinary } = require('./utils/cloudinary.js')

var whitelist = ['http://localhost:3000', 'https://ratelmay.com', 'https://ratel-ma3y-amcademy-app.vercel.app/']
var corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}

app.use(express.static("public"));
app.use(cors());
app.use(logger("dev"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// const PORT = process.env.PORT || 5000;
// const HOST = "0.0.0.0";

//mongo Connection
const url = process.env.DB_API_KEY;
const connectionParams = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};
mongoose
  .connect(url, connectionParams)
  .then(() =>
    app.listen(process.env.DB_PORT || 1000, async () => {
      console.log("%c Server started", "color: green;");
    })
  )
  .catch((err) => console.error(`Error DB. ${err}`));

//Video Call API Setup

const arrApi = process.env.DAILY_API_KEY.split(',')
const DAILY_API_KEY = arrApi[(new Date(Date.now())).getUTCDate()];

const headers = {
  Accept: "application/json",
  "Content-Type": "application/json",
  Authorization: "Bearer " + DAILY_API_KEY,
};

const getRoom = (room) => {
  return fetch(`https://api.daily.co/v1/rooms/${room}`, {
    method: "GET",
    headers,
  })
    .then((res) => res.json())
    .then((json) => {
      return json;
    })
    .catch((err) => console.error("error:" + err));
};

const createRoom = (room) => {
  return fetch("https://api.daily.co/v1/rooms", {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: room,
      properties: {
        enable_screenshare: true,
        enable_chat: true,
        start_video_off: true,
        start_audio_off: false,
        enable_network_ui: true,
        enable_prejoin_ui: true,
        lang: "en",
      },
    }),
  })
    .then((res) => res.json())
    .then((json) => {
      return json;
    })
    .catch((err) => console.error("error:" + err));
};

app.post("/video-call/:id", async function (req, res, next) {
  const roomId = req.params.id;
  const role = req.body.role;

  try {
    //Check if room is already created
    const room = await getRoom(roomId);
    if (room == undefined) return res.status(400).json({ message: "Room id is empty" });
    if (!room.error) return res.status(200).send(room);

    if (role !== "instructor")
      return res
        .status(400)
        .json({ message: "Not authorized to create a new room" });

    const newRoom = await createRoom(roomId);

    res.status(200).json(newRoom);
  } catch (error) {
    next(error)
  }
});

const arrUrl = process.env.DAILY_CLIENT_URL.split(',');
app.get("/video-api-url", function (req, res) {
  res.json({ url: arrUrl[(new Date(Date.now())).getUTCDate()] });
});

//Routes

app.use("/api/sessions", require("./routes/sessions.js"));
app.use("/api/students", require("./routes/students.js"));
app.use("/api/instructors", require("./routes/instructors.js"));
app.use("/api/feedbacks", require("./routes/feedbacks.js"));
app.use("/api/contacts", require("./routes/contacts.js"));
app.use("/api/events", require("./routes/events.js"));
app.use("/api/auth", require("./routes/auth.js"));


// To upload images coming from ckeditor to cloudinary

const multipart = require('connect-multiparty');
const multipartMiddleware = multipart();

app.post('/api/upload-img', multipartMiddleware, async function (mreq, mres) {
  const { secure_url } = await cloudinary.uploader.upload(mreq.files.uploadImg.path, {
    folder: 'ckeditor',
  });
  mres.status(201).send(secure_url);
});


const errorHandler = (error, request, response, next) => {
  // Error handling middleware functionality
  console.log(`error ${error.message}`); // log the error
  const status = error.status || 400;
  // send back an easily understandable error message to the caller
  response.status(status).send(error.message);
}



app.get("*", (mreq, mres) => mres.sendStatus(404));
app.use(errorHandler);

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server Running on port ${port}`));
