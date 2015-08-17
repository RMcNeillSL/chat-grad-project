(function() {
    var app = angular.module("ChatApp", []);

    app.controller("ChatController", function($scope, $http) {
        $scope.loggedIn = false;

        $http.get("/api/user").then(function(userResult) {
            $scope.loggedIn = true;
            $scope.user = userResult.data;
            $http.get("/api/users").then(function(result) {
                $scope.users = result.data;
            });
        }, function() {
            $http.get("/api/oauth/uri").then(function(result) {
                $scope.loginUri = result.data.uri;
            });
        });

        $scope.createChat = function(user, newMessage) {
            $http.post("/api/conversations/" + user.id, {
                "sent": Date.now(),
                "body": newMessage
            }).then(function (response) {
            }, function (response) {
                $scope.errorText = "Failed to send message. Reason: " + response.status + " - " + response.responseText;
            });
        };

        $scope.getMessages = function(user) {
            $http.get("/api/conversations/" + user.id).then(function(result) {
                $scope.messages = result.data;
                console.log($scope.messages);
            })
        }

    });
})();
