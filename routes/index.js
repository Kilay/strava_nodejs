var strava = require('strava-v3');
var express = require('express');
var multiparty = require('connect-multiparty');
var fs = require('fs');
var storage = require('node-persist');
var http = require('http');

var router = express.Router();
var multipartyMiddleware = multiparty();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/strava/list/:page', function(req, res, next) {
    strava.athlete.listActivities({'page':req.params.page},function(err, response) {
        if(err){ return next(err); }
        if(!err) {
            res.json(response);
        }
    });
});

router.get('/strava/stats/:athlete_id', function(req, res, next) {
    strava.athletes.stats({'id':req.params.athlete_id},function(err, response) {
        if(err){ return next(err); }
        if(!err) {
            res.send(response);
        }
    });
});

router.get('/strava/activity/:activity_id', function(req, res, next) {
    strava.activities.get({'id':req.params.activity_id},function(err, response) {
        if(err){ return next(err); }
        if(!err) {
            res.send(response);
        }
    });
});

router.put('/strava/activity/:activity_id', function(req, res, next) {
    var type = req.body.type;
    var args = {id : req.params.activity_id};
    args[type] = req.body.data;
    strava.activities.update(args,function(err, response) {
        if(err){ return next(err); }
        if(!err) {
            res.send(response);
        }
    });
});

router.get('/strava/friends/:athlete_id', function(req, res, next) {
    strava.athletes.listFriends({'id':req.params.athlete_id},function(err, response) {
        if(err){ return next(err); }
        if(!err) {
            res.send(response);
        }
    });
});

router.post('/strava/upload', multipartyMiddleware, function(req, res) {
    var file = req.files.file;
    strava.oauth.getRequestAccessURL({scope:"view_private write"});
    strava.uploads.post({
        'data_type':'gpx',
        'file': file.path,
        'statusCallback': function(err,payload) {
            if(payload.status != "Your activity is still being processed.")
                res.send(payload);
        }
    },function(err,payload) {
    });
});

router.get('/strava/auto/upload', function(req, res, next) {
    fs.readdir("data/gpx", function(err, files) {
        if(err) {
            console.log(err);
        } else {
            var filesToUpload = [];
            storage.initSync();
            for(var i = 0; i < files.length; i++) {
                if(storage.getItem(files[i]) == null) {
                    filesToUpload.push(files[i]);
                }
            }
            res.send(filesToUpload);
        }
    });
});

router.get('/strava/auto/upload/:file', function(req, res, next) {
    strava.oauth.getRequestAccessURL({scope:"view_private write"});
    strava.uploads.post({
        'data_type':'gpx',
        'file': 'data/gpx/' + decodeURIComponent(req.params.file),
        'statusCallback': function(err,payload) {
            if(payload.status != "Your activity is still being processed.") {
                storage.initSync();
                storage.setItem(payload.external_id, {external_id: payload.external_id,upload_id: payload.id, id: payload.activity_id});
                res.send(payload);
            }
        }
    },function(err,payload) {
    });
});

router.put
router.get('/strava/gears', function(req, res, next) {
    fs.readFile("data/gears.json", 'utf8', function (err, data) {
        if (err) {
            console.log('Error: ' + err);
            return;
        }
        res.send(JSON.parse(data));
    });
});

/*
router.param('activity', function(req, res, next, id) {
    strava.activities.get({'id':id},function(err, response) {
        if(err){ return next(err); }
        if(!err) {
            req.activity = response;
            return next();
        }
    });

});
*/
module.exports = router;
