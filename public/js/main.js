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
                    $scope.startInterval();
                    $scope.intervalSet = true;
                }
            });
        };

        $scope.convertMessages = function() {
            $scope.messages.forEach(function(message) {
                $scope.formattedTime = new Date (message.sendDate).toUTCString().slice(17, 25);
                $scope.formattedDate = new Date (message.sendDate).toUTCString().slice(0, 16);


                if($scope.formattedDate !== $scope.previousDate) {
                    $scope.messageArray.push($scope.formattedDate);
                    $scope.previousDate = $scope.formattedDate;
                }
                if (message.senderId !== message.sendToId) {
                    $scope.messageString = $scope.formattedTime + " - " + message.senderId + ": " + message.message;
                    $scope.messageArray.push($scope.messageString);
                }
            });
            $scope.allMessageString = $scope.messageArray.join("\n");
            $scope.textarea.scrollTop = $scope.textarea.scrollHeight;
        };

        $scope.startInterval = function() {
            setInterval($scope.getMessages, 5000);
        };

        setInterval($scope.getUsers, 5000);
    });
})();
