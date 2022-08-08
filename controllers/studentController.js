const Student = require("../models/studentSchema");
const bcrypt = require("bcrypt");

// -------------------- IDS

const students_get_id = (mreq, mres) => {
  Student.findById(mreq.params.id)
    .select({ password: 0 })
    .then((res) => {
      instructorFromIds(res, mres);
      studentFromIds(res, mres);
    });
};

const students_put_id = (mreq, mres) => {
  
  //TODO: handle password change

  delete mreq.body.password
  delete mreq.body.email

  Student.findByIdAndUpdate(mreq.params.id, mreq.body, function (err, docs) {
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

const students_delete_id = (mreq, mres) => {
  Student.findByIdAndDelete(mreq.params.id, function (err) {
    if (err)
      mres.status(404).json({ message: "No student found with such id" });
    else mres.sendStatus(200);
  });
};

// --------------------- General

const students_post = (mreq, mres) => {
  //Save the data in the database

  if (mreq.body == null) {
    mres.status(400).json({ message: "Post body can't be empty" });
    return;
  }

  //Hash the password and post it back in the object
  bcrypt.hash(mreq.body.password, 10, function (err, hash) {
    if (err != null) {
      mres.status(501).json({ message: `Error in hashing process - ${err}` });
      return;
    }

    mreq.body.password = hash;
    const student = new Student(mreq.body);

    student
      .save()
      .then((res_cat) => {
        delete res_cat.password
        mres.json(res_cat);
      })
      .catch((err) => {
        mres.status(400).json({ message: err.message });
      });
  });
};

const students_get = (mreq, mres) => {
  if (mreq.query.name != undefined || mreq.query.Name != undefined) {
    //String Query Param for Search
    let que = mreq.query.Name || mreq.query.name;
    Student.find({ name: que })
      .select({ password: 0 })
      .populate("instructor",{ name: 1 })
      .populate("sessions", {created_at: 1,is_live: 1,room_id: 1,recently_reached: 1})
      .then((filt_insts) => {
        mres.json(filt_insts);
      })
      .catch((err) => mres.status(404).json({ message: err.message }));
  } else
    Student.find()
      .select({ password: 0 })
      .then((cats) => mres.json(cats));
};

module.exports = {
  students_get_id,
  students_put_id,
  students_delete_id,
  students_post,
  students_get,
};
