//jshint esversion:6
require('dotenv').config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser:true, useUnifiedTopology: true});

const app = express();
app.use(express.static("public"));
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended:true}));

//--> Create User Database
const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

const secret = process.env.SECRET;
userSchema.plugin(encrypt,{secret:secret, encryptedFields:["password"]});

const User = mongoose.model("User",userSchema);

app.get("/",function(req,res){
  res.render("home");
});

app.get("/login",function(req,res){
  res.render("login");
});

app.get("/register",function(req,res){
  res.render("register");
});

app.get("/secrets",function(req,res){
  res.render("secrets");
});

app.post("/register",function(req,res){
  const username = req.body.username;
  const password = req.body.password;

  User.findOne({email:username},function(err,foundUser){
    if (!err) {
      if(!foundUser){
        const newUser = new User({
          email: username,
          password: password
        });
        newUser.save();
        res.render("secrets");
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
      if(foundUser.password === password){
        res.render("secrets");
      }
      else{
        console.log(">> user doesn't exists! <<");
        res.redirect("/");
      }
    }
    else{
      console.log(err);
    }
  });
});


app.listen(3000,function(req,res){
  console.log("Server started at port 3000");
});
