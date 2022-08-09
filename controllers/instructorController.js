const Feedback = require("../models/feedbackSchema");
const Instructor = require("../models/instructorSchema");
const Session = require("../models/sessionSchema");
const Student = require("../models/studentSchema");
const bcrypt = require("bcrypt");

// -------------------- IDS

const instructors_get_id = async (mreq, mres) => {
  let res = await Instructor.findById(mreq.params.id)
    .populate("students", {
      name: 1,
      email: 1,
      _id: 1,
      has_whatsapp: 1,
      mobile: 1,
    })
    .populate("sessions", {
      room_id: 1,
      created_at: 1,
      ended_at: 1,
      _id: 1,
      participants: 1,
      is_live: 1,
      previously_reached: 1,
      recently_reached: 1,
    })
    .populate("evaluations", {
      student: 1,
      _id: 1,
      instructor_evaluation: 1,
      problems: 1,
    })
    .select({ password: 0 });
  if (res == undefined || res == null) {
    mres.status(404).json({ message: "No instructor with such id" });
    return;
  }
  //TODO: ربما انتا مش هتحتاج ترجع كل دا قدام
  // await getItemsFromIds(res, (id) => Student.findById(id)).select({password: 0});;
  // await getItemsFromIds(res, (id) => Session.findById(id));
  // await getItemsFromIds(res, (id) => Feedback.findById(id));

  mres.json(res);
};

const instructors_put_id = (mreq, mres) => {
  //TODO: handle password change
  delete mreq.body.password;
  delete mreq.body.email;

  Instructor.findByIdAndUpdate(mreq.params.id, mreq.body, function (err, docs) {
    if (err) {
      mres.sendStatus(501);
      return;
    }

    try {
      let updatedItem = { ...docs._doc, ...mreq.body };
      mres.status(200).json(updatedItem);
    } catch (error) {
      mres.status(400).json({ message: error });
    }
  }).select({ password: 0 });
};

const instructors_put_id_newpass = (mreq, mres) => {
  //TODO: شوف الخطوات دي يسطا بعدين
  //Check if the changed data is the password as it must be hashed first
  // bcrypt.compare(mreq.body.password)
  //كنت هنا باعدل الحاجات ماشي ع الخطوات

  //Check if he forgot the previous password
  //if not then he must send the previous password and the new one
  if (mreq.body)
    //First: hash the password and post it back in the object

    bcrypt.hash(mreq.body.password, 10, function (err, hash) {
      if (err != null) {
        mres.json({ message: err });
        return;
      }
      mreq.body.password = hash;

      //Then: Save the data in the database
      const instructor = new Instructor(mreq.body);
      instructor
        .save()
        .then((res_cat) => {
          mres.json(res_cat);
        })
        .catch((err) => {
          mres.status(400).json({ message: err });
        });
    });
};

const instructors_delete_id = (mreq, mres) => {
  Instructor.findByIdAndDelete(mreq.params.id, function (err) {
    if (err) mres.status(404).json({ message: err });
    else mres.sendStatus(200);
  });
};

// --------------------- General

const instructors_post = (mreq, mres) => {
  //First: hash the password and post it back in the object

  bcrypt.hash(mreq.body.password, 10, function (err, hash) {
    if (err != null) return mres.json({ message: err });
    mreq.body.password = hash;

    //Then: Save the data in the database
    const instructor = new Instructor(mreq.body);
    instructor
      .save()
      .then((res_cat) => {
        delete res_cat.password;
        mres.json(res_cat);
      })
      .catch((err) => {
        mres.status(400).json({ message: err });
      });
  });
};

const instructors_get = (mreq, mres) => {
  if (mreq.query.name != undefined || mreq.query.Name != undefined) {
    //String Query Param for Search
    //TODO: add students count and sessions count
    let que = mreq.query.Name || mreq.query.name;
    Instructor.find({ name: que })
      .populate("students", {
        name: 1,
        email: 1,
        _id: 1,
        has_whatsapp: 1,
        mobile: 1,
      })
      .select({ password: 0 })
      .then((filt_insts) => {
        if (filt_insts.length <= 0)
          return mres
            .status(404)
            .json({ message: "No instructor found with such a name" });

        mres.json(filt_insts[0]);
      })
      .catch((err) => mres.status(404).json({ message: err.message }));
  } else
    Instructor.find()
      .select({ password: 0 })
      .then((cats) => mres.json(cats));
};

//Helper Functions

//TODO: united_right_now so test it out
async function getItemsFromIds(result, whatToPush) {
  let arrPromises = [];
  result.sessions.forEach((id) => {
    arrPromises.push(whatToPush(id));
  });
  result.sessions = await Promise.all(arrPromises);
}

module.exports = {
  instructors_get_id,
  instructors_put_id,
  instructors_delete_id,
  instructors_post,
  instructors_get,
};
