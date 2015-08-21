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
        $scope.onlineCount = 0;
        $scope.offlineCount = 1;

        $scope.getSocket = function() {
            $scope.socket = io.connect("", {query: "userId=" + $scope.user._id});

            $scope.socket.on("message", function(message) {
                message.formattedTime = new Date (message.sendDate).toUTCString().slice(17, 25);
                message.formattedDate = new Date (message.sendDate).toUTCString().slice(0, 16);

                if (message.senderId === $scope.currentChatTarget.id || message.senderId === $scope.user._id) {
                    $scope.targetChatMessages.push(message);
                }
                $scope.allMessages.push(message);
                $scope.countMessagesFromUser();
            });

            $scope.socket.on("delete complete", function(deletedUserId) {
                var alertString = "Conversation with " + deletedUserId + " deleted successfully!";
                $scope.getMessages();
                alert(alertString);
            });

            $scope.socket.on("user online", function(userId) {
                for (var i = 0; i < $scope.users.length; i++) {
                    if ($scope.users[i].id === userId){
                        $scope.users[i].online = true;
                        $scope.onlineCount++;
                    }
                }
            });

            $scope.socket.on("user offline", function(userId) {
                for (var i = 0; i < $scope.users.length; i++) {
                    if ($scope.users[i].id === userId){
                        $scope.users[i].online = false;
                        $scope.onlineCount--;
                    }
                }
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
                    $scope.users[i].online = false;
                }
                $scope.getSocket();
                $scope.getAllMessages();
            });
        }, function() {
            $http.get("/api/oauth/uri").then(function(result) {
                $scope.loginUri = result.data.uri;
            });
        });

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
                $scope.offlineCount = $scope.users.length - $scope.onlineCount;
            });
        };

        $scope.setActiveChat = function(user) {
            user.active = true;
            $scope.currentChatTarget = user;
            $scope.activeChatCount++;
            user.newMessage = false;
            $scope.missedMessages -= user.newMessageCount;
            $scope.lastNumberMessages += user.newMessageCount;
            user.newMessageCount = 0;
            user.messageCount = 0;
            $scope.getMessages(user);
            $scope.countMessagesFromUser();
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
                $scope.targetChatMessages = result.data;
                $scope.numberOfMessages = $scope.targetChatMessages.length;
                $scope.convertDates();
            });
        };

        $scope.convertDates = function() {
            $scope.targetChatMessages.forEach(function(message) {
                $scope.formattedDate = new Date (message.sendDate).toUTCString().slice(0, 16);
                message.formattedTime = new Date (message.sendDate).toUTCString().slice(17, 25);
                message.formattedDate = new Date (message.sendDate).toUTCString().slice(0, 16);
            });
        };

        $scope.getAllMessages = function() {
            $http.get("/api/conversations/").then(function(result) {
                $scope.allMessages = result.data;
                $scope.numberOfMessages = $scope.allMessages.length;

                if (!$scope.initialisation) {
                    $scope.initialisation = true;
                    $scope.lastNumberMessages = $scope.numberOfMessages;
                }

                if ($scope.missedMessages) {
                    document.title = "The Speakeasy (" + $scope.missedMessages + ")";
                } else {
                    document.title = "The Speakeasy";
                }
            });
            $scope.countMessagesFromUser();
        };

        $scope.countMissedMessages = function() {
            $scope.missedMessages = 0;
            $scope.users.forEach(function(user) {
                $scope.missedMessages += user.newMessageCount;
            });

            if ($scope.missedMessages) {
                document.title = "The Speakeasy (" + $scope.missedMessages + ")";
            } else {
                document.title = "The Speakeasy";
            }
        };

        $scope.countMessagesFromUser = function() {
            $scope.users.forEach(function(user) {
                $scope.allMessages.forEach(function(message) {
                    if (message.senderId === user.id) {
                        $scope.tempMessageCount++;
                    }
                });
                if ((user.messageCount !== $scope.tempMessageCount) && (user.messageCount !== 0) &&
                        (user.id !== $scope.user._id)) {
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
            $scope.countMissedMessages();
        };

        $scope.startUsersInterval = function () {
            setInterval($scope.getUsers, 10000);
        };

        setInterval($scope.countMessagesFromUser, 3000);

        $scope.socketSendMessage = function(newMessage) {
            var message = {
                senderId: $scope.user._id,
                sendToId: $scope.currentChatTarget.id,
                sendDate: Date.now(),
                message: newMessage
            };

            message.formattedTime = new Date (message.sendDate).toUTCString().slice(17, 25);
            message.formattedDate = new Date (message.sendDate).toUTCString().slice(0, 16);
            $scope.targetChatMessages.push(message);
            $scope.socket.emit("message", message);

            $scope.newMessage = "";
            $scope.lastNumberMessages++;
        };

        $scope.deleteChat = function() {
            $scope.socket.emit("delete", $scope.currentChatTarget.id);
        };

        $scope.userHeartBeat = function() {
            $scope.socket.emit("user heartbeat");
        };

        setInterval($scope.userHeartBeat, 5000);
        $scope.startUsersInterval();

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
