var app = angular.module('strava', ['ui.router','strava', 'angular-loading-bar', 'angularFileUpload', 'xeditable']);

app.run(function(editableOptions) {
    editableOptions.theme = 'bs3';
});

app.config([
    'cfpLoadingBarProvider',
    function(cfpLoadingBarProvider) {
        cfpLoadingBarProvider.includeSpinner = false;
    }
]);

app.config([
    '$stateProvider',
    '$urlRouterProvider',
    function($stateProvider, $urlRouterProvider) {
        $stateProvider
        .state('home', {
            url: '/home',
            templateUrl: '/stravastats',
            controller: 'DashboardController',
            resolve: {
                statistics: ['$stateParams', 'strava', function($stateParams, strava) {
                    var p=strava.getStats('2851812');
                    return p;
                }]
            }
        })
        .state('stravalist', {
            url: '/strava/list/{page}',
            templateUrl: '/stravalist',
            controller: 'StravaController',
            resolve: {
                activities: ['$stateParams', 'strava', function($stateParams, strava) {
                    return strava.getAll($stateParams.page);
                }]
            }
        })
        .state('activity', {
            url: '/strava/activity/{activity_id}',
            templateUrl: '/activity',
            controller: 'StravaController',
            resolve: {
                activity: ['$stateParams', 'strava', function($stateParams, strava) {
                    return strava.get($stateParams.activity_id);
                }]
            }
        })
        .state('stravastats', {
            url: '/strava/stats/{athlete_id}',
            templateUrl: '/stravastats',
            controller: 'StravaController',
            resolve: {
                activities: ['$stateParams', 'strava', function($stateParams, strava) {
                    return strava.getStats($stateParams.athlete_id);
                }]
            }
        })
        .state('stravaupload', {
            url: '/strava/upload',
            views: {
                '': {
                    templateUrl: '/strava/upload',
                    controller: 'StravaController'
                },
                'alerts': {
                    templateUrl: '/alerts',
                    controller: 'DashboardController'
                },
            }
        })
        .state('stravaautoupload', {
            url: '/strava/auto/upload',
            views: {
                '': {
                    templateUrl: '/strava/auto/upload',
                    controller: 'StravaController',
                    resolve: {
                        alerts: ['strava', function(strava) {
                            return strava.autoUpload();
                        }]
                    }
                },
                'alerts': {
                    templateUrl: '/alerts',
                    controller: 'DashboardController'
                },
            }
        })
        .state('stravagears', {
            url: '/strava/gears',
            templateUrl: '/stravagears',
            controller: 'StravaController',
            resolve: {
                activities: ['$stateParams', 'strava', function($stateParams, strava) {
                    return strava.getGears();
                }]
            }
        });
        
        /*
        .state('stravafriends', {
            url: '/strava/friends/{athlete_id}',
            views: {
                "friends": {
                    templateUrl: '/stravafriends',
                    controller: 'StravaController',
                    resolve: {
                        activities: ['$stateParams', 'strava', function($stateParams, strava) {
                            return strava.getFriends($stateParams.athlete_id);
                        }]
                    }
                }
            }
        });
        */
        $urlRouterProvider.otherwise('home');
    }
]);


app.controller('DashboardController', [
    '$scope',
    'strava',
    'dashboard',
    function($scope, strava, dashboard) {
        $scope.stats = strava.stats;
        $scope.notifications = dashboard.notifications;
        $scope.classNotification = dashboard.ee;
        $scope.hasUnreadNotifications = dashboard.hasUnreadNotifications;

        $scope.markNotificationsAsRead = function () {
            for (var i=0; i<dashboard.notifications.length; i++){
                dashboard.notifications[i].read = false;
            }
            if(dashboard.hasUnreadNotifications === true)
                $scope.classNotification = "progress-bar-danger";
            else
                $scope.classNotification = "";
        }
    }
]);

app.controller('StravaController', [
    '$scope',
    'strava',
    '$upload',
    '$sce',
    'dashboard',
    function($scope, strava, $upload, $sce, dashboard) {
        $scope.stravaUploads = strava.upload;
        $scope.activities = strava.activities;
        $scope.activity = strava.activity;
        $scope.gears = strava.gears;
        $scope.friends = strava.friends;
        $scope.stats = strava.stats;
        $scope.page = parseInt(strava.page);
        $scope.activity_types = [
            {id: 0, name: 'Course à pied'},
            {id: 1, name: 'Course'},
            {id: 2, name: 'Sortie longue'},
            {id: 3, name: 'Entraînement'}
        ]; 

        $scope.$watch('files', function () {
            $scope.upload($scope.files);
        });
        $scope.upload = function (files) {
            if (files && files.length) {
                for (var i = 0; i < files.length; i++) {
                    var file = files[i];
                    $upload.upload({
                        url: 'strava/upload',
                        method: 'POST',
                        file: file
                    }).progress(function (evt) {
                        var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
                        $scope.dynamic = progressPercentage;
                    }).success(function (data, status, headers, config) {
                        var type = 'success';
                        var icon = 'fa-check-circle';
                        if(data.status.indexOf("error") > -1) {
                            type = 'danger';
                            icon = 'fa-exclamation-triangle';
                        }
                        $scope.addAlert('<strong>' + data.status + '</strong>', data.error, type, icon);
                    });
                }
            }
        };
        $scope.getGears = function() {
            return $scope.gears.length ? null : strava.getGears();
        };
        $scope.updateActivity = function(type, data) {
            return strava.updateActivity($scope.activity.id, type, data);
        };
        $scope.addAlert = function(title, message, type, icon) {
            $scope.alerts.push({title: $sce.trustAsHtml(title), message: $sce.trustAsHtml(message), type: type});
            dashboard.addAlert(title, message, type, icon);
        };
        $scope.closeAlert = function(index) {
            $scope.alerts.splice(index, 1);
        };
    }
]);

app.directive('rowClickable', function() {
    return function(scope, element, attrs) {
        element.click(function() {
            window.document.location = $(this).data('url');
        }).css("cursor", "pointer");
    };
})

app.factory('dashboard', ['$sce', function ($sce) {
    var o = {
        notifications: [],
        hasUnreadNotifications: false,
    };
    o.addAlert = function(title, message, type, icon) {
        var e = (message == "") ? "ddd" : "eee";
        o.notifications.push({title: $sce.trustAsHtml(title), message: (message != null) ? $sce.trustAsHtml(message) : "", read: true, type: type, icon: icon});
        o.hasUnreadNotifications = true;
    }
    o.markNotificationsAsRead = function () {
        for (var i=0; i<o.notifications.length; i++){
            o.notifications[i].read = false;
        }
        o.hasUnreadNotifications = false;
    }
    o.getBadgeNotificationClass = function () {
        if(o.hasUnreadNotifications === true)
            return "progress-bar-danger";
        else
            return "";
    }

    return o;
}]);

app.factory('strava', ['$sce','$http', function($sce, $http) {
    var o = {
        activities: [],
        friends: [],
        gears: [],
        activity: null,
        stats: null,
        page: 1,
        upload: {gpxToUpload: 0, gpxUploaded: 0, alerts: []}
    };
    o.getGears = function() {
        return $http.get('/strava/gears/').success(function(data) {
            angular.copy(data, o.gears);
        });
    };
    o.getAll = function(page) {
        return $http.get('/strava/list/'+page).success(function(data) {
            o.page = page;
            for(var i = 0; i < data.length; i++) {
            	data[i].elapsed_time = moment.duration({'second' : data[i].elapsed_time});
            }
            angular.copy(data, o.activities);
        });
    };
    o.get = function(activity_id) {
        return $http.get('/strava/activity/'+activity_id).then(function(res) {
            o.activity = res.data;
            console.dir(o.activity);
            o.activity.elapsed_time = moment.duration({'second' : o.activity.elapsed_time});
            o.activity.moving_time = moment.duration({'second' : o.activity.moving_time});
        });
    };
    o.updateActivity = function(activity_id, type, data) {
        return $http.put('/strava/activity/'+activity_id, {type : type, data : data}).then(function(res) {
            o.activity = res.data;
        });
    };
    o.getFriends = function(athlete_id) {
        return $http.get('/strava/friends/'+athlete_id).then(function(res) {
            angular.copy(res.data, o.friends);
        });
    };
    o.getStats = function(athlete_id) {
        return $http.get('/strava/stats/'+athlete_id).then(function(res) {
            o.stats = res.data;
        });
    };
    o.autoUpload = function() {
        return $http.get('/strava/auto/upload').then(function(res) {
        	o.upload.gpxToUpload = res.data.length;
        	if(res.data.length === 0) {
        		o.addAlert({status: 'No activities to upload', type: 'info', icon: 'fa-exclamation-triangle'});	
        	}
            for(var i = 0; i < res.data.length; i++) {
                $http.get('/strava/auto/upload/'+res.data[i]).then(function(res) {
                    o.addAlert(res.data);
                    o.upload.gpxUploaded += 1;
                });
            }
        });
    };
    o.addAlert = function(data) {
    	var type = data.type;
        var icon = data.info;
        if(type == null) {
	        if(data.status.indexOf("error") > -1) {
	            type = 'danger';
	            icon = 'fa-exclamation-triangle';
	        }
	        else {
	        	type = 'success';
	        	icon = 'fa-check-circle';
	        }
    	}
        o.upload.alerts.push({title: $sce.trustAsHtml('<strong>' + data.status + '</strong>'), message: $sce.trustAsHtml(data.error), type: type, icon: icon});
    };
    return o;
}]);
