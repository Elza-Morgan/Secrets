//jshint esversion:6
require('dotenv').config();
const express = require("express");
const ejs = require("ejs");
const bodyParser= require("body-parser");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require ("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate'); // this package used to make the function of findOrCreate() to work instead of implenting it.

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
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());


//The serialize and deserialize is now applied to all kind of Strategy not only on Local.

passport.serializeUser((user, cb)=> {
    cb(null, user.id); 
});

passport.deserializeUser((id, cb) =>{
    User.findById(id).then((user)=>{
        cb(null,user);
    }).catch((err)=>{
        cb(err);
    });
});

/*This is used only on "passposrt-local-mongoose" not applid to all other strategies only for "local" strategy */
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());



//It is important to add this method right after app.serialize and deserialize user.// 
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRETE,
    callbackURL: "http://localhost:3000/auth/google/secrets",
     /*The link below is used to solve google+ account and simply letting us to retrive users account 
     from another end-point of google*/
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },

  //This function is used to Create new Users from loggin-in through google into our Database.
  //This Function will also be triggered after authenticating with Google.
  function(accessToken, refreshToken, profile, cb) {
    // "googleId" is the name created in our Schema which is in our DB.
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get('/', function(req,res){

    res.render("home");

});

//Use passport.authenticate(), specifying the 'google' strategy, to authenticate requests.
//This Request is called or made from Login and Register pahe when you press on the google button.
app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] }));


  /*This URL depends on the link that you have created in google cloude at Credentials at Authorised URL redirect,
  which is ur callback after the Authenticaton*/
  //This is were cookie is created to save their login Session after successfuly logged-in from Google.
  app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secret.
    res.redirect("/secrets");
  });

app.get('/login', function(req,res){
    res.render("login");
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

app.get("/secrets",function (req,res){

    //{$ne:null} mean "not equal to null"
    User.find({"secret": {$ne:null}}).then((foundusers)=>{
        if(foundusers){
            res.render("secrets", {usersWithSecrets: foundusers});
        }

    }).catch((err)=>{
        console.log(err);
    });
    
});

app.get("/submit",(req,res)=>{

    if(req.isAuthenticated()){  //if authentication is true then it will enter the "if-statment"
        res.render("submit");
    }else{
        res.redirect("/login");
    }

});

app.post("/submit", (req,res) =>{

    const submittedSecrete= req.body.secret;
    console.log(req.user.id);

    User.findById(req.user.id).then((founduser)=>{

            if(founduser){
                    founduser.secret = submittedSecrete;
                    founduser.save().then(()=>{
                        res.redirect("/secrets");
                    }).catch((err)=>{
                        console.log(err);
                    });
            }
    }).catch((err)=>{
        console.log(err);
    });
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