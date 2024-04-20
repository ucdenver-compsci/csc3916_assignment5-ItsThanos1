var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Movie schema
var MovieSchema = new Schema({
  title: { type: String, required: true, index: true },
  releaseDate: Date,
  genre: { type: String, enum: ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Thriller', 'Western', 'Science Fiction'] },
  actors: [{ actorName: String, characterName: String }],
  imageUrl: String // Add this line
});

// return the model
module.exports = mongoose.model('Movie', MovieSchema);
