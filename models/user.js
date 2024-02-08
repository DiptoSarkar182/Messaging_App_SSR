const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    firstname: {
        type: String,
        required: true,
        minLength: 4,
        maxLength:20,
    },
    lastname: {
        type: String,
        required: true,
        minLength: 4,
        maxLength: 20,
    },
    username: {
        type: String,
        required: true,
        minLength: 4,
        maxLength: 20,
    },
    email:{
        type: String,
        maxLength: 50,
    },
    password: {
        type: String,
        required: true,
    },
    files: {
        type: Array,
    },
    friend_request: {
        type: Array,
    },
    friend_list: {
        type: Array,
    },
});

UserSchema.virtual("fullName").get(function (){
    return `${this.firstname} ${this.lastname}`;
})

module.exports = mongoose.model("User", UserSchema);