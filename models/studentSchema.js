const { default: mongoose } = require("mongoose");
const Schema = mongoose.Schema;

//TODO: add other programs support to this schema ex: Noor Bayan and multiprogram subscriptions
const studentSchema = new Schema({
  name: { type:     String },
  age: { type:      Number},
  gender: { type:   String, enum: ["Male", "Female"] },
  state: { type:    String },
  mobile: { type:   String },
  email: { type:    String},
  password: { type: String },
  notes_in_book: [
    {
      page: Number,
      surah: Number,
      ayah: Number,
      word_no: Number,
      content: String,
    },
  ],
  subscription_state: {
    type: String,
    default: function () {
      return this.instructor === undefined ? "Pending" : "Active";
    },
    enum: ["Pending", "Active", "OnHold", "Cancelled"],
  },
  sessions: [{ type: Schema.Types.ObjectId, ref: "Session" }],
  instructor: { type: Schema.Types.ObjectId, ref: "Instructor" },
  program_prefs: {
    type: {
      type: String,
      enum: ["Memorizing", "Recitation", "Noor Bayan"],
      default: "Memorizing",
    },
    sessions_in_week: Number,
    pref_days: [Number],
    pref_times_of_day: [[Number]],
    plan: [],
  },
  certificate: String,
  started_from_surah: String,
  reached_surah: String,
  whatsapp_number: String,
  started_in: {
    type: Date,
    default: function () {
      if (this.subscription_state == "active") {
        return Date.now();
      }
      return null;
    },
  },
});

const Student = new mongoose.model("Student", studentSchema);

module.exports = Student;
