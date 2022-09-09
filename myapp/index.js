"use strict";

// modules
const express = require("express");
const session = require('express-session');
const MongoStore = require("connect-mongo");
const bodyParser = require("body-parser");
const bcrypt = require('bcrypt');
const settings = require("./settings.js");
const { MongoClient } = require('mongodb');

// mongo
const mongoUrl = settings.mongoUrl;
const dbName = settings.mongoDbName;
const collectionName = settings.collectionName;
const client = new MongoClient(mongoUrl);

// mongo session
const mongoOptions = settings.mongoOptions;
const sessionSettings = settings.sessionSettings;
sessionSettings.store = MongoStore.create(mongoOptions);

// app
const app = express();
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/static', express.static(__dirname + '/public'));
app.use(session(sessionSettings));

/***********
 * Sign Up
 ***********/

app.get("/", (req, res) => {
    console.log("Session ID : " + req.sessionID);
    const userValues = {};
    const errorMsgs = {};
    res.render("./signup.ejs", { userValues: userValues, errorMsgs: errorMsgs }); // views ディレクトリから相対パス
});

app.post("/", (req, res, next) => {

    const userValues = {
        name: req.body.name || "",
        email: req.body.email || "",
        password: req.body.password || "",
    };
    const errorMsgs = {
        name: (userValues.name) ? "" : "お名前を入力してください。",
        email: (userValues.email) ? "" : "メールアドレスを入力してください。",
        password: (userValues.password) ? "" : "パスワードを入力してください。",
    };
    const pattern = /^[A-Za-z0-9]{1}[A-Za-z0-9_.-]*@{1}[A-Za-z0-9_.-]+.[A-Za-z0-9]+$/;
    if (errorMsgs.email === "" && !pattern.test(userValues.email)) {
        errorMsgs.email = "正しい形式で入力してください。";
    }
    if (errorMsgs.password === "" && userValues.password.length < 4) errorMsgs.password = "4文字以上で入力してください。";
    // ここで一旦判定
    if (errorMsgs.name !== "" || errorMsgs.email !== "" || errorMsgs.password !== "") {
        res.render("./signup.ejs", { userValues: userValues, errorMsgs: errorMsgs });
        return;
    }
    console.log(1);
    (async () => {
        console.log(2);
        try {
            const query = { email: userValues.email };
            await client.connect();
            console.log(3);
            const db = client.db(dbName);
            const collection = db.collection(collectionName);

            const count = await collection.countDocuments(query);
            if (count > 0) {
                console.log("count => " + count);
                errorMsgs.email = "このメールアドレスは登録済みです。";
                return res.render("./signup.ejs", { userValues: userValues, errorMsgs: errorMsgs });
            }
            else {
                const hash = await bcrypt.hash(userValues.password, settings.saltRounds);
                userValues.password = hash;
                // ↑こういう所でエラーが発生したら処理が止まってcatchにわたってくれる。
                await collection.insertOne(userValues);
                console.log(4);
                res.redirect(302, "/static/success.html");
            }
        }
        finally {
            await client.close();
            return 5; // "client closed."
        }
    })()
    .then(result => console.log(result))
        .catch(e => next(e))
        .finally(() => console.log("end."));
    console.log(6);
});

/*************
 * Login Page
 *************/


app.get("/login", (req, res, next) => {
    console.log("Session ID : " + req.sessionID);
    const userValues = {};
    const errorMsgs = {};
    res.render("./login.ejs", { userValues: userValues, errorMsgs: errorMsgs });
});

app.post("/login", (req, res, next) => {
    // 入力チェック
    const userValues = {
        email: req.body.email || "",
        password: req.body.password || "",
    };
    const errorMsgs = {
        email: (userValues.email) ? "" : "メールアドレスを入力してください。",
        password: (userValues.password) ? "" : "パスワードを入力してください。",
    };
    const pattern = /^[A-Za-z0-9]{1}[A-Za-z0-9_.-]*@{1}[A-Za-z0-9_.-]+.[A-Za-z0-9]+$/;
    if (errorMsgs.email === "" && !pattern.test(userValues.email)) {
        errorMsgs.email = "正しい形式で入力してください。";
    }
    if (errorMsgs.password === "" && userValues.password.length < 4) errorMsgs.password = "4文字以上で入力してください。";
    if (errorMsgs.email !== "" || errorMsgs.password !== "") {
        res.render("./login.ejs", { userValues: userValues, errorMsgs: errorMsgs });
        return;
    }

    (async () => {
        try {
            const query = { email: userValues.email };
            await client.connect();
            const db = client.db(dbName);
            const collection = db.collection(collectionName);

            const userDocument = await collection.findOne(query); // なかったらnull
            if (userDocument === null) {
                errorMsgs.email = "このメールアドレスは登録は登録されていません。";
                res.render("./login.ejs", { userValues: userValues, errorMsgs: errorMsgs });
                return;
            }
            else {
                const match = await bcrypt.compare(userValues.password, userDocument.password);

                if (!match) {
                    errorMsgs.password = "パスワードが正しくありません。";
                    res.render("./login.ejs", { userValues: userValues, errorMsgs: errorMsgs });
                    return;
                }
                else {
                    // ログイン完了
                    userValues.name = userDocument.name;

                    await req.session.regenerate((e) => { if (e) throw new Error(e) });
                    req.session.email = userValues.email;
                    await req.session.save((e) => { if (e) throw new Error(e) });
                    console.log("Session saved.");
                    // req.session.userValues = userValues;
                    res.redirect(302, "/mypage");
                    return;
                }
            }
        }
        finally {
            await client.close();
            return "client closed";
        }
    })()
    .then(result => console.log(result))
        .catch(e => next(e))
        .finally(() => console.log("end."));
});

app.get("/mypage", (req, res, next) => {
    console.log("From Mypage, Session ID : " + req.sessionID);
    console.log("From Mypage, session.email : " + req.session.email);
    res.render("./mypage.ejs");
});




// all catch 404
app.all('/*', (req, res, next) => {
    console.log('Accessing the secret section ...');
    res.status(404).send("Not found");
    next(); // pass control to the next handler
});

//
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).sendFile(__dirname + "/error.html");
});

app.listen(settings.port, () => {
    console.log(`Example app listening on port ${settings.port}`);
});
