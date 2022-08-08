const { default: mongoose } = require("mongoose");
const Schema = mongoose.Schema;

const feedbackSchema = new Schema({
    student:{type: Schema.Types.ObjectId,ref: 'Student'},
    instructor:{type: Schema.Types.ObjectId,ref: 'Instructor'},
    instructor_evaluation:Number,
    program_evaluation:Number,
    suggestions:String,
    problems:String,
    reached_this_month:String,
    reached_in_general:String,
    current_soura:String
});

const Feedback = new mongoose.model("Feedback", feedbackSchema);

module.exports = Feedback;