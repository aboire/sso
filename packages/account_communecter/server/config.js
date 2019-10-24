import { Accounts } from 'meteor/accounts-base';
import { _ } from 'meteor/underscore';

Accounts.registerLoginHandler(function(loginRequest) {
  if (!loginRequest.email || !loginRequest.pwd) {
    return null;
  }

  const response = HTTP.call('POST', `${Meteor.settings.endpoint}/${Meteor.settings.module}/person/authenticatetoken`, {
    params: {
      email: loginRequest.email,
      pwd: loginRequest.pwd,
      tokenName: 'sso'
    },
  });

  if (response && response.data && response.data.result === true && response.data.id) {
    let userId = null;
    let retourId = null;

    if (response.data.id && response.data.id.$id) {
      retourId = response.data.id.$id;
    } else {
      retourId = response.data.id;
    }
    //console.log(response.data);

    // ok valide
    const userM = Meteor.users.findOne({ _id: retourId });
    
    let token = response.data.token ? response.data.token : false;

    // console.log(userM);
    if (userM) {
      // Meteor.user existe
      userId = userM._id;
      const account = response.data.account;
      const insert = {};
      insert.name = account.name;
      insert.username = account.username;
      insert.email = account.email;
      if (account.profilThumbImageUrl){
        insert.profilThumbImageUrl = account.profilThumbImageUrl;
      }
      if (token) {
        Meteor.users.update(userId, { $set: { 'profile.token': token } });
      }
      Meteor.users.update(userId, { $set: { emails: [loginRequest.email], 'profile.pixelhumain': insert } });
    } else {
      // Meteor.user n'existe pas
      // username ou emails
      const account = response.data.account;
      const insert = {};
      insert._id = retourId;
      insert.emails = [loginRequest.email];
      insert.profile = {};
      insert.profile.pixelhumain = {};
      insert.profile.pixelhumain.name = account.name;
      insert.profile.pixelhumain.username = account.username;
      insert.profile.pixelhumain.email = account.email;
      if (token) {
        insert.profile.token = token;
      }
      if (account.profilThumbImageUrl) {
      insert.profile.pixelhumain.profilThumbImageUrl = account.profilThumbImageUrl;
      }
      userId = Meteor.users.insert(insert);
    }

    if (!token) {
      const userToken = Meteor.users.findOne({ _id: retourId });
      if (userToken && userToken.profile && userToken.profile.token) {
        token = userToken.profile.token
      }
    }
    
    const stampedToken = Accounts._generateStampedLoginToken();
    Meteor.users.update(userId,
      { $push: { 'services.resume.loginTokens': stampedToken } },
    );
    this.setUserId(userId);
    // console.log(userId);
    return {
      userId,
      token: stampedToken.token,
      apiToken: token
    };
  }
  if (response && response.data && response.data.result === false) {
    throw new Meteor.Error(Accounts.LoginCancelledError.numericError, response.data.msg);
  } else if (response && response.data && response.data.result === true && response.data.msg) {
    throw new Meteor.Error(response.data.msg);
  }
});
