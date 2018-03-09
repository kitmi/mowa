"use strict";

const LocalStrategy = require('passport-local').Strategy;

module.exports = (app, passport) => {

    //called after login
    passport.serializeUser((user, done) => {
        done(null, user.id)
    });

    //called if session has user
    passport.deserializeUser(function(id, done) {
        let user = { id /* findUser */ };
        done(null, user);
    });    
    
    passport.use(new LocalStrategy(
        function(username, password, done) {
            let error = false, validPassword = true, user = { id: 1 };

            if (error) {
                return done(error)
            }

            if (!user) {
                return done(null, false, { message: 'Invalid username.' });
            }

            if (!validPassword) {
                return done(null, false, { message: 'Invalid password.' });
            }

            done(null, user);
        }
    ));
};