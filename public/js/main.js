(function() {
    var app = angular.module("ChatApp", []);

    app.controller("ChatController", function($scope, $http) {
        $scope.loggedIn = false;
        $scope.currentChatTarget = "";
        $scope.intervalSet = false;
        $scope.initialisation = false;
        $scope.lastNumberMessages = 0;
        $scope.numberOfMessages = 0;
        $scope.missedMessages = 0;
        $scope.activeChatCount = 0;
        $scope.allMessages = [];
        $scope.tempMessageCount = 0;
        $scope.missedMessageReset = false;
        $scope.targetChatMessages = [];

        $scope.getSocket = function() {
            $scope.socket = io.connect("", {query: "userid=" + $scope.user._id});

            $scope.socket.on("message", function(message) {
                $scope.targetChatMessages.push(message);
                $scope.convertMessages();
            });
        };

        $http.get("/api/user").then(function(userResult) {
            $scope.loggedIn = true;
            $scope.user = userResult.data;
            $http.get("/api/users").then(function(result) {
                $scope.users = result.data;
                $scope.loopCount = 0;

                for (var i = 0; i < $scope.users.length; i++) {
                    $scope.users[i].active = false;
                    $scope.users[i].messageCount = 0;
                    $scope.users[i].newMessage = false;
                    $scope.users[i].newMessageCount = 0;
                }
                $scope.getSocket();
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
                //$scope.getMessages($scope.currentChatTarget);
                $scope.lastNumberMessages++;
            }, function (response) {
                $scope.errorText = "Failed to send message. Reason: " + response.status + " - " + response.responseText;
            });
        };

        $scope.getUsers = function() {
            $http.get("/api/users").then(function(result) {
                $scope.tempUsers = result.data;
                $scope.loopCount = 0;

                for (var i = 0; i < $scope.tempUsers.length; i++) {
                    $scope.users[i].avatarUrl = $scope.tempUsers[i].avatarUrl;
                    $scope.users[i].id = $scope.tempUsers[i].id;
                    $scope.users[i].name = $scope.tempUsers[i].name;

                    if ($scope.users[i].active !== true) {
                        $scope.users[i].active = false;
                    }
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
                user.newMessage = false;
                $scope.missedMessageReset = true;
                $scope.missedMessages = $scope.missedMessages - user.newMessageCount;
                $scope.lastNumberMessages = $scope.lastNumberMessages + user.newMessageCount;
                user.newMessageCount = 0;
                user.messageCount = 0;
                $scope.countMessagesFromUser();
            }

            $http.get("/api/conversations/" + $scope.id).then(function(result) {
                $scope.targetChatMessages = result.data;
                $scope.numberOfMessages = $scope.targetChatMessages.length;
                $scope.convertMessages();

                if ($scope.intervalSet === false) {
                    $scope.startMessageInterval();
                    $scope.intervalSet = true;
                }
            });
        };

        $scope.convertMessages = function() {
            $scope.targetChatMessages.forEach(function(message) {
                $scope.formattedDate = new Date (message.sendDate).toUTCString().slice(0, 16);
                message.formattedTime = new Date (message.sendDate).toUTCString().slice(17, 25);
                message.formattedDate = new Date (message.sendDate).toUTCString().slice(0, 16);
            });
            $scope.previousDate = "";
        };

        $scope.getAllMessages = function() {
            $http.get("/api/conversations/").then(function(result) {
                $scope.allMessages = result.data;
                $scope.numberOfMessages = $scope.allMessages.length;

                if (!$scope.initialisation || $scope.clearNotif) {
                    $scope.initialisation = true;
                    $scope.clearNotif = false;
                    $scope.lastNumberMessages = $scope.numberOfMessages;
                }

                if (($scope.numberOfMessages !== $scope.lastNumberMessages) && !$scope.missedMessageReset) {
                    $scope.missedMessages = ($scope.numberOfMessages - $scope.lastNumberMessages);
                    document.title = "The Speakeasy (" + $scope.missedMessages + ")";
                } else {
                    document.title = "The Speakeasy";
                    $scope.missedMessageReset = false;
                }
            });
            $scope.countMessagesFromUser();
        };

        $scope.countMessagesFromUser = function() {
            $scope.users.forEach(function(user) {
                $scope.allMessages.forEach(function(message) {
                    if (message.senderId === user.id) {
                        $scope.tempMessageCount++;
                    }
                });
                if ((user.messageCount !== $scope.tempMessageCount) && (user.messageCount !== 0)) {
                    if (!user.active) {
                        user.active = true;
                        $scope.activeChatCount++;
                    }
                    user.newMessage = true;
                    user.newMessageCount = $scope.tempMessageCount - user.messageCount;
                } else {
                    user.messageCount = $scope.tempMessageCount;
                }
                $scope.tempMessageCount = 0;
            });
        };

        $scope.clearNotifications = function() {
            $scope.clearNotif = true;
        };

        $scope.startMessageInterval = function() {
            //setInterval($scope.getMessages, 1000);
        };

        $scope.startAllMessageInterval = function() {
            setInterval($scope.getAllMessages, 2000);
        };

        $scope.startUsersInterval = function () {
            setInterval($scope.getUsers, 5000);
        };

        $scope.socketSendMessage = function(newMessage) {
            var message = {
                senderId: $scope.user._id,
                sendToId: $scope.currentChatTarget.id,
                sendDate: Date.now(),
                message: newMessage
            };
            $scope.socket.emit("message", message);
        };

        $scope.socketStartChat = function(singleUser) {
            $scope.socket.emit("start chat", singleUser.id);
            $scope.getMessages(singleUser);
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
