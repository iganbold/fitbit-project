var express = require('express');
var router  = express.Router();
var config  = require( '../config/oauth2.json' );
var fs      = require('fs');
var Fitbit  = require( 'fitbit-oauth2' );

// Simple token persist functions.
var tfile = 'fb-token.json';
var persist = {
    read: function( filename, cb ) {
        fs.readFile( filename, { encoding: 'utf8', flag: 'r' }, function( err, data ) {
            if ( err ) return cb( err );
            try {
                var token = JSON.parse( data );
                cb( null, token );
            } catch( err ) {
                cb( err );
            }
        });
    },
    write: function( filename, token, cb ) {
        console.log( 'persisting new token:', JSON.stringify( token ) );
        fs.writeFile( filename, JSON.stringify( token ), cb );
    }
};

var fitbit = new Fitbit( config.fitbit ); 

// middleware that is specific to this router
router.use(function timeLog(req, res, next) {
  console.log('Time: ', Date.now());
  next();
});


router.get('/auth',function(req,res){
  res.redirect( fitbit.authorizeURL());
});

// define the callback route
router.get('/callback', function(req, res, next) {
    var code = req.query.code;
    var done = false;
    fitbit.fetchToken( code, function( err, token ) {
        console.log(JSON.stringify( token ));
        // persist the token
        persist.write( tfile, token, function( err ) {
            if(done == false)
            {
                if ( err ) return next( err );
                done = true;
                res.redirect('/fitbit/profile');
            }
        });
    });
});

router.get('/profile', function(req, res) {
   fitbit.request({
        uri: "https://api.fitbit.com/1/user/-/profile.json",
        method: 'GET',
    }, ( err, body, token ) => {
        if ( err ) return next( err );
        var profile = JSON.parse( body );
        // if token is not null, a refesh has happened and we need to persist the new token
        if ( token ) {
          persist.write( tfile, token, function( err ) {
                if ( err ) return next( err );
                    res.send( '<pre>' + JSON.stringify( profile, null, 2 ) + '</pre>' );
            });  
        }
        else {
            res.send( '<pre>' + JSON.stringify( profile, null, 2 ) + '</pre>' );
        }
    });
});

module.exports = router;