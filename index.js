require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const app = express();
const server = require("http").createServer(app);
const cors = require("cors");
const helmet = require("helmet");
const Session = require("./models/sessionSchema");


const PORT = process.env.PORT || 5000;
//open the server

server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

//mongo Connection
const url = process.env.DB_API_KEY;
const connectionParams = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};
mongoose
  .connect(url, connectionParams)
  .then(() =>
    app.listen(process.env.PORT || 1000, () =>
      console.log("%c Server started", "color: green;")
    )
  )
  .catch((err) => console.error(`Error DB. ${err}`));

//TODO: change origin here to another 
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(helmet());

app.get("/", (req, res) => {
  res.send("Running");
});

// Socket things
// 'on' means detect change
//افتكر ان io هنا السيرفر بيتكلم
//انما socket هنا الكلاينت هو اللي بيتكلم

//REM: connection would happen when pressing create room or when pressing on existing room
io.on("connection", (socket) => {

  socket.emit("me", socket.id);

  socket.on("disconnect", () => {
    socket.broadcast.emit("callEnded"); //هنا هو بيقول للباقي يا جماعه انا ماشي
  });

  // TODO: I think this is the place we should work on to improve this
  // NOTE: Data would be passed by front-end as data object (data) == ({userToCall ...})
  // NOTE: signalData is the video audio stream that is sent through the socket

  socket.on("callUser", ({ userToCall, signalData, from, name }) => {
    io.to(userToCall).emit("callUser", { signal: signalData, from, name }); //هنا بيقول للسيرفر ناديلي على سيد
  });

  socket.on("answerCall", (data) => {
    io.to(data.to).emit("callAccepted", data.signal);         //هنا بيقوله ايوه يا احمد
  });


  //--------------------------------------- NOW TO CHAT ROOM APPLICATION ya rab

  //client create a room
  //TODO: can use uuid to create random roomID notice must be saved in mongoDB in session object as roomID 
  socket.on("createRoom", (socket,roomID)=>{
    socket.to(roomID).emit("openRoom","Started the session")
  })

  //client join to the room 
  //TODO: only participants can access the room without permission
  //TODO: non-participants can access only by given their names and take the acceptance from the instructor
  //TODO: supervisors and admins are exceptions that can enter without being in the list and with no permissions
  socket.on("joinRoom", (socket,roomID)=>{
    socket.join(roomID)
  })

  //TODO: better approach is just to concat in frontend side to an existing array AND THAT MAKES you can send just the new message not all of the array
  //sending text messages
  socket.on("sendText",(msg)=>{
    
    //store new msg in mongodb
    Session
    let msgs = []
    //coming from mongoDB as
    io.sockets.emit("messages",msgs)
  })
});


//Routes

app.use("/api/sessions", require("./routes/sessions.js"));
app.use("/api/students", require("./routes/students.js"));
app.use("/api/instructors", require("./routes/instructors.js"));
app.use("/api/feedbacks", require("./routes/feedbacks.js"));
app.use("/api/events", require("./routes/events.js"));
app.use("/api/auth", require("./routes/auth.js"));

app.get("*", (mreq, mres) => mres.sendStatus(404));

module.exports = mongoose;