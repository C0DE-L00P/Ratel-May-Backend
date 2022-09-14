const Contact = require("../models/contactSchema");

// --------------------- Id

const contacts_get_id = (mreq, mres) => {
  Contact.findById(mreq.params.id)
    .then((res) => (res ? mres.json(res) : mres.sendStatus(404)))
    .catch(() => mres.sendStatus(404));
};

const contacts_put_id = (mreq, mres) => {
  Contact.findByIdAndUpdate(mreq.params.id, mreq.body,{new: true}, function (err, docs) {
    if(err) return mres.status(400).json({message: err})
    mres.status(200).json(docs)
  });
};

const contacts_delete_id = (mreq, mres) => {
  Contact.findByIdAndDelete(mreq.params.id, function (err) {
    if (err) return mres.sendStatus(404)
    mres.sendStatus(200);
  });
};


// --------------------- General

const contacts_post = (mreq, mres) => {
  const contact = new Contact(mreq.body);

  contact.save()
    .then(() => {
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
  contacts_get_id,
  contacts_put_id,
  contacts_delete_id,
  contacts_get,
  contacts_post,
};
