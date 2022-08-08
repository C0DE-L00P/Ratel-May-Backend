const Feedback = require("../models/feedbackSchema");
const Instructor = require("../models/instructorSchema");
const Student = require("../models/studentSchema");

// -------------------- IDS

const feedbacks_get_id = (mreq, mres) => {
  Feedback.findById(mreq.params.id)
  .populate('chat', { name: 1, email: 1,_id: 1,has_whatsapp: 1, mobile: 1,privilages:1, is_available: 1})
  .populate("participants",{ name: 1, email: 1,_id: 1,has_whatsapp: 1, mobile: 1,privilages:1, is_available: 1})
  .populate("created_by",{ name: 1, email: 1,_id: 1,has_whatsapp: 1, mobile: 1,privilages:1, is_available: 1})
  .populate("evaluations.evaluated_by",{ name: 1, _id: 1})
  .populate("evaluations.student",{ name: 1, _id: 1})
  .then((res) => {
    // instructorAndStudentDataFromIds(res, mres);
    mres.json(res)
  });
};

// const feedbacks_put_id = (mreq, mres) => {
//   Feedback.findByIdAndUpdate(mreq.params.id, mreq.body, function (err, docs) {
//     // productsFromIDs(docs, mres);
//   });
// };

// const feedbacks_delete_id = (mreq, mres) => {
//   Feedback.findByIdAndDelete(mreq.params.id, function (err) {
//     if (err) mres.sendStatus(404);
//     else mres.sendStatus(200);
//   });
// };

// --------------------- General

const feedbacks_post = (mreq, mres) => {
  //Save the data in the database
  const feedback = new Feedback(mreq.body);

  feedback
    .save()
    .then((res_cat) => {
      mres.json(res_cat);
    })
    .catch((err) => {
      mres.status(500).json({message: err})
    });
};

const feedbacks_get = (mreq, mres) => {
  if (mreq.query.Instructor != undefined || mreq.query.instructor != undefined) {
    //String Query Param for Search
    let que = mreq.query.Instructor || mreq.query.instructor;
    Feedback.find({ instructor: que })
      .then((filt_feeds) => {
        mres.json(filt_feeds);
      })
      .catch((err) => mres.status(404).json({message: err}));
  } else {
    //General
    Feedback.find()
    .then(async (feeds) => {
      // let feedsPromises = [];

      // feeds.forEach((feed) => {
      //   feedsPromises.push(instructorAndStudentDataFromIds(feed, mres));
      // });

      // feeds = await Promise.all(feedsPromises);

      mres.json(feeds);
    });
  }
};

function instructorAndStudentDataFromIds(result, res) {
  Instructor.findById(result.instructor).select({password: 0})
    .then((inst_info) => {
      result = { ...result, instructor: inst_info };
    })
    .then((result) =>
      Student.findById(result.student).select({password: 0}).then((stud_info) => {
        result = { ...result, student: stud_info };
        res.json(result);
      })
    )
    .catch((err) =>
      res.status(404).json({message: "Can't find info about students nor instructors with such ids"})
    );
}

module.exports = {
  feedbacks_get_id,
  // feedbacks_put_id,
  // feedbacks_delete_id,
  feedbacks_post,
  feedbacks_get,
};
