"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var ImageSequence = /** @class */ (function () {
    /**
     *
     * @param urls ordered image URLs
     */
    function ImageSequence(urls) {
        this.imagePromises = [];
        this.urls = urls;
        this.length = this.urls.length;
        this.images = this.urls.map(function () { return undefined; });
    }
    ImageSequence.prototype.load = function (i) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _this = this;
            return tslib_1.__generator(this, function (_a) {
                if (i === undefined) {
                    return [2 /*return*/, Promise.all(this.urls.map(function (_, i) { return _this.loadAt(i); }))];
                }
                return [2 /*return*/, this.loadAt(i)];
            });
        });
    };
    ImageSequence.prototype.getImageAt = function (i) {
        return this.images[i] || this.loadAt(i);
    };
    ImageSequence.prototype.getImagePathAt = function (i) {
        return this.urls[i];
    };
    ImageSequence.prototype.loadAt = function (i) {
        var _this = this;
        if (i >= 0 && i < this.length) {
            if (!this.imagePromises[i]) {
                this.imagePromises[i] = new Promise(function (resolve, reject) {
                    var image = new window.Image();
                    image.src = _this.urls[i];
                    image.onload = function () { return resolve(image); };
                    image.onerror = function (e) { return reject(e); };
                });
            }
            return this.imagePromises[i];
        }
        return Promise.reject(new Error(i + " is out of range: [0, " + this.length + ")"));
    };
    return ImageSequence;
}());
exports.ImageSequence = ImageSequence;
//# sourceMappingURL=ImageSequence.js.map