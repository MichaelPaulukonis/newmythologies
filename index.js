// ### Libraries and globals

var _ = require('underscore');
var pos = require('pos');
// var config = require('./config.js');
// var Twit = require('twit');
// var T = new Twit(config);
var motifCore = require('./motif.array.txt');
var motifs = JSON.parse(JSON.stringify(motifCore));

// ### Utility Functions

// temporary
var config = {
  log: false,
  minutes: 1,
  seconds: 2
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
var splitterPunct = function(s1, s2) {

  // logger('splitterPunct');

  var s1Loc = s1.indexOf(':');
  var s2Loc = s2.indexOf(':');

  var sent = s1.slice(0, s1Loc) + s2.slice(s2Loc);
  return sent;

};

var splitterPos = function(s1,s2) {

  // logger('splitterPos');

  var pos = 'CC';

  var words1 = getPOSarrayFull(s1);
  var words2 = getPOSarrayFull(s2);

  // sentence1 up to CC
  // then sentence2 from CC

  // we don't do token replacement, because then we lose punctuation, etc.
  var firstCC = firstPOS(words1, pos);
  var secondCC = firstPOS(words2, pos);

  var firstLoc = s1.indexOf(firstCC);
  var secondLoc = s2.indexOf(secondCC); // - secondCC.length;

  var sent = s1.slice(0, firstLoc) + s2.slice(secondLoc);

  return sent;


};


var isAlpha = function(text) {
  return (typeof text != 'undefined' && /^[\w]+/.test(text));
};

// almost random -- neither first nor last token, however
var getRandomToken = function(tokens) {
  return tokens[Math.floor(Math.random()*(tokens.length-1)) + 1];
};

// TODO: wait, how does this work?
// turn sentences into tokens
// split each sentence at some random token
// take first part of first sentence
// and second part of second sentence
// TODO: test this baby - where does it split????
var woodSplitter = function(s1, s2) {

  var t1 = new pos.Lexer().lex(s1);
  var t2 = new pos.Lexer().lex(s2);

  // TODO: must have at least 1 from s1
  // and at least 1 from s2
  // var pos1 = t1[Math.floor(Math.random()*(t1.length-1)) + 1];
  // var pos2 = t2[Math.floor(Math.random()*(t2.length-1)) + 1];

  var pos1, pos2;
  while (!isAlpha(pos1)) pos1 = getRandomToken(t1);
  while (!isAlpha(pos2)) pos2 = getRandomToken(t2);

  // console.log('pos1: ' + pos1 + ' pos2: ' + pos2);
  // TODO: tokens may not nesc be words
  // for example "'" or "," are all tokenized
  // so. HOW TO HANDLE????

  // m1: Mother's ghost tries to tear daughter to pieces.
  // m2: Why good-looking but soft, useless women attract men.
  // strategy: woodsplitter
  // pos1: tries pos2: ,
  // w1: 15 w2: -1
  // Mother's ghost .

  var w1 = s1.search(new RegExp('\\b' + pos1 + '\\b'));
  var w2 = s2.search(new RegExp('\\b' + pos2 + '\\b'));

  // console.log('w1: ' + w1 + ' w2: ' + w2);

  var sent = s1.slice(0, w1).trim() + ' '  + s2.slice(w2).trim();

  return sent;

};

var replacer = function(pos, vector) {

  var posReplacement = function(s1, s2) {

    // logger('posReplacement');

    var sent = s1;

    var words1 = getPOSarray(s1, pos);
    var words2 = getPOSarray(s2, pos);

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
  var replacementPos = function(s1, s2) {

    // logger('replacementPos');

    var sent = s1;

    var words1 = getPOSarray(s1, pos);
    var words2 = getPOSarray(s2, pos);

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


var hasPOS = function(s1, s2, pos) {

  var s1f = false;
  var s2f = false;

  for (var i = 0; i < s1.length; i++) {
    if (pos.indexOf(s1[i].pos) > -1) {
      // if (s1[i].pos == pos) {
      s1f = true;
      break;
    }
  }

  for (i = 0; i < s2.length; i++) {
    if (pos.indexOf(s2[i].pos) > -1) {
      // if (s2[i].pos == pos) {
      s2f = true;
      break;
    }
  }

  var found = s1f && s2f;

  // if (pos == 'NN') console.log('found: ' + found);

  return found;

};


var hasColons = function(s1, s2) {

  return (s1.indexOf(':') > -1 && s2.indexOf(':') > -1);

};

// 50-50 chance (unless override)
var coinflip = function(chance) {

  if (!chance) chance = 0.5;

  return (Math.random() < chance);

};

// input: two texts as strings
// output: a strategy method
var getStrategy = function(s1, s2) {

  // logger('getStrategy');

  var hp1 = getPOSarrayFull(s1);
  var hp2 = getPOSarrayFull(s2);
  var ccs = hasPOS(hp1,hp2, 'CC');
  var colons = hasColons(s1, s2);
  // TODO: trap for all possible variants
  var nns = hasPOS(hp1, hp2, 'NN');

  var strategy;

  if (colons && coinflip(0.5)) {
    logger('strategy: splitterPunct');
    strategy = splitterPunct;
  } else if(ccs && coinflip(0.75)) {
    logger('strategy: splitterPos');
    strategy = splitterPos;
  } else if (nns && coinflip(0.8)) {
    logger('strategy: replacer FOUND');
    strategy = (Math.random() > 0.5) ? replacer('NN', direction.forward) : replacer('NN', direction.reverse);
  } else {
    logger('strategy: woodsplitter');
    // TODO: we should NOT be running the replacer
    // BECUASE WE DON'T HAVE THE MATCHING parts of speech to do so!
    // strategy = (Math.random() > 0.5) ? replacer('NN', direction.forward) : replacer('NN', direction.reverse);
    strategy = woodSplitter;
  }

  return strategy;
};

var picker = function(texts) {

  // logger('picker!');

  var s1 = pickRemove(texts);
  var s2 = pickRemove(texts);

  logger('\ns1: ' + s1.name + '\ns2:' + s2.name);

  var two = [s1, s2];

  return two;

};

// we do NOT have the data here... :-(
var tweeter = function(texts) {

  logger('tweeter!');

  // fs.readFile('motifs.txt', 'utf8', function(err, data) {

  //   if (err) {
  //     return console.log(err);
  //   }

  //   var lines = data.trim().split('\n');

  //   var catmyth1 = pickRemove(lines).trim().replace('\r', '');
  //   var catmyth2 = pickRemove(lines).trim().replace('\r', '');

  //   var myth1 = catmyth1.substr(catmyth1.indexOf(' ') + 1);
  //   var myth2 = catmyth2.substr(catmyth2.indexOf(' ') + 1);

  // myth1 = "Mother's ghost tries to tear daughter to pieces.";
  // myth2 = "Why good-looking but soft, useless women attract men.";
  // strategy: replacer
  // Mother's undefined tries to tear undefined to pieces.

  logger(motifs);
  if (motifs.length < 2) {
    motifs = JSON.parse(JSON.stringify(motifCore));
  }

  var myth1 = pickRemove(motifs)[1];
  var myth2 = pickRemove(motifs)[1];

  logger('\nm1: ' + myth1 + '\nm2: ' + myth2);

  var strategy = getStrategy(myth1, myth2);

  try {
    var newSentence = strategy(myth1, myth2);
    // capitalize first word
    // I tried inflection's "titleize" but that zapped acronyms like "SSN" and "NSA"
    newSentence = newSentence.slice(0,1).toUpperCase() + newSentence.slice(1);

    console.log(newSentence);

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
  // });

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
