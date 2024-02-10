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
const Message = require('../models/message');

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

        findId.friend_list.push(currentUser.id);
        await findId.save();

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

exports.view_inbox_get = async(req,res,next)=>{
    try {
        const currentUser = req.user;
        let friendsList = [];
        for(let i=0; i<currentUser.friend_list.length; i++){
            const myFriend = await User.findById(currentUser.friend_list[i]);
            friendsList.push(myFriend);
        }
        return res.render("inbox-page",{
            title: "Inbox",
            friendsList: friendsList,
        })
    } catch (err) {
        return next(err)
    }
}

// exports.start_chatting_get = async(req,res,next)=>{
//     try {
//         const currentUser = req.user;
//         let friendsList = [];
//         for(let i=0; i<currentUser.friend_list.length; i++){
//             const myFriend = await User.findById(currentUser.friend_list[i]);
//             friendsList.push(myFriend);
//         }
//         const isCurrentUserSender = await Message.find({
//             sender: currentUser.id,
//         }).sort({dateCreated:1}).populate('receiver');

//         const isCurrentUserReceiver = await Message.find({
//             receiver: currentUser.id,
//         }).sort({dateCreated:1}).populate('sender');

//         if(isCurrentUserReceiver){
//             const sendInfo = isCurrentUserReceiver;
//             const showTextArea = true;
//             res.render("user-messages-page",{
//                 title: "Inbox",
//                 friendsList: friendsList,
//                 showTextArea: showTextArea,
//                 sendInfo: sendInfo,
//             })
//         }
//     } catch (err) {
//         return next(err);
//     }
// }

exports.start_chatting_get = async(req,res,next)=>{
    try {
        const currentUser = req.user;
        let friendsList = [];
        for(let i=0; i<currentUser.friend_list.length; i++){
            const myFriend = await User.findById(currentUser.friend_list[i]);
            friendsList.push(myFriend);
        }

        // Fetch all messages where the current user is either the sender or the receiver
        const messages = await Message.find({
            $or: [
                { sender: currentUser.id },
                { receiver: currentUser.id }
            ]
        }).sort({dateCreated:1}).populate('sender').populate('receiver');

        // Filter the messages to only include conversations between the current user and the other user
        const conversation = messages.filter(message =>
            (message.sender.id === currentUser.id && message.receiver.id === req.params.id) ||
            (message.receiver.id === currentUser.id && message.sender.id === req.params.id)
        );

        const showTextArea = true;
        res.render("user-messages-page",{
            title: "Inbox",
            friendsList: friendsList,
            showTextArea: showTextArea,
            sendInfo: conversation, // Pass the conversation to the template
        })
    } catch (err) {
        return next(err);
    }
}

exports.start_chatting_post = [
    body("message", "Cannot send empty message!")
    .trim()
    .isLength({ min: 1 })
    .escape(),

    asyncHandler(async(req,res,next)=>{
        const uploader = async (path) => await cloudinary.uploads(path, "messaging_app/message_images")
        try {
            const urls = []
            const files = req.files; 
            for(const file of files){
                const { path } = file; 
                const newPath = await uploader(path)
                urls.push(newPath)
                fs.unlinkSync(path)
            }
            const currentUser = req.user;
            const receiverId = req.params.id;
            await new Message({
                messages: req.body.message,
                sender: currentUser.id,
                receiver: receiverId,
                files: urls,
            }).save();
            res.redirect(`/view-inbox/${receiverId}`)
        } catch (err) {
            return next(err)
        }
    })
];

