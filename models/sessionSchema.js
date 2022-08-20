const { default: mongoose } = require("mongoose");
const Schema = mongoose.Schema;

const sessionSchema = new Schema({
  room_id: String,
  created_at: { type: Date, default: Date.now },
  start_at: { type: Date },
  ended_at: { type: Date },
  chat: [
    {
      message: { type: String },
      date: { type: String, default: Date.now },
      owner: { type: Schema.Types.ObjectId, refPath: "model_type"},
    },
  ],
  model_type: { type: String, enum: ["Student", "Instructor"] },
  members_with_access: {type: [Schema.Types.ObjectId], refPath: "model_type" },
  created_by: { type: Schema.Types.ObjectId, ref: "Instructor" },
  is_live: { type: Boolean, default: true },
  previously_reached: String,
  recently_reached: String,
  evaluations: [
    {
      evaluated_by: { type: Schema.Types.ObjectId, ref: "Instructor" },
      student: { type: Schema.Types.ObjectId, ref: "Student"},
      previously_eval: Number,
      current_eval: Number,
      notes: String,
    },
  ],
  attendants: [{type: [Schema.Types.ObjectId], refPath: "model_type" }]
});
//TODO: evaluations object now uses a lot of queries - embedding data would be best practice for this case

const Session = new mongoose.model("Session", sessionSchema);

module.exports = Session;
