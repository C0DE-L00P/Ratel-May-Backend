const Student = require("../models/studentSchema");
const bcrypt = require("bcrypt");
const fileSys = require("fs");
const fetch = require("node-fetch");
const Util = require("../models/utilSchema");
const Instructor = require("../models/instructorSchema");
require("dotenv").config();

// -------------------- IDS

const students_get_id = (mreq, mres) => {
  if (mreq.params.id.length != 12 && mreq.params.id.length != 24)
    return mres.sendStatus(400);

  Student.findById(mreq.params.id)
    .populate("instructor", { name: 1, gender: 1, state: 1, _id: 1 })
    .populate("sessions", {
      created_at: 1,
      is_live: 1,
      room_id: 1,
      recently_reached: 1,
      attendants: 1,
      _id: 1,
    })
    .select({ password: 0 })
    .then((res) => (res ? mres.json(res) : mres.sendStatus(404)))
    .catch(() => mres.sendStatus(404));
};

const students_put_id = async (mreq, mres) => {
  if (mreq.params.id.length != 12 && mreq.params.id.length != 24)
    return mres.sendStatus(400);

  let email = mreq.body.email;
  let pin = mreq.body.pin;

  if ("password" in mreq.body) handlePasswordChange(mreq, mres, email, pin);
  else findAndUpdate(mreq, mres);
};

const students_delete_id = (mreq, mres) => {
  if (mreq.params.id.length != 12 && mreq.params.id.length != 24)
    return mres.sendStatus(400);

  Student.findByIdAndDelete(mreq.params.id, function (err) {
    if (err)
      return mres
        .status(404)
        .json({ message: "No student found with such id" });

    //Delete student from the instructor he has
    fetch(`${process.env.BASE_URL}/api/instructors/${mreq.body.instructorID}`, {
      method: 'PUT',
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        is_removing_student: true,
        students: mreq.params.id,
      }),
    })

    mres.sendStatus(200);
  });
};

// --------------------- General

const students_post = async (mreq, mres) => {
  //Check if this email is already registered
  let alreadyRegistered = await Student.exists({ email: mreq.body.email });
  if (alreadyRegistered)
    return mres
      .status(409)
      .json({ message: "This email is already registered" });

  //Save the data in the database

  if (!mreq.body) return mres.sendStatus(400);

  //Hash the password and post it back in the object
  bcrypt.hash(mreq.body.password, 10, function (err, hash) {
    if (err != null) {
      mres.status(500).json({ message: `Error in hashing - ${err}` });
      return;
    }

    mreq.body.password = hash;

    mreq.body.name = capitalizeFirstLetters(mreq.body.name);

    const student = new Student(mreq.body);

    student
      .save()
      .then((res_cat) => {
        delete res_cat.password;
        mres.json(res_cat);
      })
      .catch((err) => {
        mres.status(400).json({ message: err.message });
      });
  });
};

const students_get = (mreq, mres) => {
  if (mreq.query.name || mreq.query.Name) {
    //String Query Param for Search
    let que = mreq.query.Name || mreq.query.name;
    Student.find({ name: { $regex: que, $options: "i" } })
      .sort({ name: 1 })
      .select({ password: 0 })
      .populate("instructor", { name: 1 })
      .populate("sessions", {
        created_at: 1,
        is_live: 1,
        room_id: 1,
        recently_reached: 1,
      })
      .then((filt_insts) => {
        const count = filt_insts?.length;
        mres.json({ data: filt_insts, count });
      })
      .catch((err) => mres.status(404).json({ message: err.message }));
  } else {
    const { page = 1, limit = 10 } = mreq.query;
    Student.find()
      .sort({ name: 1 })
      .select({ password: 0 })
      .limit(limit)
      .skip((page - 1) * limit)
      .then(async (cats) => {
        const count = cats?.length;
        mres.json({ data: cats, count });
      });
  }
};

// --------------------- Helper Functions

function capitalizeFirstLetters(string) {
  let arr = string.split(" ");
  for (let i = 0; i < arr.length; i++) {
    arr[i] = arr[i].charAt(0).toUpperCase() + arr[i].slice(1);
  }
  return arr.join(" ");
}

async function handlePasswordChange(mreq, mres, email, pin) {
  if ("old_password" in mreq.body) {
    //1- if he passes the old password

    let stud = await Student.findOne({ email: email });
    if (!stud) return mres.sendStatus(404);

    await bcrypt.compare(
      mreq.body.old_password,
      stud.password,
      async function (err, result) {
        //Passwords matched
        if (!result)
          return mres
            .status(401)
            .json({ message: "Credentials are incorrect" });
        mreq.body.password = await bcrypt.hash(mreq.body.password, 10);
        findAndUpdate(mreq, mres);
      }
    );
  } else {
    if ("pin" in mreq.body) {
      //2- if he passes a pin code sent for his email

      let pinsList = {};
      try {
        let resu = await Util.findOne().lean();
        pinsList = resu.pinsList;
      } catch (err) {}

      let emailKey = email.replaceAll(".", "#");
      if (!(emailKey in pinsList)) return mres.sendStatus(401);

      if (pinsList[emailKey].pin == pin) {
        //check the pin one more time
        mreq.body.password = await bcrypt.hash(mreq.body.password, 10);
        let resu = await Util.findOne().lean();
        pinsList = resu.pinsList;
        delete pinsList[emailKey];
        Util.updateOne(
          { _id: "632053d485bfa440b6b689db" },
          { $set: { pinsList: pinsList } }
        ).exec();

        findAndUpdate(mreq, mres);
      } else mres.status(409).json({ message: "PIN is incorrect" });
    } else {
      delete mreq.body.password; //3- Passes non of them then not allowed to change pass
      findAndUpdate(mreq, mres);
    }
  }
}

async function findAndUpdate(mreq, mres) {
  let temp = {
    se: mreq.body.sessions,
    nb: mreq.body.notes_in_book,
  };

  //Check if he is changing his instructor
  if ("instructor" in mreq.body) {
    let { instructor } = await Student.findById(mreq.params.id).select({
      instructor: 1,
    });

    let BASE_URL = process.env.BASE_URL;
    let assign = (url, bodyMsg) =>
      fetch(url, {
        method: "PUT",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyMsg),
      }).catch((err) => console.error("ERROR:" + err));

    if (instructor != mreq.body.instructor) {
      //assign session for every user mentioned
      if (instructor)
        assign(`${BASE_URL}/api/instructors/${instructor.toString()}`, {
          is_removing_student: true,
          students: mreq.params.id,
        });

      assign(`${BASE_URL}/api/instructors/${mreq.body.instructor}`, {
        students: [mreq.params.id],
      });
    }
  }

  delete mreq.body.email; //Email can't be changed
  delete mreq.body.old_password;
  delete mreq.body.pin;
  delete mreq.body.sessions;
  delete mreq.body.notes_in_book;

  if ("name" in mreq.body)
    mreq.body.name = capitalizeFirstLetters(mreq.body.name);

  Student.findByIdAndUpdate(
    mreq.params.id,
    {
      $addToSet: { sessions: temp.se },
      $push: { notes_in_book: temp.nb },
      ...mreq.body,
    },
    { new: true },
    function (err, result) {
      if (err) mres.status(500).json({ message: err });
      mres.status(200).json(result);
    }
  ).select({ password: 0 });
}

module.exports = {
  students_get_id,
  students_put_id,
  students_delete_id,
  students_post,
  students_get,
};
