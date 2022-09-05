const Contact = require("../models/contactSchema");
require("dotenv").config();

// --------------------- General

const contacts_post = (mreq, mres) => {
  const contact = new Contact(mreq.body);

  contact.save()
    .then((res_cat) => {
      mres.sendStatus(200);
    })
    .catch((err) => {
      mres.status(500).json({ message: err });
    });
};

const contacts_get = (mreq, mres) => {
  const { page = 1, limit = 10 } = mreq.query;
  Contact.find().sort({date: -1})
    .limit(limit)
    .skip((page - 1) * limit)
    .then(async (contacts) => {
      const count = await Contact.countDocuments({})
      mres.json({data: contacts,count});
    });
};

module.exports = {
  contacts_get,
  contacts_post,
};
