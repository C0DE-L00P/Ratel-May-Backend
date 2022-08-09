const Event = require("../models/eventSchema");
const fs = require("fs");
require("dotenv").config();

// -------------------- IDS

const events_get_id = (mreq, mres) => {
  Event.findById(mreq.params.id)
    .then((res) => {
      mres.json(res);
    })
    .catch((err) => mres.sendStatus(404));
};

const events_put_id = (mreq, mres) => {
  Event.findByIdAndUpdate(mreq.params.id, mreq.body, function (err, docs) {
    if (err) {
      mres.sendStatus(501);
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
  });
};

const events_delete_id = (mreq, mres) => {
  Event.findByIdAndDelete(mreq.params.id, function (err, docs) {
    try {
      if (err) mres.sendStatus(404);
      else {
        deleteFile(docs._doc.article_img, mres);
        mres.sendStatus(200);
      }
    } catch (error) {
      mres.status(400).json({ message: error });
    }
  });
};

// --------------------- General

const events_post = (mreq, mres) => {
  //Save the data in the database
  //TODO: check how frontend side would work with this img url as it sends public ex: "public/assets/events/1659927351441.webp",
  
  if (mreq.file != undefined)
    mreq.body.article_img = mreq.file.path.replaceAll("\\", "/").replace("public",process.env.BASE_URL);

  const event = new Event(mreq.body);
  event
    .save()
    .then((res_cat) => {
      mres.json(res_cat);
    })
    .catch((err) => {
      mres.status(501).json({ message: err });
    });
};

const events_get = (mreq, mres) => {
  if (mreq.query.limit != undefined || mreq.query.Limit != undefined) {
    //String Query Param for limiting results
    let que = mreq.query.limit || mreq.query.Limit;
    Event.find()
      .limit(que)
      .then((filt_events) => {
        mres.json(filt_events);
      })
      .catch((err) => mres.status(409).json({ message: err }));
  } else {
    //General
    Event.find().then((events) => mres.json(events));
  }
};

//Helper Function

function deleteFile(path, mres) {
  if (path != undefined)
    fs.unlink(path, (err) => {
      if (err) {
        mres
          .status(501)
          .json({ message: "Can't remove the image file please try again" });
        return;
      }
    });
}

module.exports = {
  events_get_id,
  events_put_id,
  events_delete_id,
  events_post,
  events_get,
};
