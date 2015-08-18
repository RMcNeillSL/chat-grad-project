(function() {
    var app = angular.module("ChatApp", []);

    app.controller("ChatController", function($scope, $http) {
        $scope.loggedIn = false;
        $scope.messageArray = [];
        $scope.allMessageString = "";
        $scope.currentChatTarget = "";

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

        $scope.sendMessage = function(newMessage) {
            $http.post("/api/conversations/" + $scope.currentChatTarget.id, {
                "sent": Date.now(),
                "body": newMessage
            }).then(function (response) {
                $scope.allMessageString = "";
                $scope.getMessages($scope.currentChatTarget);
            }, function (response) {
                $scope.errorText = "Failed to send message. Reason: " + response.status + " - " + response.responseText;
            });
        };

        $scope.getMessages = function(user) {
            $http.get("/api/conversations/" + user.id).then(function(result) {
                $scope.allMessageString = "";
                $scope.messageArray = [];
                $scope.messages = result.data;
                $scope.currentChatTarget = user;
                $scope.convertMessages();
            })
        };

        $scope.convertMessages = function() {
            $scope.messages.forEach(function(message) {
                $scope.formattedDate = new Date (message.sendDate);

                if(message.senderId !== message.sendToId) {
                    $scope.messageString = message.senderId + " TO " + message.sendToId + " AT " + $scope.formattedDate
                        + ": " + message.message;
                    $scope.messageArray.push($scope.messageString);
                }
            });
            $scope.allMessageString = $scope.messageArray.join("\n");
        }
    });
})();
