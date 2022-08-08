const { default: mongoose } = require("mongoose");
const Schema = mongoose.Schema;

const eventSchema = new Schema({
    date: {type:Date, default: Date.now },
    title:{type: String, required: true},
    content:String,
    article_img: {type: String,required: true}
});

const Event = new mongoose.model("Event", eventSchema);

module.exports = Event;