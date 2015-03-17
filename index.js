// ### Libraries and globals

var _ = require('underscore');
// TODO: use the npm-pos lib
var pos = require('pos');
// var config = require('./config.js');
// var Twit = require('twit');
// var T = new Twit(config);
var fs = require('fs');

// ### Utility Functions

// temporary
var config = {
  log: true,
  minutes: 1,
  seconds: 5
};

var logger = function(msg) {
  // console.log('logging?: ' + config.log);
  if (config.log) console.log(msg);
};

// adding to array.prototype caused issues with nlp_compromise
var pick = function(arr) {
  return arr[Math.floor(Math.random()*arr.length)];
};

var pickRemove = function(arr) {
  var index = Math.floor(Math.random()*arr.length);
  return arr.splice(index,1)[0];
};


var getRandom = function(min,max) {
  return Math.floor(Math.random() * (max - min) + min);
};

// crude fix for the encoding problems I've encountered
// not sure what the best way to do this is. :-(
var clean = function(text) {
  text = text.replace(' ', ' ').replace('’', "\'");
  text = text.replace('“', '"').replace('”', '"');
  return text;
};


var direction = {
  forward: 0,
  reverse: 1
};


// text as string
// var dumpInfo = function(text) {

//   logger('\n\ntext: ' + text);

//   var p = nlp.pos(text);
//   var tokens = p[0].tokens;

//   for (var i = 0; i < tokens.length; i++) {
//     var t = tokens[i];
//     logger('text: ' + t.text + ' (' + t.pos.tag + ')');
//   }

//   var nn = getNounArray(text);
//   logger(nn.join(' -  '));
// };

var stripWord = function(word) {

  // let punctuation and possessives remain
  // TODO: unit-tests for various errors we encounter
  // Venice's := Venice
  // VENICE'S := VENICE
  // etc.
  var removals = ['"', ':', '-', ',', '\'s$', '\\(', '\\)', '\\[', '\\]' ];

  for (var i = 0 ; i < removals.length; i++) {
    var r = removals[i];
    word = word.replace(new RegExp(r, 'i'), '');
  }

  return word;
};



var getNounArray = function(text) {

  //  var pos = require('pos');
  //  var s = 'Embattled Oregon Governor Says He Will Resign'
  //  var words = new pos.Lexer().lex(s);
  //  var taggedWords = new pos.Tagger().tag(words);
  //  taggedWords
  // [ [ 'Embattled', 'JJ' ],
  //   [ 'Oregon', 'NNP' ],
  //   [ 'Governor', 'NNP' ],
  //   [ 'Says', 'VBZ' ],
  //   [ 'He', 'PRP' ],
  //   [ 'Will', 'MD' ],
  //   [ 'Resign', 'VB' ] ]
  var nn = [];
  var currn = [];
  var active = false;
  var targetPos = 'NNPSNNS'; // NN, NNP, NNPS, NNS
  var words = new pos.Lexer().lex(text);
  var taggedWords = new pos.Tagger().tag(words);
  for (var i in taggedWords) {
    var taggedWord = taggedWords[i];
    if (targetPos.indexOf(taggedWord[1]) > -1) {
      // consider sequention nouns to be a noun-phrase
      // this is probably a crap algorithm
      currn.push(taggedWord[0]);
    } else {
      if (currn.length > 0) {
        nn.push(currn.join(' '));
        currn = [];
      }
    }
  }

  return nn;

};


var getPOSarray = function(text, targetPos) {

  var parts = [];
  var words = new pos.Lexer().lex(text);
  var taggedWords = new pos.Tagger().tag(words);

  for (var i = 0; i < taggedWords.length; i++) {
    var t = taggedWords[i];
    if (targetPos.indexOf(t[1]) > -1) {
      parts.push(stripWord(t[0]));
    }
  }

  return parts;

};

var getPOSarrayFull = function(text) {

  var parts = [];

  try {
    var words = new pos.Lexer().lex(text);
    var taggedWords = new pos.Tagger().tag(words);

    for (var i = 0; i < taggedWords.length; i++) {
      var t = taggedWords[i];
      parts.push({ word: stripWord(t[0]), pos: t[1] });
    }
  } catch (err) {
    console.log(err.message);
  }

  return parts;

};

var firstPOS = function(parts, pos) {

  var word = '';

  for(var i = 0; i < parts.length; i++) {
    if (parts[i].pos == pos) {
      word = parts[i].word;
      break;
    }
  }

  return word;
};

// split on inner punctuation
var splitterPunct = function(h1, h2) {

  // logger('splitterPunct');

  var h1Loc = h1.indexOf(':');
  var h2Loc = h2.indexOf(':');

  var sent = h1.slice(0, h1Loc) + h2.slice(h2Loc);
  return sent;

};

var splitterPos = function(h1,h2) {

  // logger('splitterPos');

  var pos = 'CC';

  var words1 = getPOSarrayFull(h1);
  var words2 = getPOSarrayFull(h2);

  // sentence1 up to CC
  // then sentence2 from CC

  // we don't do token replacement, because then we lose punctuation, etc.
  var firstCC = firstPOS(words1, pos);
  var secondCC = firstPOS(words2, pos);

  var firstLoc = h1.indexOf(firstCC);
  var secondLoc = h2.indexOf(secondCC); // - secondCC.length;

  var sent = h1.slice(0, firstLoc) + h2.slice(secondLoc);

  return sent;


};

// TODO: wait, how does this work?
var woodSplitter = function(h1, h2) {

  var t1 = nlp.tokenize(h1)[0].tokens;
  var t2 = nlp.tokenize(h2)[0].tokens;

  var pos1 = t1[Math.floor(Math.random()*t1.length)].text;
  var pos2 = t2[Math.floor(Math.random()*t2.length)].text;

  var w1 = h1.search(new RegExp('\\b' + pos1 + '\\b'));
  var w2 = h2.search(new RegExp('\\b' + pos2 + '\\b'));

  var sent = h1.slice(0, w1).trim() + ' '  + h2.slice(w2).trim();

  return sent;

};

var replacer = function(pos, vector) {

  var posReplacement = function(h1, h2) {

    // logger('posReplacement');

    var sent = h1;

    var words1 = getPOSarray(h1, pos);
    var words2 = getPOSarray(h2, pos);

    var longest = ( words1.length > words2.length ? words1.length : words2.length);

    // the shortest list needs to be modded against its length
    for (var i = 0; i < longest; i++) {
      // logger('replace: ' + words1[i % words1.length] + ' with: ' +  words2[i % words2.length]);
      sent = sent.replace(new RegExp('\\b' + words1[i % words1.length] + '\\b', 'i'), words2[i % words2.length]);
    }

    return sent;

  };

  // loop through the second (smaller) array in reverse.
  // uh. wheeee?
  var replacementPos = function(h1, h2) {

    // logger('replacementPos');

    var sent = h1;

    var words1 = getPOSarray(h1, pos);
    var words2 = getPOSarray(h2, pos);

    var longest = ( words1.length > words2.length ? words1.length : words2.length);

    // ugh ugh ugh ugh ugh
    var w2i = words2.length;
    // the shortest list needs to be modded against its length
    for (var i = 0; i < longest; i++) {
      w2i--;
      if (w2i < 0) w2i = words2.length - 1;
      var invert = w2i;
      // logger('i: ' + i + ' invert: ' + invert);
      sent = sent.replace(new RegExp('\\b' + words1[i % words1.length] + '\\b', 'i'), words2[invert]);
    }

    return sent;

  };

  return (vector == direction.forward ? posReplacement : replacementPos);

};


var hasPOS = function(h1, h2, pos) {

  var h1f = false;
  var h2f = false;

  for (var i = 0; i < h1.length; i++) {
    if (h1[i].pos == pos) {
      h1f = true;
      break;
    }
  }

  for (i = 0; i < h2.length; i++) {
    if (h2[i].pos == pos) {
      h2f = true;
      break;
    }
  }

  var found = h1f && h2f;

  // if (pos == 'NN') console.log('found: ' + found);

  return found;

};


var hasColons = function(h1, h2) {

  return (h1.indexOf(':') > -1 && h2.indexOf(':') > -1);

};

// 50-50 chance (unless override)
var coinflip = function(chance) {

  if (!chance) chance = 0.5;

  return (Math.random() < chance);

};

// input: two texts as strings
// output: a strategy method
var getStrategy = function(h1, h2) {

  // logger('getStrategy');

  var hp1 = getPOSarrayFull(h1);
  var hp2 = getPOSarrayFull(h2);
  var ccs = hasPOS(hp1,hp2, 'CC');
  var colons = hasColons(h1, h2);
  var nns = hasPOS(hp1, hp2, 'NN');

  var strategy;

  if (colons && coinflip(0.75)) {
    strategy = splitterPunct;
  }
  else if(ccs && coinflip(0.75)) {
    strategy = splitterPos;
  } else if (nns && coinflip(0.8)) {
    strategy = (Math.random() > 0.5) ? replacer('NN', direction.forward) : replacer('NN', direction.reverse);
  } else {
    strategy = (Math.random() > 0.5) ? replacer('NN', direction.forward) : replacer('NN', direction.reverse);
    // strategy = woodSplitter;
  }

  return strategy;
};

var picker = function(texts) {

  // logger('picker!');

  var h1 = pickRemove(texts);
  var h2 = pickRemove(texts);

  logger('\nh1: ' + h1.name + '\nh2:' + h2.name);

  var two = [h1, h2];

  return two;

};

// we do NOT have the data here... :-(
var tweeter = function(texts) {

  logger('tweeter!');

  fs.readFile('motifs.txt', 'utf8', function(err, data) {

    if (err) {
      return console.log(err);
    }

    var lines = data.trim().split('\n');

    var catmyth1 = pickRemove(lines).trim().replace('\r', '');
    var catmyth2 = pickRemove(lines).trim().replace('\r', '');

    var myth1 = catmyth1.substr(catmyth1.indexOf(' ') + 1);
    var myth2 = catmyth2.substr(catmyth2.indexOf(' ') + 1);

    logger('\nm1: ' + myth1 + '\nm2: ' + myth2);

    var strategy = getStrategy(myth1, myth2);

    try {
      var newSentence = strategy(myth1, myth2);
      // capitalize first word
      // I tried inflection's "titleize" but that zapped acronyms like "SSN" and "NSA"
      newSentence = newSentence.slice(0,1).toUpperCase() + newSentence.slice(1);

      logger(newSentence);

      if(!newSentence) {
	logger('NOTHING NOTHING NOTHING');
      }
    } catch (err) {
      console.log('Error: ' + err.message);
    }

    if (newSentence.length === 0 || newSentence.length > 140) {
      tweet();
    } else {
      if (config.tweet_on) {
	T.post('statuses/update', { status: newSentence }, function(err, reply) {
	  if (err) {
	    console.log('error:', err);
	  }
	  else {
            // nothing on success
	  }
	});
      }
    }
  });

};


// Tweets ever n minutes
// set config.seconds to 60 for a complete minute
setInterval(function () {
  try {
    tweeter();
  }
  catch (e) {
    console.log(e);
  }
}, 1000 * config.minutes * config.seconds);

// Tweets once on initialization.
tweeter();
