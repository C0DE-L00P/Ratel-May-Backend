const { default: mongoose } = require("mongoose");
const Schema = mongoose.Schema;

const contactSchema = new Schema({
    name:   {type: String,   required: true},
    email:  {type: String,   required: true},
    content:{type: String,   required: true},
    phone:  {type: String},  
    date:   {type: Date,     default: Date.now},
    status: {type: String, enum: ["Read","Unread"], default: "Unread"}
});

const Contact = new mongoose.model("Contact", contactSchema);
module.exports = Contact;