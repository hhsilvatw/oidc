'use strict';
let restify = require('restify');
let oidc = require('./');

let server = restify.createServer({
  name: 'Your super awesome API server',
  version: '0.1.0'
});

server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

let auth = new oidc.Auth({
  oidcServer: 'https://youraccount.oktapreview.com',
  clientId: 'clientid-here',
  clientSecret: 'clientsecret-here',
  callbackURL: 'http://127.0.0.1:9000/auth/okta/callback'
});
let middleware = new oidc.middleware.Restify(auth);

// Visiting this url, will redirect you to Okta for OAuth autentication
server.get(
  '/auth/okta',
  middleware.auth({
    redirectToOidc: true
  })
);

// This URL is called back from Okta
server.get(
  '/auth/okta/callback',
  middleware.auth(),
  (req, res, next) => {
    // Once we have a valid jwt; redirect to the profile page using it
    res.redirect('/profile?id_token=' + req.user.jwt, next);
  }
);

// Protected resource expects the jwt to prove who they are to be passed
// in the query string as id_token=jwthash
server.get(
  '/profile',
  middleware.auth(),
  (req, res) => {
    res.send(req.user);
  }
);

server.listen(9000);
