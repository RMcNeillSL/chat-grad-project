(function() {
    var app = angular.module("ChatApp", []);

    app.controller("ChatController", function($scope, $http) {
        $scope.loggedIn = false;
        $scope.messageArray = [];
        $scope.allMessageString = "";
        $scope.currentChatTarget = "";
        $scope.textarea = document.getElementById("chatarea");
        $scope.intervalSet = false;
        $scope.initialisation = false;
        $scope.lastNumberMessages = 0;
        $scope.numberOfMessages = 0;
        $scope.missedMessages = 0;
        $scope.activeChatCount = 0;

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
                $scope.lastNumberMessages++;
            }, function (response) {
                $scope.errorText = "Failed to send message. Reason: " + response.status + " - " + response.responseText;
            });
        };

        $scope.getUsers = function() {
            //console.log($scope.users);
            $http.get("/api/users").then(function(result) {
                $scope.tempUsers = result.data;
                $scope.loopCount = 0;

                for(var i=0; i<$scope.tempUsers.length; i++) {
                    $scope.users[i].avatarUrl = $scope.tempUsers[i].avatarUrl;
                    $scope.users[i].id = $scope.tempUsers[i].id;
                    $scope.users[i].name = $scope.tempUsers[i].name;
                }
            });
        };

        $scope.getMessages = function(user) {
            $scope.id = "";
            if (!user) {
                $scope.id = $scope.currentChatTarget.id;
            } else {
                user.active = true;
                $scope.id = user.id;
                $scope.currentChatTarget = user;
                $scope.activeChatCount++;
            }

            $http.get("/api/conversations/" + $scope.id).then(function(result) {
                $scope.allMessageString = "";
                $scope.messageArray = [];
                $scope.messages = result.data;
                $scope.numberOfMessages = $scope.messages.length;
                $scope.convertMessages();

                if ($scope.intervalSet === false) {
                    $scope.startMessageInterval();
                    $scope.intervalSet = true;
                }
            });
        };

        $scope.convertMessages = function() {
            $scope.messages.forEach(function(message) {
                $scope.formattedDate = new Date (message.sendDate).toUTCString().slice(0, 16);
                message.formattedTime = new Date (message.sendDate).toUTCString().slice(17, 25);
                message.formattedDate = new Date (message.sendDate).toUTCString().slice(0, 16);
            });
            //$scope.allMessageString = $scope.messageArray.join("\n");
            $scope.previousDate = "";
        };

        $scope.getAllMessages = function() {
            $http.get("/api/conversations/").then(function(result) {
                $scope.allMessages = result.data;
                $scope.numberOfMessages = $scope.allMessages.length;

                if(!$scope.initialisation || $scope.clearNotif) {
                    $scope.initialisation = true;
                    $scope.clearNotif = false;
                    $scope.lastNumberMessages = $scope.numberOfMessages;
                }

                if ($scope.numberOfMessages !== $scope.lastNumberMessages) {
                    $scope.missedMessages = ($scope.numberOfMessages - $scope.lastNumberMessages);
                    document.title = "The Speakeasy (" + $scope.missedMessages + ")";
                } else {
                    document.title = "The Speakeasy";
                    $scope.missedMessages = 0;
                }
            });
        };

        $scope.clearNotifications = function() {
            $scope.clearNotif = true;
        };

        $scope.startMessageInterval = function() {
            setInterval($scope.getMessages, 1000);
        };

        $scope.startAllMessageInterval = function() {
            setInterval($scope.getAllMessages, 5000);
        };

        $scope.startUsersInterval = function () {
            setInterval($scope.getUsers, 5000);
        };

        $scope.startUsersInterval();
        $scope.startAllMessageInterval();

    }); // END OF CONTROLLER

    app.directive("scrollToLast", ["$location", "$anchorScroll", function($location, $anchorScroll) {
        function linkFn(scope, element, attrs) {
            $location.hash(attrs.scrollToLast);
            $anchorScroll();
        }
        return {
            restrict: "AE",
            scope: {
            },
            link: linkFn
        };
    }]);
})();
