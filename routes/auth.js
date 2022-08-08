require("dotenv").config();
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const pinsList = require('../utils/pinList')

//Controllers

const Instructor = require("../models/instructorSchema.js");
const Student = require("../models/studentSchema.js");

const user_post_login = async (mreq, mres) => {
  // check If Email Valid

  let res_user = await Instructor.findOne({ email: mreq.body.email });

  if (res_user == undefined)
    res_user = await Student.findOne({ email: mreq.body.email });

  if (res_user == undefined) {
    mres.status(404).json({
      message: "Auth Problem: No instructor nor student with such credentials",
    });
    return;
  }

  // Now hash the password sent and compare with stored one

  bcrypt.compare(mreq.body.password, res_user.password, function (err, result) {
    if (result) {
      //Verified
      //TODO: here we should start using JWT
      //TODO: should be tested if this remove THE KEY

      delete res_user.password;
      mres.json(res_user);
    } else {
      //Password is not correct
      console.log('err',err)
      mres.status(404).json({ message: `Auth Problem: No instructor nor student with such credentials`});
    }
  });
};

const user_post_forgotten = async (mreq, mres) => {
  //TODO for password verification
  //Send Email for his gmail with random verification code
  //compare the code he wrote with the code you send
  //is they are the same voala open the password

  //TODO: use nodemailer

  // check If Email Valid

  let res_user = await Instructor.findOne({ email: mreq.body.email });

  if (res_user == undefined)
    res_user = await Student.findOne({ email: mreq.body.email });

  if (res_user == undefined) {
    mres.status(404).json({
      message: "Auth Problem: No instructor nor student with such credentials",
    });
    return;
  }

  //Sending an email with verification code

  //TODO: use Ratel May gmail account and HE MUST VERIFY 2 WAY AUTH then create an app password to use it here
  var transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.MAIL_APP_PASS,
    },
  });

  let PIN = Math.round(Math.random() * 1000000);

  //Mail Format

  var mailOptions = {
    from: process.env.EMAIL,
    to: mreq.body.email,
    subject: "Here's your PIN",
    html: `<div style="font-size:16px;line-height: 1.25rem">We received a request to reset the password on your Ratel May Account.
    <br>
    <br>
    <span style="font-weight:700; font-size:40px;">
    ${PIN}</span>
    <br>
Enter this code to complete the reset.
<br>
<br>
Thanks for helping us keep your account secure.
<br>
The Ratel May Team</div>`,
  };

  //Send Mail

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      mres.status(500).json({ message: error });
      return;
    }

    pinsList[mreq.body.email] = PIN;

    //Remove PIN from pinsList after 10 minutes
    setTimeout(() => {
      delete pinsList[mreq.body.email];
    }, 10 * 60 * 1000);

    mres.sendStatus(200);
  });
};

//TODO: password reset post request

//Helper Function

router.route("/login").post(user_post_login);

router.route("/forgotten").post(user_post_forgotten);

module.exports = router;
