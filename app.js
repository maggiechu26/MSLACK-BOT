const express = require('express');
const bodyParser = require('body-parser');
const apiai = require('apiai');
const app = express();
const APIAI_TOKEN = process.env.APIAI_TOKEN;
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const apiaiApp = apiai(APIAI_TOKEN);
var axios = require('axios');
var moment = require('moment');
// var WebClient = require('@slack/client').WebClient;
// var web = new WebClient(bot_token);

const Google_Client_Id = process.env.CLIENT_ID;
const Google_Client_Secret = process.env.CLIENT_SECRET;
const Url_Redirect = process.env.REDIRECT_URL;

var { rtm } = require('./index');

var IncomingWebhook = require('@slack/client').IncomingWebhook;
var url = process.env.SLACK_WEBHOOK_URL || '';
var webhook = new IncomingWebhook(url);
webhook.send('Hello! How may I help you?', function(err, header, statusCode, body) {
  if (err) {
    console.log('Error:', err);
  } else {
    console.log('Received', statusCode, 'from Slack');
  }
});

// console.log('TODAY IS: ' ,new Date() )
let today = new Date();
let oneDayBeforeTask;
var { Reminder } = require('./models')

// function remindeDayBefore(slackUserId) {
//   Reminder.findOne({slackId: slackUserId})
//           .then(function(reminder){
//             let today = new Date();
//             let reminderData = reminder.date
//             let oneDayBeforeTask =
//           })
// }

const server = app.listen(process.env.PORT || 5000, () => {
  console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});

app.get('/', function(req, res){
  res.send("HI");
})

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/calendar'
]

var google = require('googleapis'); //google.calendar.events.insert
var urlshortener = google.urlshortener('v1');
var plus = google.plus('v1');
var OAuth2 = google.auth.OAuth2;
var { User } = require('./models');

// var calendar = google.calendar('v3');
app.post('/slack/interactive', function(req, res) { //make request to Google Calendar API
  var payload = JSON.parse(req.body.payload);
  console.log(payload)
  if(payload.callback_id === 'meeting') {
    if (payload.actions[0].value === 'true') {
      User.findOne({slackId: payload.user.id})
      .then(function(user) {
        console.log('USER IS', user);
        var googleAuth = getGoogleAuth();
        var credentials = Object.assign({}, user.google);
        delete credentials.profile_id; //we don't need profile id nad name
        delete credentials.profile_name;
        const length = payload.original_message.text.split(' ').length;
        let action = payload.original_message.text.split(' ')[3];
        let date = payload.original_message.text.split(' ')[length-1];
        googleAuth.setCredentials(credentials);
        var calendar = google.calendar('v3'); //GOOGLE SDK
        calendar.events.insert({
          auth: googleAuth,
          calendarId: 'primary',
          resource: {
            summary: action,
            // attendees: users.pending.users,
            start: {
              'date': moment.utc(user.pending.when).format('YYYY-MM-DDTHH: mm:ss-07:00'), //turn it into a string that Google calendar can understand
              'timeZone': 'America/Los_Angeles'
            },
            end: {
              // 'date': moment(user.date).add(1, 'days').format('YYYY-MM-DD'), //want all day event reminder
              'date': moment.utc(user.pending.when).add(1, 'hours').format('YYYY-MM-DDTHH: mm:ss-07:00'), //turn it into a string that Google calendar can understand
              'timeZone': 'America/Los_Angeles'
            }

          },
        }, function(err, event) {
          if (err) {
            console.log('There was an error contacting the Calendar service ' + err);
          } else {
            console.log('Event created: %s', event.htmlLink);

          }
        });
      });
      res.send('Scheduled meeting :white_check_mark:');

    } else {
      res.send('Cancelled :x:');
    }
  } else {
    if (payload.actions[0].value === 'true') {
      User.findOne({slackId: payload.user.id})
      .then(function(user) {
        console.log('USER IS', user);
        var googleAuth = getGoogleAuth();
        var credentials = Object.assign({}, user.google);
        delete credentials.profile_id; //we don't need profile id nad name
        delete credentials.profile_name;
        const length = payload.original_message.text.split(' ').length;
        let action = payload.original_message.text.split(' ')[3];
        let date = payload.original_message.text.split(' ')[length-1];
        googleAuth.setCredentials(credentials);
        var calendar = google.calendar('v3'); //GOOGLE SDK
        calendar.events.insert({
          auth: googleAuth,
          calendarId: 'primary',
          resource: {
            summary: action,
            start: {
              'date': date,
              'timeZone': 'America/Los_Angeles'
            },
            end: {
              // 'date': moment(user.date).add(1, 'days').format('YYYY-MM-DD'), //want all day event reminder
              'date': date,
              'timeZone': 'America/Los_Angeles'
            }

          },
        }, function(err, event) {
          if (err) {
            console.log('There was an error contacting the Calendar service ' + err);
          } else {
            console.log('Event created: %s', event.htmlLink);

          }
        });
      });
      res.send('Created reminder :white_check_mark:');

    } else {
      res.send('Cancelled :x:');
    }

  }
})




function getGoogleAuth() {
  return new OAuth2(
    Google_Client_Id,
    Google_Client_Secret,
    'https://slackbot-scheduler.herokuapp.com/google/callback' //send users back to this url
    // Url_Redirect/google/callback
  );
}

app.get('/connect', function(req, res){
  console.log(req.query);
  var userId  = req.query.user;
  if(!userId){
    res.status(400).send('Missing User id')
  } else {
    User.findById(userId)
    .then(function(user){
      if(! user) {
        res.status(404).send("Cannot find user")
      } else {
        //have a user
        var googleAuth = getGoogleAuth();
        var url = googleAuth.generateAuthUrl({
          access_type: 'offline',
          prompt: 'consent',
          scope: GOOGLE_SCOPES,
          state: userId
        });
        res.redirect(url)
      }
    });
  }
})

app.get('/google/callback', function(req, res){
  var googleAuth = getGoogleAuth();
  googleAuth.getToken(req.query.code, function(err, tokens){ //req.query.code --> AUTHENTICATED users
    if(err){
      res.status(500).json({error: err});
    } else {
      googleAuth.setCredentials(tokens);
      var plus = google.plus('v1');
      plus.people.get({ userId: 'me', auth: googleAuth }, function (err, googleUser) {
        if(err){
          res.status(500).json({error: err});
        } else {
          User.findById(req.query.state) //find user created originally created on slack
          .then(function(MongoUser){
            MongoUser.google = tokens; //store everything in there
            MongoUser.google.profile_id = googleUser.id;
            MongoUser.google.profile_name = googleUser.displayName;
            return MongoUser.save(); //save everything in Mongo
          })
          .then(function(MongoUser){
            res.send('You are connected to google calendar')
            rtm.sendMessage('You are connected to Google Calendar', MongoUser.slackDmId)
          })
          res.json({
            code: req.query.code,
            state: req.query.state,
            tokens,
            googleUser
          });
        }
      })
    }
  })
});
