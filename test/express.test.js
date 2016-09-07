'use strict';
let restify = require('restify');
let express = require('express');
let should = require('should');
let bodyParser = require('body-parser');
let fs = require('fs');
var mock = require('mock-require');

mock('jsonwebtoken', {
  decode: function() {
    return JSON.parse(fs.readFileSync(__dirname + '/sample-data/jwt').toString());
  },
  verify: function() {
    return JSON.parse(fs.readFileSync(__dirname + '/sample-data/jwt').toString());
  }
});

let oidc = require('../');
describe('Express', () => {
  let server, mockOidcServer, auth;
  let port = 9481;
  let oidcPort = 9483;

  before(done => {
    server = express();
    server.use(bodyParser.json());

    mockOidcServer = restify.createServer({
      name: 'fake oidc server'
    });
    mockOidcServer.use(restify.queryParser());
    mockOidcServer.use(restify.bodyParser());

    let dynamicHandler = (req, res, next) => {
      try {
        let data = fs.readFileSync(__dirname + '/sample-data' + req.url);
        res.json(JSON.parse(data.toString()));
      } catch(ex) {
        console.log(ex);
        console.log(' !! ' + req.url);
        return res.send(400, 'No sample data found for ' + req.url);
      }
      next();
    };
    mockOidcServer.get('.*', dynamicHandler);
    mockOidcServer.post('.*', dynamicHandler);

    mockOidcServer.listen(oidcPort, () => {
      auth = new oidc.Auth({
        oidcServer: 'http://127.0.0.1:' + oidcPort,
        clientId: 'some-client-id',
        clientSecret: 'some-secret'
      }, () => {
        let middleware = new oidc.middleware.Express(auth);
        server.get('/protected', middleware.auth(), (req, res, next) => {
          res.json({
            youare: 'in'
          });
          next();
        });
        server.get('/login', middleware.auth({ redirectToOidc: true }));

        server.listen(port, done);
      });
    });
  });

  after(() => {
    mockOidcServer.close();
  });

  it('Should redirect to Odic if configured to do so', done => {
    let client = restify.createJsonClient({
      url: 'http://127.0.0.1:' + port,
      version: require('../package.json').version
    });
    client.get('/login', (err, req, res) => {
      should(err).eql(null);
      should(res.statusCode).eql(302);
      done();
    });
  });

  it('Should reject API requests without an id_token', done => {
    let client = restify.createJsonClient({
      url: 'http://127.0.0.1:' + port,
      version: require('../package.json').version
    });
    client.get('/protected', err => {
      should(err).not.eql(null);
      should(err.statusCode).eql(401, err.message);
      done();
    });
  });

});
