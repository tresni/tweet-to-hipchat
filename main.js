var twitter = new (require('twitter'))({
	consumer_key: process.env.TWITTER_KEY,
	consumer_secret: process.env.TWITTER_SECRET
})
var hipchat = new (require('hipchatter'))(process.env.HIPCHAT_TOKEN)
var redis = require('redis')

if (process.env.REDIS_SOCKET) {
	redis = redis.createClient(process.env.REDIS_SOCKET, {})
}
else if (process.env.REDIS_PORT && process.env.REDIS_HOST) {
	redis = redis.createClient(process.env.REDIS_PORT, process.env.REDIS_HOST, {})
}
else {
	redis = redis.createClient()
}

redis.get('tweetchat::' + process.env.TWITTER_HANDLE, function (err, last_id) {
	var options = {
		screen_name: process.env.TWITTER_HANDLE,
		count: 1,
		exclude_replies: true,
		contributor_details: true,
		include_rts: false,
		trim_user: true,
	}

	if (last_id) {
		options.since_id = last_id;
	}

	twitter.getUserTimeline(
		options,
		function (tweets) {
			if (tweets.length) {
				console.log('we have data', tweets)
				hipchat.notify(process.env.HIPCHAT_ROOM, {
					message: 'https://twitter.com/' + process.env.TWITTER_HANDLE + ' /status/' + tweets[0].id_str,
					token: process.env.HIPCHAT_TOKEN,
					notify: process.env.HIPCHAT_NOTIFY == 'false' ? false : true,
					message_format: 'text'
				}, function (err) {
					if (err) console.log("ERROR!!!", err)
					else console.log('Notification sent')
				})

				redis.set('tweetchat::' + process.env.TWITTER_HANDLE, tweets[0].id_str, function (err) {
					console.log('stored & shutting down', err)
					redis.quit()
				})
			}
			else {
				redis.quit()
			}
		}
	)
})
