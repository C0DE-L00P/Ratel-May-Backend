const Session = require("../models/sessionSchema");
const fetch = require("node-fetch");
const Instructor = require("../models/instructorSchema");

// -------------------- IDS

const sessions_get_id = (mreq, mres) => {
  Session.findById(mreq.params.id)
    // .populate("chat", {
    //   name: 1,
    //   email: 1,
    //   _id: 1,
    //   //has_whatsapp: 1,
    //   mobile: 1,
    //   privileges: 1,
    //   is_available: 1,
    // })
    .populate("attendants", {
      name: 1,
      email: 1,
      _id: 1,
      //has_whatsapp: 1,
      mobile: 1,
      privileges: 1,
      is_available: 1,
    })
    .populate("created_by", {
      name: 1,
      email: 1,
      _id: 1,
      //has_whatsapp: 1,
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
  if ('is_live' in mreq.body && !mreq.body.is_live) delete mreq.body.attendants;

  //To mark as attended
  Session.findByIdAndUpdate(
    { _id: mreq.params.id },
    {
      $addToSet: { attendants: mreq.body.attendants },
      $push: { evaluations: mreq.body.evaluations },
    },
    function (err, result) {
      if (err) console.error(err);
      console.log(result)
      console.log(mreq.body.attendants, mreq.body.evaluations)

      delete mreq.body.attendants;
      delete mreq.body.evaluations;

      Session.findByIdAndUpdate(
        mreq.params.id,
        mreq.body,
        function (err, docs) {
          if (err) return mres.sendStatus(501);

          try {
            let updatedItem = { ...docs._doc, ...mreq.body };
            mres.status(200).json(updatedItem);
          } catch (error) {
            mres.status(400).json({ message: error.message });
          }
        }
      );
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

  session
    .save()
    .then((res_cat) => {
      mres.json(res_cat);
      //assign session for every user mentioned
      //TODO: best practice is to handle members_with_access here to assign session's ID to the users
    })
    .catch((err) => {
      mres.status(500).json({ message: err.message });
    });
};

const sessions_get = async (mreq, mres) => {
  if (mreq.query.user_id != undefined || mreq.query.userId != undefined) {
    //Query sessions for this specific user
    let que = mreq.query.user_id || mreq.query.userId;
    var ObjectId = await require("mongoose").Types.ObjectId;
    console.log("thihs", que);

    Session.find({ members_with_access: new ObjectId(que) })
      .populate("attendants", {
        name: 1,
        email: 1,
        _id: 1,
        //has_whatsapp: 1,
        mobile: 1,
        privileges: 1,
        is_available: 1,
      })
      .populate("created_by", {
        name: 1,
        email: 1,
        _id: 1,
        //has_whatsapp: 1,
        mobile: 1,
        privileges: 1,
        is_available: 1,
      })
      .then((cats) => mres.json(cats))
      .catch((err) => mres.status(400).json({ message: err.message }));
  } else {
    // General
    //TODO: must be authorized to access all sessions

    Session.find()
      .populate("attendants", {
        name: 1,
        email: 1,
        _id: 1,
        //has_whatsapp: 1,
        mobile: 1,
        privileges: 1,
        is_available: 1,
      })
      .populate("created_by", {
        name: 1,
        email: 1,
        _id: 1,
        //has_whatsapp: 1,
        mobile: 1,
        privileges: 1,
        is_available: 1,
      })
      .then((cats) => mres.json(cats))
      .catch((err) => mres.status(400).json({ message: err.message }));
  }
};

function sessions_post_last(mreq, mres) {
  let listOfUsers = mreq.body.members;
  Session.find(
    {
      members_with_access: { $all: [listOfUsers] },
    },
    function (err, docs) {
      if (err) return mres.sendStatus(404);
      mres.status(200).json(docs);
      console.log("reached");
    }
  );
}

module.exports = {
  sessions_get_id,
  sessions_put_id,
  sessions_delete_id,
  sessions_post,
  sessions_get,
  sessions_post_last,
};
