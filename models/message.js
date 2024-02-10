const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { DateTime } = require("luxon");

const MessageSchema = new Schema({
    messages: {
        type: String,
        required: true,
        minLength: 1,
    },
    sender: {
        type: Schema.Types.ObjectId,
        ref: "User", required: true,
    },
    receiver: {
        type: Schema.Types.ObjectId,
        ref: "User", required: true,
    },
    dateCreated: {
        type: Date,
        default: () => new Date(),
        required: true,
    },
    files: {
        type: Array,
    },
})

MessageSchema.virtual("timestamp_formatted").get(function () {
    return DateTime.fromJSDate(this.dateCreated).toLocaleString(
      DateTime.DATETIME_MED
    );
});

module.exports = mongoose.model("Message", MessageSchema);