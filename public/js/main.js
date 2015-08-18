(function() {
    var app = angular.module("ChatApp", []);

    app.controller("ChatController", function($scope, $http) {
        $scope.loggedIn = false;
        $scope.messageArray = [];
        $scope.allMessageString = "";
        $scope.currentChatTarget = "";
        $scope.textarea = document.getElementById("chatarea");
        $scope.intervalSet = false;

        $http.get("/api/user").then(function(userResult) {
            $scope.loggedIn = true;
            $scope.user = userResult.data;
            $http.get("/api/users").then(function(result) {
                $scope.users = result.data;
                $scope.startUsersInterval();
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
                $scope.newMessage = "";
                $scope.allMessageString = "";
                $scope.getMessages($scope.currentChatTarget);
            }, function (response) {
                $scope.errorText = "Failed to send message. Reason: " + response.status + " - " + response.responseText;
            });
        };

        $scope.getUsers = function() {
            $http.get("/api/users").then(function(result) {
                $scope.users = result.data;
            });
        };

        $scope.getMessages = function(user) {
            $scope.id = "";
            if (!user) {
                $scope.id = $scope.currentChatTarget.id;
            } else {
                $scope.id = user.id;
                $scope.currentChatTarget = user;
            }
            $http.get("/api/conversations/" + $scope.id).then(function(result) {
                $scope.allMessageString = "";
                $scope.messageArray = [];
                $scope.messages = result.data;
                $scope.convertMessages();

                if ($scope.intervalSet === false) {
                    $scope.startMessageInterval();
                    $scope.intervalSet = true;
                }
            });
        };

        $scope.convertMessages = function() {
            $scope.messages.forEach(function(message) {
                $scope.formattedTime = new Date (message.sendDate).toUTCString().slice(17, 25);
                $scope.formattedDate = new Date (message.sendDate).toUTCString().slice(0, 16);

                if (message.senderId !== message.sendToId) {
                    if (($scope.formattedDate !== $scope.previousDate)) {
                        $scope.messageArray.push("");
                        $scope.messageArray.push($scope.formattedDate);
                        $scope.previousDate = $scope.formattedDate;
                    }
                    $scope.messageString = $scope.formattedTime + " - " + message.senderId + ": " + message.message;
                    $scope.messageArray.push($scope.messageString);
                }
            });
            $scope.allMessageString = $scope.messageArray.join("\n");
            $scope.textarea.scrollTop = $scope.textarea.scrollHeight;
            $scope.previousDate = "";
        };

        $scope.startMessageInterval = function() {
            setInterval($scope.getMessages, 2500);
        };

        $scope.startUsersInterval = function () {
            setInterval($scope.getUsers, 5000);
        }
    });
})();
