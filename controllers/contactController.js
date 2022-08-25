const fs = require("fs");
const Contact = require("../models/contactSchema");
require("dotenv").config();

// --------------------- General

const contacts_post = (mreq, mres) => {
  Contact.save()
    .then((res_cat) => {
      mres.sendStatus(200);
    })
    .catch((err) => {
      mres.status(500).json({ message: err });
    });
};

const contacts_get = (mreq, mres) => {
  const { page = 1, limit = 10 } = mreq.body;
  Contact.find()
    .limit(limit)
    .skip((page - 1) * limit)
    .then(async (contacts) => {
      const count = Contact.countDocuments({})
      mres.json({data: contacts,count});
    });
};

module.exports = {
  contacts_get,
  contacts_post,
};
