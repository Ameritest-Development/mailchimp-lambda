require('dotenv').load();

var Promise = require('es6-promise').Promise,
    request = require('superagent'),
    md5     = require('md5');

var API_URL  = '.api.mailchimp.com/3.0/lists/',
    DATACENTER  = process.env.DATACENTER,
    API_KEY  = process.env.API_KEY,
    LIST_ID  = process.env.LIST_ID,
    USERNAME = process.env.USERNAME,
    STATUS   = process.env.STATUS;

function urlForList() {
  return 'https://' + DATACENTER + API_URL + LIST_ID + '/members/';
}

function urlForUser(emailAddress) {
  return urlForList() + md5(emailAddress);
}

function updateSubscription(emailAddress, firstName, lastName) {
  return new Promise(function(resolve, reject) {
    request.patch(urlForUser(emailAddress))
      .auth(USERNAME, API_KEY)
      .send({ email_address: emailAddress, status: STATUS, merge_fields: { FNAME: firstName, LNAME: lastName } })
      .end(function(err, res) {
        if (err) {
          reject({ statusCode: err.status, body: err.response.text });
        } else {
          resolve(res.body);
        }
      });
  });
}

function createSubscription(emailAddress, firstName, lastName) {
  return new Promise(function(resolve, reject) {
    request.post(urlForList())
      .auth(USERNAME, API_KEY)
      .send({ email_address: emailAddress, status: STATUS, merge_fields: { FNAME: firstName, LNAME: lastName } })
      .end(function(err, res) {
        if (err) {
          reject({ statusCode: err.status, body: err.response.text });
        } else {
          resolve({statusCode: res.status, body: 'Successful Create'});
        }
      });
  });
}

exports.handler = function(event, context) {

  if ( event.body ) {
    event = JSON.parse(event.body);
  }

  var emailAddress = event.email;
  var firstName    = event.first_name || "";
  var lastName     = event.last_name  || "";

  console.log("Vars: " + emailAddress + "|" + firstName + "|" + lastName);

  function create() {
    var res = createSubscription(emailAddress, firstName, lastName)
      .then(function(responseBody) {
        console.log("Resp Body: ", responseBody);
        context.succeed(responseBody);
      })
      .catch(function(err) {
        return err;
      });

    return res;
  }

  var res = updateSubscription(emailAddress, firstName, lastName)
    .then(function(responseBody) {
      context.succeed({statusCode: 200, body: 'Successful Update'});
    })
    .catch(function(err) {
      console.log("Error: ", err);
      if (err.status === 404 || err.statusCode === 404) {
        console.log("New subscriber!");
        create();
      } else {

        if(!err.statusCode) {
          err = {statusCode: 500, body: err.message};
        };
        
        return err;
      }
    });
};