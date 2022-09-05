const Event = require("../models/eventSchema");
const fileSys = require("fs");
require("dotenv").config();
const nodemailer = require("nodemailer");

// -------------------- IDS

const events_get_id = (mreq, mres) => {
  Event.findById(mreq.params.id)
    .then((res) => (res ? mres.json(res) : mres.sendStatus(404)))
    .catch(() => mres.sendStatus(404));
};

const events_put_id = (mreq, mres) => {
  Event.findByIdAndUpdate(
    mreq.params.id,
    mreq.body,
    { new: true },
    function (err, docs) {
      if (err) {
        mres.sendStatus(500);
        return;
      }

      try {
        let updatedItem = { ...docs._doc, ...mreq.body };

        //Remove old image if the image has been changed
        if (
          docs._doc.article_img != updatedItem.article_img &&
          updatedItem.article_img != undefined
        )
          deleteFile(docs._doc.article_img, mres);

        mres.status(200).json(updatedItem);
      } catch (error) {
        mres.status(400).json({ message: error });
      }
    }
  );
};

const events_delete_id = (mreq, mres) => {
  Event.findByIdAndDelete(mreq.params.id, function (err, docs) {
    try {
      if (err) return mres.sendStatus(404);
      else {
        const success = deleteFile(docs._doc.article_img, mres);
        return success ? mres.sendStatus(200) : mres.sendStatus(500);
      }
    } catch (error) {
      return mres.status(400).json({ message: error });
    }
  });
};

// --------------------- General

const events_post = async (mreq, mres) => {
  //Save the data in the database

  if (mreq.file != undefined)
    mreq.body.article_img = mreq.file.path
      .replaceAll("\\", "/")
      .replace("public", process.env.BASE_URL);

  const event = new Event(mreq.body);

  event
    .save()
    .then((res_cat) => {
      //---------------------------------
      let dateString = res_cat.date.toString();
      let dateEditted = dateString.split("T")[0];

      var transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL,
          pass: process.env.MAIL_APP_PASS,
        },
      });

      //GET THE LIST OF SUBSCRIPERS to send mails to

      let subscripersList = [];
      try {
        subscripersList = JSON.parse(
          fileSys.readFileSync("utils/subscripersList.json")
        );
      } catch (erro) {
        console.log(erro, "subs", subscripersList);
      }

      console.log(
        "our fans",
        subscripersList,
        "our post",
        res_cat,
        "our date",
        dateEditted
      );

      subscripersList.forEach((sub) => {
        //Mail Format

        var mailOptions = {
          from: process.env.EMAIL,
          to: sub,
          subject: `${res_cat.title}`,
          html: `
    <img src="http://localhost:5000/uploads/1662208739097.webp" alt="Post Image" style="maxHieght: 160px">
    <br>
    ${res_cat.article_img}
          <h1>${res_cat.title}</h1>
          <p style="font-size:12px; color: grey;">${dateEditted}</p>
    <br>
    <p">
    ${res_cat.content}</p>
    <br>
    <br>
    ${process.env.FRONT_BASE_URL + "/events"}
    <br>
    `,
        };

        //Send Mail
        transporter.sendMail(mailOptions, function (error, info) {
          if (error) return console.log("error when sent emails", error);
          console.log("emails sent");
        });
      });

      //-----------------------------------

      mres.json(res_cat);
    })
    .catch((err) => {
      console.error("errorororor", err);
      mres.status(500).json({ message: err });
    });
};

const events_get = (mreq, mres) => {
  //General
  const { page = 1, limit = 10 } = mreq.query;

  Event.find().sort({date: -1})
    .limit(limit)
    .skip((page - 1) * limit)
    .then(async (events) => {
      const count = await Event.countDocuments({});
      mres.json({ data: events, count });
    });
};

//Helper Function

function deleteFile(path, mres) {
  if (path != undefined)
    fileSys.unlink(path, (err) => {
      if (err) {
        return false;
      }
    });
}

const events_post_subscripe = (mreq, mres) => {
  let email = mreq.body.email;
  let subscripersList = new Set([]);
  try {
    subscripersList = new Set(
      JSON.parse(fileSys.readFileSync("utils/subscripersList.json"))
    );
  } catch (erro) {
    console.log(erro, "subs", subscripersList);
  }

  subscripersList.add(email);

  fileSys.writeFileSync(
    "utils/subscripersList.json",
    JSON.stringify(Array.from(subscripersList))
  );

  mres.sendStatus(200);
};

module.exports = {
  events_get_id,
  events_put_id,
  events_delete_id,
  events_post,
  events_get,
  events_post_subscripe,
};
