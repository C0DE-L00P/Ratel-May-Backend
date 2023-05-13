require("dotenv").config();
const nodemailer = require("nodemailer");
const sanitize = require('mongo-sanitize');

const fileSys = require("fs");
const Event = require("../models/eventSchema");
const Util = require("../models/utilSchema");
const { cloudinary } = require("../utils/cloudinary");

// -------------------- IDS

const events_get_slug = (mreq, mres) => {
  Event.findOne({ slug: mreq.params.slug })
    .then((res) => (res ? mres.json(res) : mres.sendStatus(404)))
    .catch(() => mres.sendStatus(404));
};

const events_put_id = (mreq, mres) => {
  Event.findByIdAndUpdate(
    mreq.params.id,
    sanitize(mreq.body),
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
  console.log('event',mreq.body)

  try {
    const fileStr = mreq.body.article_img;
    const uploadedResponse = await cloudinary.uploader.upload(fileStr, {
      upload_preset: "ratel_events",
    });
    mreq.body.article_img = uploadedResponse.url
    
    const event = new Event(sanitize(mreq.body));

    event
      .save()
      .then(async (res_cat) => {
        
        if(process.env.NODE_ENV == 'development') return

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
        Util.findOne()
          .lean()
          .then(({ subscripersList }) => {
            subscripersList = subscripersList?? []
            mres.sendStatus(200)

            subscripersList.forEach((sub) => {
              console.log("our fans", subscripersList);

              //Mail Format

              var mailOptions = {
                from: process.env.EMAIL,
                to: sub,
                subject: `${res_cat.title}`,
                html: `
    <div alt="Post Image" style="height: 240px;width: 100%;background-image: url('${res_cat.article_img}'); background-size: cover;"></div>
                <br>
                      <h1>${res_cat.title}</h1>
                      <p style="font-size:12px; color: grey;">${dateEditted}</p>
                <br>
                <p style="white-space: pre-line;font-size:18px; ">
                ${res_cat.summary}</p>
                <br>
                <br>
                اعرف اكثر
                ${process.env.FRONT_BASE_URL + "/events/"+ res_cat.slug}
                <br>
                `,
              };

              //Send Mail
              transporter.sendMail(mailOptions, function (error, info) {
                if (error) return console.log("error when sent emails", error);

                console.log("emails sent");
              });
            });
          });
      })
      .catch((err) => {
        mres.status(500).json({ message: err });
      });

  } catch (error) {
    console.log(error);
    mres.sendStatus(500)
  }

  // if (mreq.file != undefined)
  //   mreq.body.article_img = mreq.file.path
  //     .replaceAll("\\", "/")
  //     .replace("public", process.env.BASE_URL);
};

const events_get = (mreq, mres) => {
  //General
  const { page = 1, limit = 10 } = mreq.query;

  Event.find()
    .sort({ date: -1 })
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

const events_get_subscripe = async (mreq, mres) => {
  let email = mreq.params.email
  Util.updateOne({}, { $addToSet: { subscripersList: email } }).exec();
  mres.status(200).redirect(`${process.env.FRONT_BASE_URL}/home`);
}

const events_post_subscripe_request = async (mreq, mres) => {
  // send Mail for him to confirm
  MailingConfirmationMessage(mreq,mres)
}

function MailingConfirmationMessage(mreq, mres) {
  //Sending an email with verification code

  var transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.MAIL_APP_PASS,
    },
  });


  //Mail Format

  var mailOptions = {
    from: process.env.EMAIL,
    to: mreq.body.email,
    subject: `Keep in touch`,
    html: `<div style="font-size:16px;line-height: 1.25rem; direction: ltr;"> 
      We received a request to make your email in touch with our latest events and posts.
    <br>
      To prevent any spams, we want to make sure that was you. Please, click the button below to confirm.
    <br>
    <a href="${process.env.SUB_BASE_URL??process.env.BASE_URL}/api/events/subscripe/${mreq.body.email}">
    <button style="font-weight:500; font-size:24px; padding: 12px;margin: 16px; border-radius: 8px; background-color: #157347; color: white"; outline: none;>
    Confirm </button>
    </a>
    <br>
    <br>
    Thanks for helping us.
    <br>
    The Ratel May Team</div>`,
  };

  //Send Mail

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) return mres.status(500).json({ message: error });
    mres.sendStatus(200);
  });
}


module.exports = {
  events_get_slug,
  events_put_id,
  events_delete_id,
  events_post,
  events_get,
  events_get_subscripe,
  events_post_subscripe_request
};
