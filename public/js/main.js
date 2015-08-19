(function() {
    var app = angular.module("ChatApp", []);

    app.controller("ChatController", function($scope, $http) {
        $scope.loggedIn = false;
        $scope.messageArray = [];
        $scope.allMessageString = "";
        $scope.currentChatTarget = "";
        $scope.textarea = document.getElementById("chatarea");
        $scope.intervalSet = false;
        $scope.lastNumberMessages = "";
        $scope.missedMessages = "0";

        $http.get("/api/user").then(function(userResult) {
            $scope.loggedIn = true;
            $scope.user = userResult.data;
            $http.get("/api/users").then(function(result) {
                $scope.users = result.data;
                $scope.startUsersInterval();
                $scope.startAllMessageInterval();
                $scope.clearNotifications();
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
                $scope.getAllMessages();
                $scope.clearNotifications();
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

                if ($scope.numberOfMessages !== $scope.lastNumberMessages) {
                    $scope.missedMessages = ($scope.numberOfMessages - $scope.lastNumberMessages);
                } else {
                    $scope.missedMessages = "";
                }

                //angular.element(window).bind("focus", function() {
                //    console.log("enter");
                //}).bind("blur", function() {
                //    console.log("out");
                //});
            });
        };

        $scope.clearNotifications = function() {
            $scope.lastNumberMessages = $scope.numberOfMessages;
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
