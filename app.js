//jshint esversion:6
require('dotenv').config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");
//const md5 = require('md5');
// const bcrypt = require('bcrypt');
// const saltRounds = 10;
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();
app.use(express.static("public"));
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended:true}));
app.use(session({
  secret: 'our little secret.',
  resave: false,
  saveUninitialized: true,
}))

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser:true, useUnifiedTopology: true});
mongoose.set('useCreateIndex', true);

//--> Create User Database
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String
});

//const secret = process.env.SECRET;
//userSchema.plugin(encrypt,{secret:secret, encryptedFields:["password"]});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User",userSchema);

passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/",function(req,res){
  res.render("home");
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

app.get("/login",function(req,res){
  res.render("login");
});

app.get("/register",function(req,res){
  res.render("register");
});

app.get("/secrets",function(req,res){
  if(req.isAuthenticated()){
    User.find({"secret":{$ne : null}},function(err,foundUsers){
      if (err) {
        console.log(err);
      }
      else {
        res.render("secrets",{foundUsers: foundUsers});
      }
    })
  }
  else{
    res.redirect("/login");
  }
});

app.get("/logout",function(req,res){
  req.logout();
  res.redirect('/');
});

app.get("/submit", function(req,res){
  if (req.isAuthenticated()) {
    res.render("submit");
  }
  else {
    res.redirect("/login");
  }
});

app.post("/submit", function(req,res){
  const secretSubmitted = req.body.secret;
  const userid = req.user.id;

  User.findById(userid,function(err,foundUser){
    if(err){
      console.log(err);
    }
    else{
      foundUser.secret = secretSubmitted;
      foundUser.save(function(){
        res.redirect("/secrets");
      });
    }
  });

});

app.post("/register",function(req,res){
  const username = req.body.username;
  const password = req.body.password;

  User.findOne({email:username},function(err,foundUser){
    if (!err) {
      if(!foundUser){
        // bcrypt.hash(password, saltRounds, function(err, hash) {
        //   const newUser = new User({
        //     email: username,
        //     password: hash
        //   });
        //   newUser.save();
        //   res.render("secrets");
        // });

        User.register({username: username},password,function(err,user){
          if(err){
            console.log(err);
            res.redirect("/register");
          }
          else{
            passport.authenticate("local")(req,res,function(){
              res.redirect("/secrets");
            });
          }
        });


      }
      else{
        console.log("user already exists!");
        res.redirect("/");
      }
    } else {
      console.log(err);
    }
  });
});

app.post("/login",function(req,res){
  const username = req.body.username;
  const password = req.body.password;

  User.findOne({email:username},function(err,foundUser){
    if(!err){
      //
      // bcrypt.compare(password, foundUser.password, function(err, result) {
      //   if(result === true){
      //     res.render("secrets");
      //   }
      //   else{
      //     console.log(">> user doesn't exists! <<");
      //     res.redirect("/");
      //   }
      // });

      const user = new User({
        username:username,
        password:password
      });

      req.login(user,function(err){
        if(err){
          console.log(err);
        }
        else{
          passport.authenticate("local")(req,res,function(){
            res.redirect("/secrets");
          });
        }
      });

    }
    else{
      console.log(err);
    }
  });
});


app.listen(3000,function(req,res){
  console.log("Server started at port 3000");
});
