"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var ImageSequence_1 = require("./ImageSequence");
var CanvasPlayer = /** @class */ (function () {
    function CanvasPlayer(canvas, imageURLs, _a) {
        var _b = _a === void 0 ? {} : _a, _c = _b.fitImageSize, fitImageSize = _c === void 0 ? true : _c, _d = _b.posterFrame, posterFrame = _d === void 0 ? 'first' : _d;
        this.frameRequest = undefined;
        var ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('CanvasRenderingContext2D unavailable');
        }
        this.canvas = canvas;
        this.ctx = ctx;
        this.sequence = new ImageSequence_1.ImageSequence(imageURLs);
        this.sizeInitialized = !fitImageSize;
        this.last = -1;
        this.cur = -1;
        if (posterFrame !== false) {
            this.seek(posterFrame === 'first'
                ? 0
                : posterFrame === 'last'
                    ? this.sequence.length - 1
                    : posterFrame);
        }
    }
    CanvasPlayer.prototype.load = function () {
        return this.sequence.load();
    };
    CanvasPlayer.prototype.seek = function (i, _a) {
        var _b = (_a === void 0 ? {} : _a).draw, draw = _b === void 0 ? true : _b;
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_c) {
                this.cur = i;
                if (draw) {
                    return [2 /*return*/, this.drawCurrentFrame()];
                }
                return [2 /*return*/];
            });
        });
    };
    CanvasPlayer.prototype.seekPercent = function (p, options) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                return [2 /*return*/, this.seek(Math.round(p * (this.sequence.length - 1)), options)];
            });
        });
    };
    Object.defineProperty(CanvasPlayer.prototype, "playing", {
        get: function () {
            return this.playInterval !== undefined;
        },
        enumerable: true,
        configurable: true
    });
    CanvasPlayer.prototype.pause = function () {
        window.clearInterval(this.playInterval);
        this.playInterval = undefined;
    };
    CanvasPlayer.prototype.play = function (_a) {
        var _b = _a === void 0 ? {} : _a, _c = _b.fps, fps = _c === void 0 ? 24 : _c, _d = _b.mode, mode = _d === void 0 ? 0 /* Normal */ : _d, _e = _b.waitOnLoading, waitOnLoading = _e === void 0 ? true : _e, onUpdated = _b.onUpdated, onEnded = _b.onEnded;
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var direction, waiting;
            var _this = this;
            return tslib_1.__generator(this, function (_f) {
                if (this.playInterval !== undefined) {
                    window.clearInterval(this.playInterval);
                }
                direction = mode === 1 /* Reverse */ ? -1 : 1;
                waiting = false;
                this.playInterval = window.setInterval(function () {
                    if (waiting) {
                        if (CanvasPlayer.DEBUG) {
                            console.log("Waiting to play: " + _this.sequence.getImagePathAt(_this.cur));
                        }
                        return;
                    }
                    var emitUpdate = function (i) {
                        if (onUpdated) {
                            window.setTimeout(function () { return onUpdated({ i: i }); }, 0);
                        }
                    };
                    var update = function (i) {
                        if (waitOnLoading) {
                            waiting = true;
                            _this.seek(i).then(function () { return emitUpdate(i); });
                        }
                        else {
                            _this.seek(i).catch(console.error);
                            emitUpdate(i);
                        }
                    };
                    var next = _this.cur + direction;
                    var out = next >= _this.sequence.length || next < 0;
                    if (!out) {
                        return update(next);
                    }
                    switch (mode) {
                        case 2 /* Loop */:
                            update(0);
                            break;
                        case 3 /* Alternate */:
                            direction = -direction;
                            update(direction > 0 ? 0 : _this.sequence.length - 1);
                            break;
                        default:
                            _this.pause();
                            if (onEnded) {
                                window.setTimeout(function () { return onEnded({ i: next }); }, 0);
                            }
                            break;
                    }
                }, 1000 / fps);
                return [2 /*return*/];
            });
        });
    };
    CanvasPlayer.prototype.drawCurrentFrame = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var image, waitingAt, _a, e_1;
            return tslib_1.__generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (this.cur === this.last) {
                            return [2 /*return*/];
                        }
                        image = this.sequence.getImageAt(this.cur);
                        if (!image) {
                            return [2 /*return*/];
                        }
                        this.last = this.cur;
                        if (image instanceof window.Image) {
                            return [2 /*return*/, this.drawImage(image)];
                        }
                        waitingAt = this.cur;
                        if (CanvasPlayer.DEBUG) {
                            console.warn("Try to draw the " + waitingAt + "th image unloaded: " + this.sequence.getImagePathAt(waitingAt));
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        _a = this.drawImage;
                        return [4 /*yield*/, image];
                    case 2:
                        _a.apply(this, [_b.sent()]);
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _b.sent();
                        console.error(e_1);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    CanvasPlayer.prototype.drawImage = function (image) {
        var _this = this;
        if (this.frameRequest !== undefined) {
            window.cancelAnimationFrame(this.frameRequest);
        }
        this.frameRequest = window.requestAnimationFrame(function () {
            _this.frameRequest = undefined;
            if (!_this.sizeInitialized) {
                _this.canvas.width = image.width;
                _this.canvas.height = image.height;
                _this.sizeInitialized = true;
            }
            _this.ctx.drawImage(image, 0, 0, image.width, image.height);
        });
    };
    CanvasPlayer.DEBUG = false;
    return CanvasPlayer;
}());
exports.CanvasPlayer = CanvasPlayer;
//# sourceMappingURL=CanvasPlayer.js.map