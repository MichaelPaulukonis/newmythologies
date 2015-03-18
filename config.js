// Put your own Twitter App keys here. See README.md for more detail.
// if you see 'process.env.SOMETHING' that means it's a heroku environment variable
// heroku plugins:install https://github.com/ddollar/heroku-config.git
// and will only work with 'foreman start worker'
module.exports = {
    consumer_key:         process.env.CONSUMER_KEY,
    consumer_secret:      process.env.CONSUMER_SECRET,
    access_token:         process.env.ACCESS_TOKEN,
    access_token_secret:  process.env.ACCESS_TOKEN_SECRET,

    // static_lib:           (process.env.STATIC_LIB.toLowerCase() === 'true'),
    tweet_on:             (process.env.TWEET_ON.toLowerCase() === 'true'),
    log:                  (process.env.LOG.toLowerCase() === 'true'),
    seconds:              parseInt(process.env.SECONDS, 10),
    minutes:              parseInt(process.env.MINUTES, 10)
};
