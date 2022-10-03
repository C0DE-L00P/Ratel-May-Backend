require("dotenv").config();
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");

//Controllers

const Instructor = require("../models/instructorSchema.js");
const Student = require("../models/studentSchema.js");
const Util = require("../models/utilSchema.js");

const user_post_login = async (mreq, mres) => {
  // check If Email is valid
  let role = "instructor";

  let res_user = await Instructor.findOne({ email: mreq.body.email }).populate(
    "students",
    {
      name: 1,
      email: 1,
      _id: 1,
      mobile: 1,
      populate: { path: "sessions", limit: 1, sort: { created: -1 } },
    }
  );

  if (!res_user) {
    role = "student";
    res_user = await Student.findOne({ email: mreq.body.email });
  }

  if (!res_user)
    return mres.status(404).json({
      message: "Auth Problem: No instructor nor student with such credentials",
    });

  // Now hash the password sent and compare with stored one

  bcrypt.compare(mreq.body.password, res_user.password, function (err, result) {
    if (result) {
      //Verified

      //JWT Creation
      const em = {
        _id: res_user._id,
        email: res_user.email,
        role: role,
        privileges: res_user.privileges,
        name: res_user.name,
        isAvailable: res_user.isAvailable,
        subscription_state: res_user.subscription_state,
      };
      const accessToken = jwt.sign(em, process.env.ACCESS_TOKEN_SECRET);

      const user = res_user.toObject(); //IMPORTANT
      user.accessToken = accessToken;

      //TODO: implement refresh token as well
      // , {expiresIn: '30s'}
      // const refreshToken = jwt.sign({_id: res_user._id,email: res_user.email}, process.env.REFRESH_TOKEN_SECRET, {expiresIn: '1y'});
      // user.refreshToken = refreshToken

      delete user.password;

      mres.json(user);
    } else {
      //Password is not correct
      mres.status(404).json({
        message: `Auth Problem: No instructor nor student with such credentials`,
      });
    }
  });
};

const user_post_request_pin = async (mreq, mres) => {
  // check If Email is valid

  let field = "instructors";

  if (!("rpin" in mreq.body && mreq.body.rpin)) {
    //MEANS PIN would be used to recover password

    let res_user = await Instructor.findOne({ email: mreq.body.email });

    if (!res_user) {
      res_user = await Student.findOne({ email: mreq.body.email });
      field = "students";
    }

    if (!res_user)
      return mres.status(404).json({
        message:
          "Auth Problem: No instructor nor student with such credentials",
      });
  }

  MailingPIN(mreq, mres, field);
};

const user_post_confirm_pin = async (mreq, mres) => {
  let email = mreq.body.email;
  let pin = mreq.body.pin;

  let pinsList = {};

  Util.findOne()
    .lean()
    .exec(async function (err, doc) {
      pinsList = doc.pinsList;

      let emailKey = mreq.body.email.replaceAll(".", "#");

      if (!(emailKey in pinsList)) return mres.sendStatus(401);

      pinsList[emailKey].trials == 5
        ? delete pinsList[emailKey]
        : (pinsList[emailKey].trials = pinsList[emailKey].trials + 1);

      Util.updateOne({ _id: utilsID }, { $set: { pinsList: pinsList } }).exec();

      if (pinsList[emailKey].pin != pin && pinsList[emailKey].pin)
        return mres.status(403).json({ message: "PIN is incorrect" });

      //When pin is identical to the one sent
      //Check for the user data in the database to give him the id

      if (!("rpin" in mreq.body)) {
        //means that he is not registering for the first time
        let user = await Instructor.findOne({ email: email }).select({
          _id: 1,
        });

        if (!user)
          user = await Student.findOne({ email: email }).select({ _id: 1 });

        if (!user)
          return mres.status(404).json({
            message:
              "Auth Problem: No instructor nor student with such credentials",
          });

        //OK now send his id back to him to put the newPass later on
        mres
          .status(200)
          .json({ _id: user._id, field: pinsList[emailKey].searchField });
      } else mres.sendStatus(200);
    });
};

//Helper Function

function MailingPIN(mreq, mres, field) {
  //Sending an email with verification code

  var transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.MAIL_APP_PASS,
    },
  });

  let PIN = Math.round(Math.random() * 1000000);

  //Mail Format

  let isRegistrationPIN = "rpin" in mreq.body;

  var mailOptions = {
    from: process.env.EMAIL,
    to: mreq.body.email,
    subject: `${
      isRegistrationPIN ? "Verify your email in Ratel May" : "Here's your PIN"
    }`,
    html: `<div style="font-size:16px;line-height: 1.25rem"> ${
      isRegistrationPIN
        ? "You need to verify that this email belongs to you to complete registration"
        : "We received a request to reset password in your Ratel May Account"
    }.
    <br>
    <br>
    <span style="font-weight:700; font-size:40px;">
    ${PIN}</span>
    <br>
    Enter this code to complete the ${
      isRegistrationPIN ? "verification" : "reset"
    }.
    <br>
    <br>
    Thanks for helping us ${
      isRegistrationPIN ? "" : "keep your account secure"
    }.
    <br>
    The Ratel May Team</div>`,
  };

  //Send Mail

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) return mres.status(500).json({ message: error });

    SavePINinStorage(mreq, PIN, field);
    mres.sendStatus(200);
  });
}

const utilsID = "632053d485bfa440b6b689db"; //this is the only ID that utils would be stored in

function SavePINinStorage(mreq, PIN, field) {
  Util.findOne()
    .lean()
    .exec(function (err, doc) {
      let emailKey = mreq.body.email.replaceAll(".", "#");

      let obj = doc.pinsList ?? {};
      obj[emailKey] = {
        pin: PIN,
        searchField: field,
        trials: 0,
      };

      doc["pinsList"] = obj;

      Util.updateOne({ _id: utilsID }, { $set: { pinsList: obj } }).exec();

      // Remove PIN from pinsList after 10 minutes

      setTimeout(() => {
        Util.findOne()
          .lean()
          .exec(function (err, doc) {
            delete doc.pinsList[emailKey];
            Util.updateOne(
              { _id: utilsID },
              { $set: { pinsList: doc.pinsList } }
            ).exec();
          });
      }, 10 * 60 * 1000);
    });
}

//Routes

router.route("/login").post(user_post_login);
router.route("/request_pin").post(user_post_request_pin);
router.route("/confirm_pin").post(user_post_confirm_pin);

module.exports = router;
