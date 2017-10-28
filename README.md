# 说明

在v2ex上收藏了400多个帖子了，每次查找都要翻好久，因此做了这个工具自用，如果有感兴趣的可以搞下来自己玩玩，代码不多。

#### 工作原理：

* 同步收藏的帖子和评论到sqlite数据库
* 插件搜索sqlite数据库进行展示

#### 使用

    git clone https://github.com/AmateurEvents/v2ex-collections-search.git
    开启chrome开发者模式，加载插件即可

![插件演示](static/images/v2ex-collections-search-display.gif)

* 启用插件
* 打开并登陆v2ex
* 打开我的收藏页面，点击插件的同步按钮，即可开启同步，打开控制台可以看到同步进度，关掉页面就关掉了同步(同步的时候最好关闭Adblock插件)
* 同步完成后即可进行搜索