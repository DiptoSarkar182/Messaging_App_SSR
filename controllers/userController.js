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
const bcrypt = require('bcryptjs');

exports.sign_up_get = (req,res,next)=>{
  const userWantToSignUp = true;
    return res.render("sign-up-page",{
        title: "Create a new account",
        userWantToSignUp: userWantToSignUp,
    })
};

exports.sign_up_post = [
    body("first_name")
     .trim()
     .isLength({min:4, max:20})
     .withMessage("First Name is required")
     .escape(),
    
     body("last_name")
     .trim()
     .isLength({min:4, max:20})
     .withMessage("Last Name is required")
     .escape(),
    
     body("username")
     .trim()
     .custom(async (value)=>{
        const user = await User.findOne({username: value});
        if(user){
            return await Promise.reject("Username Already Taken!");
        }
        return true;
     }),
    
     body('email')
     .custom(async (value) => {
       const user = await User.findOne({ email: value });
       if (user) {
         return await Promise.reject("Email already taken");
       }
       return true;
     })
     .isEmail().withMessage('Not a valid e-mail address'),
    
     body("password", "Password should be atleast 6 characters long")
     .trim()
     .isLength({ min: 6 })
     .escape(),
    
     body("confirmPassword").custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error("Passwords do not match");
        }
        return true;
      }),
    
      asyncHandler(async(req,res,next)=>{
        const errors = validationResult(req);
        try {
            if (!errors.isEmpty()) {
                const urls = []
                const files = req.files;
                for(const file of files){
                    const { path } = file; 
                    fs.unlinkSync(path)
                }
                const user = new User({
                  username: req.body.username,
                  firstname: req.body.first_name,
                  lastname: req.body.last_name,
                  password: req.body.password,
                  email: req.body.email,
                });
                return res.render("sign-up-page", {
                  title: "Create a new account",
                  user: user,
                  errors: errors.array(),
                });
              }
              else{
                const uploader = async (path) => await cloudinary.uploads(path, "messaging_app/profile_photo")
                const urls = []
                const files = req.files;
                for(const file of files){
                    const { path } = file; 
                    const newPath = await uploader(path)
                    urls.push(newPath)
                    fs.unlinkSync(path)
                }
                const passwordHash = await createHash(req.body.password);
                const user = await new User({
                    username: req.body.username,
                    firstname: req.body.first_name,
                    lastname: req.body.last_name,
                    password: passwordHash,
                    email: req.body.email,
                    files: urls,
                }).save();
          
                req.login(user, (err) => {
                    if (err) return next(err);
                    return res.redirect("/");
                  });
              }
        } catch (err) {
            return next(err);
        }
      })
    
];

exports.sign_in_get = (req,res,next)=>{
    return res.render("sign-in-page",{
        title: "Sign in",
        errors: req.flash("SignUpMessage"),
    })
};

exports.sign_in_post =  passport.authenticate(
  "local", {
      successRedirect: "/",
      failureRedirect: "/sign-in",
      failureFlash: true,
  }
);

exports.demo_user_get = async(req,res,next)=>{
  const demoUsername = "Demo_User_1";
  const demoUser = await User.findOne({username: demoUsername});
  if (!demoUser) {
    // Handle case when demo user is not found
    return res.redirect('/sign-in');
}
req.logIn(demoUser, function(err) {
    if (err) { 
        return next(err); 
    }
    return res.redirect('/');
});
}

exports.visit_profile_get = (req,res,next)=>{
  if(!req.user){
    return res.redirect("/sign-in");
  }
  const currentUser = req.user;
  
  return res.render("visit-profile-page",{
    title: "Profile details",
    currentUser: currentUser,
  })
}

exports.edit_profile_get = async(req,res,next)=>{
  try {
    if(!req.user){
      return res.redirect("/sign-in");
    }
    const currentUserID = req.params.id;
    const user = await User.findOne({_id: currentUserID});
    return res.render("sign-up-page",{
      title: "Edit your account",
      user: user,
    })
  } catch (err) {
    return next(err);
  }
}

exports.edit_profile_post = [
  body("first_name")
     .trim()
     .isLength({min:4, max:20})
     .withMessage("First Name is required")
     .escape(),
    
     body("last_name")
     .trim()
     .isLength({min:4, max:20})
     .withMessage("Last Name is required")
     .escape(),
    
     body("username")
     .trim()
     .custom(async (value)=>{
        const user = await User.findOne({username: value});
        if(user){
            return await Promise.reject("Username Already Taken!");
        }
        return true;
     }),
    
     body('email')
     .custom(async (value) => {
       const user = await User.findOne({ email: value });
       if (user) {
         return await Promise.reject("Email already taken");
       }
       return true;
     })
     .isEmail().withMessage('Not a valid e-mail address'),
    
      asyncHandler(async(req,res,next)=>{
        const errors = validationResult(req);
        try {
            if (!errors.isEmpty()) {
                const urls = []
                const files = req.files;
                for(const file of files){
                    const { path } = file; 
                    fs.unlinkSync(path)
                }
                const currentUserID = req.params.id;
                const user = await User.findById(currentUserID);
                return res.render("sign-up-page", {
                  title: "Edit your account",
                  user: user,
                  errors: errors.array(),
                });
              }
              else{
                const uploader = async (path) => await cloudinary.uploads(path, "messaging_app/profile_photo")
                const currentUserID = req.params.id;
                let user = await User.findOne({_id:currentUserID});
                if(user){
                  const publicId = user.files[0].id; 
                  const result = await cloudinary.deleteImage(publicId);
                  await user.updateOne({_id:currentUserID},
                    { $set: { "files": [] } });
                  if(req.method === 'POST'){
                    const urls = []
                    const files = req.files;
                    for(const file of files){
                        const { path } = file; 
                        const newPath = await uploader(path)
                        urls.push(newPath)
                        fs.unlinkSync(path)
                    }
                    user = await user.updateOne({
                      $set: {
                        username: req.body.username,
                        firstname: req.body.first_name,
                        lastname: req.body.last_name,
                        email: req.body.email,
                        files: urls,
                      }
                    },{},{new: true})
                  }
                }
                
                
          
                return res.redirect("/visit-profile")
              }
        } catch (err) {
            return next(err);
        }
      })
];

exports.change_password_get = (req,res,next)=>{
  if(!req.user){
      return res.redirect("/sign-in");
    }
  return res.render("change-password-page",{
    title: "Change Password"
  })
}

exports.change_password_post = [
  body("current_password", "Password should be atleast 6 characters long")
     .trim()
     .isLength({ min: 6 })
     .custom(async (value, { req }) => {
      const user = await User.findOne({ _id: req.params.id });
      const res = await bcrypt.compare(value, user.password);
      if (!res) {
        return await Promise.reject("Current password do not match!");
      }
      return true;
    })
     .escape(),
    body("password", "Password should be atleast 6 characters long")
     .trim()
     .isLength({ min: 6 })
     .escape(),
    
     body("confirmPassword").custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error("Password and confirm password should match");
        }
        return true;
      }),
      async(req,res,next)=>{
        const errors = validationResult(req);
        try {
          if(!errors.isEmpty()){
            return res.render("change-password-page",{
              title: "Change Password",
              errors: errors.array(),

            })
          }
          else{
            let user = await User.findOne({_id:req.params.id});
            if(user){
              const passwordHash = await createHash(req.body.password);
              user = await user.updateOne(
                {
                  $set: {
                    password: passwordHash,
                  }
                },{},{new: true}
              )
            }
            return res.redirect("/visit-profile")
          }
        } catch (err) {
          return next(err)
        }
      }
];

exports.log_out = (req,res,next)=>{
  req.logout((err)=>{
    if(err){
      return next(err)
    }
    return res.redirect("/");
  })
}