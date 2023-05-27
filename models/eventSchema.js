const { default: mongoose } = require("mongoose");
const Schema = mongoose.Schema;

const eventSchema = new Schema({
    date: {type:Date, default: Date.now },
    title:{type: String, required: true},
    content:String,
    lang: {type: String, default: 'ar'},
    image: {type: String },
    slug: {type: String, unique: true, required: true },
    summary: {type: String, required: true },
    keywords: {type: String }
});

const Event = new mongoose.model("Event", eventSchema);

module.exports = Event;