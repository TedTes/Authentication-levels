//jshint esversion:6
require("dotenv").config();
const express=require("express");
const bodyparser=require("body-parser");
const ejs=require("ejs");
const mongoose=require("mongoose");
const bcrypt=require("bcrypt");
const session=require("express-session");
const passport=require("passport");
const passportlocalmongoose=require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate=require("mongoose-findorcreate");
//const encrypt=require("mongoose-encryption");
//const md5=require("md5");
const app=express();
const salt=10;
app.set("view engine","ejs");
app.use(bodyparser.urlencoded(
  {extended:true}
));
app.use(express.static("public"));

app.use(session({
  secret:"this is some kind of secret",
  resave:false,
  saveUninitialized:false
}));


app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/usersDB",{useNewUrlParser:true});
mongoose.set("useCreateIndex",true);
//jshint esversion:6
const userSchema=new mongoose.Schema({
  email:String,
  password:String,
  googleId:String,
  secret:String
});
userSchema.plugin(passportlocalmongoose);
userSchema.plugin(findOrCreate);
//userSchema.plugin(encrypt,{secret:process.env.SECRET,encryptedFields:["password"]});
const User=new mongoose.model("User",userSchema);

passport.use(User.createStrategy());

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
    callbackURL: "http://localhost:3000/auth/google/authentication-project",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
app.get("/",function(req,res)
{
  res.render("home");
});
app.get("/register",function(req,res)
{
  res.render("register");
});

app.get("/login",function(req,res)
{
  res.render("login");
});
app.get("/secrets",function(req,res)
{
  // if(req.isAuthenticated())
  // {
  //   res.render("secrets");
  // }
  // else{
  //   res.redirect("/login");
  // }
  User.find({"secret":{$ne:null}},function(err,foundUsers){
    if (err)
    {
    console.log(err);
    }
    else
    if(foundUsers)
    {
      res.render("secrets",{usersWithSecrets:foundUsers})
    }
  })
});
app.post("/login",function(req,res)
{
const user=new User({
  username:req.body.username,
  password:req.body.password
});
req.login(user,function(err)
{
  if(err)
  {
    console.log(err);
  }
  else{
   passport.authenticate("local")(req,res,function()
 {
res.redirect("/secrets");
 });
  }
});
});
app.post("/register",function(req,res)
{
  User.register({username:req.body.username},req.body.password,function(err,user)
{
  if(err)
  {
    console.log(err);
    res.redirect("/register");
  }
  else{
    passport.authenticate("local")(req,res,function()
  {
    res.redirect("/secrets");
  });
  }
});
});
app.get("/logout",function(req,res){
  req.logout();
  res.redirect("/");
});
app.get("/auth/google",
  passport.authenticate("google",{scope:["profile"]}
));
app.get( "/auth/google/authentication-project",
    passport.authenticate( "google", {
        failureRedirect: "/login"}),function(req,res){
          res.redirect("/secrets");
        }
);
app.get("/submit",function(req,res){
  if(req.isAuthenticated())
  {
    res.render("submit");
  }
  else{
    res.redirect("/login");
  }
});
app.post("/submit",function(req,res)
{
  const mysecret=req.body.secret;
console.log(req.user);
  User.findById(req.user.id,function(err,foundUser)
{
  if(err)
  {
    console.log(err);
  }
  else
  if(foundUser)
  {
    foundUser.secret=mysecret;
    foundUser.save(function(){
      res.redirect("/secrets");
    });
  }
});
});
// bcrypt.hash(req.body.password,salt,function(err,hash)
// {
//   const newUser=new User({
//     email:req.body.username,
//     password:hash
//   });
//   newUser.save(function(err)
// {
//   if(err)
//   {
//     console.log(err);
//   }
//   else{
//     res.render("secrets");
//   }
// });
// });


//app.post("/login",function(req,res)
//{
//   const username=req.body.username;
//   const password=req.body.password;
//
//   User.findOne({email:username},function(err,result)
// {
//   if (err)
//   {
//     console.log(err);
//   }
//   else{
//     if(result)
//     {
//       bcrypt.compare(password,result.password,function(err,reslt)
//     {
//       if(reslt===true)
//       {
//         res.render("secrets");
//       }
//     });
//     }
//   }
// });
//});































































app.listen(3000,function(){
  console.log("server started running port 3000");
});
