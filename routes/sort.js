require('dotenv').config();
const express = require('express');
const router = express.Router();
const exec = require('child_process').exec;
const MongoClient = require("mongodb").MongoClient;
const assert = require("assert");

let reqcounter = 0;
let insertcounter = 0;
let hostname = "unknown_host";
let dbUrl = "mongodb://10.0.0.81:27017/sortdb";
setHostname();
setTimeout(dropSortDatabase,2000);
let sortdb=null;

router.get('/', function(req, res, next) {
    reqcounter++;

    let numbers = doSort(1000);
    // console.log(numbers);
    insertDocument(numbers);
    res.json({
        hostname: hostname,
        requestCtr: reqcounter,
        numbers: []
    });
});

router.get('/count/:count', function(req, res, next) {
    reqcounter++;

    let numbers = doSort(req.params.count);
    insertDocument(numbers);
    res.json({
        hostname: hostname,
        requestCtr: reqcounter,
        count: req.params.count,
        numbers: []
    });
});

router.get('/count/:count/:numberResponse', function(req, res, next) {
    reqcounter++;

    let numbers = doSort(req.params.count);
    if(req.params.numberResponse === 'false'){
        numbers=[];
    }
    res.json({
        hostname: hostname,
        requestCtr: reqcounter,
        count: req.params.count,
        numbers: numbers
    });
});

router.get('/readall', function(req, res, next) {
    reqcounter++;

    //console.log("Config: min="+min+", max="+max+", num="+num);
    findAllDocuments(docs => {
        res.json(docs);
    });
});

router.get('/readlast', function(req, res, next) {
    reqcounter++;

    //console.log("Config: min="+min+", max="+max+", num="+num);
    findLastDoc(docs => {
        res.json(docs);
    });
});

function doSort(count){
    let numbers = [];

    for(let i=0;i<count;i++){
        numbers.push(randomNumber(0,1000));
    }
    numbers.sort(compareNumber);
    //console.log(numbers);
    return numbers;
}

function insertDocument(numbers){
    getDatabaseConnection(function (err, conn) {
            assert.equal(null, err);
            var collection = conn.collection('sort');
            collection.insertOne({
                _id: hostname + ":" + insertcounter,
                list: numbers
            }, function (err, res) {
                if(err != null && err.code === 11000){
                    conn.close();
                    //console.log(err);
                    console.log("Caught duplicate Key error while writing document! Retry...");
                    insertDocument(numbers);
               }
                else {
                    assert.equal(err, null);
                    // console.log("Inserted sucessfully");
                    insertcounter++;
                    conn.close();
               }
            });
        });
}

function findAllDocuments(callback) {
    getDatabaseConnection(function (err, conn) {
        assert.equal(null, err);
        var collection = conn.collection('sort');
        collection.find({}).toArray(function (err, docs) {
            assert.equal(err, null);
            // console.log("Found the following records");
            // console.log(docs);
            conn.close();
            callback(docs);
        });
    });
}

function findLastDoc(callback) {
    getDatabaseConnection(function (err, conn) {
        assert.equal(null, err);
        var collection = conn.collection('sort');
        let queryObj = {
            _id: hostname + ":" + (insertcounter - 1)
        };
        // console.log("find doc: " + queryObj._id);
        collection.find(queryObj).toArray(function (err, docs) {
            assert.equal(err, null);
            // console.log("Found the following records");
            // console.log(docs);
            conn.close();
            callback(docs);
        });
    });
}

function getDatabaseConnection(callback){
    MongoClient.connect(dbUrl, function (err, connection) {
        assert.equal(null, err);
        //console.log("Connected successfully to mongodb");
        //connection.close();
        //sortdb = connection;
        callback(err, connection);
    });
}

function dropSortDatabase() {
    MongoClient.connect(dbUrl, function (err, connection) {
        assert.equal(null, err);
        connection.dropDatabase();
        console.log("Dropped sortdb");
    });
}

function randomNumber(min,max){
    return Math.floor(Math.random()*(max-min+1)+min);
}

function compareNumber(a,b){
    return a-b;
}

function setHostname(){
    exec('hostname', function (error, stdOut, stdErr) {
        hostname = stdOut.trim();
        console.log("Hostname set to: "+hostname);
    });
}
module.exports = router;
