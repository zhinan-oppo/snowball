"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var scroll_handle_1 = tslib_1.__importDefault(require("@zhinan-oppo/scroll-handle"));
var jquery_1 = tslib_1.__importDefault(require("jquery"));
function getMedia(mediaConfig, defaultAttr) {
    if (mediaConfig === void 0) { mediaConfig = [
        {
            attr: 'z-src-mb',
            end: 568,
        },
        {
            attr: 'z-src-pc',
            start: 569,
        },
    ]; }
    var width = window.innerWidth ||
        document.documentElement.clientWidth ||
        document.body.clientWidth;
    var result = { attr: defaultAttr };
    mediaConfig.forEach(function (media) {
        var start = media.start || 0;
        var end = media.end || 20000;
        if (width >= start && width <= end) {
            result = media;
        }
    });
    return result;
}
exports.getMedia = getMedia;
exports.lazyLoad = function (dom, mediaConfig, defaultAttr) {
    // eslint-disable-next-line eqeqeq
    var isBg = jquery_1.default(dom).attr('z-bg') != undefined;
    var removeHandle = scroll_handle_1.default({
        dom: dom,
        handlers: {
            onStateChange: function (dom, state) {
                if (state !== 'inView') {
                    return;
                }
                // eslint-disable-next-line eqeqeq
                var src = jquery_1.default(dom).attr(getMedia(mediaConfig, defaultAttr).attr) ||
                    jquery_1.default(dom).attr(defaultAttr);
                if (!src) {
                    console.error('没有一个默认的 src 值');
                    if (removeHandle)
                        removeHandle();
                    return;
                }
                if (isBg) {
                    jquery_1.default(dom).css('background-image', "url(" + src + ")");
                }
                else {
                    jquery_1.default(dom).attr('src', src);
                }
                if (removeHandle)
                    removeHandle();
            },
        },
        start: { placement: 2 },
    });
};
exports.init = function (_a) {
    var _b = _a === void 0 ? {} : _a, _c = _b.mediaConfig, mediaConfig = _c === void 0 ? [
        {
            attr: 'z-src-mb',
            end: 568,
        },
        {
            attr: 'z-src-pc',
            start: 569,
        },
    ] : _c, _d = _b.defaultAttr, defaultAttr = _d === void 0 ? 'z-src' : _d;
    var queryString = mediaConfig
        .map(function (_a) {
        var attr = _a.attr;
        return "[" + attr + "]";
    })
        .concat(["[" + defaultAttr + "]"])
        .join(',');
    jquery_1.default(queryString).each(function (i, dom) {
        exports.lazyLoad(dom, mediaConfig, defaultAttr);
    });
};
//# sourceMappingURL=index.js.map