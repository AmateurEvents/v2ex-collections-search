$(document).ready(function(){
    //page
    var db = openDatabase('v2ex', '1.0', 'v2ex', 2 * 1024 * 1024);

    var button_sync = Ladda.create(document.querySelector("button[name='sync']"))
    var button_search = Ladda.create(document.querySelector("button[name='search']"))
    $("button[name='sync']").click(function(){
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs){ 
            console.log(chrome.extension.getBackgroundPage().send_message(tabs))
        })
    })
    
    $("button[name='search']").click(function() {
        button_search.start()
        var keyword = $("input[name='keywords']").val()
        var flag = $("input[type='radio']:checked").val()
        keyword = keyword.replace(/(^\s*)|(\s*$)/g, "")
        if (keyword.length <= 0){
            button_search.stop()
            return
        }
        if (flag === "title") {
            var select_count_sql = "select count(*) as post_length from user_title where post_title like '%" + keyword + "%' or post_text like '%" + keyword + "%'"
        } else {
            var select_count_sql = "select count(*) as post_length from post_reply where reply_content like '%" + keyword + "%'"
        }
        db.transaction(function(tx) {
            tx.executeSql(
                select_count_sql,
                [],
                function (tx, result) {
                    console.log(result.rows)
                    if (result.rows.length <= 0){
                        button_search.stop()
                        return
                    }
                    var per_page_number = 4
                    var total_size = result.rows[0]["post_length"]
                    var total_page = parseInt(total_size / per_page_number)
                    var remainder = total_size % per_page_number
                    if (remainder != 0) {
                        total_page += 1
                    }
                    $("#page").paging({
                        pageNo:1,
                        totalPage: total_page,
                        totalSize: total_size,
                        callback: function(page) {
                            var start = 4 * (page - 1)
                            gen_content(db, keyword, per_page_number, start, flag)
                        }
                    })
                    gen_content(db, keyword, per_page_number, 0, flag)
                    button_search.stop()
                },
                function (tx, error) {
                    button_search.stop()
                    console.log('执行失败: ' + error.message)
                }
            )
        })
    })

    $body = $(document.body)
    $body.on('click', '.external_link', function() {
        window.open("http://v2ex.com/t/" + $(this).attr("value"))
        // window.open("http://v2ex.com/t/")
    })

    $("input[name='keywords']").bind('keydown', function(event) {
        if (event.keyCode == 13) {
            $("button[name='search']").click()
        }
    })
})

function gen_content(db, keyword, per_page_number, start, flag) {
    if (flag === "title") {
        var select_title_sql = "select user_id, post_id, user_name, post_title, post_reply_number, post_text from user_title where post_title like '%" + keyword + "%' or post_text like '%" + keyword + "%' limit " + per_page_number + " offset ?"
        console.log(select_title_sql)
        db.transaction(function(tx) {
            tx.executeSql(
                select_title_sql,
                [start],
                function (tx, select_result){
                    var data = select_result.rows
                    $(".items").empty()
                    $.each(data, function(i, value){
                        console.log("start data")
                        $(".items").append('<div class="col-xs-12">\
                            <div class="media search-media">\
                                <div class="media-body">\
                                    <div>\
                                        <h4 class="media-heading">\
                                            <a href="#" class="blue external_link" value=' + value.post_id + '>' + value.post_title + '</a>\
                                        </h4>\
                                    </div>\
                                    <p>作者：' + value.user_name + '  回复：' + value.post_reply_number + '</p>\
                                </div>\
                            </div>\
                        </div>')
                    })
                }),
            function (tx, error){
                console.log(error.message)
            }
        })
    } else if (flag === "reply") {
        var select_reply_sql = "select post_id, reply_id, reply_content from post_reply where reply_content like '%" + keyword + "%' limit " + per_page_number + " offset ?"
        var select_info_from_title = "select user_name, post_title, post_reply_number, post_text from user_title where post_id=?"
        db.transaction(function(tx) {
            tx.executeSql(
                select_reply_sql,
                [start],
                function (tx, select_result){
                    var data = select_result.rows
                    $(".items").empty()
                    $.each(data, function(i, value){
                        tx.executeSql(
                            select_info_from_title,
                            [value.post_id],
                            function(tx, title_info) {
                                console.log(title_info)
                                var temp_content = value.reply_content
                                if (value.reply_content.length >= 50) {
                                    temp_content = temp_content.slice(0, 50)
                                }
                                $(".items").append('<div class="col-xs-12">\
                                    <div class="media search-media">\
                                        <div class="media-body">\
                                            <div>\
                                                <h4 class="media-heading">\
                                                    <a href="#" class="blue external_link" value=' + value.post_id + '>' +title_info.rows[0].post_title + '</a>\
                                                </h4>\
                                            </div>\
                                            <p>作者：' + title_info.rows[0].user_name + '  回复：' + temp_content + '</p>\
                                        </div>\
                                    </div>\
                                </div>')
                            },
                            function(tx, error) {

                            }
                        )
                    })
                }),
            function (tx, error){

            }
        })
    }
}


function open_link(post_id) {
    window.open("http://v2ex.com/t/" + post_id)
}