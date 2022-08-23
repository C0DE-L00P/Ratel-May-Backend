const fs = require("fs");
const Contact = require("../models/contactSchema");
require("dotenv").config();


// --------------------- General

const contacts_post = (mreq, mres) => {

  Contact
    .save()
    .then((res_cat) => {
      mres.sendStatus(200);
    })
    .catch((err) => {
      mres.status(500).json({ message: err });
    });
};

const contacts_get = (mreq, mres) => {
    Contact.find().then((events) => mres.json(events));
};

module.exports = {
  contacts_get,
  contacts_post
};
