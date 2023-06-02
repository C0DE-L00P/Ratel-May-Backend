require("dotenv").config();
const sanitize = require('mongo-sanitize');
const Sib = require('sib-api-v3-sdk');

// SendInBlue configurations
const client = Sib.ApiClient.instance
let apiKey = client.authentications['api-key']
apiKey.apiKey = process.env.SEND_IN_BLUE_API;

const tranEmailApi = new Sib.TransactionalEmailsApi()
const sender = {
  email: process.env.EMAIL,
  name: 'رتل معي'
}

// const fileSys = require("fs");
const Event = require("../models/eventSchema");
const Util = require("../models/utilSchema");
const { cloudinary } = require("../utils/cloudinary");



// -------------------- IDS

const events_get_slug = (mreq, mres) => {
  Event.findOne({ slug: mreq.params.slug })
    .then((res) => (res ? mres.json(res) : mres.sendStatus(404)))
    .catch(() => mres.sendStatus(404));
};

const events_put_id = async (mreq, mres) => {

  try {
    const fileStr = mreq.body.image;
    const uploadedResponse = await cloudinary.uploader.upload(fileStr, {
      upload_preset: "ratel_events",
    });
    mreq.body.image = uploadedResponse.url
  } catch (error) { console.error(error) }

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
  Event.findByIdAndDelete(mreq.params.id, async function (err, docs) {
    try {
      if (err) return mres.sendStatus(404);
      // const success = await deleteFile(docs._doc.article_img, mres);
      mres.sendStatus(200);

    } catch (error) {
      return mres.status(400).json({ message: error });
    }
  });
};

// --------------------- General

const events_post = async (mreq, mres) => {
  // return mres.sendStatus(200)
  try {
    const fileStr = mreq.body.image;
    const uploadedResponse = await cloudinary.uploader.upload(fileStr, {
      upload_preset: "ratel_events",
    });
    mreq.body.image = uploadedResponse.url

    //Save the data in the database
    const event = new Event(sanitize(mreq.body));
    let res_cat = await event.save()
    mres.sendStatus(200)

    if (process.env.NODE_ENV == 'development') return

    //---------------------------------
    let dateString = res_cat.date.toString();
    let dateEditted = dateString.split("T")[0];

    //GET THE LIST OF SUBSCRIPERS to send mails to
    let {subscripersList} = await Util.findOne().lean()
    subscripersList = subscripersList ?? []

    if (subscripersList.length == 0) return

    //Mail Format
    subscripersList = subscripersList.map(li => ({ email: li }))

    let sibStatus = await tranEmailApi.sendTransacEmail({
      sender,
      to: subscripersList,
      subject: `${res_cat.title}`,
      htmlContent: `<div alt="Post Image" style="height: 240px;width: 100%;background-image: url('${res_cat.image}'); background-size: cover;"></div>
          <br>
                <h1>${res_cat.title}</h1>
                <p style="font-size:12px; color: grey;">${dateEditted}</p>
          <br>
          <p style="white-space: pre-line;font-size:18px; ">
          ${res_cat.summary}</p>
          <br>
          <br>    
          <a href="${process.env.FRONT_BASE_URL + "/blog/" + res_cat.slug}">اعرف أكثر</a>
          <br>
          `,
    });

  } catch (error) {
    console.log(error);
    mres.status(500).json({ message: error })
  }
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

// function deleteFile(path, mres) {
//   if (path != undefined)
//     fileSys.unlink(path, (err) => {
//       if (err) {
//         return false;
//       }
//     });
// }

const events_get_subscripe = async (mreq, mres) => {
  let email = mreq.params.email
  Util.updateOne({}, { $addToSet: { subscripersList: email } }).exec();


  try {

    //Mail Format

    let sibStatus = await tranEmailApi.sendTransacEmail({
      sender: sender,
      to: [{ email }],
      subject: `Subscriped Successfully`,
      htmlContent: `<div style="font-size:16px;line-height: 1.25rem; direction: ltr;"> 
        you are now subscriped to Ratel May Newsletter. Don't worry we won't spam your email. We would keep you in touch to know our latest posts that we hope to benefit you in the topics you wish.
        <br/>
        If you wish to unsubscripe, you can contact us anytime on <a href="${process.env.FRONT_BASE_URL}/contact">our site</a>.
        <br/>
        <br/>
        Thank you for trusting in us.<br/>
        RatelMay Team
    </div>`,
    });

    //TODO if you add a confirm page to frontend add it here
    mres.sendStatus(200).redirect(`${process.env.FRONT_BASE_URL}`);
  } catch (error) {
    console.error(error)
    mres.status(400).json({ message: error, success: false })
  }
}

const events_post_subscripe_request = async (mreq, mres) => {

  try {

    //Mail Format

    let sibStatus = await tranEmailApi.sendTransacEmail({
      sender: sender,
      to: [{ email: mreq.body.email }],
      subject: `Subscripe to ratel newsletter`,
      htmlContent: `<div style="font-size:16px;line-height: 1.25rem; direction: ltr;"> 
    We received a request to make your email in touch with our latest events and posts.
  <br>
    To prevent any spams, we want to make sure that was you. Please, click the button below to confirm.
  <br>
  <a href="${process.env.SUB_BASE_URL ?? process.env.BASE_URL}/api/events/subscripe/${mreq.body.email}">
  <button style="font-weight:500; font-size:20px; padding: 12px;margin: 16px; border-radius: 8px; background-color: #157347; color: white"; outline: none;>
  Confirm </button>
  </a>
  <br>
  <br>
  Thanks for helping us.
  <br>
  The Ratel May Team</div>`,
    });

    mres.sendStatus(200);
  } catch (error) {
    console.error(error)
    mres.sendStatus(504)
  }
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
