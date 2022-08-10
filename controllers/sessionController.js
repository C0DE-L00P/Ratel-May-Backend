const Session = require("../models/sessionSchema");
const Instructor = require("../models/instructorSchema");
const Student = require("../models/studentSchema");

// -------------------- IDS

const sessions_get_id = (mreq, mres) => {
  Session.findById(mreq.params.id)
    .populate("chat", {
      name: 1,
      email: 1,
      _id: 1,
      has_whatsapp: 1,
      mobile: 1,
      privilages: 1,
      is_available: 1,
    })
    .populate("currently_inside", {
      name: 1,
      email: 1,
      _id: 1,
      has_whatsapp: 1,
      mobile: 1,
      privilages: 1,
      is_available: 1,
    })
    .populate("created_by", {
      name: 1,
      email: 1,
      _id: 1,
      has_whatsapp: 1,
      mobile: 1,
      privilages: 1,
      is_available: 1,
    })
    .populate("evaluations.evaluated_by", { name: 1, _id: 1 })
    .populate("evaluations.student", { name: 1, _id: 1 })
    .then((res) => mres.json(res));
};

const sessions_put_id = (mreq, mres) => {
  Session.findByIdAndUpdate(mreq.params.id, mreq.body, function (err, docs) {
    if (err) return mres.sendStatus(501);

    try {
      let updatedItem = { ...docs._doc, ...mreq.body };
      mres.status(200).json(updatedItem);
    } catch (error) {
      mres.status(400).json({ message: error.message });
    }
  });
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
    })
    .catch((err) => {
      mres.status(501).json({ message: err.message });
    });
};

const sessions_get = (mreq, mres) => {
  if (mreq.query.user_id != undefined || mreq.query.userId != undefined) {
    //Query sessions for this specific user
    let que = mreq.query.user_id || mreq.query.userId;
    var ObjectId = require('mongoose').Types.ObjectId

    Session.find({ members_with_access: [new ObjectId(que)] })
      .populate("currently_inside", {
        name: 1,
        email: 1,
        _id: 1,
        has_whatsapp: 1,
        mobile: 1,
        privilages: 1,
        is_available: 1,
      })
      .populate("created_by", {
        name: 1,
        email: 1,
        _id: 1,
        has_whatsapp: 1,
        mobile: 1,
        privilages: 1,
        is_available: 1,
      }).then((cats) => mres.json(cats));;
  } else {
    // General
    //TODO: must be authorized to access all sessions

    Session.find()
      .populate("currently_inside", {
        name: 1,
        email: 1,
        _id: 1,
        has_whatsapp: 1,
        mobile: 1,
        privilages: 1,
        is_available: 1,
      })
      .populate("created_by", {
        name: 1,
        email: 1,
        _id: 1,
        has_whatsapp: 1,
        mobile: 1,
        privilages: 1,
        is_available: 1,
      })
      .then((cats) => mres.json(cats));
  }
};

module.exports = {
  sessions_get_id,
  sessions_put_id,
  sessions_delete_id,
  sessions_post,
  sessions_get,
};
