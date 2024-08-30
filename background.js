// background.js
chrome.runtime.onInstalled.addListener(() => {
    console.log('x-srt', '插件安装完成');
});

chrome.webRequest.onBeforeRequest.addListener(
    function (details) {
        if (details.url.indexOf('antpcdn.com') > -1) {
            console.log('x-srt', details.url)
        }
    },
    {urls: ["<all_urls>"]},
    ["blocking", "requestBody"]
);
