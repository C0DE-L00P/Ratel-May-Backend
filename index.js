require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const fetch = require("node-fetch");
const app = express();
const logger = require("morgan");
const cors = require("cors");

var corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200,
}

app.use(express.static('public'))
app.use(cors(corsOptions))
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));


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
    app.listen(process.env.DB_PORT || 1000, () =>
      console.log("%c Server started", "color: green;")
    )
  )
  .catch((err) => console.error(`Error DB. ${err}`));


//Video Call API Setup

const API_KEY = process.env.DAILY_API_KEY;

const headers = {
  Accept: "application/json",
  "Content-Type": "application/json",
  Authorization: "Bearer " + API_KEY,
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

app.get("/video-call/:id", async function (req, res) {
  const roomId = req.params.id;

  const room = await getRoom(roomId);
  if (room == undefined)
    return res.status(400).json({ message: "Room id is empty" });

  if (room.error) {
    const newRoom = await createRoom(roomId);
    res.status(200).send(newRoom);
  } else {
    res.status(200).send(room);
  }
});

app.get("/video-api-url", function (req, res) {
  res.json({url: process.env.DAILY_CLIENT_URL})
});


//Routes

app.use("/api/sessions", require("./routes/sessions.js"));
app.use("/api/students", require("./routes/students.js"));
app.use("/api/instructors", require("./routes/instructors.js"));
app.use("/api/feedbacks", require("./routes/feedbacks.js"));
app.use("/api/events", require("./routes/events.js"));
app.use("/api/auth", require("./routes/auth.js"));
app.get("*", (mreq, mres) => mres.sendStatus(404));

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server Running on port ${port}`));