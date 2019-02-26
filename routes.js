var express = require('express');
var bcrypt = require('bcryptjs');

var User = require('./models/User');
var JogTime = require('./models/JogTime');

var routes = new express.Router();
var saltRounds = 10;


routes.get('/', function(req, res) {
  if (req.cookies.userId) {
    // if we've got a user id, assume we're logged in and redirect to the app:
    res.redirect('/times')
  } else {
    // otherwise, redirect to login
    res.redirect('/sign-in')
  }
})

// show the create account page
routes.get('/create-account', function(req, res) {
  res.render('create-account.html')
})

// handle create account forms:
routes.post('/create-account', function(req, res) {
  var form = req.body;


  if (form.password !== form.passwordConfirm) {
    res.redirect('/create-account', 
    {error: "Passwords do not match eachother"});
    return;
  }
  // hash the password - we dont want to store it directly
  var passwordHash = bcrypt.hashSync(form.password, saltRounds)
  
  // create the user
  var userId = User.insert(form.name, form.email, passwordHash)

  // set the userId as a cookie
  res.cookie('userId', userId)

  // redirect to the logged in page
  res.redirect('/times')
})

// show the sign-in page
routes.get('/sign-in', function(req, res) {
  res.render('sign-in.html')
})

routes.post('/sign-in', function(req, res) {
  var form = req.body

  // find the user that's trying to log in
  var user = User.findByEmail(form.email)

  // if the user exists...
  if (user) {
    console.log({ form, user })
    if (bcrypt.compareSync(form.password, user.passwordHash)) {
      // the hashes match! set the log in cookie
      res.cookie('userId', user.id)
      // redirect to main app:
      res.redirect('/times')
    } else {
      // if the username and password don't match, say so
      res.render('sign-in.html', {
        errorMessage: 'Email address and password do not match'
      })
    }
  } else {
    // if the user doesnt exist, say so
    res.render('sign-in.html', {
      errorMessage: 'No user with that email exists'
    })
  }
})

// handle signing out
routes.get('/sign-out', function(req, res) {
  // clear the user id cookie
  res.clearCookie('userId')

  // redirect to the login screen
  res.redirect('/sign-in')
})

// list all jog times
routes.get('/times', function(req, res) {
  var loggedInUser = User.findById(req.cookies.userId);
  if (loggedInUser === null) {
		res.redirect('/sign-in')
		return
	}

  var userTimes = JogTime.findByUserId(req.cookies.userId);
  var totalDistance = userTimes.reduce((accumulator, currentValue) => accumulator + currentValue.distance, 0);
  var totalTime = userTimes.reduce((accumulator, currentValue) => accumulator + currentValue.duration, 0);
  var avgSpeed = totalDistance / totalTime;


  res.render('list-times.html', {
    user: loggedInUser,
    stats: {
      totalDistance: totalDistance.toFixed(2),
      totalTime: totalTime.toFixed(2),
      avgSpeed: avgSpeed.toFixed(2)
    },
    times: userTimes
  })
})

// show the create time form
routes.get('/times/new', function(req, res) {
  var loggedInUser = User.findById(req.cookies.userId);

  res.render('create-time.html', {
    user: loggedInUser
  })
})

// handle the create time form
routes.post('/times/new', function(req, res) {
  const { startTime, distance, duration } = req.body;

  var JogTimeId = JogTime.insert(req.cookies.userId, startTime, distance, duration);

  res.cookie('timeId', JogTimeId);

  res.redirect('/times');
})

// show a specific time
routes.get('/times/:id', function(req, res) {
  var JogTimeId = req.params.id;
  var loggedInUser = User.findById(req.cookies.userId); 

  var JogTime = JogTime.findById(JogTimeId, loggedInUser.id);

  if (JogTime === null) {
		res.redirect('/times')
	} else {
		res.render('edit-time.html', {
      user: loggedInUser,
      time: JogTime
		})
	}
})

// handle the edit of a time
routes.post('/times/:id', function(req, res) {
  const JogTimeId = req.params.id;
  const { startTime, distance, duration } = req.body

  JogTime.updateTime(startTime, distance, duration, JogTimeId);

  res.redirect('/times');
})

// handle the delete of a time 
routes.get('/times/:id/delete', function(req, res) {
  var JogTimeId = req.params.id;

  JogTime.delete(JogTimeId);

  res.redirect('/times');
})

// handle the delete of an account
routes.get('/delete-account', function(req, res) {
  var userId = req.cookies.userId;

  //delete the user
  User.delete(userId);

  //clear the cookie
  res.clearCookie('userId')

  //sign out
  res.redirect('/sign-in')
});

module.exports = routes
