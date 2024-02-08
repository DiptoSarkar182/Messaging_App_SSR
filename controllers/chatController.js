const User = require('../models/user');
const {body, validationResult} = require('express-validator');
const passport = require('passport');
const {flash} = require('express-flash');
const {createHash} = require('../middlewares/authentication');
const upload = require('../middlewares/multer');
const cloudinary = require('../middlewares/cloudinary');
const validator = require('validator');
const fs = require('fs');
const path = require('path');
const asyncHandler = require('express-async-handler');

exports.chat_room_get = (req,res,next)=>{
    return res.render("chat-room-page",{
        title: "Welcome to the chat room"
    })
}

exports.add_friend_get = (req,res,next)=>{
    return res.render("add-friend-page",{
        title: "Add a friend",
        successMessage: req.flash('success'),
    })
}

exports.add_friend_post = [
    body("username")
      .trim()
      .isLength({ min: 4, max: 20 })
      .withMessage("Username is required (4-20 characters) ")
      .escape(),
      async(req,res,next)=>{
        try {
            const currentUser = req.user.username;
            const currentUserID = req.user.id;
            const findUser = await User.findOne({username:req.body.username});
            
            if(findUser){
                if(findUser.username === currentUser){
                    res.render("add-friend-page",{
                        title: "Add a friend",
                        userNotFound: "This is you.",
                    })
                } else{
                    res.render("add-friend-page",{
                        title: "Add a friend",
                        userFound: findUser,
                    })
                }
            } else{
                res.render("add-friend-page",{
                    title: "Add a friend",
                    userNotFound: "User does not exist!",
                })
            }
        } catch (err) {
            return next(err);
        }
      },
];

exports.friend_request_get = async(req,res,next)=>{
    try {
        const currentUserID = req.user.id;
        const sendingRequestTo = req.params.id;
        const receiverUserDetails = await User.findById(sendingRequestTo);
        receiverUserDetails.friend_request.push(currentUserID);
        await receiverUserDetails.save();
        req.flash('success', 'Friend request sent successfully!');
        return res.redirect("/add-friend")
    } catch (err) {
        return next(err);
    }
};

exports.view_friend_request_get = async(req,res,next)=>{
    try {
        const currentUser = req.user;
        let friendRequestList = [];
        for(let i=0; i<currentUser.friend_request.length; i++){
            const whoSentRequest = await User.findById(currentUser.friend_request[i]);
            friendRequestList.push(whoSentRequest);
        }
        return res.render("view-friend-request-page",{
            title: "Friend Request List",
            friendRequestList: friendRequestList,
            currentUser: currentUser,
        })
    } catch (err) {
        return next(err);
    }
}

exports.accept_friend_request_get = async(req,res,next)=>{
    try {
        const idOfIncomingRequest = req.params.id;
        const findId = await User.findById(idOfIncomingRequest);
        const currentUser = req.user;
        currentUser.friend_list.push(findId.id);
        await currentUser.save();

        currentUser.friend_request.pull(findId.id);
        await currentUser.save();
        return res.redirect("/view-friend-request");
    } catch (err) {
        return next(err);
    }
}

exports.reject_friend_request_get = async(req,res,next)=>{
    try {
        const idOfIncomingRequest = req.params.id;
        const currentUser = req.user;
        const findId = await User.findById(idOfIncomingRequest);
        currentUser.friend_request.pull(findId.id);
        await currentUser.save();
        return res.redirect("/view-friend-request");
    } catch (err) {
        return next(err);
    }
}

exports.view_friends_list_get = async(req,res,next)=>{
    try {
        const currentUser = req.user;
        let friendsList = [];
        for(let i=0; i<currentUser.friend_list.length; i++){
            const myFriend = await User.findById(currentUser.friend_list[i]);
            friendsList.push(myFriend);
        }
        return res.render("friends-list-page",{
            title: "Friends List",
            friendsList: friendsList,
        })
    } catch (err) {
        return next(err);
    }
}