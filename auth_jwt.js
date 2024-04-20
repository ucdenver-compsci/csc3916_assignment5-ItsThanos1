var passport = require('passport');
var JwtStrategy = require('passport-jwt').Strategy;
var ExtractJwt = require('passport-jwt').ExtractJwt;
var User = require('./Users');

var opts = {};
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme("jwt");
opts.secretOrKey = process.env.SECRET_KEY;

passport.use(new JwtStrategy(opts, function(jwt_payload, done) {
    

    // Changed to use Promises instead of callback
    User.findById(jwt_payload.id).then(user => {
        if (user) {
            console.log("User found:", user);
            done(null, user);
        } else {
            console.log("No user found with ID from JWT payload:", jwt_payload.id);
            done(null, false);
        }
    }).catch(err => {
        console.error("Error during user lookup:", err);
        done(err, false);
    });
}));

exports.isAuthenticated = passport.authenticate('jwt', { session : false });
exports.secret = opts.secretOrKey ;