const { default: mongoose } = require("mongoose");
const Schema = mongoose.Schema;

const instructorSchema = new Schema({
  name: { type: String, required: true },
  gender: { type: String, required: true, enum: ["Male", "Female"] },
  age: { type: Number, required: true },
  state: { type: String, required: true },
  certificates: [String],
  mobile: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  privileges: {
    type: String,
    required: true,
    enum: ["Admin", "Supervisor", "None"],
  },
  students: [{ type: Schema.Types.ObjectId, ref: "Student" }],
  sessions: [{ type: Schema.Types.ObjectId, ref: "Session" }],
  evaluations: [{ type: Schema.Types.ObjectId, ref: "Feedback" }],
  notes_in_book: [
    {
      page: Number,
      surah: Number,
      ayah: Number,
      word_no: Number,
      content: String,
    },
  ],
  started_at: { type: Date, default: Date.now },
  is_available: { type: Boolean, default: true },
  in_session: { type: Boolean, default: false },
  prefs: {
    working_hours: [[Number]],
    working_days: [Number],
  },
  plan_doc: { type: String },
  busy: {
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
  },
});

const Instructor = new mongoose.model("Instructor", instructorSchema);

module.exports = Instructor;
