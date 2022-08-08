const { default: mongoose } = require("mongoose");
const Schema = mongoose.Schema;

//TODO: add other programs support to this schema ex: Noor Bayan and multiprogram subscriptions
const studentSchema = new Schema({
  name: {type: String,required: true},
  age: {type: Number,required: [true,"You must put an age"]},
  gender: {type: String,required: true,enum: ["Male", "Female"]},
  mobile: String,
  email: {type: String,required: [true,"You must put an email"]},
  password: {type: String,required: true},
  state: {type: String, required: true},
  notes_in_book: [
    {
      page: Number,
      surah: Number,
      ayah: Number,
      word_no: Number,
      content: String,
    },
  ],
  sessions: [{ type: Schema.Types.ObjectId, ref: "Session"}],
  instructor: { type: Schema.Types.ObjectId, ref: "Instructor"},
  program_prefs: {
    type: String,
    sessions_in_week: Number,
    pref_days: [String],
    pref_times_of_day: [[Number]],
    plan: [],
  },
  certificate: String,
  reached: String,
  started_from_surah: String,
  has_whatsapp: Boolean,
  started_in: {type: Date ,default: Date.now},
});

const Student = new mongoose.model("Student", studentSchema);

module.exports = Student;
