var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI);

var User = mongoose.model('User', {
  slackId:{
    type: String,
    required: true
  },
  slackDmId: {
    type: String,
    required: true
  },
  google: {},
  date: String,
  action: String,
  pending: {},
});

var Reminder = mongoose.model('Reminder', {
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  date: Date,
  task: {
    type: String,
    required: true
  },
});

var Meeting = mongoose.model('Meeting', {

})

module.exports = {
  User,
  Reminder
};
