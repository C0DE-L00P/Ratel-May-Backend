const sanitize = require('mongo-sanitize');
const Feedback = require("../models/feedbackSchema");

// -------------------- IDS

const feedbacks_get_id = (mreq, mres) => {
  Feedback.findById(mreq.params.id)
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
    .catch(() => mres.sendStatus(404));
};

// const feedbacks_put_id = (mreq, mres) => {
//   Feedback.findByIdAndUpdate(mreq.params.id, mreq.body,{new: true}, function (err, docs) {
//     if (err) return mres.sendStatus(404);
//     mres.json(docs);
//   });
// };

// const feedbacks_delete_id = (mreq, mres) => {
//   Feedback.findByIdAndDelete(mreq.params.id, function (err) {
//     if (err) return mres.sendStatus(404);
//     mres.sendStatus(200);
//   });
// };

// --------------------- General

const feedbacks_post = (mreq, mres) => {
  //Save the data in the database
  const feedback = new Feedback(sanitize(mreq.body));

  feedback
    .save()
    .then((res_cat) => {
      mres.json(res_cat);
    })
    .catch((err) => {
      mres.status(500).json({ message: err });
    });
};

const feedbacks_get = (mreq, mres) => {
  if (
    mreq.query.Instructor != undefined ||
    mreq.query.instructor != undefined
  ) {
    //String Query Param for Search
    let que = mreq.query.Instructor || mreq.query.instructor;
    Feedback.find({ instructor: que }).sort({date: -1})
      .then((filt_feeds) => {
        mres.json(filt_feeds);
      })
      .catch((err) => mres.status(404).json({ message: err }));
  } else {
    //General
    Feedback.find().then(async (feeds) => {
      mres.json(feeds);
    });
  }
};

module.exports = {
  feedbacks_get_id,
  // feedbacks_put_id,
  // feedbacks_delete_id,
  feedbacks_post,
  feedbacks_get,
};
