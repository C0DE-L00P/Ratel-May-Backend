const Student = require("../models/studentSchema");
const bcrypt = require("bcrypt");
const fileSys = require("fs");
const Session = require("../models/sessionSchema");

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
  //TODO: maybe the mongo already has this feature, check that
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

    //TODO: still send password when creating for the first time

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
  else
    Student.find()
      .select({ password: 0 })
      .then((cats) => mres.json(cats));
};

// --------------------- Helper Functions

async function handlePasswordChange(mreq, mres, email, pin) {
  //TODO: a lot of redundency I can do better

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

function findAndUpdate(mreq, mres) {
  delete mreq.body.email; //Email can't be changed
  delete mreq.body.old_password;
  delete mreq.body.pin;

  //TODO: maybe there is a way to mix both requests 
  //Add session and notebooks first
  Session.updateOne(
    { _id: mreq.params.id },
    {
      $addToSet: { sessions: mreq.body.sessions },
      $addToSet: { notes_in_book: mreq.body.notes_in_book },
    },
    function (err, result) {
      if (err) console.error(err);

      delete mreq.body.sessions;
      delete mreq.body.notes_in_book;

  //Then update
      
      Student.findByIdAndUpdate(
        mreq.params.id,
        mreq.body,
        function (err, docs) {
          if (err) return mres.sendStatus(500);

          try {
            let updatedItem = { ...docs._doc, ...mreq.body };
            // delete updatedItem.password
            mres.status(200).json(updatedItem);
          } catch (error) {
            mres.status(400).json({ message: error });
          }
        }
      ).select({ password: 0 });
    }
  );
}

module.exports = {
  students_get_id,
  students_put_id,
  students_delete_id,
  students_post,
  students_get,
};
