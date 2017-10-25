/*
数据抓取脚本，利用v2ex提供的api将搜藏的帖子和评论抓取下来
*/

var spider_timer
chrome.extension.onRequest.addListener(
    function(request, sender, sendResponse) {
        if (request.source === "background") {
            var topic_num = $("a[href='/my/topics'] .bigger").text()
            if (typeof topic_num === 'undefined' || topic_num === ""){
                console.log("请在 https://www.v2ex.com/my/topics页面同步数据")
                return
            }
            var total_number = parseInt(topic_num)
            var page_number = parseInt(total_number / 20)
            var remainder = total_number % 20
            if (remainder != 0) {
                page_number += 1
            }
            var temp_last_number = localStorage.last_number
            localStorage.clear()
            localStorage.total_number = total_number
            localStorage.page_number = page_number
            // 从上次同步的地方开始
            if (page_number > parseInt(temp_last_number)) {
                localStorage.last_number = parseInt(temp_last_number)
            } else {
                localStorage.last_number = 0
            }
            // 抓取间隔设置，v2ex的api限制每小时api调用次数为120次，程序中每个帖子会调用两次，一次抓取题目和内容，一次抓取回复
            // 计算下来大约需要将间隔设置到60s左右，不过如果有很多ip代理的话可以将间隔设置的更小
            spider_timer = setInterval(function() {send_message()}, 50000)
            sendResponse({source: "content"})
        }
    }
);

function send_message() {
    if (parseInt(localStorage.last_number) === parseInt(localStorage.page_number)) {
        if  (localStorage.temp_link === "[]") {
            clearInterval(spider_timer)
            return
        }
    }
    if (typeof localStorage.temp_link != "undefined" && localStorage.temp_link != "[]") {
        var temp_link_list = JSON.parse(localStorage.temp_link)
        var temp_link = temp_link_list.pop()
        var post_id = temp_link.split("://")[1].split("/")[2]
        get_post_data(post_id)
        get_replies_data(post_id)
        localStorage.temp_link = JSON.stringify(temp_link_list)
    } else {
        localStorage.last_number = parseInt(localStorage.last_number) + 1
        get_page_data(localStorage.last_number)
    }
}

function get_page_data(page) {
    $.get("/my/topics?p=" + page, {}, function(result) {
        console.log("开始同步第" + page + "页")
        var html_object = $.parseHTML(result)
        var item_title = $(html_object).find("#Main .item_title a")
        var download_post_link = new Array()
        $.each(item_title, function(i, value) {
            download_post_link.push(value.href.split("#")[0])
        });
        localStorage.temp_link = JSON.stringify(download_post_link)
    });
}

function get_post_data(post_id) {
    $.get("/api/topics/show.json?id=" + post_id, {}, function(res){
        console.log("开始同步第" + post_id + "条帖子")
        if (res.length >= 1) {
            var send_data = [
                res[0].member.id,
                res[0].id,
                res[0].member.username,
                res[0].title,
                res[0].replies,
                res[0].content
            ]
            chrome.extension.sendRequest({source: "content", type: "post", result: send_data}, function(response) {
                // console.log(response)
            });
        }
    })
}

function get_replies_data(post_id) {
    $.get("/api/replies/show.json?topic_id=" + post_id, {}, function(res){
        if (res.hasOwnProperty("status")) {
            if (res.status === "error") {
                alert("每小时api调用次数超过了120次")
                localStorage.last_number = parseInt(localStorage.last_number) - 1
                clearInterval(spider_timer)
                return
            }
        } else if (res.length >= 1) {
            chrome.extension.sendRequest({source: "content", type: "reply", result: res, post_id: post_id}, function(response) {
                console.log(response)
            })
        }
    })
}