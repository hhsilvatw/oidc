# oidc 
[restify](https://github.com/restify/node-restify) middleware to enable [OpenID Connect](http://openid.net/connect/) claims based __authentication__ against an oidc provider (tested against Okta Preview).

## Summary
This project basically came about as I wanted to make use of Json Web Tokens in a microservers architecture to pass around claims related to identity without constantly querying the OAuth server.

### Key Features

  - Minimal configuration, automatic OpenID configuration discovery (/.well-known/openid-configuration)
  - Validation of JWTs against the Published Public Keys (jwks_uri) of the OpenID Connect provider
  
### Limitations

  - Only supports RSA (RS256, RS384, RS512) signed JWT tokens at the moment
  - OIDC Provider public keys are cached once downloaded until the server restarts, as per the [Okta OIDC](http://developer.okta.com/docs/api/resources/oidc) spec, these change four times per year without warning
  - Only basic user information is returned at the moment, need to add the /userinfo extension
  - This code is so happy path it's not even funny
  - Was largely a discovery project; subsequently there is a lack of unit tests

## Authentication, not Authorisation
The purpose here is to prove to the microservices __who you are__, not __what you can do__.  Subsequently; you'll need to think about AuthZ, and your implementation is going to be highly dependent on your architecture (each service might have it's own AuthZ?  You might not need AuthZ because everyone can do everything if they're authenticated?).

Remember the JWT is just a signed set of claims, by one server, that another server trusts.  For example:

"Hi __Application Server__, I want to access your resources and my username is __bob__, here is proof i am bob from __Okta__ in the form of a JWT that's signed by Oktas private key"

## Example
### Use case
Your user is visiting a web page which aggregates information from multiple other microservices, each of those microservices however needs to know that you're authenticated, and who you are in order to provide the information back to you.

### Components

  - Okta as an OpenID Connect provider
  - Application: Some web application
  - Microservice 1
  - Microservice 2

### Sequence
The sequence looks like this:
![sequence](websequence/authentication_flow.png?raw=true)

__Note:__ Security Consideration: If a JWT is going to leave your network; it would be good practice to dereference it first.  For example; if NGINX was in front of all of these services, it could handle the referencing of an incoming arbitary token to a JWT, which is then passed to the upstream.

### The Code
Here is an example of the above flow

```javascript
let restify = require('restify');
let oidc = require('oidc');

let server = restify.createServer({
  name: 'Your super awesome application server',
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
    res.redirect('/profile?id_token=' + req.user.jwt.raw, next);
  }
);

// Protected resource expects the jwt to prove who they are to be passed
// in the query string as id_token=jwthash, not passing jwt here results 
// in a 401
server.get(
  '/profile',
  middleware.auth(),
  (req, res) => {
    res.send(req.user);
  }
);

server.listen(9000);
```
