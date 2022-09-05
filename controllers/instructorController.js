const Instructor = require("../models/instructorSchema");
const bcrypt = require("bcrypt");
const fileSys = require("fs");

// -------------------- IDS

const instructors_get_id = async (mreq, mres) => {
  if (mreq.params.id.length != 12 && mreq.params.id.length != 24)
    return mres.sendStatus(400);

  let res = await Instructor.findById(mreq.params.id)
    .populate("students", {
      name: 1,
      email: 1,
      _id: 1,
      //has_whatsapp: 1,
      mobile: 1,
    })
    .populate("sessions", {
      room_id: 1,
      created_at: 1,
      ended_at: 1,
      _id: 1,
      members_with_access: 1,
      members_count: 1,
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

  res ? mres.json(res) : mres.sendStatus(404);
};

const instructors_put_id = (mreq, mres) => {
  if (mreq.params.id.length != 12 && mreq.params.id.length != 24)
    return mres.sendStatus(400);

  let email = mreq.body.email;
  let pin = mreq.body.pin;

  if ("password" in mreq.body) handlePasswordChange(mreq, mres, email, pin);
  else findAndUpdate(mreq, mres);
};

const instructors_delete_id = (mreq, mres) => {
  if (mreq.params.id.length != 12 && mreq.params.id.length != 24)
    return mres.sendStatus(400);

  Instructor.findByIdAndDelete(mreq.params.id, function (err) {
    if (err) mres.status(404).json({ message: err });
    else mres.sendStatus(200);
  });
};

// --------------------- General

const instructors_post = async (mreq, mres) => {
  //Check if this email is already registered
  let alreadyRegistered = await Instructor.exists({ email: mreq.body.email });
  if (alreadyRegistered)
    return mres
      .status(409)
      .json({ message: "This email is already registered" });

  //First: hash the password and post it back in the object

  bcrypt.hash(mreq.body.password, 10, function (err, hash) {
    if (err != null) return mres.status(400).json({ message: err });
    mreq.body.password = hash;
    mreq.body.name = capitalizeFirstLetters(mreq.body.name);

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
  if (mreq.query.name || mreq.query.Name) {
    //String Query Param for Search

    let que = mreq.query.Name || mreq.query.name;
    Instructor.find({ name: { $regex: que, $options: "i" } }).sort({name:1})
      .populate("students", {
        name: 1,
        email: 1,
        _id: 1,
        whatsapp_number: 1,
        mobile: 1,
      })
      .populate("evaluations", {
        instructor_evaluation: 1,
        student: 1,
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
  } else {
    
    const { page = 1, limit = 10 } = mreq.query;

    Instructor.find().sort({name:1})
      .limit(limit)
      .skip((page - 1) * limit)
      .select({ password: 0 })
      .then(async (cats) => {
        const count = await Instructor.countDocuments({});
        mres.json({ data: cats, count });
      });
  }
};

//Helper Functions

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

    let inst = await Instructor.findOne({ email: email });
    if (!inst) return mres.sendStatus(404);

    await bcrypt.compare(
      mreq.body.old_password,
      inst.password,
      async function (err, result) {
        //Passwords matched
        if (!result)
          return mres
            .status(401)
            .json({ message: "Credentials are incorrect" });
        mreq.body.password = await bcrypt.hash(mreq.body.password, 10);
        console.log("1 pass", mreq.body.password);
        findAndUpdate(mreq, mres);
      }
    );
  } else {
    if ("pin" in mreq.body) {
      //2- if he passes a pin code sent for his email
      let pinsList = {};
      try {
        pinsList = JSON.parse(fileSys.readFileSync("utils/pinsList.json"));
      } catch (err) {}

      if (!(email in pinsList)) return mres.sendStatus(401);

      if (pinsList[email].pin == pin) {
        //check the pin one more time
        console.log("pinned 3");
        mreq.body.password = await bcrypt.hash(mreq.body.password, 10);
        console.log("pinned 4");

        //Alright now delete this pin from local
        pinsList = JSON.parse(fileSys.readFileSync("utils/pinsList.json"));
        delete pinsList[email];
        fileSys.writeFileSync("utils/pinsList.json", JSON.stringify(pinsList));

        console.log("pinned 5");
        findAndUpdate(mreq, mres);
      } else mres.status(409).json({ message: "PIN is incorrect" });
    } else {
      delete mreq.body.password; //3- Passes non of them then not allowed to change pass
      findAndUpdate(mreq, mres);
      console.log("pinned 6");
    }
  }
}

async function findAndUpdate(mreq, mres) {
  let temp = {
    st: mreq.body.students,
    se: mreq.body.sessions,
    ev: mreq.body.evaluations,
    nb: mreq.body.notes_in_book,
  };

  //check if he is removing a student
  if (mreq.body.is_removing_student) {
    await Instructor.findByIdAndUpdate(mreq.params.id, {
      $pull: { students: temp.st },
    });
    delete temp.st;
    delete mreq.body.is_removing_student;
  }

  delete mreq.body.email; //Email can't be changed
  delete mreq.body.old_password;
  delete mreq.body.pin;
  delete mreq.body.students;
  delete mreq.body.sessions;
  delete mreq.body.evaluations;
  delete mreq.body.notes_in_book;

  if ("name" in mreq.body)
    mreq.body.name = capitalizeFirstLetters(mreq.body.name);

  Instructor.findByIdAndUpdate(
    mreq.params.id,
    {
      $addToSet: { sessions: temp.se },
      $addToSet: { students: temp.st },
      $push: { evaluations: temp.ev },
      $push: { notes_in_book: temp.nb },
      ...mreq.body,
    },
    { new: true }
  )
    .select({ password: 0 })
    .then((res) => {
      mres.json(res);
    })
    .catch((err) => mres.status(400).json({ message: err }));
}

module.exports = {
  instructors_get_id,
  instructors_put_id,
  instructors_delete_id,
  instructors_post,
  instructors_get,
};
