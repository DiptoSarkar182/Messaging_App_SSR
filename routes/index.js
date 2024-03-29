var express = require('express');
var router = express.Router();
const upload = require('../middlewares/multer')

const userController = require('../controllers/userController');
const chatController = require('../controllers/chatController');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('home-page');
});

router.get("/sign-up", userController.sign_up_get);
router.post("/sign-up", upload.array('avatar',1), userController.sign_up_post);

router.get("/sign-in", userController.sign_in_get)
router.post("/sign-in", userController.sign_in_post)

router.get("/visit-profile", userController.visit_profile_get);

router.get("/chat-room", chatController.chat_room_get);
router.get("/add-friend", chatController.add_friend_get);
router.post("/add-friend", chatController.add_friend_post);
router.get("/add-friend/:id", chatController.friend_request_get);
router.get("/view-friend-request", chatController.view_friend_request_get);
router.get("/accept-request/:id", chatController.accept_friend_request_get);
router.get("/reject-request/:id", chatController.reject_friend_request_get);

router.get("/view-friends-list", chatController.view_friends_list_get);
router.get("/view-inbox", chatController.view_inbox_get);
router.get("/view-inbox/:id", chatController.start_chatting_get);
router.post("/view-inbox/:id", upload.array('image',1), chatController.start_chatting_post);

router.get("/visit-profile/edit-profile/:id", userController.edit_profile_get);
router.post("/visit-profile/edit-profile/:id", upload.array('avatar',1), userController.edit_profile_post);
router.get("/visit-profile/change-password/:id", userController.change_password_get);
router.post("/visit-profile/change-password/:id", userController.change_password_post);

router.get("/demo-user-1", userController.demo_user_1_get);
router.get("/demo-user-2", userController.demo_user_2_get);

router.get("/log-out", userController.log_out);

module.exports = router;
