/*
数据管理脚本，用来将后端抓到的数据存入sqlite数据库，方便后面搜索，并且接受前端的同步，搜索事件
*/
var db = openDatabase('v2ex', '1.0', 'v2ex', 2 * 1024 * 1024)

var POST_REPLY = "create table if not exists post_reply (post_id INTEGER, reply_id INTEGER, reply_content TEXT)"
var USER_TITLE = "create table if not exists user_title (user_id INTEGER, post_id INTEGER, user_name TEXT, post_title TEXT, post_reply_number int, post_text TEXT)"
db.transaction(function(tx) {
    tx.executeSql(USER_TITLE)
    tx.executeSql(POST_REPLY)
});


var SELECT_COUNT = "select count(*) as length from user_title union select count(*) as length from post_reply"

chrome.extension.onRequest.addListener(
    function(request, sender, sendResponse) {
        console.log(request)
        if (request.source === "content") {
            console.log("from content")
            if (request.type === "post") {
                db.transaction(function(tx) {
                    var results = request.result
                    var INSERT_SQL = "insert into user_title (user_id, post_id, user_name, post_title, post_reply_number, post_text) values(?, ?, ?, ?, ?, ?)"
                    var EXIST_SQL = "select count(*) from user_title where post_id=?"
                    tx.executeSql(EXIST_SQL, [results[1]], function(tx, result){
                        if (result.rows[0]["count(*)"] <= 0) {
                            tx.executeSql(INSERT_SQL, results)
                        }
                    },
                    function(tx, error) {
                        console.log("执行失败" + error.message)
                    })
                })
            } else if(request.type === "reply") {
                db.transaction(function(tx) {
                    var results = request.result
                    var post_id = request.post_id
                    var INSERT_SQL = "insert into post_reply (post_id, reply_id, reply_content) values(?, ?, ?)"
                    var EXIST_SQL = "select count(*) as reply_length from post_reply where post_id=? and reply_id=?"
                    results.forEach(function(value, index, array){
                        tx.executeSql(
                            EXIST_SQL,
                            [post_id, value.id],
                            function(tx, result) {
                                if (result.rows[0]["reply_length"] <= 0) {
                                    var params = [post_id, value.id, value.content]
                                    tx.executeSql(INSERT_SQL, params)
                                }
                            })
                    })
                })
            }
    }
});

function send_message(tabs){
    db.transaction(function(tx){
        tx.executeSql(
            SELECT_COUNT,
            [],
            function(tx, result) {
                if (result.rows.length === 1) {
                    chrome.tabs.sendRequest(tabs[0].id, {source: "background"}, function(response) {
                        console.log(response)
                        if(typeof response !='undefined'){
                            console.log("开始数据同步")
                        }else{
                            console.log("response为空=>"+response);
                        }
                    });//end  sendMessage
                } else {
                    var total_length = result.rows[0].length + result.rows[1].length
                    console.log("开始120s检测是否有其他同步任务")
                    setTimeout(function(){get_info_change(total_length, tabs)}, 120000)
                }
            },
            function(tx, error) {
                console.log("出错了 + " + error.message())
            });
    })   
}

function get_info_change(total_length, tabs) {
    db.transaction(function(tx){
        tx.executeSql(
            SELECT_COUNT,
            [],
            function(tx, result) {
                var now_total_length = result.rows[0].length + result.rows[1].length
                if (parseInt(total_length) === now_total_length) {
                    console.log("没有其他同步任务，开始同步")
                    chrome.tabs.sendRequest(tabs[0].id, {source: "background"}, function(response) {
                        console.log(response)
                        if(typeof response !='undefined'){
                            console.log(response);
                        }else{
                            console.log("response为空=>"+response);
                        }
                    });//end  sendMessage
                }
            },
            function(tx, error) {
                console.log("出错了 + " + error.message())
            });
    })
}