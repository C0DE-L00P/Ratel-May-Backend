const Session = require("../models/sessionSchema");
const fetch = require("node-fetch");
const Instructor = require("../models/instructorSchema");
require("dotenv").config();

// -------------------- IDS

const sessions_get_id = (mreq, mres) => {
  Session.findById(mreq.params.id)
    .populate("attendants", {
      name: 1,
      email: 1,
      _id: 1,
      mobile: 1,
      privileges: 1,
      is_available: 1,
    })
    .populate("created_by", {
      name: 1,
      email: 1,
      _id: 1,
      mobile: 1,
      privileges: 1,
      is_available: 1,
    })
    .populate("evaluations.evaluated_by", { name: 1, _id: 1 })
    .populate("evaluations.student", { name: 1, _id: 1 })
    .then((res) => (res ? mres.json(res) : mres.sendStatus(404)))
    .catch((err) => mres.status(400).json({ message: err.message }));
};

const sessions_put_id = (mreq, mres) => {

  if ("is_live" in mreq.body && !mreq.body.is_live) {
    //Don't accept any more attendants
    delete mreq.body.attendants;


    //Delete the room
    const arrApi = process.env.DAILY_API_KEY.split(',')
    const DAILY_API_KEY = arrApi[(new Date(Date.now())).getUTCDate()];
    let headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: "Bearer " + DAILY_API_KEY
    };

    fetch(`https://api.daily.co/v1/rooms/${mreq.body.room_id}`, {
      method: "DELETE",
      headers,
    })
      .then(() => console.log(`room ${mreq.body.room_id} has been deleted`))
      .catch((err) => console.error("error:" + err));
  }

  temp = {
    at: mreq.body.attendants,
    ev: mreq.body.evaluations,
  };

  delete mreq.body.attendants;
  delete mreq.body.evaluations;

  Session.findOneAndUpdate(
    { _id: mreq.params.id, "evaluations.student": { $ne: temp.ev?.student } },
    {
      $push: { evaluations: temp.ev },
      $addToSet: { attendants: temp.at },
      ...mreq.body,
    },
    { new: true },
    function (err, result) {
      if (err) return mres.status(500).json({ message: err });
      mres.status(200).json(result);
    }
  );
};

const sessions_delete_id = (mreq, mres) => {
  Session.findByIdAndDelete(mreq.params.id, function (err) {
    if (err) mres.sendStatus(404);
    else mres.sendStatus(200);
  });
};

// --------------------- General

const sessions_post = (mreq, mres) => {
  //Save the data in the database
  const session = new Session(mreq.body);
  console.log('session', mreq.body)

  session
    .save()
    .then((res_cat) => {
      mres.json(res_cat);

      let arr = res_cat.members_with_access ?? [];
      let BASE_URL = process.env.BASE_URL;

      //assign session for every user mentioned
      let assign = (url) =>
        fetch(url, {
          method: "PUT",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessions: [res_cat._id.toString()] }),
        }).catch((err) => console.error("ERROR:" + err));

      //FIRST assign for instructor
      assign(`${BASE_URL}/api/instructors/${res_cat.created_by}`);

      //SECOND assign for students
      arr.forEach((memberID) => {
        if (memberID !== res_cat.created_by)
          assign(`${BASE_URL}/api/students/${memberID}`);
      });
    })
    .catch((err) => {
      mres.status(500).json({ message: err.message });
    });
};

const sessions_get = async (mreq, mres) => {
  const { page = 1, limit = 10 } = mreq.query;

  if (mreq.query.user_id != undefined || mreq.query.userId != undefined) {
    //Query sessions for this specific user
    let que = mreq.query.user_id || mreq.query.userId;
    if (que.length != 12 && que.length != 24) return mres.sendStatus(400);

    var ObjectId = await require("mongoose").Types.ObjectId;

    Session.find({ members_with_access: new ObjectId(que) })
      .sort({ created_at: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .populate("attendants", {
        name: 1,
        email: 1,
        _id: 1,
        mobile: 1,
        privileges: 1,
        is_available: 1,
      })
      .populate("created_by", {
        name: 1,
        email: 1,
        _id: 1,
        mobile: 1,
        privileges: 1,
        is_available: 1,
      })
      .then(async (cats) => {
        const count = await Session.countDocuments({
          members_with_access: new ObjectId(que),
        });
        mres.json({ data: cats, count });
      })
      .catch((err) => mres.status(404).json({ message: err.message }));
  } else {
    // General

    Session.find()
      .sort({ created_at: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .populate("attendants", {
        name: 1,
        email: 1,
        _id: 1,
        mobile: 1,
        privileges: 1,
        is_available: 1,
      })
      .populate("created_by", {
        name: 1,
        email: 1,
        _id: 1,
        mobile: 1,
        privileges: 1,
        is_available: 1,
      })
      .then(async (cats) => {
        const count = await Session.countDocuments({});
        mres.json({ data: cats, count });
      })
      .catch((err) => mres.status(404).json({ message: err.message }));
  }
};

module.exports = {
  sessions_get_id,
  sessions_put_id,
  sessions_delete_id,
  sessions_post,
  sessions_get,
};
