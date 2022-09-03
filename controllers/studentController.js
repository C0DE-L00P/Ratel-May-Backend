const Student = require("../models/studentSchema");
const bcrypt = require("bcrypt");
const fileSys = require("fs");
const Session = require("../models/sessionSchema");
const fetch = require("node-fetch");
require('dotenv').config()

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
      mres.status(404).json({ message: "No student found with such id" });
    else mres.sendStatus(200);
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
    const student = new Student(mreq.body);

    student
      .save()
      .then((res_cat) => {
        delete res_cat.password;
        console.log("posted student", res_cat);
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
      .select({ password: 0 })
      .populate("instructor", { name: 1 })
      .populate("sessions", {
        created_at: 1,
        is_live: 1,
        room_id: 1,
        recently_reached: 1,
      })
      .then((filt_insts) => {
        mres.json(filt_insts);
      })
      .catch((err) => mres.status(404).json({ message: err.message }));
  }
  //TO GET LiST of STUDENTS DATA
  // else if(mreq.query.list || mreq.query.List){
  //   Student.find({
  //     '_id': { $in: [
  //         mongoose.Types.ObjectId('4ed3ede8844f0f351100000c'),
  //         mongoose.Types.ObjectId('4ed3f117a844e0471100000d'),
  //         mongoose.Types.ObjectId('4ed3f18132f50c491100000e')
  //     ]}
  // }, function(err, docs){
  //      console.log(docs);
  // });
  // }
  else {
    const { page = 1, limit = 10 } = mreq.query;
    Student.find()
      .select({ password: 0 })
      .limit(limit)
      .skip((page - 1) * limit)
      .then(async (cats) => {
        const count = await Student.countDocuments({});
        mres.json({ data: cats, count });
      });
  }
};

// --------------------- Helper Functions

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
        console.log("1 pass", mreq.body.password);
        findAndUpdate(mreq, mres);
      }
    );
  } else {
    if ("pin" in mreq.body) {
      //2- if he passes a pin code sent for his email

      console.log("pinned 1");
      let pinsList = {};
      try {
        pinsList = JSON.parse(fileSys.readFileSync("utils/pinsList.json"));
      } catch (err) {}

      if (!(email in pinsList)) return mres.sendStatus(401);

      console.log("pinned 2");

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
    se: mreq.body.sessions,
    nb: mreq.body.notes_in_book,
  };

  //Check if he is changing his instructor
  if("instructor" in mreq.body){
    console.log('------------------')

    let {instructor} = await Student.findById(mreq.params.id).select({instructor: 1})
    
    let BASE_URL = process.env.BASE_URL;
    let assign = (url,bodyMsg) =>
    fetch(url, {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyMsg),
    }).catch((err) => console.error("ERROR:" + err));


    if(instructor.toString() != mreq.body.instructor){
      console.log('i',instructor.toString(),'s',mreq.params.id)

      //assign session for every user mentioned
      if(instructor) assign(`${BASE_URL}/api/instructors/${instructor.toString()}`,{ is_removing_student: true, students: [mreq.params.id] });  

      assign(`${BASE_URL}/api/instructors/${mreq.body.instructor}`,{ students: [mreq.params.id] });  
    }

  }

  delete mreq.body.email; //Email can't be changed
  delete mreq.body.old_password;
  delete mreq.body.pin;
  delete mreq.body.sessions;
  delete mreq.body.notes_in_book;

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

      // if(instructor && result.instructor !== instructor){
      //   //Remove the student from the old instructor
      //   //assign him to the new one
      // }else{

        mres.status(200).json(result);
      // }
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
