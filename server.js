/*
CSC3916 HW2
File: Server.js
Description: Web API scaffolding for Movie API
 */
var Movie = require('./Movies'); //imported movies and users
var User = require('./Users'); 
var Review = require('./Reviews');
var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var passport = require('passport');
var authController = require('./auth');
var authJwtController = require('./auth_jwt');
db = require('./db')(); //hack
var jwt = require('jsonwebtoken');
var cors = require('cors');
var basicAuth = require('basic-auth');

var app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

var router = express.Router();






function getJSONObjectForMovieRequirement(req) {
    var json = {
        headers: "No headers",
        key: process.env.UNIQUE_KEY,
        body: "No body"
    };

    if (req.body != null) {
        json.body = req.body;
    }

    if (req.headers != null) {
        json.headers = req.headers;
    }

    return json;
}

router.post('/signup', (req, res) => {
    if (!req.body.username || !req.body.password) {
        res.json({success: false, msg: 'Please include both username and password to signup.'});
    } else {
        var newUser = new User({
            username: req.body.username,
            password: req.body.password // Password hashing is handled in the User model
        });

        newUser.save().then(() => {
            res.json({success: true, msg: 'Successfully created new user.'});
        }).catch(err => {
            res.json({success: false, msg: 'Username already exists.', error: err.message});
        });
    }
});



router.post('/signin', async (req, res) => {
    console.log("Signin route hit with username:", req.body.username);
    try {
        const user = await User.findOne({ username: req.body.username }).select('+password').exec();
        if (!user) {
            console.log("User not found:", req.body.username);
            return res.status(401).send({success: false, msg: 'Authentication failed. User not found.'});
        }

        console.log("User found, comparing password for user:", req.body.username);
        const isMatch = await user.comparePassword(req.body.password);
        if (isMatch) {
            console.log("Password matches for user:", req.body.username);
            var userToken = { id: user._id, username: user.username };
            var token = jwt.sign(userToken, process.env.SECRET_KEY);
            res.json({ success: true, token: 'JWT ' + token });
        } else {
            console.log("Password does not match for user:", req.body.username);
            res.status(401).send({ success: false, msg: 'Authentication failed.' });
        }
    } catch (err) {
        console.error("Error in signin route:", err);
        res.status(500).send({success: false, msg: 'Authentication failed.', error: err.message});
    }
});

router.route('/reviews')
  .get(authJwtController.isAuthenticated, (req, res) => {
    Review.find({})
      .then(reviews => res.json({success: true, message: "GET reviews", reviews: reviews}))
      .catch(err => res.status(500).json({success: false, message: "Error fetching reviews.", error: err.message}));
  })
  .post(authJwtController.isAuthenticated, (req, res) => {
    Movie.findById(req.body.movieId)
      .then(movie => {
        if (!movie) {
          return res.status(400).json({success: false, message: "Movie not found."});
        }
        
        var newReview = new Review({
          movieId: req.body.movieId,
          username: req.body.username,
          review: req.body.review,
          rating: req.body.rating
        });

        newReview.save()
          .then(review => res.json({success: true, message: "Review created!", review: review}))
          .catch(err => res.status(400).json({success: false, message: "Error saving review.", error: err.message}));
      })
      .catch(err => res.status(500).json({success: false, message: "Error checking movie existence.", error: err.message}));
  });


router.route('/reviews/:id')
  .delete(authJwtController.isAuthenticated, (req, res) => {
    Review.findByIdAndDelete(req.params.id)
      .then(review => {
        if (!review) {
          res.status(404).json({success: false, message: "Review not found."});
        } else {
          res.json({success: true, message: "Review deleted"});
        }
      })
      .catch(err => res.status(500).json({success: false, message: "Error deleting review.", error: err.message}));
  });


router.route('/testcollection')
    .delete(authController.isAuthenticated, (req, res) => {
        console.log(req.body);
        res = res.status(200);
        if (req.get('Content-Type')) {
            res = res.type(req.get('Content-Type'));
        }
        var o = getJSONObjectForMovieRequirement(req);
        res.json(o);
    }
    )
    .put(authJwtController.isAuthenticated, (req, res) => {
        console.log(req.body);
        res = res.status(200);
        if (req.get('Content-Type')) {
            res = res.type(req.get('Content-Type'));
        }
        var o = getJSONObjectForMovieRequirement(req);
        res.json(o);
    }
    );

    router.route('/movies')
    .get(authJwtController.isAuthenticated, (req, res) => {
      if (req.query.reviews === "true") {
        Movie.aggregate([
          {
            $lookup: {
              from: 'reviews',
              localField: '_id',
              foreignField: 'movieId',
              as: 'movieReviews'
            }
          },
          {
            $addFields: {
              avgRating: { $avg: '$movieReviews.rating' }
            }
          },
          {
            $sort: { avgRating: -1 }
          }
        ]).exec()
          .then(movies => {
            res.json({success: true, message: "GET movies with reviews", movies: movies});
          })
          .catch(err => {
            res.status(500).json({success: false, message: "Error fetching movies with reviews.", error: err.message});
          });
      } else {  
        Movie.find({})
          .exec()
          .then(movies => {
            res.json({success: true, message: "GET movies", movies: movies});
          })
          .catch(err => {
            res.status(500).json({success: false, message: "Error fetching movies.", error: err.message});
          });
      }
    })
    .post(authJwtController.isAuthenticated, (req, res) => {
        var newMovie = new Movie({
            title: req.body.title,
            releaseDate: req.body.releaseDate,
            genre: req.body.genre,
            actors: req.body.actors,
            imageUrl: req.body.imageUrl
        });
    
        newMovie.save()
            .then(movie => res.json({success: true, message: "Movie saved successfully.", movie: movie}))
            .catch(err => res.status(500).json({success: false, message: "Error saving movie.", error: err.message}));
    })
    .put(authJwtController.isAuthenticated, (req, res) => {
        Movie.findOneAndUpdate({ title: req.body.title }, req.body, { new: true })
            .then(movie => {
                if (!movie) {
                    res.status(404).json({success: false, message: "Movie not found."});
                } else {
                    res.json({success: true, message: "Movie updated", movie: movie});
                }
            })
            .catch(err => res.status(500).json({success: false, message: "Error updating movie.", error: err.message}));
    })
    .delete(authController.isAuthenticated, (req, res) => {
        Movie.findOneAndDelete({ title: req.body.title })
            .then(movie => {
                if (!movie) {
                    res.status(404).json({success: false, message: "Movie not found."});
                } else {
                    res.json({success: true, message: "Movie deleted"});
                }
            })
            .catch(err => res.status(500).json({success: false, message: "Error deleting movie.", error: err.message}));
    });


    router.use('*', (req, res) => {
        res.status(405).send({ message: 'HTTP method not supported.' });
    });

    router.route('/movies/:id')
  .get(authJwtController.isAuthenticated, (req, res) => {
    const movieId = new mongoose.Types.ObjectId(req.params.id);

    Movie.aggregate([
      {
        $match: { _id: movieId }
      },
      {
        $lookup: {
          from: 'reviews',
          localField: '_id',
          foreignField: 'movieId',
          as: 'reviews'
        }
      },
      {
        $addFields: {
          avgRating:  { $avg: '$reviews.rating' }
        }
      }
    ]).exec()
      .then(movie => {
        if (!movie || movie.length === 0) {
          return res.status(404).json({ success: false, message: "Movie not found." });
        }
        res.json({ success: true, movie: movie[0] });
      })
      .catch(err => res.status(500).json({ success: false, message: "Error fetching movie.", error: err.message }));
  });

    
app.use('/', router);
app.listen(process.env.PORT || 8080);
module.exports = app; // for testing only


