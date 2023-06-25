//jshint esversion:6
require('dotenv').config();
const express = require("express");
const ejs = require("ejs");
const bodyParser= require("body-parser");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require ("passport-local-mongoose");

// var md5 = require('md5');


const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
    secret: "This message is secret.",
    resave: false,
    saveUninitialized: false
    
         }));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://127.0.0.1:27017/userDB", {useNewUrlParser:true});


const userSchema = new mongoose.Schema ({
    email: String,
    password: String
});

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get('/', function(req,res){

    res.render("home");

});

app.get("/secrets",function (req,res){

if(req.isAuthenticated()){  //if authentication is true then it will enter the "if-statment"
    res.render("secrets");
}else{
    res.redirect("/login");
}

});

app.get('/login', function(req,res){

    res.render("login");

});

app.get("/logout", function(req,res){

    req.logout(function(err){
        if(err){
            console.log(err);
        }else{
            res.redirect("/");
        }
    });
   

});

app.get('/register', function(req,res){

    res.render("register");

});

app.post("/register", function(req,res){

   User.register({username: req.body.username}, req.body.password).then(function(){
    passport.authenticate("local")(req,res,function(){
        res.redirect("/secrets");
    });
   }).catch(function(err){
    console.log(err);
    res.redirect("/register");
   });   


});


app.post("/login", function(req,res){

    const user = User({
        username: req.body.username,
        password: req.body.password

    });

    req.login(user,function(err){
        if(err){
            console.log(err);
        }else{

            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            });
        }

    });


});


app.listen(3000,function(){
    console.log("Successfuly Connected on port 3000");
});