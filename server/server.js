var express = require("express");
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");

module.exports = function(port, db, githubAuthoriser) {
    var app = express();
    var http = require('http').Server(app);
    var io = require('socket.io')(http);
    app.use(express.static("public"));
    app.use(cookieParser());
    app.use(bodyParser.json());

    var users = db.collection("users-rmcneill");
    var conversations = db.collection("conversations-rmcneill");
    var sessions = {};

    app.get("/", function(req, res){
        res.sendFile(__dirname + "/index.html");
    });

    io.on("connection", function(socket) {
        console.log(socket.handshake.query.userid, ": Connected");
        //socket.join(socket.handshake.query.userid);

        socket.on("disconnect", function () {
            console.log(socket.handshake.query.userid, ": Disconnected");
        });

        socket.on("start chat", function (chatTarget) {
            socket.join(chatTarget);
            console.log(socket.handshake.query.userid, "joined chat with", chatTarget);
        });

        socket.on("message", function (message) {
            io.to(message.sendToId).emit("message", message);

            conversations.insertOne({
                senderId: socket.handshake.query.userid,
                sendToId: message.sendToId,
                sendDate: message.sendDate,
                message: message.message
            });
        });
    });

    http.listen(8080, function(){
        console.log("Chat listening on port 8080");
    });

    app.get("/oauth", function(req, res) {
        githubAuthoriser.authorise(req, function(githubUser, token) {
            if (githubUser) {
                users.findOne({
                    _id: githubUser.login
                }, function(err, user) {
                    if (!user) {
                        // TODO: Wait for this operation to complete
                        users.insertOne({
                            _id: githubUser.login,
                            name: githubUser.name,
                            avatarUrl: githubUser.avatar_url
                        });
                    }
                    sessions[token] = {
                        user: githubUser.login
                    };
                    res.cookie("sessionToken", token);
                    res.header("Location", "/");
                    res.sendStatus(302);
                });
            }
            else {
                res.sendStatus(400);
            }

        });
    });

    app.get("/api/oauth/uri", function(req, res) {
        res.json({
            uri: githubAuthoriser.oAuthUri
        });
    });

    app.use(function(req, res, next) {
        if (req.cookies.sessionToken) {
            req.session = sessions[req.cookies.sessionToken];
            if (req.session) {
                next();
            } else {
                res.sendStatus(401);
            }
        } else {
            res.sendStatus(401);
        }
    });

    app.get("/api/user", function(req, res) {
        users.findOne({
            _id: req.session.user
        }, function(err, user) {
            if (!err) {
                res.json(user);
            } else {
                res.sendStatus(500);
            }
        });
    });

    app.get("/api/users", function(req, res) {
        users.find().toArray(function(err, docs) {
            if (!err) {
                res.json(docs.map(function(user) {
                    return {
                        id: user._id,
                        name: user.name,
                        avatarUrl: user.avatarUrl
                    };
                }));
            } else {
                res.sendStatus(500);
            }
        });
    });

    app.get("/api/conversations", function(req, res) {
        var senderId = req.session.user;

        conversations.find({
            $or: [{senderId: senderId}, {sendToId: senderId}]
        }).toArray(function (err, docs) {
            if (!err) {
                res.json(docs.map(function(conversation) {
                    return {
                        senderId: conversation.senderId,
                        sendToId: conversation.sendToId,
                        sendDate: conversation.sendDate,
                        message: conversation.message
                    };
                }));
            } else {
                res.sendStatus(500);
            }
        });
    });

    app.post("/api/conversations/:name", function(req, res) {
        var sendToId = req.params.name;
        var senderId = req.session.user;
        var message = req.body.body;
        var sendDate = req.body.sent;

        conversations.insertOne({
            senderId: senderId,
            sendToId: sendToId,
            sendDate: sendDate,
            message: message
        });

        res.sendStatus(201);        //TODO: Error checking
    });

    app.get("/api/conversations/:name", function (req, res) {
        var sendToId = req.params.name;
        var senderId = req.session.user;

        conversations.find({
            senderId: {$in: [senderId, sendToId]},
            sendToId: {$in: [senderId, sendToId]}
        }).toArray(function (err, docs) {
            if (!err) {
                res.json(docs.map(function(conversation) {
                    return {
                        senderId: conversation.senderId,
                        sendToId: conversation.sendToId,
                        sendDate: conversation.sendDate,
                        message: conversation.message
                    };
                }));
            } else {
                res.sendStatus(500);
            }
        });
    });
};
