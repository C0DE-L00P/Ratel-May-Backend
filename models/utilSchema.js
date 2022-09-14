const { default: mongoose } = require("mongoose");
const Schema = mongoose.Schema;

const utilSchema = new Schema(
  {
    pinsList: { type: Map, of: Schema.Types.Mixed },
    subscripersList: [{ type: String }],
  },
  {
    strict: false,
  }
);

const Util = new mongoose.model("Util", utilSchema);
module.exports = Util;
