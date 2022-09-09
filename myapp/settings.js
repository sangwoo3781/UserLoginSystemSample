"use strict";

exports.port = 8080;

exports.mongoUrl = "mongodb://localhost:27017";
exports.mongoDbName = "usersDb";
exports.collectionName = "users";
exports.saltRounds = 10;

const expiresMinuets = 1;

exports.mongoOptions = {
    mongoUrl: "mongodb://localhost:27017",
    dbName: "mySessiondb",
    ttl: expiresMinuets, // ttl設定しないとautoRemoveが反映されないっぽいので必ず設定しよう
    autoRemove: "interval", // "interval" or "disabled"
    autoRemoveInterval: 0,// minuets
};

exports.sessionSettings = {
    secret: 'secret',
    name: "mysession",
    resave: false,
    saveUninitialized: false, // curlテスト段階だと、trueにしないと毎回初期化される。
    store: "set after require this module and mongo store", //MongoStore.create(mongoOptions),
    cookie: {
        httpOnly: false,
        secure: false,
        expires: new Date(Date.now() + (1000 * 60 * expiresMinuets)), // 1000が一秒。
        maxAge: (1000 * 60 * expiresMinuets),
    }
};