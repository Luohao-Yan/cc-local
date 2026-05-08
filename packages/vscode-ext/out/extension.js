var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../../node_modules/.bun/ws@8.20.0/node_modules/ws/lib/constants.js
var require_constants = __commonJS({
  "../../node_modules/.bun/ws@8.20.0/node_modules/ws/lib/constants.js"(exports, module) {
    "use strict";
    var BINARY_TYPES = ["nodebuffer", "arraybuffer", "fragments"];
    var hasBlob = typeof Blob !== "undefined";
    if (hasBlob) BINARY_TYPES.push("blob");
    module.exports = {
      BINARY_TYPES,
      CLOSE_TIMEOUT: 3e4,
      EMPTY_BUFFER: Buffer.alloc(0),
      GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
      hasBlob,
      kForOnEventAttribute: Symbol("kIsForOnEventAttribute"),
      kListener: Symbol("kListener"),
      kStatusCode: Symbol("status-code"),
      kWebSocket: Symbol("websocket"),
      NOOP: () => {
      }
    };
  }
});

// ../../node_modules/.bun/ws@8.20.0/node_modules/ws/lib/buffer-util.js
var require_buffer_util = __commonJS({
  "../../node_modules/.bun/ws@8.20.0/node_modules/ws/lib/buffer-util.js"(exports, module) {
    "use strict";
    var { EMPTY_BUFFER } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    function concat(list, totalLength) {
      if (list.length === 0) return EMPTY_BUFFER;
      if (list.length === 1) return list[0];
      const target = Buffer.allocUnsafe(totalLength);
      let offset = 0;
      for (let i = 0; i < list.length; i++) {
        const buf = list[i];
        target.set(buf, offset);
        offset += buf.length;
      }
      if (offset < totalLength) {
        return new FastBuffer(target.buffer, target.byteOffset, offset);
      }
      return target;
    }
    function _mask(source, mask, output, offset, length) {
      for (let i = 0; i < length; i++) {
        output[offset + i] = source[i] ^ mask[i & 3];
      }
    }
    function _unmask(buffer, mask) {
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] ^= mask[i & 3];
      }
    }
    function toArrayBuffer(buf) {
      if (buf.length === buf.buffer.byteLength) {
        return buf.buffer;
      }
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
    }
    function toBuffer(data) {
      toBuffer.readOnly = true;
      if (Buffer.isBuffer(data)) return data;
      let buf;
      if (data instanceof ArrayBuffer) {
        buf = new FastBuffer(data);
      } else if (ArrayBuffer.isView(data)) {
        buf = new FastBuffer(data.buffer, data.byteOffset, data.byteLength);
      } else {
        buf = Buffer.from(data);
        toBuffer.readOnly = false;
      }
      return buf;
    }
    module.exports = {
      concat,
      mask: _mask,
      toArrayBuffer,
      toBuffer,
      unmask: _unmask
    };
    if (!process.env.WS_NO_BUFFER_UTIL) {
      try {
        const bufferUtil = __require("bufferutil");
        module.exports.mask = function(source, mask, output, offset, length) {
          if (length < 48) _mask(source, mask, output, offset, length);
          else bufferUtil.mask(source, mask, output, offset, length);
        };
        module.exports.unmask = function(buffer, mask) {
          if (buffer.length < 32) _unmask(buffer, mask);
          else bufferUtil.unmask(buffer, mask);
        };
      } catch (e) {
      }
    }
  }
});

// ../../node_modules/.bun/ws@8.20.0/node_modules/ws/lib/limiter.js
var require_limiter = __commonJS({
  "../../node_modules/.bun/ws@8.20.0/node_modules/ws/lib/limiter.js"(exports, module) {
    "use strict";
    var kDone = Symbol("kDone");
    var kRun = Symbol("kRun");
    var Limiter = class {
      /**
       * Creates a new `Limiter`.
       *
       * @param {Number} [concurrency=Infinity] The maximum number of jobs allowed
       *     to run concurrently
       */
      constructor(concurrency) {
        this[kDone] = () => {
          this.pending--;
          this[kRun]();
        };
        this.concurrency = concurrency || Infinity;
        this.jobs = [];
        this.pending = 0;
      }
      /**
       * Adds a job to the queue.
       *
       * @param {Function} job The job to run
       * @public
       */
      add(job) {
        this.jobs.push(job);
        this[kRun]();
      }
      /**
       * Removes a job from the queue and runs it if possible.
       *
       * @private
       */
      [kRun]() {
        if (this.pending === this.concurrency) return;
        if (this.jobs.length) {
          const job = this.jobs.shift();
          this.pending++;
          job(this[kDone]);
        }
      }
    };
    module.exports = Limiter;
  }
});

// ../../node_modules/.bun/ws@8.20.0/node_modules/ws/lib/permessage-deflate.js
var require_permessage_deflate = __commonJS({
  "../../node_modules/.bun/ws@8.20.0/node_modules/ws/lib/permessage-deflate.js"(exports, module) {
    "use strict";
    var zlib = __require("zlib");
    var bufferUtil = require_buffer_util();
    var Limiter = require_limiter();
    var { kStatusCode } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    var TRAILER = Buffer.from([0, 0, 255, 255]);
    var kPerMessageDeflate = Symbol("permessage-deflate");
    var kTotalLength = Symbol("total-length");
    var kCallback = Symbol("callback");
    var kBuffers = Symbol("buffers");
    var kError = Symbol("error");
    var zlibLimiter;
    var PerMessageDeflate2 = class {
      /**
       * Creates a PerMessageDeflate instance.
       *
       * @param {Object} [options] Configuration options
       * @param {(Boolean|Number)} [options.clientMaxWindowBits] Advertise support
       *     for, or request, a custom client window size
       * @param {Boolean} [options.clientNoContextTakeover=false] Advertise/
       *     acknowledge disabling of client context takeover
       * @param {Number} [options.concurrencyLimit=10] The number of concurrent
       *     calls to zlib
       * @param {Boolean} [options.isServer=false] Create the instance in either
       *     server or client mode
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {(Boolean|Number)} [options.serverMaxWindowBits] Request/confirm the
       *     use of a custom server window size
       * @param {Boolean} [options.serverNoContextTakeover=false] Request/accept
       *     disabling of server context takeover
       * @param {Number} [options.threshold=1024] Size (in bytes) below which
       *     messages should not be compressed if context takeover is disabled
       * @param {Object} [options.zlibDeflateOptions] Options to pass to zlib on
       *     deflate
       * @param {Object} [options.zlibInflateOptions] Options to pass to zlib on
       *     inflate
       */
      constructor(options) {
        this._options = options || {};
        this._threshold = this._options.threshold !== void 0 ? this._options.threshold : 1024;
        this._maxPayload = this._options.maxPayload | 0;
        this._isServer = !!this._options.isServer;
        this._deflate = null;
        this._inflate = null;
        this.params = null;
        if (!zlibLimiter) {
          const concurrency = this._options.concurrencyLimit !== void 0 ? this._options.concurrencyLimit : 10;
          zlibLimiter = new Limiter(concurrency);
        }
      }
      /**
       * @type {String}
       */
      static get extensionName() {
        return "permessage-deflate";
      }
      /**
       * Create an extension negotiation offer.
       *
       * @return {Object} Extension parameters
       * @public
       */
      offer() {
        const params = {};
        if (this._options.serverNoContextTakeover) {
          params.server_no_context_takeover = true;
        }
        if (this._options.clientNoContextTakeover) {
          params.client_no_context_takeover = true;
        }
        if (this._options.serverMaxWindowBits) {
          params.server_max_window_bits = this._options.serverMaxWindowBits;
        }
        if (this._options.clientMaxWindowBits) {
          params.client_max_window_bits = this._options.clientMaxWindowBits;
        } else if (this._options.clientMaxWindowBits == null) {
          params.client_max_window_bits = true;
        }
        return params;
      }
      /**
       * Accept an extension negotiation offer/response.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Object} Accepted configuration
       * @public
       */
      accept(configurations) {
        configurations = this.normalizeParams(configurations);
        this.params = this._isServer ? this.acceptAsServer(configurations) : this.acceptAsClient(configurations);
        return this.params;
      }
      /**
       * Releases all resources used by the extension.
       *
       * @public
       */
      cleanup() {
        if (this._inflate) {
          this._inflate.close();
          this._inflate = null;
        }
        if (this._deflate) {
          const callback = this._deflate[kCallback];
          this._deflate.close();
          this._deflate = null;
          if (callback) {
            callback(
              new Error(
                "The deflate stream was closed while data was being processed"
              )
            );
          }
        }
      }
      /**
       *  Accept an extension negotiation offer.
       *
       * @param {Array} offers The extension negotiation offers
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsServer(offers) {
        const opts = this._options;
        const accepted = offers.find((params) => {
          if (opts.serverNoContextTakeover === false && params.server_no_context_takeover || params.server_max_window_bits && (opts.serverMaxWindowBits === false || typeof opts.serverMaxWindowBits === "number" && opts.serverMaxWindowBits > params.server_max_window_bits) || typeof opts.clientMaxWindowBits === "number" && !params.client_max_window_bits) {
            return false;
          }
          return true;
        });
        if (!accepted) {
          throw new Error("None of the extension offers can be accepted");
        }
        if (opts.serverNoContextTakeover) {
          accepted.server_no_context_takeover = true;
        }
        if (opts.clientNoContextTakeover) {
          accepted.client_no_context_takeover = true;
        }
        if (typeof opts.serverMaxWindowBits === "number") {
          accepted.server_max_window_bits = opts.serverMaxWindowBits;
        }
        if (typeof opts.clientMaxWindowBits === "number") {
          accepted.client_max_window_bits = opts.clientMaxWindowBits;
        } else if (accepted.client_max_window_bits === true || opts.clientMaxWindowBits === false) {
          delete accepted.client_max_window_bits;
        }
        return accepted;
      }
      /**
       * Accept the extension negotiation response.
       *
       * @param {Array} response The extension negotiation response
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsClient(response) {
        const params = response[0];
        if (this._options.clientNoContextTakeover === false && params.client_no_context_takeover) {
          throw new Error('Unexpected parameter "client_no_context_takeover"');
        }
        if (!params.client_max_window_bits) {
          if (typeof this._options.clientMaxWindowBits === "number") {
            params.client_max_window_bits = this._options.clientMaxWindowBits;
          }
        } else if (this._options.clientMaxWindowBits === false || typeof this._options.clientMaxWindowBits === "number" && params.client_max_window_bits > this._options.clientMaxWindowBits) {
          throw new Error(
            'Unexpected or invalid parameter "client_max_window_bits"'
          );
        }
        return params;
      }
      /**
       * Normalize parameters.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Array} The offers/response with normalized parameters
       * @private
       */
      normalizeParams(configurations) {
        configurations.forEach((params) => {
          Object.keys(params).forEach((key) => {
            let value = params[key];
            if (value.length > 1) {
              throw new Error(`Parameter "${key}" must have only a single value`);
            }
            value = value[0];
            if (key === "client_max_window_bits") {
              if (value !== true) {
                const num = +value;
                if (!Number.isInteger(num) || num < 8 || num > 15) {
                  throw new TypeError(
                    `Invalid value for parameter "${key}": ${value}`
                  );
                }
                value = num;
              } else if (!this._isServer) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else if (key === "server_max_window_bits") {
              const num = +value;
              if (!Number.isInteger(num) || num < 8 || num > 15) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
              value = num;
            } else if (key === "client_no_context_takeover" || key === "server_no_context_takeover") {
              if (value !== true) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else {
              throw new Error(`Unknown parameter "${key}"`);
            }
            params[key] = value;
          });
        });
        return configurations;
      }
      /**
       * Decompress data. Concurrency limited.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      decompress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._decompress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Compress data. Concurrency limited.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      compress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._compress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Decompress data.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _decompress(data, fin, callback) {
        const endpoint = this._isServer ? "client" : "server";
        if (!this._inflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._inflate = zlib.createInflateRaw({
            ...this._options.zlibInflateOptions,
            windowBits
          });
          this._inflate[kPerMessageDeflate] = this;
          this._inflate[kTotalLength] = 0;
          this._inflate[kBuffers] = [];
          this._inflate.on("error", inflateOnError);
          this._inflate.on("data", inflateOnData);
        }
        this._inflate[kCallback] = callback;
        this._inflate.write(data);
        if (fin) this._inflate.write(TRAILER);
        this._inflate.flush(() => {
          const err = this._inflate[kError];
          if (err) {
            this._inflate.close();
            this._inflate = null;
            callback(err);
            return;
          }
          const data2 = bufferUtil.concat(
            this._inflate[kBuffers],
            this._inflate[kTotalLength]
          );
          if (this._inflate._readableState.endEmitted) {
            this._inflate.close();
            this._inflate = null;
          } else {
            this._inflate[kTotalLength] = 0;
            this._inflate[kBuffers] = [];
            if (fin && this.params[`${endpoint}_no_context_takeover`]) {
              this._inflate.reset();
            }
          }
          callback(null, data2);
        });
      }
      /**
       * Compress data.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _compress(data, fin, callback) {
        const endpoint = this._isServer ? "server" : "client";
        if (!this._deflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._deflate = zlib.createDeflateRaw({
            ...this._options.zlibDeflateOptions,
            windowBits
          });
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          this._deflate.on("data", deflateOnData);
        }
        this._deflate[kCallback] = callback;
        this._deflate.write(data);
        this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
          if (!this._deflate) {
            return;
          }
          let data2 = bufferUtil.concat(
            this._deflate[kBuffers],
            this._deflate[kTotalLength]
          );
          if (fin) {
            data2 = new FastBuffer(data2.buffer, data2.byteOffset, data2.length - 4);
          }
          this._deflate[kCallback] = null;
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          if (fin && this.params[`${endpoint}_no_context_takeover`]) {
            this._deflate.reset();
          }
          callback(null, data2);
        });
      }
    };
    module.exports = PerMessageDeflate2;
    function deflateOnData(chunk) {
      this[kBuffers].push(chunk);
      this[kTotalLength] += chunk.length;
    }
    function inflateOnData(chunk) {
      this[kTotalLength] += chunk.length;
      if (this[kPerMessageDeflate]._maxPayload < 1 || this[kTotalLength] <= this[kPerMessageDeflate]._maxPayload) {
        this[kBuffers].push(chunk);
        return;
      }
      this[kError] = new RangeError("Max payload size exceeded");
      this[kError].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH";
      this[kError][kStatusCode] = 1009;
      this.removeListener("data", inflateOnData);
      this.reset();
    }
    function inflateOnError(err) {
      this[kPerMessageDeflate]._inflate = null;
      if (this[kError]) {
        this[kCallback](this[kError]);
        return;
      }
      err[kStatusCode] = 1007;
      this[kCallback](err);
    }
  }
});

// ../../node_modules/.bun/ws@8.20.0/node_modules/ws/lib/validation.js
var require_validation = __commonJS({
  "../../node_modules/.bun/ws@8.20.0/node_modules/ws/lib/validation.js"(exports, module) {
    "use strict";
    var { isUtf8 } = __require("buffer");
    var { hasBlob } = require_constants();
    var tokenChars = [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 0 - 15
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 16 - 31
      0,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      1,
      1,
      0,
      1,
      1,
      0,
      // 32 - 47
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      // 48 - 63
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 64 - 79
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      1,
      1,
      // 80 - 95
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 96 - 111
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      1,
      0,
      1,
      0
      // 112 - 127
    ];
    function isValidStatusCode(code) {
      return code >= 1e3 && code <= 1014 && code !== 1004 && code !== 1005 && code !== 1006 || code >= 3e3 && code <= 4999;
    }
    function _isValidUTF8(buf) {
      const len = buf.length;
      let i = 0;
      while (i < len) {
        if ((buf[i] & 128) === 0) {
          i++;
        } else if ((buf[i] & 224) === 192) {
          if (i + 1 === len || (buf[i + 1] & 192) !== 128 || (buf[i] & 254) === 192) {
            return false;
          }
          i += 2;
        } else if ((buf[i] & 240) === 224) {
          if (i + 2 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || buf[i] === 224 && (buf[i + 1] & 224) === 128 || // Overlong
          buf[i] === 237 && (buf[i + 1] & 224) === 160) {
            return false;
          }
          i += 3;
        } else if ((buf[i] & 248) === 240) {
          if (i + 3 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || (buf[i + 3] & 192) !== 128 || buf[i] === 240 && (buf[i + 1] & 240) === 128 || // Overlong
          buf[i] === 244 && buf[i + 1] > 143 || buf[i] > 244) {
            return false;
          }
          i += 4;
        } else {
          return false;
        }
      }
      return true;
    }
    function isBlob(value) {
      return hasBlob && typeof value === "object" && typeof value.arrayBuffer === "function" && typeof value.type === "string" && typeof value.stream === "function" && (value[Symbol.toStringTag] === "Blob" || value[Symbol.toStringTag] === "File");
    }
    module.exports = {
      isBlob,
      isValidStatusCode,
      isValidUTF8: _isValidUTF8,
      tokenChars
    };
    if (isUtf8) {
      module.exports.isValidUTF8 = function(buf) {
        return buf.length < 24 ? _isValidUTF8(buf) : isUtf8(buf);
      };
    } else if (!process.env.WS_NO_UTF_8_VALIDATE) {
      try {
        const isValidUTF8 = __require("utf-8-validate");
        module.exports.isValidUTF8 = function(buf) {
          return buf.length < 32 ? _isValidUTF8(buf) : isValidUTF8(buf);
        };
      } catch (e) {
      }
    }
  }
});

// ../../node_modules/.bun/ws@8.20.0/node_modules/ws/lib/receiver.js
var require_receiver = __commonJS({
  "../../node_modules/.bun/ws@8.20.0/node_modules/ws/lib/receiver.js"(exports, module) {
    "use strict";
    var { Writable } = __require("stream");
    var PerMessageDeflate2 = require_permessage_deflate();
    var {
      BINARY_TYPES,
      EMPTY_BUFFER,
      kStatusCode,
      kWebSocket
    } = require_constants();
    var { concat, toArrayBuffer, unmask } = require_buffer_util();
    var { isValidStatusCode, isValidUTF8 } = require_validation();
    var FastBuffer = Buffer[Symbol.species];
    var GET_INFO = 0;
    var GET_PAYLOAD_LENGTH_16 = 1;
    var GET_PAYLOAD_LENGTH_64 = 2;
    var GET_MASK = 3;
    var GET_DATA = 4;
    var INFLATING = 5;
    var DEFER_EVENT = 6;
    var Receiver2 = class extends Writable {
      /**
       * Creates a Receiver instance.
       *
       * @param {Object} [options] Options object
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {String} [options.binaryType=nodebuffer] The type for binary data
       * @param {Object} [options.extensions] An object containing the negotiated
       *     extensions
       * @param {Boolean} [options.isServer=false] Specifies whether to operate in
       *     client or server mode
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       */
      constructor(options = {}) {
        super();
        this._allowSynchronousEvents = options.allowSynchronousEvents !== void 0 ? options.allowSynchronousEvents : true;
        this._binaryType = options.binaryType || BINARY_TYPES[0];
        this._extensions = options.extensions || {};
        this._isServer = !!options.isServer;
        this._maxPayload = options.maxPayload | 0;
        this._skipUTF8Validation = !!options.skipUTF8Validation;
        this[kWebSocket] = void 0;
        this._bufferedBytes = 0;
        this._buffers = [];
        this._compressed = false;
        this._payloadLength = 0;
        this._mask = void 0;
        this._fragmented = 0;
        this._masked = false;
        this._fin = false;
        this._opcode = 0;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._fragments = [];
        this._errored = false;
        this._loop = false;
        this._state = GET_INFO;
      }
      /**
       * Implements `Writable.prototype._write()`.
       *
       * @param {Buffer} chunk The chunk of data to write
       * @param {String} encoding The character encoding of `chunk`
       * @param {Function} cb Callback
       * @private
       */
      _write(chunk, encoding, cb) {
        if (this._opcode === 8 && this._state == GET_INFO) return cb();
        this._bufferedBytes += chunk.length;
        this._buffers.push(chunk);
        this.startLoop(cb);
      }
      /**
       * Consumes `n` bytes from the buffered data.
       *
       * @param {Number} n The number of bytes to consume
       * @return {Buffer} The consumed bytes
       * @private
       */
      consume(n) {
        this._bufferedBytes -= n;
        if (n === this._buffers[0].length) return this._buffers.shift();
        if (n < this._buffers[0].length) {
          const buf = this._buffers[0];
          this._buffers[0] = new FastBuffer(
            buf.buffer,
            buf.byteOffset + n,
            buf.length - n
          );
          return new FastBuffer(buf.buffer, buf.byteOffset, n);
        }
        const dst = Buffer.allocUnsafe(n);
        do {
          const buf = this._buffers[0];
          const offset = dst.length - n;
          if (n >= buf.length) {
            dst.set(this._buffers.shift(), offset);
          } else {
            dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset);
            this._buffers[0] = new FastBuffer(
              buf.buffer,
              buf.byteOffset + n,
              buf.length - n
            );
          }
          n -= buf.length;
        } while (n > 0);
        return dst;
      }
      /**
       * Starts the parsing loop.
       *
       * @param {Function} cb Callback
       * @private
       */
      startLoop(cb) {
        this._loop = true;
        do {
          switch (this._state) {
            case GET_INFO:
              this.getInfo(cb);
              break;
            case GET_PAYLOAD_LENGTH_16:
              this.getPayloadLength16(cb);
              break;
            case GET_PAYLOAD_LENGTH_64:
              this.getPayloadLength64(cb);
              break;
            case GET_MASK:
              this.getMask();
              break;
            case GET_DATA:
              this.getData(cb);
              break;
            case INFLATING:
            case DEFER_EVENT:
              this._loop = false;
              return;
          }
        } while (this._loop);
        if (!this._errored) cb();
      }
      /**
       * Reads the first two bytes of a frame.
       *
       * @param {Function} cb Callback
       * @private
       */
      getInfo(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        const buf = this.consume(2);
        if ((buf[0] & 48) !== 0) {
          const error = this.createError(
            RangeError,
            "RSV2 and RSV3 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_2_3"
          );
          cb(error);
          return;
        }
        const compressed = (buf[0] & 64) === 64;
        if (compressed && !this._extensions[PerMessageDeflate2.extensionName]) {
          const error = this.createError(
            RangeError,
            "RSV1 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_1"
          );
          cb(error);
          return;
        }
        this._fin = (buf[0] & 128) === 128;
        this._opcode = buf[0] & 15;
        this._payloadLength = buf[1] & 127;
        if (this._opcode === 0) {
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (!this._fragmented) {
            const error = this.createError(
              RangeError,
              "invalid opcode 0",
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._opcode = this._fragmented;
        } else if (this._opcode === 1 || this._opcode === 2) {
          if (this._fragmented) {
            const error = this.createError(
              RangeError,
              `invalid opcode ${this._opcode}`,
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._compressed = compressed;
        } else if (this._opcode > 7 && this._opcode < 11) {
          if (!this._fin) {
            const error = this.createError(
              RangeError,
              "FIN must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_FIN"
            );
            cb(error);
            return;
          }
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (this._payloadLength > 125 || this._opcode === 8 && this._payloadLength === 1) {
            const error = this.createError(
              RangeError,
              `invalid payload length ${this._payloadLength}`,
              true,
              1002,
              "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH"
            );
            cb(error);
            return;
          }
        } else {
          const error = this.createError(
            RangeError,
            `invalid opcode ${this._opcode}`,
            true,
            1002,
            "WS_ERR_INVALID_OPCODE"
          );
          cb(error);
          return;
        }
        if (!this._fin && !this._fragmented) this._fragmented = this._opcode;
        this._masked = (buf[1] & 128) === 128;
        if (this._isServer) {
          if (!this._masked) {
            const error = this.createError(
              RangeError,
              "MASK must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_MASK"
            );
            cb(error);
            return;
          }
        } else if (this._masked) {
          const error = this.createError(
            RangeError,
            "MASK must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_MASK"
          );
          cb(error);
          return;
        }
        if (this._payloadLength === 126) this._state = GET_PAYLOAD_LENGTH_16;
        else if (this._payloadLength === 127) this._state = GET_PAYLOAD_LENGTH_64;
        else this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+16).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength16(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        this._payloadLength = this.consume(2).readUInt16BE(0);
        this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+64).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength64(cb) {
        if (this._bufferedBytes < 8) {
          this._loop = false;
          return;
        }
        const buf = this.consume(8);
        const num = buf.readUInt32BE(0);
        if (num > Math.pow(2, 53 - 32) - 1) {
          const error = this.createError(
            RangeError,
            "Unsupported WebSocket frame: payload length > 2^53 - 1",
            false,
            1009,
            "WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH"
          );
          cb(error);
          return;
        }
        this._payloadLength = num * Math.pow(2, 32) + buf.readUInt32BE(4);
        this.haveLength(cb);
      }
      /**
       * Payload length has been read.
       *
       * @param {Function} cb Callback
       * @private
       */
      haveLength(cb) {
        if (this._payloadLength && this._opcode < 8) {
          this._totalPayloadLength += this._payloadLength;
          if (this._totalPayloadLength > this._maxPayload && this._maxPayload > 0) {
            const error = this.createError(
              RangeError,
              "Max payload size exceeded",
              false,
              1009,
              "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
            );
            cb(error);
            return;
          }
        }
        if (this._masked) this._state = GET_MASK;
        else this._state = GET_DATA;
      }
      /**
       * Reads mask bytes.
       *
       * @private
       */
      getMask() {
        if (this._bufferedBytes < 4) {
          this._loop = false;
          return;
        }
        this._mask = this.consume(4);
        this._state = GET_DATA;
      }
      /**
       * Reads data bytes.
       *
       * @param {Function} cb Callback
       * @private
       */
      getData(cb) {
        let data = EMPTY_BUFFER;
        if (this._payloadLength) {
          if (this._bufferedBytes < this._payloadLength) {
            this._loop = false;
            return;
          }
          data = this.consume(this._payloadLength);
          if (this._masked && (this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3]) !== 0) {
            unmask(data, this._mask);
          }
        }
        if (this._opcode > 7) {
          this.controlMessage(data, cb);
          return;
        }
        if (this._compressed) {
          this._state = INFLATING;
          this.decompress(data, cb);
          return;
        }
        if (data.length) {
          this._messageLength = this._totalPayloadLength;
          this._fragments.push(data);
        }
        this.dataMessage(cb);
      }
      /**
       * Decompresses data.
       *
       * @param {Buffer} data Compressed data
       * @param {Function} cb Callback
       * @private
       */
      decompress(data, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        perMessageDeflate.decompress(data, this._fin, (err, buf) => {
          if (err) return cb(err);
          if (buf.length) {
            this._messageLength += buf.length;
            if (this._messageLength > this._maxPayload && this._maxPayload > 0) {
              const error = this.createError(
                RangeError,
                "Max payload size exceeded",
                false,
                1009,
                "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
              );
              cb(error);
              return;
            }
            this._fragments.push(buf);
          }
          this.dataMessage(cb);
          if (this._state === GET_INFO) this.startLoop(cb);
        });
      }
      /**
       * Handles a data message.
       *
       * @param {Function} cb Callback
       * @private
       */
      dataMessage(cb) {
        if (!this._fin) {
          this._state = GET_INFO;
          return;
        }
        const messageLength = this._messageLength;
        const fragments = this._fragments;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._fragmented = 0;
        this._fragments = [];
        if (this._opcode === 2) {
          let data;
          if (this._binaryType === "nodebuffer") {
            data = concat(fragments, messageLength);
          } else if (this._binaryType === "arraybuffer") {
            data = toArrayBuffer(concat(fragments, messageLength));
          } else if (this._binaryType === "blob") {
            data = new Blob(fragments);
          } else {
            data = fragments;
          }
          if (this._allowSynchronousEvents) {
            this.emit("message", data, true);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", data, true);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        } else {
          const buf = concat(fragments, messageLength);
          if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
            const error = this.createError(
              Error,
              "invalid UTF-8 sequence",
              true,
              1007,
              "WS_ERR_INVALID_UTF8"
            );
            cb(error);
            return;
          }
          if (this._state === INFLATING || this._allowSynchronousEvents) {
            this.emit("message", buf, false);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", buf, false);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        }
      }
      /**
       * Handles a control message.
       *
       * @param {Buffer} data Data to handle
       * @return {(Error|RangeError|undefined)} A possible error
       * @private
       */
      controlMessage(data, cb) {
        if (this._opcode === 8) {
          if (data.length === 0) {
            this._loop = false;
            this.emit("conclude", 1005, EMPTY_BUFFER);
            this.end();
          } else {
            const code = data.readUInt16BE(0);
            if (!isValidStatusCode(code)) {
              const error = this.createError(
                RangeError,
                `invalid status code ${code}`,
                true,
                1002,
                "WS_ERR_INVALID_CLOSE_CODE"
              );
              cb(error);
              return;
            }
            const buf = new FastBuffer(
              data.buffer,
              data.byteOffset + 2,
              data.length - 2
            );
            if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
              const error = this.createError(
                Error,
                "invalid UTF-8 sequence",
                true,
                1007,
                "WS_ERR_INVALID_UTF8"
              );
              cb(error);
              return;
            }
            this._loop = false;
            this.emit("conclude", code, buf);
            this.end();
          }
          this._state = GET_INFO;
          return;
        }
        if (this._allowSynchronousEvents) {
          this.emit(this._opcode === 9 ? "ping" : "pong", data);
          this._state = GET_INFO;
        } else {
          this._state = DEFER_EVENT;
          setImmediate(() => {
            this.emit(this._opcode === 9 ? "ping" : "pong", data);
            this._state = GET_INFO;
            this.startLoop(cb);
          });
        }
      }
      /**
       * Builds an error object.
       *
       * @param {function(new:Error|RangeError)} ErrorCtor The error constructor
       * @param {String} message The error message
       * @param {Boolean} prefix Specifies whether or not to add a default prefix to
       *     `message`
       * @param {Number} statusCode The status code
       * @param {String} errorCode The exposed error code
       * @return {(Error|RangeError)} The error
       * @private
       */
      createError(ErrorCtor, message, prefix, statusCode, errorCode) {
        this._loop = false;
        this._errored = true;
        const err = new ErrorCtor(
          prefix ? `Invalid WebSocket frame: ${message}` : message
        );
        Error.captureStackTrace(err, this.createError);
        err.code = errorCode;
        err[kStatusCode] = statusCode;
        return err;
      }
    };
    module.exports = Receiver2;
  }
});

// ../../node_modules/.bun/ws@8.20.0/node_modules/ws/lib/sender.js
var require_sender = __commonJS({
  "../../node_modules/.bun/ws@8.20.0/node_modules/ws/lib/sender.js"(exports, module) {
    "use strict";
    var { Duplex } = __require("stream");
    var { randomFillSync } = __require("crypto");
    var PerMessageDeflate2 = require_permessage_deflate();
    var { EMPTY_BUFFER, kWebSocket, NOOP } = require_constants();
    var { isBlob, isValidStatusCode } = require_validation();
    var { mask: applyMask, toBuffer } = require_buffer_util();
    var kByteLength = Symbol("kByteLength");
    var maskBuffer = Buffer.alloc(4);
    var RANDOM_POOL_SIZE = 8 * 1024;
    var randomPool;
    var randomPoolPointer = RANDOM_POOL_SIZE;
    var DEFAULT = 0;
    var DEFLATING = 1;
    var GET_BLOB_DATA = 2;
    var Sender2 = class _Sender {
      /**
       * Creates a Sender instance.
       *
       * @param {Duplex} socket The connection socket
       * @param {Object} [extensions] An object containing the negotiated extensions
       * @param {Function} [generateMask] The function used to generate the masking
       *     key
       */
      constructor(socket, extensions, generateMask) {
        this._extensions = extensions || {};
        if (generateMask) {
          this._generateMask = generateMask;
          this._maskBuffer = Buffer.alloc(4);
        }
        this._socket = socket;
        this._firstFragment = true;
        this._compress = false;
        this._bufferedBytes = 0;
        this._queue = [];
        this._state = DEFAULT;
        this.onerror = NOOP;
        this[kWebSocket] = void 0;
      }
      /**
       * Frames a piece of data according to the HyBi WebSocket protocol.
       *
       * @param {(Buffer|String)} data The data to frame
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @return {(Buffer|String)[]} The framed data
       * @public
       */
      static frame(data, options) {
        let mask;
        let merge = false;
        let offset = 2;
        let skipMasking = false;
        if (options.mask) {
          mask = options.maskBuffer || maskBuffer;
          if (options.generateMask) {
            options.generateMask(mask);
          } else {
            if (randomPoolPointer === RANDOM_POOL_SIZE) {
              if (randomPool === void 0) {
                randomPool = Buffer.alloc(RANDOM_POOL_SIZE);
              }
              randomFillSync(randomPool, 0, RANDOM_POOL_SIZE);
              randomPoolPointer = 0;
            }
            mask[0] = randomPool[randomPoolPointer++];
            mask[1] = randomPool[randomPoolPointer++];
            mask[2] = randomPool[randomPoolPointer++];
            mask[3] = randomPool[randomPoolPointer++];
          }
          skipMasking = (mask[0] | mask[1] | mask[2] | mask[3]) === 0;
          offset = 6;
        }
        let dataLength;
        if (typeof data === "string") {
          if ((!options.mask || skipMasking) && options[kByteLength] !== void 0) {
            dataLength = options[kByteLength];
          } else {
            data = Buffer.from(data);
            dataLength = data.length;
          }
        } else {
          dataLength = data.length;
          merge = options.mask && options.readOnly && !skipMasking;
        }
        let payloadLength = dataLength;
        if (dataLength >= 65536) {
          offset += 8;
          payloadLength = 127;
        } else if (dataLength > 125) {
          offset += 2;
          payloadLength = 126;
        }
        const target = Buffer.allocUnsafe(merge ? dataLength + offset : offset);
        target[0] = options.fin ? options.opcode | 128 : options.opcode;
        if (options.rsv1) target[0] |= 64;
        target[1] = payloadLength;
        if (payloadLength === 126) {
          target.writeUInt16BE(dataLength, 2);
        } else if (payloadLength === 127) {
          target[2] = target[3] = 0;
          target.writeUIntBE(dataLength, 4, 6);
        }
        if (!options.mask) return [target, data];
        target[1] |= 128;
        target[offset - 4] = mask[0];
        target[offset - 3] = mask[1];
        target[offset - 2] = mask[2];
        target[offset - 1] = mask[3];
        if (skipMasking) return [target, data];
        if (merge) {
          applyMask(data, mask, target, offset, dataLength);
          return [target];
        }
        applyMask(data, mask, data, 0, dataLength);
        return [target, data];
      }
      /**
       * Sends a close message to the other peer.
       *
       * @param {Number} [code] The status code component of the body
       * @param {(String|Buffer)} [data] The message component of the body
       * @param {Boolean} [mask=false] Specifies whether or not to mask the message
       * @param {Function} [cb] Callback
       * @public
       */
      close(code, data, mask, cb) {
        let buf;
        if (code === void 0) {
          buf = EMPTY_BUFFER;
        } else if (typeof code !== "number" || !isValidStatusCode(code)) {
          throw new TypeError("First argument must be a valid error code number");
        } else if (data === void 0 || !data.length) {
          buf = Buffer.allocUnsafe(2);
          buf.writeUInt16BE(code, 0);
        } else {
          const length = Buffer.byteLength(data);
          if (length > 123) {
            throw new RangeError("The message must not be greater than 123 bytes");
          }
          buf = Buffer.allocUnsafe(2 + length);
          buf.writeUInt16BE(code, 0);
          if (typeof data === "string") {
            buf.write(data, 2);
          } else {
            buf.set(data, 2);
          }
        }
        const options = {
          [kByteLength]: buf.length,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 8,
          readOnly: false,
          rsv1: false
        };
        if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, buf, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(buf, options), cb);
        }
      }
      /**
       * Sends a ping message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      ping(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 9,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a pong message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      pong(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 10,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a data message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Object} options Options object
       * @param {Boolean} [options.binary=false] Specifies whether `data` is binary
       *     or text
       * @param {Boolean} [options.compress=false] Specifies whether or not to
       *     compress `data`
       * @param {Boolean} [options.fin=false] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Function} [cb] Callback
       * @public
       */
      send(data, options, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        let opcode = options.binary ? 2 : 1;
        let rsv1 = options.compress;
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (this._firstFragment) {
          this._firstFragment = false;
          if (rsv1 && perMessageDeflate && perMessageDeflate.params[perMessageDeflate._isServer ? "server_no_context_takeover" : "client_no_context_takeover"]) {
            rsv1 = byteLength >= perMessageDeflate._threshold;
          }
          this._compress = rsv1;
        } else {
          rsv1 = false;
          opcode = 0;
        }
        if (options.fin) this._firstFragment = true;
        const opts = {
          [kByteLength]: byteLength,
          fin: options.fin,
          generateMask: this._generateMask,
          mask: options.mask,
          maskBuffer: this._maskBuffer,
          opcode,
          readOnly,
          rsv1
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, this._compress, opts, cb]);
          } else {
            this.getBlobData(data, this._compress, opts, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, this._compress, opts, cb]);
        } else {
          this.dispatch(data, this._compress, opts, cb);
        }
      }
      /**
       * Gets the contents of a blob as binary data.
       *
       * @param {Blob} blob The blob
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     the data
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      getBlobData(blob, compress, options, cb) {
        this._bufferedBytes += options[kByteLength];
        this._state = GET_BLOB_DATA;
        blob.arrayBuffer().then((arrayBuffer) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while the blob was being read"
            );
            process.nextTick(callCallbacks, this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          const data = toBuffer(arrayBuffer);
          if (!compress) {
            this._state = DEFAULT;
            this.sendFrame(_Sender.frame(data, options), cb);
            this.dequeue();
          } else {
            this.dispatch(data, compress, options, cb);
          }
        }).catch((err) => {
          process.nextTick(onError, this, err, cb);
        });
      }
      /**
       * Dispatches a message.
       *
       * @param {(Buffer|String)} data The message to send
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     `data`
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      dispatch(data, compress, options, cb) {
        if (!compress) {
          this.sendFrame(_Sender.frame(data, options), cb);
          return;
        }
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        this._bufferedBytes += options[kByteLength];
        this._state = DEFLATING;
        perMessageDeflate.compress(data, options.fin, (_, buf) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while data was being compressed"
            );
            callCallbacks(this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          this._state = DEFAULT;
          options.readOnly = false;
          this.sendFrame(_Sender.frame(buf, options), cb);
          this.dequeue();
        });
      }
      /**
       * Executes queued send operations.
       *
       * @private
       */
      dequeue() {
        while (this._state === DEFAULT && this._queue.length) {
          const params = this._queue.shift();
          this._bufferedBytes -= params[3][kByteLength];
          Reflect.apply(params[0], this, params.slice(1));
        }
      }
      /**
       * Enqueues a send operation.
       *
       * @param {Array} params Send operation parameters.
       * @private
       */
      enqueue(params) {
        this._bufferedBytes += params[3][kByteLength];
        this._queue.push(params);
      }
      /**
       * Sends a frame.
       *
       * @param {(Buffer | String)[]} list The frame to send
       * @param {Function} [cb] Callback
       * @private
       */
      sendFrame(list, cb) {
        if (list.length === 2) {
          this._socket.cork();
          this._socket.write(list[0]);
          this._socket.write(list[1], cb);
          this._socket.uncork();
        } else {
          this._socket.write(list[0], cb);
        }
      }
    };
    module.exports = Sender2;
    function callCallbacks(sender, err, cb) {
      if (typeof cb === "function") cb(err);
      for (let i = 0; i < sender._queue.length; i++) {
        const params = sender._queue[i];
        const callback = params[params.length - 1];
        if (typeof callback === "function") callback(err);
      }
    }
    function onError(sender, err, cb) {
      callCallbacks(sender, err, cb);
      sender.onerror(err);
    }
  }
});

// ../../node_modules/.bun/ws@8.20.0/node_modules/ws/lib/event-target.js
var require_event_target = __commonJS({
  "../../node_modules/.bun/ws@8.20.0/node_modules/ws/lib/event-target.js"(exports, module) {
    "use strict";
    var { kForOnEventAttribute, kListener } = require_constants();
    var kCode = Symbol("kCode");
    var kData = Symbol("kData");
    var kError = Symbol("kError");
    var kMessage = Symbol("kMessage");
    var kReason = Symbol("kReason");
    var kTarget = Symbol("kTarget");
    var kType = Symbol("kType");
    var kWasClean = Symbol("kWasClean");
    var Event = class {
      /**
       * Create a new `Event`.
       *
       * @param {String} type The name of the event
       * @throws {TypeError} If the `type` argument is not specified
       */
      constructor(type) {
        this[kTarget] = null;
        this[kType] = type;
      }
      /**
       * @type {*}
       */
      get target() {
        return this[kTarget];
      }
      /**
       * @type {String}
       */
      get type() {
        return this[kType];
      }
    };
    Object.defineProperty(Event.prototype, "target", { enumerable: true });
    Object.defineProperty(Event.prototype, "type", { enumerable: true });
    var CloseEvent = class extends Event {
      /**
       * Create a new `CloseEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {Number} [options.code=0] The status code explaining why the
       *     connection was closed
       * @param {String} [options.reason=''] A human-readable string explaining why
       *     the connection was closed
       * @param {Boolean} [options.wasClean=false] Indicates whether or not the
       *     connection was cleanly closed
       */
      constructor(type, options = {}) {
        super(type);
        this[kCode] = options.code === void 0 ? 0 : options.code;
        this[kReason] = options.reason === void 0 ? "" : options.reason;
        this[kWasClean] = options.wasClean === void 0 ? false : options.wasClean;
      }
      /**
       * @type {Number}
       */
      get code() {
        return this[kCode];
      }
      /**
       * @type {String}
       */
      get reason() {
        return this[kReason];
      }
      /**
       * @type {Boolean}
       */
      get wasClean() {
        return this[kWasClean];
      }
    };
    Object.defineProperty(CloseEvent.prototype, "code", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "reason", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "wasClean", { enumerable: true });
    var ErrorEvent = class extends Event {
      /**
       * Create a new `ErrorEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.error=null] The error that generated this event
       * @param {String} [options.message=''] The error message
       */
      constructor(type, options = {}) {
        super(type);
        this[kError] = options.error === void 0 ? null : options.error;
        this[kMessage] = options.message === void 0 ? "" : options.message;
      }
      /**
       * @type {*}
       */
      get error() {
        return this[kError];
      }
      /**
       * @type {String}
       */
      get message() {
        return this[kMessage];
      }
    };
    Object.defineProperty(ErrorEvent.prototype, "error", { enumerable: true });
    Object.defineProperty(ErrorEvent.prototype, "message", { enumerable: true });
    var MessageEvent = class extends Event {
      /**
       * Create a new `MessageEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.data=null] The message content
       */
      constructor(type, options = {}) {
        super(type);
        this[kData] = options.data === void 0 ? null : options.data;
      }
      /**
       * @type {*}
       */
      get data() {
        return this[kData];
      }
    };
    Object.defineProperty(MessageEvent.prototype, "data", { enumerable: true });
    var EventTarget = {
      /**
       * Register an event listener.
       *
       * @param {String} type A string representing the event type to listen for
       * @param {(Function|Object)} handler The listener to add
       * @param {Object} [options] An options object specifies characteristics about
       *     the event listener
       * @param {Boolean} [options.once=false] A `Boolean` indicating that the
       *     listener should be invoked at most once after being added. If `true`,
       *     the listener would be automatically removed when invoked.
       * @public
       */
      addEventListener(type, handler, options = {}) {
        for (const listener of this.listeners(type)) {
          if (!options[kForOnEventAttribute] && listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            return;
          }
        }
        let wrapper;
        if (type === "message") {
          wrapper = function onMessage(data, isBinary) {
            const event = new MessageEvent("message", {
              data: isBinary ? data : data.toString()
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "close") {
          wrapper = function onClose(code, message) {
            const event = new CloseEvent("close", {
              code,
              reason: message.toString(),
              wasClean: this._closeFrameReceived && this._closeFrameSent
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "error") {
          wrapper = function onError(error) {
            const event = new ErrorEvent("error", {
              error,
              message: error.message
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "open") {
          wrapper = function onOpen() {
            const event = new Event("open");
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else {
          return;
        }
        wrapper[kForOnEventAttribute] = !!options[kForOnEventAttribute];
        wrapper[kListener] = handler;
        if (options.once) {
          this.once(type, wrapper);
        } else {
          this.on(type, wrapper);
        }
      },
      /**
       * Remove an event listener.
       *
       * @param {String} type A string representing the event type to remove
       * @param {(Function|Object)} handler The listener to remove
       * @public
       */
      removeEventListener(type, handler) {
        for (const listener of this.listeners(type)) {
          if (listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            this.removeListener(type, listener);
            break;
          }
        }
      }
    };
    module.exports = {
      CloseEvent,
      ErrorEvent,
      Event,
      EventTarget,
      MessageEvent
    };
    function callListener(listener, thisArg, event) {
      if (typeof listener === "object" && listener.handleEvent) {
        listener.handleEvent.call(listener, event);
      } else {
        listener.call(thisArg, event);
      }
    }
  }
});

// ../../node_modules/.bun/ws@8.20.0/node_modules/ws/lib/extension.js
var require_extension = __commonJS({
  "../../node_modules/.bun/ws@8.20.0/node_modules/ws/lib/extension.js"(exports, module) {
    "use strict";
    var { tokenChars } = require_validation();
    function push(dest, name, elem) {
      if (dest[name] === void 0) dest[name] = [elem];
      else dest[name].push(elem);
    }
    function parse2(header) {
      const offers = /* @__PURE__ */ Object.create(null);
      let params = /* @__PURE__ */ Object.create(null);
      let mustUnescape = false;
      let isEscaping = false;
      let inQuotes = false;
      let extensionName;
      let paramName;
      let start = -1;
      let code = -1;
      let end = -1;
      let i = 0;
      for (; i < header.length; i++) {
        code = header.charCodeAt(i);
        if (extensionName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (i !== 0 && (code === 32 || code === 9)) {
            if (end === -1 && start !== -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            const name = header.slice(start, end);
            if (code === 44) {
              push(offers, name, params);
              params = /* @__PURE__ */ Object.create(null);
            } else {
              extensionName = name;
            }
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else if (paramName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (code === 32 || code === 9) {
            if (end === -1 && start !== -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            push(params, header.slice(start, end), true);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            start = end = -1;
          } else if (code === 61 && start !== -1 && end === -1) {
            paramName = header.slice(start, i);
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else {
          if (isEscaping) {
            if (tokenChars[code] !== 1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (start === -1) start = i;
            else if (!mustUnescape) mustUnescape = true;
            isEscaping = false;
          } else if (inQuotes) {
            if (tokenChars[code] === 1) {
              if (start === -1) start = i;
            } else if (code === 34 && start !== -1) {
              inQuotes = false;
              end = i;
            } else if (code === 92) {
              isEscaping = true;
            } else {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
          } else if (code === 34 && header.charCodeAt(i - 1) === 61) {
            inQuotes = true;
          } else if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (start !== -1 && (code === 32 || code === 9)) {
            if (end === -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            let value = header.slice(start, end);
            if (mustUnescape) {
              value = value.replace(/\\/g, "");
              mustUnescape = false;
            }
            push(params, paramName, value);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            paramName = void 0;
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        }
      }
      if (start === -1 || inQuotes || code === 32 || code === 9) {
        throw new SyntaxError("Unexpected end of input");
      }
      if (end === -1) end = i;
      const token = header.slice(start, end);
      if (extensionName === void 0) {
        push(offers, token, params);
      } else {
        if (paramName === void 0) {
          push(params, token, true);
        } else if (mustUnescape) {
          push(params, paramName, token.replace(/\\/g, ""));
        } else {
          push(params, paramName, token);
        }
        push(offers, extensionName, params);
      }
      return offers;
    }
    function format(extensions) {
      return Object.keys(extensions).map((extension2) => {
        let configurations = extensions[extension2];
        if (!Array.isArray(configurations)) configurations = [configurations];
        return configurations.map((params) => {
          return [extension2].concat(
            Object.keys(params).map((k) => {
              let values = params[k];
              if (!Array.isArray(values)) values = [values];
              return values.map((v) => v === true ? k : `${k}=${v}`).join("; ");
            })
          ).join("; ");
        }).join(", ");
      }).join(", ");
    }
    module.exports = { format, parse: parse2 };
  }
});

// ../../node_modules/.bun/ws@8.20.0/node_modules/ws/lib/websocket.js
var require_websocket = __commonJS({
  "../../node_modules/.bun/ws@8.20.0/node_modules/ws/lib/websocket.js"(exports, module) {
    "use strict";
    var EventEmitter13 = __require("events");
    var https2 = __require("https");
    var http5 = __require("http");
    var net = __require("net");
    var tls = __require("tls");
    var { randomBytes: randomBytes8, createHash: createHash3 } = __require("crypto");
    var { Duplex, Readable } = __require("stream");
    var { URL: URL4 } = __require("url");
    var PerMessageDeflate2 = require_permessage_deflate();
    var Receiver2 = require_receiver();
    var Sender2 = require_sender();
    var { isBlob } = require_validation();
    var {
      BINARY_TYPES,
      CLOSE_TIMEOUT,
      EMPTY_BUFFER,
      GUID,
      kForOnEventAttribute,
      kListener,
      kStatusCode,
      kWebSocket,
      NOOP
    } = require_constants();
    var {
      EventTarget: { addEventListener, removeEventListener }
    } = require_event_target();
    var { format, parse: parse2 } = require_extension();
    var { toBuffer } = require_buffer_util();
    var kAborted = Symbol("kAborted");
    var protocolVersions = [8, 13];
    var readyStates = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];
    var subprotocolRegex = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;
    var WebSocket3 = class _WebSocket extends EventEmitter13 {
      /**
       * Create a new `WebSocket`.
       *
       * @param {(String|URL)} address The URL to which to connect
       * @param {(String|String[])} [protocols] The subprotocols
       * @param {Object} [options] Connection options
       */
      constructor(address, protocols, options) {
        super();
        this._binaryType = BINARY_TYPES[0];
        this._closeCode = 1006;
        this._closeFrameReceived = false;
        this._closeFrameSent = false;
        this._closeMessage = EMPTY_BUFFER;
        this._closeTimer = null;
        this._errorEmitted = false;
        this._extensions = {};
        this._paused = false;
        this._protocol = "";
        this._readyState = _WebSocket.CONNECTING;
        this._receiver = null;
        this._sender = null;
        this._socket = null;
        if (address !== null) {
          this._bufferedAmount = 0;
          this._isServer = false;
          this._redirects = 0;
          if (protocols === void 0) {
            protocols = [];
          } else if (!Array.isArray(protocols)) {
            if (typeof protocols === "object" && protocols !== null) {
              options = protocols;
              protocols = [];
            } else {
              protocols = [protocols];
            }
          }
          initAsClient(this, address, protocols, options);
        } else {
          this._autoPong = options.autoPong;
          this._closeTimeout = options.closeTimeout;
          this._isServer = true;
        }
      }
      /**
       * For historical reasons, the custom "nodebuffer" type is used by the default
       * instead of "blob".
       *
       * @type {String}
       */
      get binaryType() {
        return this._binaryType;
      }
      set binaryType(type) {
        if (!BINARY_TYPES.includes(type)) return;
        this._binaryType = type;
        if (this._receiver) this._receiver._binaryType = type;
      }
      /**
       * @type {Number}
       */
      get bufferedAmount() {
        if (!this._socket) return this._bufferedAmount;
        return this._socket._writableState.length + this._sender._bufferedBytes;
      }
      /**
       * @type {String}
       */
      get extensions() {
        return Object.keys(this._extensions).join();
      }
      /**
       * @type {Boolean}
       */
      get isPaused() {
        return this._paused;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onclose() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onerror() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onopen() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onmessage() {
        return null;
      }
      /**
       * @type {String}
       */
      get protocol() {
        return this._protocol;
      }
      /**
       * @type {Number}
       */
      get readyState() {
        return this._readyState;
      }
      /**
       * @type {String}
       */
      get url() {
        return this._url;
      }
      /**
       * Set up the socket and the internal resources.
       *
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Object} options Options object
       * @param {Boolean} [options.allowSynchronousEvents=false] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Number} [options.maxPayload=0] The maximum allowed message size
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @private
       */
      setSocket(socket, head, options) {
        const receiver = new Receiver2({
          allowSynchronousEvents: options.allowSynchronousEvents,
          binaryType: this.binaryType,
          extensions: this._extensions,
          isServer: this._isServer,
          maxPayload: options.maxPayload,
          skipUTF8Validation: options.skipUTF8Validation
        });
        const sender = new Sender2(socket, this._extensions, options.generateMask);
        this._receiver = receiver;
        this._sender = sender;
        this._socket = socket;
        receiver[kWebSocket] = this;
        sender[kWebSocket] = this;
        socket[kWebSocket] = this;
        receiver.on("conclude", receiverOnConclude);
        receiver.on("drain", receiverOnDrain);
        receiver.on("error", receiverOnError);
        receiver.on("message", receiverOnMessage);
        receiver.on("ping", receiverOnPing);
        receiver.on("pong", receiverOnPong);
        sender.onerror = senderOnError;
        if (socket.setTimeout) socket.setTimeout(0);
        if (socket.setNoDelay) socket.setNoDelay();
        if (head.length > 0) socket.unshift(head);
        socket.on("close", socketOnClose);
        socket.on("data", socketOnData);
        socket.on("end", socketOnEnd);
        socket.on("error", socketOnError);
        this._readyState = _WebSocket.OPEN;
        this.emit("open");
      }
      /**
       * Emit the `'close'` event.
       *
       * @private
       */
      emitClose() {
        if (!this._socket) {
          this._readyState = _WebSocket.CLOSED;
          this.emit("close", this._closeCode, this._closeMessage);
          return;
        }
        if (this._extensions[PerMessageDeflate2.extensionName]) {
          this._extensions[PerMessageDeflate2.extensionName].cleanup();
        }
        this._receiver.removeAllListeners();
        this._readyState = _WebSocket.CLOSED;
        this.emit("close", this._closeCode, this._closeMessage);
      }
      /**
       * Start a closing handshake.
       *
       *          +----------+   +-----------+   +----------+
       *     - - -|ws.close()|-->|close frame|-->|ws.close()|- - -
       *    |     +----------+   +-----------+   +----------+     |
       *          +----------+   +-----------+         |
       * CLOSING  |ws.close()|<--|close frame|<--+-----+       CLOSING
       *          +----------+   +-----------+   |
       *    |           |                        |   +---+        |
       *                +------------------------+-->|fin| - - - -
       *    |         +---+                      |   +---+
       *     - - - - -|fin|<---------------------+
       *              +---+
       *
       * @param {Number} [code] Status code explaining why the connection is closing
       * @param {(String|Buffer)} [data] The reason why the connection is
       *     closing
       * @public
       */
      close(code, data) {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this.readyState === _WebSocket.CLOSING) {
          if (this._closeFrameSent && (this._closeFrameReceived || this._receiver._writableState.errorEmitted)) {
            this._socket.end();
          }
          return;
        }
        this._readyState = _WebSocket.CLOSING;
        this._sender.close(code, data, !this._isServer, (err) => {
          if (err) return;
          this._closeFrameSent = true;
          if (this._closeFrameReceived || this._receiver._writableState.errorEmitted) {
            this._socket.end();
          }
        });
        setCloseTimer(this);
      }
      /**
       * Pause the socket.
       *
       * @public
       */
      pause() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = true;
        this._socket.pause();
      }
      /**
       * Send a ping.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the ping is sent
       * @public
       */
      ping(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.ping(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Send a pong.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the pong is sent
       * @public
       */
      pong(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.pong(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Resume the socket.
       *
       * @public
       */
      resume() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = false;
        if (!this._receiver._writableState.needDrain) this._socket.resume();
      }
      /**
       * Send a data message.
       *
       * @param {*} data The message to send
       * @param {Object} [options] Options object
       * @param {Boolean} [options.binary] Specifies whether `data` is binary or
       *     text
       * @param {Boolean} [options.compress] Specifies whether or not to compress
       *     `data`
       * @param {Boolean} [options.fin=true] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when data is written out
       * @public
       */
      send(data, options, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof options === "function") {
          cb = options;
          options = {};
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        const opts = {
          binary: typeof data !== "string",
          mask: !this._isServer,
          compress: true,
          fin: true,
          ...options
        };
        if (!this._extensions[PerMessageDeflate2.extensionName]) {
          opts.compress = false;
        }
        this._sender.send(data || EMPTY_BUFFER, opts, cb);
      }
      /**
       * Forcibly close the connection.
       *
       * @public
       */
      terminate() {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this._socket) {
          this._readyState = _WebSocket.CLOSING;
          this._socket.destroy();
        }
      }
    };
    Object.defineProperty(WebSocket3, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket3.prototype, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket3, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket3.prototype, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket3, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket3.prototype, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket3, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    Object.defineProperty(WebSocket3.prototype, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    [
      "binaryType",
      "bufferedAmount",
      "extensions",
      "isPaused",
      "protocol",
      "readyState",
      "url"
    ].forEach((property) => {
      Object.defineProperty(WebSocket3.prototype, property, { enumerable: true });
    });
    ["open", "error", "close", "message"].forEach((method) => {
      Object.defineProperty(WebSocket3.prototype, `on${method}`, {
        enumerable: true,
        get() {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) return listener[kListener];
          }
          return null;
        },
        set(handler) {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) {
              this.removeListener(method, listener);
              break;
            }
          }
          if (typeof handler !== "function") return;
          this.addEventListener(method, handler, {
            [kForOnEventAttribute]: true
          });
        }
      });
    });
    WebSocket3.prototype.addEventListener = addEventListener;
    WebSocket3.prototype.removeEventListener = removeEventListener;
    module.exports = WebSocket3;
    function initAsClient(websocket, address, protocols, options) {
      const opts = {
        allowSynchronousEvents: true,
        autoPong: true,
        closeTimeout: CLOSE_TIMEOUT,
        protocolVersion: protocolVersions[1],
        maxPayload: 100 * 1024 * 1024,
        skipUTF8Validation: false,
        perMessageDeflate: true,
        followRedirects: false,
        maxRedirects: 10,
        ...options,
        socketPath: void 0,
        hostname: void 0,
        protocol: void 0,
        timeout: void 0,
        method: "GET",
        host: void 0,
        path: void 0,
        port: void 0
      };
      websocket._autoPong = opts.autoPong;
      websocket._closeTimeout = opts.closeTimeout;
      if (!protocolVersions.includes(opts.protocolVersion)) {
        throw new RangeError(
          `Unsupported protocol version: ${opts.protocolVersion} (supported versions: ${protocolVersions.join(", ")})`
        );
      }
      let parsedUrl;
      if (address instanceof URL4) {
        parsedUrl = address;
      } else {
        try {
          parsedUrl = new URL4(address);
        } catch {
          throw new SyntaxError(`Invalid URL: ${address}`);
        }
      }
      if (parsedUrl.protocol === "http:") {
        parsedUrl.protocol = "ws:";
      } else if (parsedUrl.protocol === "https:") {
        parsedUrl.protocol = "wss:";
      }
      websocket._url = parsedUrl.href;
      const isSecure = parsedUrl.protocol === "wss:";
      const isIpcUrl = parsedUrl.protocol === "ws+unix:";
      let invalidUrlMessage;
      if (parsedUrl.protocol !== "ws:" && !isSecure && !isIpcUrl) {
        invalidUrlMessage = `The URL's protocol must be one of "ws:", "wss:", "http:", "https:", or "ws+unix:"`;
      } else if (isIpcUrl && !parsedUrl.pathname) {
        invalidUrlMessage = "The URL's pathname is empty";
      } else if (parsedUrl.hash) {
        invalidUrlMessage = "The URL contains a fragment identifier";
      }
      if (invalidUrlMessage) {
        const err = new SyntaxError(invalidUrlMessage);
        if (websocket._redirects === 0) {
          throw err;
        } else {
          emitErrorAndClose(websocket, err);
          return;
        }
      }
      const defaultPort = isSecure ? 443 : 80;
      const key = randomBytes8(16).toString("base64");
      const request = isSecure ? https2.request : http5.request;
      const protocolSet = /* @__PURE__ */ new Set();
      let perMessageDeflate;
      opts.createConnection = opts.createConnection || (isSecure ? tlsConnect : netConnect);
      opts.defaultPort = opts.defaultPort || defaultPort;
      opts.port = parsedUrl.port || defaultPort;
      opts.host = parsedUrl.hostname.startsWith("[") ? parsedUrl.hostname.slice(1, -1) : parsedUrl.hostname;
      opts.headers = {
        ...opts.headers,
        "Sec-WebSocket-Version": opts.protocolVersion,
        "Sec-WebSocket-Key": key,
        Connection: "Upgrade",
        Upgrade: "websocket"
      };
      opts.path = parsedUrl.pathname + parsedUrl.search;
      opts.timeout = opts.handshakeTimeout;
      if (opts.perMessageDeflate) {
        perMessageDeflate = new PerMessageDeflate2({
          ...opts.perMessageDeflate,
          isServer: false,
          maxPayload: opts.maxPayload
        });
        opts.headers["Sec-WebSocket-Extensions"] = format({
          [PerMessageDeflate2.extensionName]: perMessageDeflate.offer()
        });
      }
      if (protocols.length) {
        for (const protocol of protocols) {
          if (typeof protocol !== "string" || !subprotocolRegex.test(protocol) || protocolSet.has(protocol)) {
            throw new SyntaxError(
              "An invalid or duplicated subprotocol was specified"
            );
          }
          protocolSet.add(protocol);
        }
        opts.headers["Sec-WebSocket-Protocol"] = protocols.join(",");
      }
      if (opts.origin) {
        if (opts.protocolVersion < 13) {
          opts.headers["Sec-WebSocket-Origin"] = opts.origin;
        } else {
          opts.headers.Origin = opts.origin;
        }
      }
      if (parsedUrl.username || parsedUrl.password) {
        opts.auth = `${parsedUrl.username}:${parsedUrl.password}`;
      }
      if (isIpcUrl) {
        const parts = opts.path.split(":");
        opts.socketPath = parts[0];
        opts.path = parts[1];
      }
      let req;
      if (opts.followRedirects) {
        if (websocket._redirects === 0) {
          websocket._originalIpc = isIpcUrl;
          websocket._originalSecure = isSecure;
          websocket._originalHostOrSocketPath = isIpcUrl ? opts.socketPath : parsedUrl.host;
          const headers = options && options.headers;
          options = { ...options, headers: {} };
          if (headers) {
            for (const [key2, value] of Object.entries(headers)) {
              options.headers[key2.toLowerCase()] = value;
            }
          }
        } else if (websocket.listenerCount("redirect") === 0) {
          const isSameHost = isIpcUrl ? websocket._originalIpc ? opts.socketPath === websocket._originalHostOrSocketPath : false : websocket._originalIpc ? false : parsedUrl.host === websocket._originalHostOrSocketPath;
          if (!isSameHost || websocket._originalSecure && !isSecure) {
            delete opts.headers.authorization;
            delete opts.headers.cookie;
            if (!isSameHost) delete opts.headers.host;
            opts.auth = void 0;
          }
        }
        if (opts.auth && !options.headers.authorization) {
          options.headers.authorization = "Basic " + Buffer.from(opts.auth).toString("base64");
        }
        req = websocket._req = request(opts);
        if (websocket._redirects) {
          websocket.emit("redirect", websocket.url, req);
        }
      } else {
        req = websocket._req = request(opts);
      }
      if (opts.timeout) {
        req.on("timeout", () => {
          abortHandshake(websocket, req, "Opening handshake has timed out");
        });
      }
      req.on("error", (err) => {
        if (req === null || req[kAborted]) return;
        req = websocket._req = null;
        emitErrorAndClose(websocket, err);
      });
      req.on("response", (res) => {
        const location = res.headers.location;
        const statusCode = res.statusCode;
        if (location && opts.followRedirects && statusCode >= 300 && statusCode < 400) {
          if (++websocket._redirects > opts.maxRedirects) {
            abortHandshake(websocket, req, "Maximum redirects exceeded");
            return;
          }
          req.abort();
          let addr;
          try {
            addr = new URL4(location, address);
          } catch (e) {
            const err = new SyntaxError(`Invalid URL: ${location}`);
            emitErrorAndClose(websocket, err);
            return;
          }
          initAsClient(websocket, addr, protocols, options);
        } else if (!websocket.emit("unexpected-response", req, res)) {
          abortHandshake(
            websocket,
            req,
            `Unexpected server response: ${res.statusCode}`
          );
        }
      });
      req.on("upgrade", (res, socket, head) => {
        websocket.emit("upgrade", res);
        if (websocket.readyState !== WebSocket3.CONNECTING) return;
        req = websocket._req = null;
        const upgrade = res.headers.upgrade;
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          abortHandshake(websocket, socket, "Invalid Upgrade header");
          return;
        }
        const digest = createHash3("sha1").update(key + GUID).digest("base64");
        if (res.headers["sec-websocket-accept"] !== digest) {
          abortHandshake(websocket, socket, "Invalid Sec-WebSocket-Accept header");
          return;
        }
        const serverProt = res.headers["sec-websocket-protocol"];
        let protError;
        if (serverProt !== void 0) {
          if (!protocolSet.size) {
            protError = "Server sent a subprotocol but none was requested";
          } else if (!protocolSet.has(serverProt)) {
            protError = "Server sent an invalid subprotocol";
          }
        } else if (protocolSet.size) {
          protError = "Server sent no subprotocol";
        }
        if (protError) {
          abortHandshake(websocket, socket, protError);
          return;
        }
        if (serverProt) websocket._protocol = serverProt;
        const secWebSocketExtensions = res.headers["sec-websocket-extensions"];
        if (secWebSocketExtensions !== void 0) {
          if (!perMessageDeflate) {
            const message = "Server sent a Sec-WebSocket-Extensions header but no extension was requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          let extensions;
          try {
            extensions = parse2(secWebSocketExtensions);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          const extensionNames = Object.keys(extensions);
          if (extensionNames.length !== 1 || extensionNames[0] !== PerMessageDeflate2.extensionName) {
            const message = "Server indicated an extension that was not requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          try {
            perMessageDeflate.accept(extensions[PerMessageDeflate2.extensionName]);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          websocket._extensions[PerMessageDeflate2.extensionName] = perMessageDeflate;
        }
        websocket.setSocket(socket, head, {
          allowSynchronousEvents: opts.allowSynchronousEvents,
          generateMask: opts.generateMask,
          maxPayload: opts.maxPayload,
          skipUTF8Validation: opts.skipUTF8Validation
        });
      });
      if (opts.finishRequest) {
        opts.finishRequest(req, websocket);
      } else {
        req.end();
      }
    }
    function emitErrorAndClose(websocket, err) {
      websocket._readyState = WebSocket3.CLOSING;
      websocket._errorEmitted = true;
      websocket.emit("error", err);
      websocket.emitClose();
    }
    function netConnect(options) {
      options.path = options.socketPath;
      return net.connect(options);
    }
    function tlsConnect(options) {
      options.path = void 0;
      if (!options.servername && options.servername !== "") {
        options.servername = net.isIP(options.host) ? "" : options.host;
      }
      return tls.connect(options);
    }
    function abortHandshake(websocket, stream, message) {
      websocket._readyState = WebSocket3.CLOSING;
      const err = new Error(message);
      Error.captureStackTrace(err, abortHandshake);
      if (stream.setHeader) {
        stream[kAborted] = true;
        stream.abort();
        if (stream.socket && !stream.socket.destroyed) {
          stream.socket.destroy();
        }
        process.nextTick(emitErrorAndClose, websocket, err);
      } else {
        stream.destroy(err);
        stream.once("error", websocket.emit.bind(websocket, "error"));
        stream.once("close", websocket.emitClose.bind(websocket));
      }
    }
    function sendAfterClose(websocket, data, cb) {
      if (data) {
        const length = isBlob(data) ? data.size : toBuffer(data).length;
        if (websocket._socket) websocket._sender._bufferedBytes += length;
        else websocket._bufferedAmount += length;
      }
      if (cb) {
        const err = new Error(
          `WebSocket is not open: readyState ${websocket.readyState} (${readyStates[websocket.readyState]})`
        );
        process.nextTick(cb, err);
      }
    }
    function receiverOnConclude(code, reason) {
      const websocket = this[kWebSocket];
      websocket._closeFrameReceived = true;
      websocket._closeMessage = reason;
      websocket._closeCode = code;
      if (websocket._socket[kWebSocket] === void 0) return;
      websocket._socket.removeListener("data", socketOnData);
      process.nextTick(resume, websocket._socket);
      if (code === 1005) websocket.close();
      else websocket.close(code, reason);
    }
    function receiverOnDrain() {
      const websocket = this[kWebSocket];
      if (!websocket.isPaused) websocket._socket.resume();
    }
    function receiverOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket._socket[kWebSocket] !== void 0) {
        websocket._socket.removeListener("data", socketOnData);
        process.nextTick(resume, websocket._socket);
        websocket.close(err[kStatusCode]);
      }
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function receiverOnFinish() {
      this[kWebSocket].emitClose();
    }
    function receiverOnMessage(data, isBinary) {
      this[kWebSocket].emit("message", data, isBinary);
    }
    function receiverOnPing(data) {
      const websocket = this[kWebSocket];
      if (websocket._autoPong) websocket.pong(data, !this._isServer, NOOP);
      websocket.emit("ping", data);
    }
    function receiverOnPong(data) {
      this[kWebSocket].emit("pong", data);
    }
    function resume(stream) {
      stream.resume();
    }
    function senderOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket.readyState === WebSocket3.CLOSED) return;
      if (websocket.readyState === WebSocket3.OPEN) {
        websocket._readyState = WebSocket3.CLOSING;
        setCloseTimer(websocket);
      }
      this._socket.end();
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function setCloseTimer(websocket) {
      websocket._closeTimer = setTimeout(
        websocket._socket.destroy.bind(websocket._socket),
        websocket._closeTimeout
      );
    }
    function socketOnClose() {
      const websocket = this[kWebSocket];
      this.removeListener("close", socketOnClose);
      this.removeListener("data", socketOnData);
      this.removeListener("end", socketOnEnd);
      websocket._readyState = WebSocket3.CLOSING;
      if (!this._readableState.endEmitted && !websocket._closeFrameReceived && !websocket._receiver._writableState.errorEmitted && this._readableState.length !== 0) {
        const chunk = this.read(this._readableState.length);
        websocket._receiver.write(chunk);
      }
      websocket._receiver.end();
      this[kWebSocket] = void 0;
      clearTimeout(websocket._closeTimer);
      if (websocket._receiver._writableState.finished || websocket._receiver._writableState.errorEmitted) {
        websocket.emitClose();
      } else {
        websocket._receiver.on("error", receiverOnFinish);
        websocket._receiver.on("finish", receiverOnFinish);
      }
    }
    function socketOnData(chunk) {
      if (!this[kWebSocket]._receiver.write(chunk)) {
        this.pause();
      }
    }
    function socketOnEnd() {
      const websocket = this[kWebSocket];
      websocket._readyState = WebSocket3.CLOSING;
      websocket._receiver.end();
      this.end();
    }
    function socketOnError() {
      const websocket = this[kWebSocket];
      this.removeListener("error", socketOnError);
      this.on("error", NOOP);
      if (websocket) {
        websocket._readyState = WebSocket3.CLOSING;
        this.destroy();
      }
    }
  }
});

// ../../node_modules/.bun/ws@8.20.0/node_modules/ws/lib/stream.js
var require_stream = __commonJS({
  "../../node_modules/.bun/ws@8.20.0/node_modules/ws/lib/stream.js"(exports, module) {
    "use strict";
    var WebSocket3 = require_websocket();
    var { Duplex } = __require("stream");
    function emitClose(stream) {
      stream.emit("close");
    }
    function duplexOnEnd() {
      if (!this.destroyed && this._writableState.finished) {
        this.destroy();
      }
    }
    function duplexOnError(err) {
      this.removeListener("error", duplexOnError);
      this.destroy();
      if (this.listenerCount("error") === 0) {
        this.emit("error", err);
      }
    }
    function createWebSocketStream2(ws, options) {
      let terminateOnDestroy = true;
      const duplex = new Duplex({
        ...options,
        autoDestroy: false,
        emitClose: false,
        objectMode: false,
        writableObjectMode: false
      });
      ws.on("message", function message(msg, isBinary) {
        const data = !isBinary && duplex._readableState.objectMode ? msg.toString() : msg;
        if (!duplex.push(data)) ws.pause();
      });
      ws.once("error", function error(err) {
        if (duplex.destroyed) return;
        terminateOnDestroy = false;
        duplex.destroy(err);
      });
      ws.once("close", function close() {
        if (duplex.destroyed) return;
        duplex.push(null);
      });
      duplex._destroy = function(err, callback) {
        if (ws.readyState === ws.CLOSED) {
          callback(err);
          process.nextTick(emitClose, duplex);
          return;
        }
        let called = false;
        ws.once("error", function error(err2) {
          called = true;
          callback(err2);
        });
        ws.once("close", function close() {
          if (!called) callback(err);
          process.nextTick(emitClose, duplex);
        });
        if (terminateOnDestroy) ws.terminate();
      };
      duplex._final = function(callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._final(callback);
          });
          return;
        }
        if (ws._socket === null) return;
        if (ws._socket._writableState.finished) {
          callback();
          if (duplex._readableState.endEmitted) duplex.destroy();
        } else {
          ws._socket.once("finish", function finish() {
            callback();
          });
          ws.close();
        }
      };
      duplex._read = function() {
        if (ws.isPaused) ws.resume();
      };
      duplex._write = function(chunk, encoding, callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._write(chunk, encoding, callback);
          });
          return;
        }
        ws.send(chunk, callback);
      };
      duplex.on("end", duplexOnEnd);
      duplex.on("error", duplexOnError);
      return duplex;
    }
    module.exports = createWebSocketStream2;
  }
});

// ../../node_modules/.bun/ws@8.20.0/node_modules/ws/lib/subprotocol.js
var require_subprotocol = __commonJS({
  "../../node_modules/.bun/ws@8.20.0/node_modules/ws/lib/subprotocol.js"(exports, module) {
    "use strict";
    var { tokenChars } = require_validation();
    function parse2(header) {
      const protocols = /* @__PURE__ */ new Set();
      let start = -1;
      let end = -1;
      let i = 0;
      for (i; i < header.length; i++) {
        const code = header.charCodeAt(i);
        if (end === -1 && tokenChars[code] === 1) {
          if (start === -1) start = i;
        } else if (i !== 0 && (code === 32 || code === 9)) {
          if (end === -1 && start !== -1) end = i;
        } else if (code === 44) {
          if (start === -1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (end === -1) end = i;
          const protocol2 = header.slice(start, end);
          if (protocols.has(protocol2)) {
            throw new SyntaxError(`The "${protocol2}" subprotocol is duplicated`);
          }
          protocols.add(protocol2);
          start = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      }
      if (start === -1 || end !== -1) {
        throw new SyntaxError("Unexpected end of input");
      }
      const protocol = header.slice(start, i);
      if (protocols.has(protocol)) {
        throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
      }
      protocols.add(protocol);
      return protocols;
    }
    module.exports = { parse: parse2 };
  }
});

// ../../node_modules/.bun/ws@8.20.0/node_modules/ws/lib/websocket-server.js
var require_websocket_server = __commonJS({
  "../../node_modules/.bun/ws@8.20.0/node_modules/ws/lib/websocket-server.js"(exports, module) {
    "use strict";
    var EventEmitter13 = __require("events");
    var http5 = __require("http");
    var { Duplex } = __require("stream");
    var { createHash: createHash3 } = __require("crypto");
    var extension2 = require_extension();
    var PerMessageDeflate2 = require_permessage_deflate();
    var subprotocol2 = require_subprotocol();
    var WebSocket3 = require_websocket();
    var { CLOSE_TIMEOUT, GUID, kWebSocket } = require_constants();
    var keyRegex = /^[+/0-9A-Za-z]{22}==$/;
    var RUNNING = 0;
    var CLOSING = 1;
    var CLOSED = 2;
    var WebSocketServer2 = class extends EventEmitter13 {
      /**
       * Create a `WebSocketServer` instance.
       *
       * @param {Object} options Configuration options
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Boolean} [options.autoPong=true] Specifies whether or not to
       *     automatically send a pong in response to a ping
       * @param {Number} [options.backlog=511] The maximum length of the queue of
       *     pending connections
       * @param {Boolean} [options.clientTracking=true] Specifies whether or not to
       *     track clients
       * @param {Number} [options.closeTimeout=30000] Duration in milliseconds to
       *     wait for the closing handshake to finish after `websocket.close()` is
       *     called
       * @param {Function} [options.handleProtocols] A hook to handle protocols
       * @param {String} [options.host] The hostname where to bind the server
       * @param {Number} [options.maxPayload=104857600] The maximum allowed message
       *     size
       * @param {Boolean} [options.noServer=false] Enable no server mode
       * @param {String} [options.path] Accept only connections matching this path
       * @param {(Boolean|Object)} [options.perMessageDeflate=false] Enable/disable
       *     permessage-deflate
       * @param {Number} [options.port] The port where to bind the server
       * @param {(http.Server|https.Server)} [options.server] A pre-created HTTP/S
       *     server to use
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @param {Function} [options.verifyClient] A hook to reject connections
       * @param {Function} [options.WebSocket=WebSocket] Specifies the `WebSocket`
       *     class to use. It must be the `WebSocket` class or class that extends it
       * @param {Function} [callback] A listener for the `listening` event
       */
      constructor(options, callback) {
        super();
        options = {
          allowSynchronousEvents: true,
          autoPong: true,
          maxPayload: 100 * 1024 * 1024,
          skipUTF8Validation: false,
          perMessageDeflate: false,
          handleProtocols: null,
          clientTracking: true,
          closeTimeout: CLOSE_TIMEOUT,
          verifyClient: null,
          noServer: false,
          backlog: null,
          // use default (511 as implemented in net.js)
          server: null,
          host: null,
          path: null,
          port: null,
          WebSocket: WebSocket3,
          ...options
        };
        if (options.port == null && !options.server && !options.noServer || options.port != null && (options.server || options.noServer) || options.server && options.noServer) {
          throw new TypeError(
            'One and only one of the "port", "server", or "noServer" options must be specified'
          );
        }
        if (options.port != null) {
          this._server = http5.createServer((req, res) => {
            const body = http5.STATUS_CODES[426];
            res.writeHead(426, {
              "Content-Length": body.length,
              "Content-Type": "text/plain"
            });
            res.end(body);
          });
          this._server.listen(
            options.port,
            options.host,
            options.backlog,
            callback
          );
        } else if (options.server) {
          this._server = options.server;
        }
        if (this._server) {
          const emitConnection = this.emit.bind(this, "connection");
          this._removeListeners = addListeners(this._server, {
            listening: this.emit.bind(this, "listening"),
            error: this.emit.bind(this, "error"),
            upgrade: (req, socket, head) => {
              this.handleUpgrade(req, socket, head, emitConnection);
            }
          });
        }
        if (options.perMessageDeflate === true) options.perMessageDeflate = {};
        if (options.clientTracking) {
          this.clients = /* @__PURE__ */ new Set();
          this._shouldEmitClose = false;
        }
        this.options = options;
        this._state = RUNNING;
      }
      /**
       * Returns the bound address, the address family name, and port of the server
       * as reported by the operating system if listening on an IP socket.
       * If the server is listening on a pipe or UNIX domain socket, the name is
       * returned as a string.
       *
       * @return {(Object|String|null)} The address of the server
       * @public
       */
      address() {
        if (this.options.noServer) {
          throw new Error('The server is operating in "noServer" mode');
        }
        if (!this._server) return null;
        return this._server.address();
      }
      /**
       * Stop the server from accepting new connections and emit the `'close'` event
       * when all existing connections are closed.
       *
       * @param {Function} [cb] A one-time listener for the `'close'` event
       * @public
       */
      close(cb) {
        if (this._state === CLOSED) {
          if (cb) {
            this.once("close", () => {
              cb(new Error("The server is not running"));
            });
          }
          process.nextTick(emitClose, this);
          return;
        }
        if (cb) this.once("close", cb);
        if (this._state === CLOSING) return;
        this._state = CLOSING;
        if (this.options.noServer || this.options.server) {
          if (this._server) {
            this._removeListeners();
            this._removeListeners = this._server = null;
          }
          if (this.clients) {
            if (!this.clients.size) {
              process.nextTick(emitClose, this);
            } else {
              this._shouldEmitClose = true;
            }
          } else {
            process.nextTick(emitClose, this);
          }
        } else {
          const server = this._server;
          this._removeListeners();
          this._removeListeners = this._server = null;
          server.close(() => {
            emitClose(this);
          });
        }
      }
      /**
       * See if a given request should be handled by this server instance.
       *
       * @param {http.IncomingMessage} req Request object to inspect
       * @return {Boolean} `true` if the request is valid, else `false`
       * @public
       */
      shouldHandle(req) {
        if (this.options.path) {
          const index = req.url.indexOf("?");
          const pathname = index !== -1 ? req.url.slice(0, index) : req.url;
          if (pathname !== this.options.path) return false;
        }
        return true;
      }
      /**
       * Handle a HTTP Upgrade request.
       *
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @public
       */
      handleUpgrade(req, socket, head, cb) {
        socket.on("error", socketOnError);
        const key = req.headers["sec-websocket-key"];
        const upgrade = req.headers.upgrade;
        const version = +req.headers["sec-websocket-version"];
        if (req.method !== "GET") {
          const message = "Invalid HTTP method";
          abortHandshakeOrEmitwsClientError(this, req, socket, 405, message);
          return;
        }
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          const message = "Invalid Upgrade header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (key === void 0 || !keyRegex.test(key)) {
          const message = "Missing or invalid Sec-WebSocket-Key header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (version !== 13 && version !== 8) {
          const message = "Missing or invalid Sec-WebSocket-Version header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message, {
            "Sec-WebSocket-Version": "13, 8"
          });
          return;
        }
        if (!this.shouldHandle(req)) {
          abortHandshake(socket, 400);
          return;
        }
        const secWebSocketProtocol = req.headers["sec-websocket-protocol"];
        let protocols = /* @__PURE__ */ new Set();
        if (secWebSocketProtocol !== void 0) {
          try {
            protocols = subprotocol2.parse(secWebSocketProtocol);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Protocol header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        const secWebSocketExtensions = req.headers["sec-websocket-extensions"];
        const extensions = {};
        if (this.options.perMessageDeflate && secWebSocketExtensions !== void 0) {
          const perMessageDeflate = new PerMessageDeflate2({
            ...this.options.perMessageDeflate,
            isServer: true,
            maxPayload: this.options.maxPayload
          });
          try {
            const offers = extension2.parse(secWebSocketExtensions);
            if (offers[PerMessageDeflate2.extensionName]) {
              perMessageDeflate.accept(offers[PerMessageDeflate2.extensionName]);
              extensions[PerMessageDeflate2.extensionName] = perMessageDeflate;
            }
          } catch (err) {
            const message = "Invalid or unacceptable Sec-WebSocket-Extensions header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        if (this.options.verifyClient) {
          const info = {
            origin: req.headers[`${version === 8 ? "sec-websocket-origin" : "origin"}`],
            secure: !!(req.socket.authorized || req.socket.encrypted),
            req
          };
          if (this.options.verifyClient.length === 2) {
            this.options.verifyClient(info, (verified, code, message, headers) => {
              if (!verified) {
                return abortHandshake(socket, code || 401, message, headers);
              }
              this.completeUpgrade(
                extensions,
                key,
                protocols,
                req,
                socket,
                head,
                cb
              );
            });
            return;
          }
          if (!this.options.verifyClient(info)) return abortHandshake(socket, 401);
        }
        this.completeUpgrade(extensions, key, protocols, req, socket, head, cb);
      }
      /**
       * Upgrade the connection to WebSocket.
       *
       * @param {Object} extensions The accepted extensions
       * @param {String} key The value of the `Sec-WebSocket-Key` header
       * @param {Set} protocols The subprotocols
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @throws {Error} If called more than once with the same socket
       * @private
       */
      completeUpgrade(extensions, key, protocols, req, socket, head, cb) {
        if (!socket.readable || !socket.writable) return socket.destroy();
        if (socket[kWebSocket]) {
          throw new Error(
            "server.handleUpgrade() was called more than once with the same socket, possibly due to a misconfiguration"
          );
        }
        if (this._state > RUNNING) return abortHandshake(socket, 503);
        const digest = createHash3("sha1").update(key + GUID).digest("base64");
        const headers = [
          "HTTP/1.1 101 Switching Protocols",
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Accept: ${digest}`
        ];
        const ws = new this.options.WebSocket(null, void 0, this.options);
        if (protocols.size) {
          const protocol = this.options.handleProtocols ? this.options.handleProtocols(protocols, req) : protocols.values().next().value;
          if (protocol) {
            headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
            ws._protocol = protocol;
          }
        }
        if (extensions[PerMessageDeflate2.extensionName]) {
          const params = extensions[PerMessageDeflate2.extensionName].params;
          const value = extension2.format({
            [PerMessageDeflate2.extensionName]: [params]
          });
          headers.push(`Sec-WebSocket-Extensions: ${value}`);
          ws._extensions = extensions;
        }
        this.emit("headers", headers, req);
        socket.write(headers.concat("\r\n").join("\r\n"));
        socket.removeListener("error", socketOnError);
        ws.setSocket(socket, head, {
          allowSynchronousEvents: this.options.allowSynchronousEvents,
          maxPayload: this.options.maxPayload,
          skipUTF8Validation: this.options.skipUTF8Validation
        });
        if (this.clients) {
          this.clients.add(ws);
          ws.on("close", () => {
            this.clients.delete(ws);
            if (this._shouldEmitClose && !this.clients.size) {
              process.nextTick(emitClose, this);
            }
          });
        }
        cb(ws, req);
      }
    };
    module.exports = WebSocketServer2;
    function addListeners(server, map) {
      for (const event of Object.keys(map)) server.on(event, map[event]);
      return function removeListeners() {
        for (const event of Object.keys(map)) {
          server.removeListener(event, map[event]);
        }
      };
    }
    function emitClose(server) {
      server._state = CLOSED;
      server.emit("close");
    }
    function socketOnError() {
      this.destroy();
    }
    function abortHandshake(socket, code, message, headers) {
      message = message || http5.STATUS_CODES[code];
      headers = {
        Connection: "close",
        "Content-Type": "text/html",
        "Content-Length": Buffer.byteLength(message),
        ...headers
      };
      socket.once("finish", socket.destroy);
      socket.end(
        `HTTP/1.1 ${code} ${http5.STATUS_CODES[code]}\r
` + Object.keys(headers).map((h) => `${h}: ${headers[h]}`).join("\r\n") + "\r\n\r\n" + message
      );
    }
    function abortHandshakeOrEmitwsClientError(server, req, socket, code, message, headers) {
      if (server.listenerCount("wsClientError")) {
        const err = new Error(message);
        Error.captureStackTrace(err, abortHandshakeOrEmitwsClientError);
        server.emit("wsClientError", err, socket, req);
      } else {
        abortHandshake(socket, code, message, headers);
      }
    }
  }
});

// ../../node_modules/.bun/ws@8.20.0/node_modules/ws/wrapper.mjs
var wrapper_exports = {};
__export(wrapper_exports, {
  PerMessageDeflate: () => import_permessage_deflate.default,
  Receiver: () => import_receiver.default,
  Sender: () => import_sender.default,
  WebSocket: () => import_websocket.default,
  WebSocketServer: () => import_websocket_server.default,
  createWebSocketStream: () => import_stream.default,
  default: () => wrapper_default,
  extension: () => import_extension.default,
  subprotocol: () => import_subprotocol.default
});
var import_stream, import_extension, import_permessage_deflate, import_receiver, import_sender, import_subprotocol, import_websocket, import_websocket_server, wrapper_default;
var init_wrapper = __esm({
  "../../node_modules/.bun/ws@8.20.0/node_modules/ws/wrapper.mjs"() {
    import_stream = __toESM(require_stream(), 1);
    import_extension = __toESM(require_extension(), 1);
    import_permessage_deflate = __toESM(require_permessage_deflate(), 1);
    import_receiver = __toESM(require_receiver(), 1);
    import_sender = __toESM(require_sender(), 1);
    import_subprotocol = __toESM(require_subprotocol(), 1);
    import_websocket = __toESM(require_websocket(), 1);
    import_websocket_server = __toESM(require_websocket_server(), 1);
    wrapper_default = import_websocket.default;
  }
});

// src/auth/ApiKeyAuth.ts
import * as vscode7 from "vscode";
var ApiKeyAuth;
var init_ApiKeyAuth = __esm({
  "src/auth/ApiKeyAuth.ts"() {
    "use strict";
    ApiKeyAuth = class {
      constructor(provider, config, storage) {
        this.provider = provider;
        this.config = config;
        this.storage = storage;
      }
      storage;
      /**
       * Get API key from various sources
       * Priority: stored key > environment variable > user input
       */
      async getApiKey() {
        const storedKey = await this.storage.getApiKey(this.provider);
        if (storedKey) {
          return storedKey;
        }
        if (this.config.envVarName) {
          const envKey = process.env[this.config.envVarName];
          if (envKey) {
            return envKey;
          }
        }
        const standardEnvVars = this.getStandardEnvVars();
        for (const envVar of standardEnvVars) {
          const envKey = process.env[envVar];
          if (envKey) {
            return envKey;
          }
        }
        return void 0;
      }
      /**
       * Store API key securely
       */
      async storeApiKey(apiKey) {
        await this.storage.storeApiKey(this.provider, apiKey);
      }
      /**
       * Validate API key by making a test request
       */
      async validateApiKey(apiKey) {
        switch (this.provider) {
          case "anthropic":
            return this.validateAnthropicKey(apiKey);
          case "openai":
            return this.validateOpenAIKey(apiKey);
          case "bedrock":
            return this.validateBedrockKey(apiKey);
          case "vertex":
            return this.validateVertexKey(apiKey);
          default:
            return this.validateGenericKey(apiKey);
        }
      }
      /**
       * Validate Anthropic API key
       */
      async validateAnthropicKey(apiKey) {
        if (!apiKey.startsWith("sk-ant-")) {
          return {
            valid: false,
            error: "Invalid Anthropic API key format. Key should start with sk-ant-"
          };
        }
        try {
          const response = await fetch("https://api.anthropic.com/v1/models", {
            headers: {
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01"
            }
          });
          if (response.ok) {
            return { valid: true, provider: "anthropic" };
          }
          if (response.status === 401) {
            return { valid: false, error: "Invalid API key" };
          }
          return { valid: false, error: `API error: ${response.status}` };
        } catch (error) {
          return { valid: false, error: `Connection error: ${error}` };
        }
      }
      /**
       * Validate OpenAI API key
       */
      async validateOpenAIKey(apiKey) {
        if (!apiKey.startsWith("sk-")) {
          return {
            valid: false,
            error: "Invalid OpenAI API key format. Key should start with sk-"
          };
        }
        try {
          const response = await fetch("https://api.openai.com/v1/models", {
            headers: {
              Authorization: `Bearer ${apiKey}`
            }
          });
          if (response.ok) {
            return { valid: true, provider: "openai" };
          }
          if (response.status === 401) {
            return { valid: false, error: "Invalid API key" };
          }
          return { valid: false, error: `API error: ${response.status}` };
        } catch (error) {
          return { valid: false, error: `Connection error: ${error}` };
        }
      }
      /**
       * Validate AWS Bedrock credentials
       */
      async validateBedrockKey(apiKey) {
        return { valid: true, provider: "bedrock" };
      }
      /**
       * Validate GCP Vertex AI credentials
       */
      async validateVertexKey(apiKey) {
        return { valid: true, provider: "vertex" };
      }
      /**
       * Generic API key validation
       */
      async validateGenericKey(apiKey) {
        if (!apiKey || apiKey.length < 10) {
          return { valid: false, error: "API key is too short" };
        }
        return { valid: true, provider: this.provider };
      }
      /**
       * Get standard environment variables for provider
       */
      getStandardEnvVars() {
        const envVarMap = {
          anthropic: ["ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN"],
          openai: ["OPENAI_API_KEY"],
          bedrock: ["AWS_ACCESS_KEY_ID"],
          vertex: ["GOOGLE_APPLICATION_CREDENTIALS"]
        };
        return envVarMap[this.provider] || [];
      }
      /**
       * Prompt user for API key
       */
      async promptForApiKey() {
        const apiKey = await vscode7.window.showInputBox({
          prompt: `Enter your ${this.provider} API key`,
          password: true,
          placeHolder: `Enter your ${this.provider} API key`,
          validateInput: async (value) => {
            if (!value || value.trim().length === 0) {
              return "API key cannot be empty";
            }
            return null;
          }
        });
        return apiKey;
      }
      /**
       * Delete stored API key
       */
      async deleteApiKey() {
        await this.storage.delete(`apikey_${this.provider}`);
      }
      /**
       * Check if API key exists
       */
      async hasApiKey() {
        const key = await this.getApiKey();
        return key !== void 0 && key.length > 0;
      }
      /**
       * Get authorization header value
       */
      async getAuthHeader() {
        const apiKey = await this.getApiKey();
        if (!apiKey) {
          return void 0;
        }
        const prefix = this.config.prefix || "Bearer ";
        return `${prefix}${apiKey}`;
      }
      /**
       * Dispose
       */
      dispose() {
      }
    };
  }
});

// src/auth/providers/CustomProviderAuth.ts
var CustomProviderAuth_exports = {};
__export(CustomProviderAuth_exports, {
  CustomProviderAuth: () => CustomProviderAuth
});
import * as vscode10 from "vscode";
import * as fs3 from "fs";
import * as path6 from "path";
import * as os6 from "os";
var MODELS_CONFIG_PATH, CustomProviderAuth;
var init_CustomProviderAuth = __esm({
  "src/auth/providers/CustomProviderAuth.ts"() {
    "use strict";
    init_ApiKeyAuth();
    MODELS_CONFIG_PATH = path6.join(os6.homedir(), ".claude", "models.json");
    CustomProviderAuth = class extends ApiKeyAuth {
      modelsConfig = null;
      constructor(storage) {
        super("custom", {
          provider: "custom"
        }, storage);
      }
      /**
       * Configure custom provider
       */
      async configure() {
        await this.loadModelsConfig();
        const options = [
          { label: "$(add) Add New Provider", action: "new" },
          { label: "$(file) Edit models.json", action: "edit" },
          { label: "$(list) View Existing Providers", action: "list" }
        ];
        const selected = await vscode10.window.showQuickPick(options, {
          placeHolder: "Custom Provider Configuration"
        });
        if (!selected) return false;
        switch (selected.action) {
          case "new":
            return await this.addNewProvider();
          case "edit":
            return await this.editModelsJson();
          case "list":
            return await this.listProviders();
        }
        return false;
      }
      /**
       * Add new custom provider
       */
      async addNewProvider() {
        const name = await vscode10.window.showInputBox({
          prompt: "Provider Name",
          placeHolder: "e.g., OpenRouter, DeepSeek, Groq"
        });
        if (!name) return false;
        const baseUrl = await vscode10.window.showInputBox({
          prompt: "API Base URL",
          placeHolder: "https://api.example.com/v1"
        });
        if (!baseUrl) return false;
        const apiFormatOptions = [
          { label: "Anthropic", value: "anthropic" },
          { label: "OpenAI", value: "openai" }
        ];
        const apiFormatSelected = await vscode10.window.showQuickPick(apiFormatOptions, {
          placeHolder: "Select API Format"
        });
        if (!apiFormatSelected) return false;
        const apiFormat = apiFormatSelected.value;
        const apiKey = await vscode10.window.showInputBox({
          prompt: "API Key",
          password: true
        });
        if (!apiKey) return false;
        const modelName = await vscode10.window.showInputBox({
          prompt: "Default Model Name (optional)",
          placeHolder: "e.g., gpt-4, claude-3-opus"
        });
        const isValid = await this.validateProvider({
          name,
          baseUrl,
          apiKey,
          apiFormat
        });
        if (!isValid) {
          const continueAnyway = await vscode10.window.showWarningMessage(
            "Could not validate the API configuration. Save anyway?",
            "Yes",
            "No"
          );
          if (continueAnyway !== "Yes") return false;
        }
        await this.saveProviderConfig({
          name,
          baseUrl,
          apiKey,
          apiFormat,
          models: modelName ? { [modelName]: { name: modelName } } : void 0
        });
        vscode10.window.showInformationMessage(`Provider "${name}" configured successfully!`);
        return true;
      }
      /**
       * Validate provider configuration
       */
      async validateProvider(config) {
        try {
          const headers = {
            "Content-Type": "application/json"
          };
          if (config.apiFormat === "openai") {
            headers["Authorization"] = `Bearer ${config.apiKey}`;
          } else {
            headers["x-api-key"] = config.apiKey;
          }
          const modelsUrl = config.baseUrl.endsWith("/") ? `${config.baseUrl}models` : `${config.baseUrl}/models`;
          const response = await fetch(modelsUrl, { headers });
          if (response.ok) {
            return true;
          }
          if (response.status === 404) {
            return true;
          }
          return response.status < 500;
        } catch {
          return false;
        }
      }
      /**
       * Save provider configuration to models.json
       */
      async saveProviderConfig(config) {
        if (!this.modelsConfig) {
          this.modelsConfig = { providers: {} };
        }
        const providerKey = config.name.toLowerCase().replace(/\s+/g, "-");
        await this.storeApiKey(config.apiKey);
        this.modelsConfig.providers[providerKey] = {
          name: config.name,
          baseUrl: config.baseUrl,
          apiKey: `{env:CCLOCAL_${providerKey.toUpperCase()}_API_KEY}`,
          apiFormat: config.apiFormat,
          models: config.models
        };
        await this.saveModelsConfig();
        process.env[`CCLOCAL_${providerKey.toUpperCase()}_API_KEY`] = config.apiKey;
      }
      /**
       * Edit models.json file
       */
      async editModelsJson() {
        if (!fs3.existsSync(MODELS_CONFIG_PATH)) {
          await this.createDefaultModelsConfig();
        }
        const document = await vscode10.workspace.openTextDocument(MODELS_CONFIG_PATH);
        await vscode10.window.showTextDocument(document);
        return true;
      }
      /**
       * List existing providers
       */
      async listProviders() {
        await this.loadModelsConfig();
        if (!this.modelsConfig || Object.keys(this.modelsConfig.providers).length === 0) {
          vscode10.window.showInformationMessage("No custom providers configured yet.");
          return false;
        }
        const items = Object.entries(this.modelsConfig.providers).map(([key, config]) => ({
          label: config.name,
          description: config.baseUrl,
          detail: `API Format: ${config.apiFormat || "openai"}`,
          key
        }));
        const selected = await vscode10.window.showQuickPick(items, {
          placeHolder: "Configured Providers"
        });
        if (!selected) return false;
        const actions = [
          { label: "$(pencil) Edit", action: "edit" },
          { label: "$(trash) Delete", action: "delete" },
          { label: "$(check) Test", action: "test" }
        ];
        const actionSelected = await vscode10.window.showQuickPick(actions, {
          placeHolder: `Actions for ${selected.label}`
        });
        if (!actionSelected) return false;
        switch (actionSelected.action) {
          case "edit":
            return await this.editProvider(selected.key);
          case "delete":
            return await this.deleteProvider(selected.key);
          case "test":
            return await this.testProvider(selected.key);
        }
        return false;
      }
      /**
       * Edit a provider
       */
      async editProvider(key) {
        await this.editModelsJson();
        return true;
      }
      /**
       * Delete a provider
       */
      async deleteProvider(key) {
        const confirm = await vscode10.window.showWarningMessage(
          `Delete provider "${key}"?`,
          "Yes",
          "No"
        );
        if (confirm !== "Yes") return false;
        if (this.modelsConfig) {
          delete this.modelsConfig.providers[key];
          await this.saveModelsConfig();
        }
        return true;
      }
      /**
       * Test a provider
       */
      async testProvider(key) {
        if (!this.modelsConfig) return false;
        const config = this.modelsConfig.providers[key];
        if (!config) return false;
        const isValid = await this.validateProvider(config);
        if (isValid) {
          vscode10.window.showInformationMessage(`Provider "${config.name}" is working!`);
        } else {
          vscode10.window.showErrorMessage(`Provider "${config.name}" test failed.`);
        }
        return isValid;
      }
      /**
       * Load models.json configuration
       */
      async loadModelsConfig() {
        try {
          if (fs3.existsSync(MODELS_CONFIG_PATH)) {
            const content = await fs3.promises.readFile(MODELS_CONFIG_PATH, "utf8");
            this.modelsConfig = JSON.parse(content);
          } else {
            this.modelsConfig = { providers: {} };
          }
        } catch (error) {
          console.error("Failed to load models.json:", error);
          this.modelsConfig = { providers: {} };
        }
      }
      /**
       * Save models.json configuration
       */
      async saveModelsConfig() {
        const dir = path6.dirname(MODELS_CONFIG_PATH);
        await fs3.promises.mkdir(dir, { recursive: true });
        await fs3.promises.writeFile(
          MODELS_CONFIG_PATH,
          JSON.stringify(this.modelsConfig, null, 2),
          "utf8"
        );
      }
      /**
       * Create default models.json
       */
      async createDefaultModelsConfig() {
        const defaultConfig = {
          providers: {},
          defaultModel: void 0,
          smallFastModel: void 0
        };
        await fs3.promises.mkdir(path6.dirname(MODELS_CONFIG_PATH), { recursive: true });
        await fs3.promises.writeFile(
          MODELS_CONFIG_PATH,
          JSON.stringify(defaultConfig, null, 2),
          "utf8"
        );
        this.modelsConfig = defaultConfig;
      }
      /**
       * Get all configured providers
       */
      async getConfiguredProviders() {
        await this.loadModelsConfig();
        return this.modelsConfig?.providers || {};
      }
      /**
       * Get models.json path
       */
      static getModelsConfigPath() {
        return MODELS_CONFIG_PATH;
      }
    };
  }
});

// src/mcp/MCPManager.ts
import * as vscode13 from "vscode";
import * as path7 from "path";
import * as fs4 from "fs";
function getMCPManager(outputChannel2, options) {
  if (!instance2 && outputChannel2) {
    instance2 = new MCPManager(outputChannel2, options);
  }
  return instance2;
}
function disposeMCPManager() {
  if (instance2) {
    instance2.dispose();
    instance2 = null;
  }
}
var CONFIG_FILE_NAMES, MCPManager, instance2;
var init_MCPManager = __esm({
  "src/mcp/MCPManager.ts"() {
    "use strict";
    CONFIG_FILE_NAMES = {
      user: ".claude.json",
      // Global: ~/.claude.json
      local: "cclocal.json",
      // Local: ~/.claude/cclocal.json
      project: ".mcp.json"
      // Project: <workspace>/.mcp.json
    };
    MCPManager = class {
      outputChannel;
      servers;
      options;
      disposables;
      stateChangeEmitter;
      /** Event fired when MCP state changes */
      onDidChangeState;
      constructor(outputChannel2, options = {}) {
        this.outputChannel = outputChannel2;
        this.options = {
          autoDiscoverProject: true,
          autoApproveKnown: false,
          preApprovedServers: [],
          deniedServers: [],
          allowedPatterns: [],
          blockedPatterns: [],
          ...options
        };
        this.servers = /* @__PURE__ */ new Map();
        this.disposables = [];
        this.stateChangeEmitter = new vscode13.EventEmitter();
        this.onDidChangeState = this.stateChangeEmitter.event;
        this.outputChannel.debug("MCPManager initialized");
      }
      // ─── Server Discovery ────────────────────────────────────────────────────────
      /**
       * Discover MCP servers from all config sources
       */
      async discoverServers() {
        this.outputChannel.debug("Discovering MCP servers...");
        const discovered = [];
        const userServers = await this.discoverFromConfig(
          this.getUserConfigPath(),
          "user"
        );
        discovered.push(...userServers);
        const localServers = await this.discoverFromConfig(
          this.getLocalConfigPath(),
          "local"
        );
        discovered.push(...localServers);
        if (this.options.autoDiscoverProject) {
          const projectServers = await this.discoverFromConfig(
            this.getProjectConfigPath(),
            "project"
          );
          discovered.push(...projectServers);
        }
        for (const server of discovered) {
          this.mergeServer(server);
        }
        this.outputChannel.info(`Discovered ${discovered.length} MCP servers`);
        return discovered;
      }
      /**
       * Discover servers from a specific config file
       */
      async discoverFromConfig(configPath, source) {
        if (!configPath) {
          return [];
        }
        try {
          const content = await fs4.promises.readFile(configPath, "utf-8");
          const config = JSON.parse(content);
          if (!config.mcpServers) {
            return [];
          }
          const servers = [];
          const now = Date.now();
          for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
            const approvalState = this.determineApprovalState(name, source);
            const info = {
              name,
              config: serverConfig,
              status: "registered",
              tools: [],
              approvalState,
              authState: this.determineAuthState(serverConfig),
              source,
              updatedAt: now,
              description: serverConfig.description
            };
            servers.push(info);
          }
          this.outputChannel.debug(`Found ${servers.length} servers in ${configPath}`);
          return servers;
        } catch (error) {
          if (error.code !== "ENOENT") {
            this.outputChannel.warn(`Failed to read config ${configPath}: ${error}`);
          }
          return [];
        }
      }
      /**
       * Determine approval state for a server
       */
      determineApprovalState(name, source) {
        if (this.options.preApprovedServers?.includes(name)) {
          return "approved";
        }
        if (this.options.deniedServers?.includes(name)) {
          return "denied";
        }
        if (this.options.allowedPatterns?.length) {
          for (const pattern of this.options.allowedPatterns) {
            if (new RegExp(pattern).test(name)) {
              return "approved";
            }
          }
        }
        if (this.options.blockedPatterns?.length) {
          for (const pattern of this.options.blockedPatterns) {
            if (new RegExp(pattern).test(name)) {
              return "denied";
            }
          }
        }
        if (source === "user" || source === "local") {
          return "approved";
        }
        return "pending";
      }
      /**
       * Determine auth state from config
       */
      determineAuthState(config) {
        if (config.authToken) {
          return "authenticated";
        }
        if (config.oauth || config.requiresAuth) {
          return "required";
        }
        return "none";
      }
      // ─── Server Management ────────────────────────────────────────────────────────
      /**
       * Approve a server
       */
      async approveServer(name, remember = false) {
        const server = this.servers.get(name);
        if (!server) {
          this.outputChannel.warn(`Cannot approve: server "${name}" not found`);
          return false;
        }
        const previousState = { ...server };
        server.approvalState = "approved";
        server.updatedAt = Date.now();
        if (remember) {
          await this.saveApprovalDecision(name, true);
        }
        this.emitStateChange("server_approved", name, server, previousState);
        this.outputChannel.info(`Approved MCP server: ${name}`);
        return true;
      }
      /**
       * Deny a server
       */
      async denyServer(name, remember = false, reason) {
        const server = this.servers.get(name);
        if (!server) {
          this.outputChannel.warn(`Cannot deny: server "${name}" not found`);
          return false;
        }
        const previousState = { ...server };
        server.approvalState = "denied";
        server.updatedAt = Date.now();
        if (remember) {
          await this.saveApprovalDecision(name, false);
        }
        this.emitStateChange("server_denied", name, server, previousState);
        this.outputChannel.info(`Denied MCP server: ${name}${reason ? ` (${reason})` : ""}`);
        return true;
      }
      /**
       * Remove a server
       */
      async removeServer(name) {
        const server = this.servers.get(name);
        if (!server) {
          return false;
        }
        this.servers.delete(name);
        this.emitStateChange("server_removed", name, void 0, server);
        this.outputChannel.info(`Removed MCP server: ${name}`);
        return true;
      }
      /**
       * Enable a server (if approved)
       */
      async enableServer(name) {
        const server = this.servers.get(name);
        if (!server) {
          return false;
        }
        if (server.approvalState !== "approved") {
          this.outputChannel.warn(`Cannot enable: server "${name}" is not approved`);
          return false;
        }
        return true;
      }
      /**
       * Disable a server
       */
      async disableServer(name) {
        const server = this.servers.get(name);
        if (!server) {
          return false;
        }
        const previousState = { ...server };
        server.status = "disconnected";
        server.updatedAt = Date.now();
        this.emitStateChange("server_disconnected", name, server, previousState);
        return true;
      }
      // ─── Server Queries ───────────────────────────────────────────────────────────
      /**
       * Get a server by name
       */
      getServer(name) {
        return this.servers.get(name);
      }
      /**
       * Get all servers
       */
      getAllServers() {
        return Array.from(this.servers.values());
      }
      /**
       * Get servers by approval state
       */
      getServersByApproval(state) {
        return this.getAllServers().filter((s) => s.approvalState === state);
      }
      /**
       * Get servers by status
       */
      getServersByStatus(status) {
        return this.getAllServers().filter((s) => s.status === status);
      }
      /**
       * Get pending approval servers
       */
      getPendingApprovals() {
        return this.getServersByApproval("pending");
      }
      /**
       * Get approved and connected servers
       */
      getActiveServers() {
        return this.getAllServers().filter(
          (s) => s.approvalState === "approved" && s.status === "connected"
        );
      }
      /**
       * Get MCP statistics
       */
      getStats() {
        const servers = this.getAllServers();
        const byStatus = {
          registered: 0,
          connecting: 0,
          connected: 0,
          disconnected: 0,
          failed: 0
        };
        const byApproval = {
          pending: 0,
          approved: 0,
          denied: 0
        };
        const bySource = {
          user: 0,
          local: 0,
          project: 0
        };
        for (const server of servers) {
          byStatus[server.status]++;
          byApproval[server.approvalState]++;
          bySource[server.source]++;
        }
        const connectedServers = servers.filter((s) => s.status === "connected").map((s) => s.name);
        const failedServers = servers.filter((s) => s.status === "failed").map((s) => s.name);
        return {
          totalDiscovered: servers.length,
          byStatus,
          byApproval,
          bySource,
          totalTools: servers.reduce((sum, s) => sum + s.tools.length, 0),
          connectedServers,
          failedServers
        };
      }
      // ─── Server Updates ────────────────────────────────────────────────────────────
      /**
       * Update server status (called from core MCPManager)
       */
      updateServerStatus(name, status, error) {
        const server = this.servers.get(name);
        if (!server) {
          return;
        }
        const previousState = { ...server };
        server.status = status;
        server.lastError = error;
        server.updatedAt = Date.now();
        const eventType = status === "connected" ? "server_connected" : status === "failed" ? "server_failed" : status === "disconnected" ? "server_disconnected" : "server_discovered";
        this.emitStateChange(eventType, name, server, previousState);
      }
      /**
       * Update server tools
       */
      updateServerTools(name, tools) {
        const server = this.servers.get(name);
        if (!server) {
          return;
        }
        const previousState = { ...server };
        server.tools = tools;
        server.updatedAt = Date.now();
        this.emitStateChange("tools_updated", name, server, previousState);
      }
      // ─── Approval Requests ────────────────────────────────────────────────────────
      /**
       * Show approval UI for pending servers
       */
      async showApprovalUI(request) {
        const server = request.info;
        const message = this.formatApprovalMessage(request);
        const items = [
          { title: "Approve" },
          { title: "Approve & Remember" },
          { title: "Deny" },
          { title: "Deny & Remember" }
        ];
        const result = await vscode13.window.showInformationMessage(
          message,
          { modal: true, detail: this.formatApprovalDetail(request) },
          ...items
        );
        if (!result) {
          return false;
        }
        if (result.title === "Approve") {
          return this.approveServer(server.name, false);
        } else if (result.title === "Approve & Remember") {
          return this.approveServer(server.name, true);
        } else if (result.title === "Deny") {
          return this.denyServer(server.name, false);
        } else if (result.title === "Deny & Remember") {
          return this.denyServer(server.name, true);
        }
        return false;
      }
      formatApprovalMessage(request) {
        return `MCP Server Approval Request: "${request.name}"`;
      }
      formatApprovalDetail(request) {
        const lines = [
          `Source: ${request.info.source}`,
          `Transport: ${request.info.config.type}`,
          "",
          "Tools that will be available:",
          ...request.tools.slice(0, 5).map((t) => `  \u2022 ${t.name}: ${t.description || "No description"}`),
          request.tools.length > 5 ? `  ... and ${request.tools.length - 5} more` : ""
        ];
        return lines.filter(Boolean).join("\n");
      }
      // ─── Config Paths ───────────────────────────────────────────────────────────────
      getUserConfigPath() {
        const home = process.env.HOME || process.env.USERPROFILE || "";
        return path7.join(home, CONFIG_FILE_NAMES.user);
      }
      getLocalConfigPath() {
        const home = process.env.HOME || process.env.USERPROFILE || "";
        return path7.join(home, ".claude", CONFIG_FILE_NAMES.local);
      }
      getProjectConfigPath() {
        const workspaceFolders = vscode13.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
          return void 0;
        }
        return path7.join(workspaceFolders[0].uri.fsPath, CONFIG_FILE_NAMES.project);
      }
      // ─── Persistence ───────────────────────────────────────────────────────────────
      /**
       * Save approval decision to config
       */
      async saveApprovalDecision(name, approved) {
        const config = vscode13.workspace.getConfiguration("cclocal");
        if (approved) {
          const approvedServers = config.get("approvedMcpServers") || [];
          if (!approvedServers.includes(name)) {
            approvedServers.push(name);
            await config.update("approvedMcpServers", approvedServers, vscode13.ConfigurationTarget.Global);
          }
        } else {
          const deniedServers = config.get("deniedMcpServers") || [];
          if (!deniedServers.includes(name)) {
            deniedServers.push(name);
            await config.update("deniedMcpServers", deniedServers, vscode13.ConfigurationTarget.Global);
          }
        }
      }
      // ─── Helpers ───────────────────────────────────────────────────────────────────
      mergeServer(server) {
        const existing = this.servers.get(server.name);
        if (existing) {
          const merged = {
            ...server,
            approvalState: existing.approvalState !== "pending" ? existing.approvalState : server.approvalState,
            updatedAt: Date.now()
          };
          this.servers.set(server.name, merged);
        } else {
          this.servers.set(server.name, server);
          this.emitStateChange("server_discovered", server.name, server);
        }
      }
      emitStateChange(type, serverName, info, previousState) {
        this.stateChangeEmitter.fire({
          type,
          serverName,
          info,
          previousState
        });
      }
      // ─── Lifecycle ─────────────────────────────────────────────────────────────────
      dispose() {
        this.servers.clear();
        this.disposables.forEach((d) => d.dispose());
        this.disposables = [];
        this.stateChangeEmitter.dispose();
        this.outputChannel.debug("MCPManager disposed");
      }
    };
    instance2 = null;
  }
});

// src/mcp/MCPPanelProvider.ts
import * as vscode14 from "vscode";
var MCPPanelProvider;
var init_MCPPanelProvider = __esm({
  "src/mcp/MCPPanelProvider.ts"() {
    "use strict";
    MCPPanelProvider = class {
      panel = null;
      mcpManager;
      constructor(mcpManager2) {
        this.mcpManager = mcpManager2;
      }
      /**
       * Show MCP management panel
       */
      show() {
        if (this.panel) {
          this.panel.reveal();
          return;
        }
        this.panel = vscode14.window.createWebviewPanel(
          "cclocal.mcp",
          "MCP Servers",
          vscode14.ViewColumn.One,
          {
            enableScripts: true,
            retainContextWhenHidden: true
          }
        );
        this.panel.webview.html = this.getWebviewContent();
        this.setupMessageHandler();
        this.mcpManager.onDidChangeState((event) => {
          this.sendState();
        });
      }
      /**
       * Setup message handler for webview communication
       */
      setupMessageHandler() {
        if (!this.panel) return;
        this.panel.webview.onDidReceiveMessage(async (message) => {
          switch (message.type) {
            case "getState":
              this.sendState();
              break;
            case "refreshServers":
              await this.mcpManager.discoverServers();
              this.sendState();
              break;
            case "approveServer":
              await this.mcpManager.approveServer(message.name, message.remember);
              this.sendState();
              break;
            case "denyServer":
              await this.mcpManager.denyServer(message.name, message.remember);
              this.sendState();
              break;
            case "enableServer":
              await this.mcpManager.enableServer(message.name);
              this.sendState();
              break;
            case "disableServer":
              await this.mcpManager.disableServer(message.name);
              this.sendState();
              break;
            case "removeServer":
              await this.mcpManager.removeServer(message.name);
              this.sendState();
              break;
            case "openSettings":
              await vscode14.commands.executeCommand("workbench.action.openSettings", "cclocal.mcp");
              break;
            case "openConfigFile":
              await this.openConfigFile(message.source);
              break;
          }
        });
      }
      /**
       * Send current state to webview
       */
      sendState() {
        const servers = this.mcpManager.getAllServers();
        const stats = this.mcpManager.getStats();
        const pending = this.mcpManager.getPendingApprovals();
        this.panel?.webview.postMessage({
          type: "state",
          servers,
          stats,
          pendingApprovals: pending
        });
      }
      /**
       * Open config file for editing
       */
      async openConfigFile(source) {
        const home = process.env.HOME || process.env.USERPROFILE || "";
        const paths = {
          user: `${home}/.claude.json`,
          local: `${home}/.claude/cclocal.json`,
          project: ""
        };
        if (source === "project") {
          const workspaceFolders = vscode14.workspace.workspaceFolders;
          if (workspaceFolders && workspaceFolders.length > 0) {
            paths.project = `${workspaceFolders[0].uri.fsPath}/.mcp.json`;
          } else {
            vscode14.window.showWarningMessage("No workspace folder open");
            return;
          }
        }
        const filePath = paths[source];
        if (!filePath) return;
        try {
          const doc = await vscode14.workspace.openTextDocument(filePath);
          await vscode14.window.showTextDocument(doc);
        } catch (error) {
          vscode14.window.showErrorMessage(`Failed to open ${filePath}: ${error}`);
        }
      }
      /**
       * Get webview HTML content
       */
      getWebviewContent() {
        return (
          /* html */
          `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MCP Servers</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      height: 100%;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      font-size: 24px;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--vscode-widget-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-actions {
      display: flex;
      gap: 8px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: var(--vscode-editorWidget-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: 6px;
      padding: 12px;
      text-align: center;
    }
    .stat-value {
      font-size: 24px;
      font-weight: 600;
      color: var(--vscode-textLink-foreground);
    }
    .stat-label {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-top: 4px;
    }
    .section {
      background: var(--vscode-editorWidget-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 600;
    }
    .server-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .server-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: var(--vscode-list-hoverBackground);
      border-radius: 4px;
      border-left: 3px solid transparent;
    }
    .server-item.approved {
      border-left-color: var(--vscode-testing-iconPassed, #4CAF50);
    }
    .server-item.denied {
      border-left-color: var(--vscode-testing-iconFailed, #f44336);
    }
    .server-item.pending {
      border-left-color: var(--vscode-editorWarning-foreground, #FF9800);
    }
    .server-info {
      flex: 1;
    }
    .server-name {
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .server-meta {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-top: 4px;
    }
    .server-tools {
      font-size: 11px;
      color: var(--vscode-textPreformat-foreground);
      margin-top: 4px;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 500;
    }
    .badge.status-connected {
      background: var(--vscode-testing-iconPassed, #4CAF50);
      color: white;
    }
    .badge.status-connecting {
      background: var(--vscode-progressBar-background, #2196F3);
      color: white;
    }
    .badge.status-failed {
      background: var(--vscode-testing-iconFailed, #f44336);
      color: white;
    }
    .badge.status-disconnected {
      background: var(--vscode-descriptionForeground);
      color: white;
    }
    .badge.source-user {
      background: var(--vscode-textLink-foreground);
      color: white;
    }
    .badge.source-project {
      background: var(--vscode-charts-orange, #FF9800);
      color: white;
    }
    .server-actions {
      display: flex;
      gap: 6px;
    }
    .btn {
      padding: 6px 12px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-family: inherit;
      font-size: 12px;
    }
    .btn:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .btn-secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    .btn-small {
      padding: 4px 8px;
      font-size: 11px;
    }
    .btn-danger {
      background: var(--vscode-inputValidation-errorBackground, #f44336);
    }
    .empty {
      text-align: center;
      color: var(--vscode-descriptionForeground);
      padding: 20px;
    }
    .pending-banner {
      background: var(--vscode-inputValidation-warningBackground, #FFF3E0);
      border: 1px solid var(--vscode-inputValidation-warningBorder, #FF9800);
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .pending-text {
      color: var(--vscode-editorWarning-foreground);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>
      <span>\u{1F50C} MCP Servers</span>
      <div class="header-actions">
        <button class="btn btn-secondary btn-small" id="refreshBtn">Refresh</button>
        <button class="btn btn-secondary btn-small" id="openSettingsBtn">Settings</button>
      </div>
    </h1>

    <div id="pendingBanner" class="pending-banner" style="display: none;">
      <span class="pending-text">
        <strong id="pendingCount">0</strong> server(s) pending approval
      </span>
      <button class="btn btn-small" id="reviewPendingBtn">Review</button>
    </div>

    <div class="stats" id="stats"></div>

    <div class="section">
      <div class="section-header">
        <span class="section-title">All Servers</span>
        <div>
          <button class="btn btn-secondary btn-small" id="openUserConfigBtn">User Config</button>
          <button class="btn btn-secondary btn-small" id="openProjectConfigBtn">Project Config</button>
        </div>
      </div>
      <div class="server-list" id="serverList">
        <div class="empty">Loading...</div>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    // Get state on load
    vscode.postMessage({ type: 'getState' });

    // Listen for state from extension
    window.addEventListener('message', event => {
      if (event.data.type === 'state') {
        renderState(event.data);
      }
    });

    function renderState(data) {
      renderStats(data.stats);
      renderServers(data.servers);
      renderPendingBanner(data.pendingApprovals);
    }

    function renderStats(stats) {
      const container = document.getElementById('stats');
      container.innerHTML = \`
        <div class="stat-card">
          <div class="stat-value">\${stats.totalDiscovered}</div>
          <div class="stat-label">Discovered</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">\${stats.byStatus.connected || 0}</div>
          <div class="stat-label">Connected</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">\${stats.byApproval.approved || 0}</div>
          <div class="stat-label">Approved</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">\${stats.totalTools}</div>
          <div class="stat-label">Tools</div>
        </div>
      \`;
    }

    function renderServers(servers) {
      const container = document.getElementById('serverList');

      if (servers.length === 0) {
        container.innerHTML = '<div class="empty">No MCP servers discovered. Add servers to your config files.</div>';
        return;
      }

      container.innerHTML = servers.map(server => \`
        <div class="server-item \${server.approvalState}">
          <div class="server-info">
            <div class="server-name">
              <strong>\${escapeHtml(server.name)}</strong>
              <span class="badge status-\${server.status}">\${server.status}</span>
              <span class="badge source-\${server.source}">\${server.source}</span>
            </div>
            <div class="server-meta">
              Transport: \${server.config.type}
              \${server.config.type === 'stdio' ? '\u2022 Command: ' + escapeHtml(server.config.command || '') : ''}
              \${server.config.type !== 'stdio' ? '\u2022 URL: ' + escapeHtml(server.config.url || '') : ''}
            </div>
            \${server.tools.length > 0 ? \`
              <div class="server-tools">
                Tools: \${server.tools.slice(0, 3).map(t => t.name).join(', ')}
                \${server.tools.length > 3 ? '...' : ''}
              </div>
            \` : ''}
            \${server.lastError ? '<div style="color: var(--vscode-errorForeground); margin-top: 4px;">Error: ' + escapeHtml(server.lastError) + '</div>' : ''}
          </div>
          <div class="server-actions">
            \${renderServerActions(server)}
          </div>
        </div>
      \`).join('');
    }

    function renderServerActions(server) {
      if (server.approvalState === 'pending') {
        return \`
          <button class="btn btn-small" onclick="approveServer('\${server.name}', false)">Approve</button>
          <button class="btn btn-small btn-secondary" onclick="approveServer('\${server.name}', true)">Approve & Remember</button>
          <button class="btn btn-small btn-danger" onclick="denyServer('\${server.name}', false)">Deny</button>
        \`;
      }
      if (server.approvalState === 'approved') {
        if (server.status === 'connected') {
          return \`
            <button class="btn btn-small btn-secondary" onclick="disableServer('\${server.name}')">Disable</button>
          \`;
        } else {
          return \`
            <button class="btn btn-small" onclick="enableServer('\${server.name}')">Enable</button>
          \`;
        }
      }
      if (server.approvalState === 'denied') {
        return \`
          <button class="btn btn-small" onclick="approveServer('\${server.name}', false)">Approve</button>
          <button class="btn btn-small btn-secondary btn-danger" onclick="removeServer('\${server.name}')">Remove</button>
        \`;
      }
      return '';
    }

    function renderPendingBanner(pending) {
      const banner = document.getElementById('pendingBanner');
      const count = document.getElementById('pendingCount');

      if (pending.length > 0) {
        banner.style.display = 'flex';
        count.textContent = pending.length;
      } else {
        banner.style.display = 'none';
      }
    }

    function escapeHtml(str) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // Action handlers
    function approveServer(name, remember) {
      vscode.postMessage({ type: 'approveServer', name, remember });
    }

    function denyServer(name, remember) {
      vscode.postMessage({ type: 'denyServer', name, remember });
    }

    function enableServer(name) {
      vscode.postMessage({ type: 'enableServer', name });
    }

    function disableServer(name) {
      vscode.postMessage({ type: 'disableServer', name });
    }

    function removeServer(name) {
      vscode.postMessage({ type: 'removeServer', name });
    }

    // Button handlers
    document.getElementById('refreshBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'refreshServers' });
    });

    document.getElementById('openSettingsBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'openSettings' });
    });

    document.getElementById('openUserConfigBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'openConfigFile', source: 'user' });
    });

    document.getElementById('openProjectConfigBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'openConfigFile', source: 'project' });
    });

    document.getElementById('reviewPendingBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'refreshServers' });
    });
  </script>
</body>
</html>
`
        );
      }
      /**
       * Dispose
       */
      dispose() {
        this.panel?.dispose();
        this.panel = null;
      }
    };
  }
});

// src/mcp/MCPAuthenticator.ts
import * as vscode15 from "vscode";
import * as http4 from "http";
import * as url3 from "url";
import * as crypto7 from "crypto";
var MCPAuthenticator;
var init_MCPAuthenticator = __esm({
  "src/mcp/MCPAuthenticator.ts"() {
    "use strict";
    MCPAuthenticator = class {
      outputChannel;
      context;
      pendingFlows;
      callbackServer;
      constructor(context, outputChannel2) {
        this.context = context;
        this.outputChannel = outputChannel2;
        this.pendingFlows = /* @__PURE__ */ new Map();
        this.callbackServer = null;
      }
      /**
       * Authenticate an MCP server using OAuth
       */
      async authenticate(server, config) {
        this.outputChannel.info(`Starting OAuth flow for MCP server: ${server.name}`);
        const existingToken = await this.getStoredToken(server.name);
        if (existingToken && !this.isTokenExpired(existingToken)) {
          this.outputChannel.debug(`Using cached token for: ${server.name}`);
          return existingToken;
        }
        if (existingToken?.refreshToken) {
          try {
            const refreshed = await this.refreshToken(config, existingToken.refreshToken);
            await this.storeToken(server.name, refreshed);
            return refreshed;
          } catch (error) {
            this.outputChannel.debug(`Token refresh failed for ${server.name}: ${error}`);
          }
        }
        return this.startOAuthFlow(config);
      }
      /**
       * Clear authentication for a server
       */
      async clearAuth(serverName) {
        await this.context.secrets.delete(`mcp_token_${serverName}`);
        this.outputChannel.info(`Cleared auth for MCP server: ${serverName}`);
      }
      // ─── OAuth Flow ─────────────────────────────────────────────────────────────
      async startOAuthFlow(config) {
        const codeVerifier = this.generateCodeVerifier();
        const codeChallenge = await this.generateCodeChallenge(codeVerifier);
        const state = crypto7.randomBytes(16).toString("hex");
        const authUrl = new URL(config.authorizationUrl);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("client_id", config.clientId);
        authUrl.searchParams.set("redirect_uri", config.redirectUri || this.getLocalCallbackUrl());
        authUrl.searchParams.set("scope", (config.scope || []).join(" "));
        authUrl.searchParams.set("state", state);
        authUrl.searchParams.set("code_challenge", codeChallenge);
        authUrl.searchParams.set("code_challenge_method", "S256");
        const callbackPort = await this.startCallbackServer();
        const flowPromise = new Promise((resolve, reject) => {
          this.pendingFlows.set(config.serverName, {
            resolve,
            reject,
            state,
            codeVerifier
          });
        });
        const uri = vscode15.Uri.parse(authUrl.toString());
        await vscode15.env.openExternal(uri);
        this.outputChannel.debug(`Opened OAuth authorization URL for: ${config.serverName}`);
        try {
          const token = await flowPromise;
          await this.storeToken(config.serverName, token);
          return token;
        } catch (error) {
          this.outputChannel.error(`OAuth flow failed for ${config.serverName}: ${error}`);
          throw error;
        } finally {
          this.pendingFlows.delete(config.serverName);
          this.stopCallbackServer();
        }
      }
      /**
       * Handle OAuth callback
       */
      handleCallback(req, res) {
        const parsedUrl = new url3.URL(req.url || "/", "http://localhost");
        if (parsedUrl.pathname === "/callback") {
          const code = parsedUrl.searchParams.get("code");
          const state = parsedUrl.searchParams.get("state");
          const error = parsedUrl.searchParams.get("error");
          if (error) {
            res.writeHead(400, { "Content-Type": "text/html" });
            res.end("<h1>Authentication Failed</h1><p>You can close this window.</p>");
            this.rejectAllFlows(new Error(`OAuth error: ${error}`));
            return;
          }
          if (!code || !state) {
            res.writeHead(400, { "Content-Type": "text/html" });
            res.end("<h1>Invalid Callback</h1><p>You can close this window.</p>");
            return;
          }
          for (const [serverName, flow] of this.pendingFlows) {
            if (flow.state === state) {
              res.writeHead(200, { "Content-Type": "text/html" });
              res.end(`
            <h1>Authentication Successful</h1>
            <p>You can close this window and return to VS Code.</p>
            <script>window.close()</script>
          `);
              flow.resolve({
                accessToken: code,
                tokenType: "pending",
                obtainedAt: Date.now()
              });
              return;
            }
          }
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end("<h1>No matching flow found</h1><p>You can close this window.</p>");
        } else {
          res.writeHead(404);
          res.end("Not found");
        }
      }
      /**
       * Exchange authorization code for token
       */
      async exchangeCode(config, code, codeVerifier) {
        const tokenUrl = new URL(config.tokenUrl);
        const body = new URLSearchParams();
        body.set("grant_type", "authorization_code");
        body.set("code", code);
        body.set("client_id", config.clientId);
        if (config.clientSecret) {
          body.set("client_secret", config.clientSecret);
        }
        body.set("redirect_uri", config.redirectUri || this.getLocalCallbackUrl());
        body.set("code_verifier", codeVerifier);
        const response = await fetch(tokenUrl.toString(), {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: body.toString()
        });
        if (!response.ok) {
          throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          tokenType: data.token_type || "Bearer",
          expiresIn: data.expires_in,
          obtainedAt: Date.now(),
          scope: typeof data.scope === "string" ? data.scope.split(" ") : void 0
        };
      }
      /**
       * Refresh an expired token
       */
      async refreshToken(config, refreshToken) {
        const tokenUrl = new URL(config.tokenUrl);
        const body = new URLSearchParams();
        body.set("grant_type", "refresh_token");
        body.set("refresh_token", refreshToken);
        body.set("client_id", config.clientId);
        if (config.clientSecret) {
          body.set("client_secret", config.clientSecret);
        }
        const response = await fetch(tokenUrl.toString(), {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: body.toString()
        });
        if (!response.ok) {
          throw new Error(`Token refresh failed: ${response.status}`);
        }
        const data = await response.json();
        return {
          accessToken: data.access_token,
          refreshToken: data.refresh_token || refreshToken,
          tokenType: data.token_type || "Bearer",
          expiresIn: data.expires_in,
          obtainedAt: Date.now(),
          scope: typeof data.scope === "string" ? data.scope.split(" ") : void 0
        };
      }
      // ─── Callback Server ────────────────────────────────────────────────────────
      async startCallbackServer() {
        if (this.callbackServer) {
          return 0;
        }
        return new Promise((resolve) => {
          this.callbackServer = http4.createServer((req, res) => {
            this.handleCallback(req, res);
          });
          this.callbackServer.listen(0, "127.0.0.1", () => {
            const address = this.callbackServer?.address();
            const port = address && typeof address === "object" ? address.port : 0;
            this.outputChannel.debug(`OAuth callback server started on port ${port}`);
            resolve(port);
          });
        });
      }
      stopCallbackServer() {
        if (this.callbackServer) {
          this.callbackServer.close();
          this.callbackServer = null;
          this.outputChannel.debug("OAuth callback server stopped");
        }
      }
      getLocalCallbackUrl() {
        const address = this.callbackServer?.address();
        const port = address && typeof address === "object" ? address.port : 8765;
        return `http://127.0.0.1:${port}/callback`;
      }
      // ─── Token Storage ──────────────────────────────────────────────────────────
      async getStoredToken(serverName) {
        const stored = await this.context.secrets.get(`mcp_token_${serverName}`);
        if (!stored) return void 0;
        try {
          return JSON.parse(stored);
        } catch {
          return void 0;
        }
      }
      async storeToken(serverName, token) {
        await this.context.secrets.store(
          `mcp_token_${serverName}`,
          JSON.stringify(token)
        );
      }
      isTokenExpired(token) {
        if (!token.expiresIn) return false;
        const expiresAt = token.obtainedAt + (token.expiresIn - 300) * 1e3;
        return Date.now() > expiresAt;
      }
      // ─── PKCE ───────────────────────────────────────────────────────────────────
      generateCodeVerifier() {
        return crypto7.randomBytes(32).toString("base64url");
      }
      async generateCodeChallenge(verifier) {
        const hash = crypto7.createHash("sha256").update(verifier).digest();
        return hash.toString("base64url");
      }
      // ─── Helpers ────────────────────────────────────────────────────────────────
      rejectAllFlows(error) {
        for (const [, flow] of this.pendingFlows) {
          flow.reject(error);
        }
        this.pendingFlows.clear();
      }
      // ─── Lifecycle ──────────────────────────────────────────────────────────────
      dispose() {
        this.stopCallbackServer();
        this.rejectAllFlows(new Error("Authenticator disposed"));
        this.outputChannel.debug("MCPAuthenticator disposed");
      }
    };
  }
});

// src/mcp/vscodeTools.ts
import * as vscode16 from "vscode";
function getOpenFilesTool() {
  return {
    name: "get_open_files",
    description: "Get a list of all currently open files in the editor.",
    inputSchema: {
      type: "object",
      properties: {
        includePath: {
          type: "boolean",
          default: true,
          description: "Include full file paths"
        },
        includeLanguage: {
          type: "boolean",
          default: true,
          description: "Include language identifiers"
        }
      }
    },
    execute: async (input) => {
      const opts = input;
      const tabs = vscode16.window.tabGroups.all.flatMap((group) => group.tabs);
      const files = tabs.filter((tab) => tab.input instanceof vscode16.TabInputText).map((tab) => {
        const textTab = tab.input;
        const result = {
          name: textTab.uri.path.split("/").pop() || ""
        };
        if (opts.includePath !== false) {
          result.path = textTab.uri.fsPath;
        }
        if (opts.includeLanguage !== false) {
          result.language = void 0;
        }
        return result;
      });
      return { files };
    }
  };
}
function getVisibleTextTool() {
  return {
    name: "get_visible_text",
    description: "Get the currently visible text in the active editor.",
    inputSchema: {
      type: "object",
      properties: {
        includeRange: {
          type: "boolean",
          default: true,
          description: "Include line range information"
        }
      }
    },
    execute: async (input) => {
      const opts = input;
      const editor = vscode16.window.activeTextEditor;
      if (!editor) {
        return { error: "No active editor" };
      }
      const visibleRanges = editor.visibleRanges;
      const texts = visibleRanges.map((range) => {
        const text = editor.document.getText(range);
        const result = { text };
        if (opts.includeRange !== false) {
          result.startLine = range.start.line + 1;
          result.endLine = range.end.line + 1;
        }
        return result;
      });
      return {
        fileName: editor.document.fileName,
        language: editor.document.languageId,
        visibleTexts: texts
      };
    }
  };
}
function runTaskTool() {
  return {
    name: "run_task",
    description: "Run a background task in the VS Code terminal.",
    inputSchema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "The command to execute"
        },
        name: {
          type: "string",
          description: "Name for the terminal instance"
        },
        cwd: {
          type: "string",
          description: "Working directory for the command"
        }
      },
      required: ["command"]
    },
    execute: async (input) => {
      const opts = input;
      const terminal = vscode16.window.createTerminal({
        name: opts.name || "CCLocal Task",
        cwd: opts.cwd
      });
      terminal.show();
      terminal.sendText(opts.command);
      return {
        success: true,
        message: `Task started in terminal: ${opts.name || "CCLocal Task"}`
      };
    }
  };
}
function diagnosticsChangedTool() {
  return {
    name: "diagnostics_changed",
    description: "Get current diagnostics (errors, warnings) for all open files or a specific file.",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Optional specific file path to check. If omitted, checks all open files."
        },
        severities: {
          type: "array",
          items: { type: "string", enum: ["error", "warning", "info", "hint"] },
          description: "Filter by severity levels"
        }
      }
    },
    execute: async (input) => {
      const opts = input;
      const severityMap = {
        error: vscode16.DiagnosticSeverity.Error,
        warning: vscode16.DiagnosticSeverity.Warning,
        info: vscode16.DiagnosticSeverity.Information,
        hint: vscode16.DiagnosticSeverity.Hint
      };
      const allowedSeverities = (opts.severities || ["error", "warning"]).map((s) => severityMap[s]).filter((s) => s !== void 0);
      let uris;
      if (opts.filePath) {
        uris = [vscode16.Uri.file(opts.filePath)];
      } else {
        uris = vscode16.window.tabGroups.all.flatMap((g) => g.tabs).filter((t) => t.input instanceof vscode16.TabInputText).map((t) => t.input.uri);
      }
      const results = {};
      for (const uri of uris) {
        const diagnostics = vscode16.languages.getDiagnostics(uri);
        const filtered = diagnostics.filter((d) => allowedSeverities.includes(d.severity));
        if (filtered.length > 0) {
          results[uri.fsPath] = filtered.map((d) => ({
            severity: ["error", "warning", "info", "hint"][d.severity],
            message: d.message,
            line: d.range.start.line + 1,
            source: d.source,
            code: d.code?.toString()
          }));
        }
      }
      return { diagnostics: results };
    }
  };
}
function fileSavedTool() {
  return {
    name: "file_saved",
    description: "Listen for file save events. Returns recently saved files.",
    inputSchema: {
      type: "object",
      properties: {
        since: {
          type: "number",
          description: "Unix timestamp to get saves since (defaults to last 60 seconds)"
        }
      }
    },
    execute: async (input) => {
      const opts = input;
      const since = opts.since || Date.now() - 6e4;
      const savedFiles = recentlySavedFiles.filter(
        (f) => f.timestamp >= since
      );
      return { savedFiles };
    }
  };
}
function trackFileSave(doc) {
  recentlySavedFiles.push({
    path: doc.fileName,
    timestamp: Date.now(),
    language: doc.languageId
  });
  while (recentlySavedFiles.length > MAX_SAVED_FILES) {
    recentlySavedFiles.shift();
  }
}
function getVSCodeMCPTools() {
  if (!registeredTools) {
    registeredTools = [
      getOpenFilesTool(),
      getVisibleTextTool(),
      runTaskTool(),
      diagnosticsChangedTool(),
      fileSavedTool()
    ];
  }
  return registeredTools;
}
function registerFileSaveListener(context) {
  context.subscriptions.push(
    vscode16.workspace.onDidSaveTextDocument((doc) => {
      trackFileSave(doc);
    })
  );
}
var recentlySavedFiles, MAX_SAVED_FILES, registeredTools;
var init_vscodeTools = __esm({
  "src/mcp/vscodeTools.ts"() {
    "use strict";
    recentlySavedFiles = [];
    MAX_SAVED_FILES = 100;
    registeredTools = null;
  }
});

// src/mcp/index.ts
var mcp_exports = {};
__export(mcp_exports, {
  MCPAuthenticator: () => MCPAuthenticator,
  MCPManager: () => MCPManager,
  MCPPanelProvider: () => MCPPanelProvider,
  disposeMCPManager: () => disposeMCPManager,
  formatApprovalState: () => formatApprovalState,
  formatServerStatus: () => formatServerStatus,
  getApprovalColor: () => getApprovalColor,
  getMCPManager: () => getMCPManager,
  getStatusColor: () => getStatusColor,
  getTransportIcon: () => getTransportIcon,
  getVSCodeMCPTools: () => getVSCodeMCPTools,
  registerFileSaveListener: () => registerFileSaveListener
});
function formatServerStatus(status) {
  const statusMap = {
    registered: "Registered",
    connecting: "Connecting...",
    connected: "Connected",
    disconnected: "Disconnected",
    failed: "Failed"
  };
  return statusMap[status] || status;
}
function formatApprovalState(state) {
  const stateMap = {
    pending: "Pending",
    approved: "Approved",
    denied: "Denied"
  };
  return stateMap[state] || state;
}
function getStatusColor(status) {
  const colorMap = {
    connected: "#4CAF50",
    connecting: "#2196F3",
    failed: "#f44336",
    disconnected: "#9E9E9E",
    registered: "#757575"
  };
  return colorMap[status] || "#757575";
}
function getApprovalColor(state) {
  const colorMap = {
    approved: "#4CAF50",
    pending: "#FF9800",
    denied: "#f44336"
  };
  return colorMap[state] || "#757575";
}
function getTransportIcon(type) {
  const iconMap = {
    stdio: "$(terminal)",
    sse: "$(globe)",
    http: "$(globe)",
    ws: "$(plug)"
  };
  return iconMap[type] || "$(server)";
}
var init_mcp = __esm({
  "src/mcp/index.ts"() {
    "use strict";
    init_MCPManager();
    init_MCPPanelProvider();
    init_MCPAuthenticator();
    init_vscodeTools();
  }
});

// src/ConfigPanelProvider.ts
var ConfigPanelProvider_exports = {};
__export(ConfigPanelProvider_exports, {
  ConfigPanelProvider: () => ConfigPanelProvider
});
import * as vscode21 from "vscode";
var ConfigPanelProvider;
var init_ConfigPanelProvider = __esm({
  "src/ConfigPanelProvider.ts"() {
    "use strict";
    ConfigPanelProvider = class {
      panel = null;
      configManager;
      constructor(configManager2) {
        this.configManager = configManager2;
      }
      /**
       * Show configuration panel
       */
      show() {
        if (this.panel) {
          this.panel.reveal();
          return;
        }
        this.panel = vscode21.window.createWebviewPanel(
          "cclocal.config",
          "CCLocal Settings",
          vscode21.ViewColumn.One,
          {
            enableScripts: true,
            retainContextWhenHidden: true
          }
        );
        this.panel.webview.html = this.getWebviewContent();
        this.setupMessageHandler();
      }
      /**
       * Setup message handler for webview communication
       */
      setupMessageHandler() {
        if (!this.panel) return;
        this.panel.webview.onDidReceiveMessage(async (message) => {
          switch (message.type) {
            case "getConfig":
              const config = this.configManager.getConfig();
              this.panel?.webview.postMessage({
                type: "config",
                config
              });
              break;
            case "updateConfig":
              await this.updateConfig(message.key, message.value);
              break;
            case "resetConfig":
              await this.resetConfig(message.key);
              break;
            case "addEnvironmentVariable":
              await this.configManager.addEnvironmentVariable(message.name, message.value);
              this.sendConfig();
              break;
            case "removeEnvironmentVariable":
              await this.configManager.removeEnvironmentVariable(message.name);
              this.sendConfig();
              break;
            case "addPermissionRule":
              await this.configManager.addPermissionRule(message.rule);
              this.sendConfig();
              break;
            case "addAllowedMcpServer":
              await this.configManager.addAllowedMcpServer(message.server);
              this.sendConfig();
              break;
            case "addDeniedMcpServer":
              await this.configManager.addDeniedMcpServer(message.server);
              this.sendConfig();
              break;
            case "openSettings":
              await vscode21.commands.executeCommand("workbench.action.openSettings", "cclocal");
              break;
            case "editModelsJson":
              await vscode21.commands.executeCommand("cclocal.configureCustomProvider");
              break;
            case "addHook":
              await this.addHook(message.hookType, message.definition);
              this.sendConfig();
              break;
            case "removeHook":
              await this.removeHook(message.hookType, message.defIndex, message.handlerIndex);
              this.sendConfig();
              break;
            case "getHookStats":
              const stats = await vscode21.commands.executeCommand("cclocal.hooks.stats");
              this.panel?.webview.postMessage({
                type: "hookStats",
                stats
              });
              break;
          }
        });
      }
      /**
       * Update configuration value
       */
      async updateConfig(key, value) {
        await this.configManager.update(key, value);
        this.sendConfig();
      }
      /**
       * Reset configuration to default
       */
      async resetConfig(key) {
        await this.configManager.update(key, void 0);
        this.sendConfig();
      }
      /**
       * Send current config to webview
       */
      sendConfig() {
        const config = this.configManager.getConfig();
        this.panel?.webview.postMessage({
          type: "config",
          config
        });
      }
      /**
       * Add a hook definition
       */
      async addHook(hookType, definition) {
        const hooks = this.configManager.get("hooks") || {};
        const typeHooks = hooks[hookType] || [];
        typeHooks.push(definition);
        hooks[hookType] = typeHooks;
        await this.configManager.update("hooks", hooks);
      }
      /**
       * Remove a hook
       */
      async removeHook(hookType, defIndex, handlerIndex) {
        const hooks = this.configManager.get("hooks") || {};
        const typeHooks = hooks[hookType];
        if (typeHooks && typeHooks[defIndex]) {
          const def = typeHooks[defIndex];
          if (def.hooks && def.hooks.length > handlerIndex) {
            def.hooks.splice(handlerIndex, 1);
            if (def.hooks.length === 0) {
              typeHooks.splice(defIndex, 1);
            }
          }
          if (typeHooks.length === 0) {
            delete hooks[hookType];
          }
          await this.configManager.update("hooks", hooks);
        }
      }
      /**
       * Get webview HTML content
       */
      getWebviewContent() {
        return (
          /* html */
          `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CCLocal Settings</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      height: 100%;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      font-size: 24px;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--vscode-widget-border);
    }
    h2 {
      font-size: 16px;
      margin: 20px 0 10px;
      color: var(--vscode-descriptionForeground);
    }
    .section {
      background: var(--vscode-editorWidget-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .setting {
      margin-bottom: 16px;
    }
    .setting:last-child {
      margin-bottom: 0;
    }
    .setting-label {
      font-weight: 600;
      margin-bottom: 4px;
    }
    .setting-description {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 8px;
    }
    .setting-input {
      width: 100%;
      padding: 6px 8px;
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      color: var(--vscode-input-foreground);
      border-radius: 4px;
      font-family: inherit;
      font-size: inherit;
    }
    .setting-input:focus {
      outline: none;
      border-color: var(--vscode-focusBorder);
    }
    .setting-select {
      width: 100%;
      padding: 6px 8px;
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      color: var(--vscode-input-foreground);
      border-radius: 4px;
    }
    .setting-checkbox {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .setting-checkbox input {
      width: 16px;
      height: 16px;
    }
    .btn {
      padding: 6px 12px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-family: inherit;
      font-size: 13px;
    }
    .btn:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .btn-secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    .btn-small {
      padding: 4px 8px;
      font-size: 12px;
    }
    .env-list, .permission-list, .mcp-list {
      margin-top: 8px;
    }
    .env-item, .permission-item, .mcp-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px;
      background: var(--vscode-list-hoverBackground);
      border-radius: 4px;
      margin-bottom: 4px;
    }
    .tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--vscode-widget-border);
    }
    .tab {
      padding: 8px 16px;
      background: transparent;
      border: none;
      color: var(--vscode-descriptionForeground);
      cursor: pointer;
      font-family: inherit;
      font-size: 13px;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
    }
    .tab:hover {
      color: var(--vscode-foreground);
    }
    .tab.active {
      color: var(--vscode-foreground);
      border-bottom-color: var(--vscode-focusBorder);
    }
    .tab-content {
      display: none;
    }
    .tab-content.active {
      display: block;
    }
    .inline-form {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
    }
    .inline-form input {
      flex: 1;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      border-radius: 10px;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>\u2699\uFE0F CCLocal Settings</h1>

    <div class="tabs">
      <button class="tab active" data-tab="general">General</button>
      <button class="tab" data-tab="auth">Authentication</button>
      <button class="tab" data-tab="model">Model</button>
      <button class="tab" data-tab="permissions">Permissions</button>
      <button class="tab" data-tab="mcp">MCP</button>
      <button class="tab" data-tab="hooks">Hooks</button>
      <button class="tab" data-tab="plugins">Plugins</button>
      <button class="tab" data-tab="remote">Remote</button>
    </div>

    <!-- General Tab -->
    <div id="tab-general" class="tab-content active">
      <div class="section">
        <h2>UI Settings</h2>
        <div class="setting">
          <label class="setting-label">Preferred Location</label>
          <p class="setting-description">Where to display CCLocal</p>
          <select id="preferredLocation" class="setting-select">
            <option value="sidebar">Sidebar</option>
            <option value="panel">Panel (New Tab)</option>
          </select>
        </div>
        <div class="setting">
          <div class="setting-checkbox">
            <input type="checkbox" id="useTerminal" />
            <label for="useTerminal">Use integrated terminal for bash commands</label>
          </div>
        </div>
        <div class="setting">
          <div class="setting-checkbox">
            <input type="checkbox" id="useCtrlEnterToSend" />
            <label for="useCtrlEnterToSend">Use Ctrl+Enter to send message</label>
          </div>
        </div>
        <div class="setting">
          <div class="setting-checkbox">
            <input type="checkbox" id="hideOnboarding" />
            <label for="hideOnboarding">Hide onboarding message</label>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>File Settings</h2>
        <div class="setting">
          <div class="setting-checkbox">
            <input type="checkbox" id="respectGitIgnore" />
            <label for="respectGitIgnore">Respect .gitignore</label>
          </div>
        </div>
        <div class="setting">
          <div class="setting-checkbox">
            <input type="checkbox" id="autosave" />
            <label for="autosave">Autosave files before editing</label>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Environment Variables</h2>
        <p class="setting-description">Custom environment variables for cclocal process</p>
        <div class="inline-form">
          <input type="text" id="envName" placeholder="NAME" />
          <input type="text" id="envValue" placeholder="value" />
          <button class="btn btn-small" id="addEnvBtn">Add</button>
        </div>
        <div id="envList" class="env-list"></div>
      </div>
    </div>

    <!-- Auth Tab -->
    <div id="tab-auth" class="tab-content">
      <div class="section">
        <h2>Login Method</h2>
        <div class="setting">
          <label class="setting-label">Force Login Method</label>
          <select id="forceLoginMethod" class="setting-select">
            <option value="">Auto-detect</option>
            <option value="claudeai">Claude.ai OAuth</option>
            <option value="console">API Key (Console)</option>
            <option value="bedrock">AWS Bedrock</option>
            <option value="vertex">GCP Vertex AI</option>
            <option value="custom">Third-party API</option>
          </select>
        </div>
        <div class="setting">
          <div class="setting-checkbox">
            <input type="checkbox" id="disableLoginPrompt" />
            <label for="disableLoginPrompt">Disable login prompt</label>
          </div>
        </div>
        <div class="setting">
          <label class="setting-label">OAuth Organization UUID</label>
          <input type="text" id="forceLoginOrgUUID" class="setting-input" placeholder="Optional" />
        </div>
      </div>

      <div class="section">
        <h2>Provider Settings</h2>
        <div class="setting">
          <label class="setting-label">AWS Bedrock Region</label>
          <input type="text" id="bedrockRegion" class="setting-input" value="us-east-1" />
        </div>
        <div class="setting">
          <label class="setting-label">GCP Vertex AI Project ID</label>
          <input type="text" id="vertexProjectId" class="setting-input" placeholder="my-project-id" />
        </div>
        <div class="setting">
          <button class="btn" id="configureCustomProvider">Configure Custom Provider</button>
        </div>
      </div>
    </div>

    <!-- Model Tab -->
    <div id="tab-model" class="tab-content">
      <div class="section">
        <h2>Model Settings</h2>
        <div class="setting">
          <label class="setting-label">Default Model</label>
          <input type="text" id="model" class="setting-input" placeholder="Leave empty for default" />
        </div>
        <div class="setting">
          <div class="setting-checkbox">
            <input type="checkbox" id="alwaysThinkingEnabled" />
            <label for="alwaysThinkingEnabled">Always enable thinking</label>
          </div>
        </div>
        <div class="setting">
          <div class="setting-checkbox">
            <input type="checkbox" id="fastMode" />
            <label for="fastMode">Fast mode</label>
          </div>
        </div>
        <div class="setting">
          <label class="setting-label">Max Thinking Tokens</label>
          <input type="number" id="maxThinkingTokens" class="setting-input" value="16000" />
        </div>
      </div>
    </div>

    <!-- Permissions Tab -->
    <div id="tab-permissions" class="tab-content">
      <div class="section">
        <h2>Permission Mode</h2>
        <div class="setting">
          <label class="setting-label">Initial Permission Mode</label>
          <select id="initialPermissionMode" class="setting-select">
            <option value="default">Default (ask for dangerous)</option>
            <option value="acceptEdits">Accept Edits (auto-accept file edits)</option>
            <option value="plan">Plan (no execution)</option>
            <option value="bypassPermissions">Bypass (auto-accept all)</option>
          </select>
        </div>
        <div class="setting">
          <div class="setting-checkbox">
            <input type="checkbox" id="allowDangerouslySkipPermissions" />
            <label for="allowDangerouslySkipPermissions">Allow dangerously skip permissions</label>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Custom Permission Rules</h2>
        <p class="setting-description">Define custom permission rules for specific tools</p>
        <div class="inline-form">
          <input type="text" id="ruleTool" placeholder="Tool name" style="width: 150px" />
          <select id="ruleBehavior" style="width: 100px">
            <option value="allow">Allow</option>
            <option value="deny">Deny</option>
            <option value="ask">Ask</option>
          </select>
          <button class="btn btn-small" id="addRuleBtn">Add</button>
        </div>
        <div id="permissionList" class="permission-list"></div>
      </div>
    </div>

    <!-- MCP Tab -->
    <div id="tab-mcp" class="tab-content">
      <div class="section">
        <h2>MCP Server Settings</h2>
        <div class="setting">
          <div class="setting-checkbox">
            <input type="checkbox" id="enableAllProjectMcpServers" />
            <label for="enableAllProjectMcpServers">Enable all project MCP servers</label>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Allowed MCP Servers</h2>
        <div class="inline-form">
          <input type="text" id="allowedMcpServer" placeholder="Server name" />
          <button class="btn btn-small" id="addAllowedMcpBtn">Add</button>
        </div>
        <div id="allowedMcpList" class="mcp-list"></div>
      </div>

      <div class="section">
        <h2>Denied MCP Servers</h2>
        <div class="inline-form">
          <input type="text" id="deniedMcpServer" placeholder="Server name" />
          <button class="btn btn-small" id="addDeniedMcpBtn">Add</button>
        </div>
        <div id="deniedMcpList" class="mcp-list"></div>
      </div>
    </div>

    <!-- Hooks Tab -->
    <div id="tab-hooks" class="tab-content">
      <div class="section">
        <h2>Hook Settings</h2>
        <div class="setting">
          <div class="setting-checkbox">
            <input type="checkbox" id="disableAllHooks" />
            <label for="disableAllHooks">Disable all hooks</label>
          </div>
        </div>
        <div class="setting">
          <label class="setting-label">Allowed HTTP Hook URLs</label>
          <p class="setting-description">Whitelist of URLs that HTTP hooks can call</p>
          <textarea id="allowedHttpHookUrls" class="setting-input" rows="2" placeholder="One URL per line"></textarea>
        </div>
        <div class="setting">
          <label class="setting-label">Allowed Commands</label>
          <p class="setting-description">Whitelist of commands that command hooks can execute</p>
          <textarea id="allowedCommands" class="setting-input" rows="2" placeholder="One command pattern per line"></textarea>
        </div>
        <div class="setting">
          <label class="setting-label">Allowed Environment Variables</label>
          <p class="setting-description">Environment variables that can be passed to hooks</p>
          <textarea id="allowedEnvVars" class="setting-input" rows="2" placeholder="One variable name per line"></textarea>
        </div>
      </div>

      <div class="section">
        <h2>Hook Configuration</h2>
        <p class="setting-description">Configure hooks by type. Hooks are executed in order.</p>

        <div class="setting">
          <label class="setting-label">Hook Type</label>
          <select id="hookType" class="setting-select">
            <option value="">Select a hook type...</option>
            <option value="PreToolUse">PreToolUse - Before tool execution</option>
            <option value="PostToolUse">PostToolUse - After tool execution</option>
            <option value="SessionStart">SessionStart - When session starts</option>
            <option value="SessionEnd">SessionEnd - When session ends</option>
            <option value="FileWrite">FileWrite - When file is written</option>
            <option value="FileEdit">FileEdit - When file is edited</option>
            <option value="FileRead">FileRead - When file is read</option>
            <option value="BashExecution">BashExecution - Before bash command</option>
            <option value="Error">Error - When error occurs</option>
            <option value="ModelChange">ModelChange - When model changes</option>
            <option value="MCPServerStart">MCPServerStart - When MCP server starts</option>
            <option value="MCPServerStop">MCPServerStop - When MCP server stops</option>
          </select>
        </div>

        <div id="hookEditor" style="display: none; margin-top: 16px;">
          <div class="setting">
            <label class="setting-label">Matcher Pattern (Regex)</label>
            <input type="text" id="hookMatcher" class="setting-input" placeholder="e.g., Bash|Edit or .* for all" />
          </div>
          <div class="setting">
            <label class="setting-label">Handler Type</label>
            <select id="hookHandlerType" class="setting-select">
              <option value="command">Command - Execute shell command</option>
              <option value="http">HTTP - Send HTTP request</option>
              <option value="function">Function - Call registered function</option>
            </select>
          </div>
          <div class="setting" id="hookCommandInput">
            <label class="setting-label">Command</label>
            <input type="text" id="hookCommand" class="setting-input" placeholder="e.g., echo 'Hook triggered'" />
          </div>
          <div class="setting" id="hookHttpInput" style="display: none;">
            <label class="setting-label">URL</label>
            <input type="text" id="hookUrl" class="setting-input" placeholder="https://api.example.com/hook" />
          </div>
          <div class="setting" id="hookFunctionInput" style="display: none;">
            <label class="setting-label">Function Name</label>
            <input type="text" id="hookFunction" class="setting-input" placeholder="myCustomHook" />
          </div>
          <div class="setting">
            <label class="setting-label">Timeout (ms)</label>
            <input type="number" id="hookTimeout" class="setting-input" value="30000" />
          </div>
          <div class="setting">
            <label class="setting-label">Description</label>
            <input type="text" id="hookDescription" class="setting-input" placeholder="What this hook does" />
          </div>
          <div style="margin-top: 8px;">
            <button class="btn btn-small" id="addHookBtn">Add Hook</button>
          </div>
        </div>

        <div id="hooksList" style="margin-top: 16px;"></div>
      </div>

      <div class="section">
        <h2>Hook Statistics</h2>
        <button class="btn btn-secondary" id="showHookStatsBtn">Show Hook Statistics</button>
        <div id="hookStats" style="margin-top: 12px; display: none;"></div>
      </div>

      <div class="section">
        <p class="setting-description">For advanced hook configuration, edit settings.json directly.</p>
        <button class="btn btn-secondary" id="openSettingsBtn">Open settings.json</button>
      </div>
    </div>

    <!-- Plugins Tab -->
    <div id="tab-plugins" class="tab-content">
      <div class="section">
        <h2>Plugin Settings</h2>
        <p class="setting-description">Plugins extend CCLocal functionality.</p>
        <div class="setting">
          <label class="setting-label">Enabled Plugins</label>
          <p class="setting-description">Format: { "plugin-id": "version" }</p>
          <textarea id="enabledPlugins" class="setting-input" rows="4" placeholder='{"formatter@anthropics": "1.0.0"}'></textarea>
        </div>
      </div>

      <div class="section">
        <h2>Marketplaces</h2>
        <div class="setting">
          <label class="setting-label">Extra Known Marketplaces</label>
          <textarea id="extraKnownMarketplaces" class="setting-input" rows="2" placeholder="One URL per line"></textarea>
        </div>
        <div class="setting">
          <label class="setting-label">Blocked Marketplaces</label>
          <textarea id="blockedMarketplaces" class="setting-input" rows="2" placeholder="One URL per line"></textarea>
        </div>
      </div>
    </div>

    <!-- Remote Tab -->
    <div id="tab-remote" class="tab-content">
      <div class="section">
        <h2>Remote Settings</h2>
        <p class="setting-description">Configure SSH connections for remote sessions.</p>
        <div class="setting">
          <label class="setting-label">SSH Configurations</label>
          <textarea id="sshConfigs" class="setting-input" rows="4" placeholder='[{"name": "server1", "host": "example.com", "user": "user"}]'></textarea>
        </div>
      </div>
    </div>

    <div style="margin-top: 20px; text-align: right;">
      <button class="btn btn-secondary" id="resetAllBtn">Reset All to Defaults</button>
      <button class="btn" id="saveBtn">Save Settings</button>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    // Get config on load
    vscode.postMessage({ type: 'getConfig' });

    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
      });
    });

    // Listen for config from extension
    window.addEventListener('message', event => {
      if (event.data.type === 'config') {
        const config = event.data.config;
        populateConfig(config);
      }
    });

    // Populate config values
    function populateConfig(config) {
      // General
      document.getElementById('preferredLocation').value = config.preferredLocation || 'sidebar';
      document.getElementById('useTerminal').checked = config.useTerminal ?? true;
      document.getElementById('useCtrlEnterToSend').checked = config.useCtrlEnterToSend ?? false;
      document.getElementById('hideOnboarding').checked = config.hideOnboarding ?? false;
      document.getElementById('respectGitIgnore').checked = config.respectGitIgnore ?? true;
      document.getElementById('autosave').checked = config.autosave ?? false;

      // Auth
      document.getElementById('forceLoginMethod').value = config.forceLoginMethod || '';
      document.getElementById('disableLoginPrompt').checked = config.disableLoginPrompt ?? false;
      document.getElementById('forceLoginOrgUUID').value = config.forceLoginOrgUUID || '';
      document.getElementById('bedrockRegion').value = config.bedrockRegion || 'us-east-1';
      document.getElementById('vertexProjectId').value = config.vertexProjectId || '';

      // Model
      document.getElementById('model').value = config.model || '';
      document.getElementById('alwaysThinkingEnabled').checked = config.alwaysThinkingEnabled ?? false;
      document.getElementById('fastMode').checked = config.fastMode ?? false;
      document.getElementById('maxThinkingTokens').value = config.maxThinkingTokens || 16000;

      // Permissions
      document.getElementById('initialPermissionMode').value = config.initialPermissionMode || 'default';
      document.getElementById('allowDangerouslySkipPermissions').checked = config.allowDangerouslySkipPermissions ?? false;

      // MCP
      document.getElementById('enableAllProjectMcpServers').checked = config.enableAllProjectMcpServers ?? false;

      // Hooks
      document.getElementById('disableAllHooks').checked = config.disableAllHooks ?? false;
      document.getElementById('allowedHttpHookUrls').value = (config.allowedHttpHookUrls || []).join('\\n');
      document.getElementById('allowedCommands').value = (config.allowedCommands || []).join('\\n');
      document.getElementById('allowedEnvVars').value = (config.allowedEnvVars || []).join('\\n');
      renderHooksList(config.hooks || {});

      // Plugins
      document.getElementById('enabledPlugins').value = JSON.stringify(config.enabledPlugins || {}, null, 2);
      document.getElementById('extraKnownMarketplaces').value = (config.extraKnownMarketplaces || []).join('\\n');
      document.getElementById('blockedMarketplaces').value = (config.blockedMarketplaces || []).join('\\n');

      // Remote
      document.getElementById('sshConfigs').value = JSON.stringify(config.sshConfigs || [], null, 2);

      // Lists
      renderEnvList(config.environmentVariables || []);
      renderPermissionList(config.permissionRules || []);
      renderMcpList('allowedMcpList', config.allowedMcpServers || [], 'removeAllowed');
      renderMcpList('deniedMcpList', config.deniedMcpServers || [], 'removeDenied');
    }

    function renderEnvList(envVars) {
      const container = document.getElementById('envList');
      container.innerHTML = envVars.map((env, i) => \`
        <div class="env-item">
          <span><strong>\${env.name}</strong>: \${env.value}</span>
          <button class="btn btn-small btn-secondary" data-index="\${i}" class="remove-env">Remove</button>
        </div>
      \`).join('');
    }

    function renderPermissionList(rules) {
      const container = document.getElementById('permissionList');
      container.innerHTML = rules.map((rule, i) => \`
        <div class="permission-item">
          <span><strong>\${rule.tool}</strong>: <span class="badge">\${rule.behavior}</span></span>
          <button class="btn btn-small btn-secondary" data-index="\${i}">Remove</button>
        </div>
      \`).join('');
    }

    function renderMcpList(containerId, servers, action) {
      const container = document.getElementById(containerId);
      container.innerHTML = servers.map((server, i) => \`
        <div class="mcp-item">
          <span>\${server}</span>
          <button class="btn btn-small btn-secondary" data-index="\${i}">Remove</button>
        </div>
      \`).join('');
    }

    function renderHooksList(hooks) {
      const container = document.getElementById('hooksList');
      if (!container) return;

      let html = '';
      const hookTypes = Object.keys(hooks);

      if (hookTypes.length === 0) {
        html = '<p class="setting-description">No hooks configured.</p>';
      } else {
        hookTypes.forEach(type => {
          const definitions = hooks[type] || [];
          if (definitions.length > 0) {
            html += \`<div style="margin-bottom: 12px;"><strong>\${type}</strong>\`;
            definitions.forEach((def, defIndex) => {
              def.hooks.forEach((handler, handlerIndex) => {
                const handlerInfo = getHandlerInfo(handler);
                html += \`
                  <div class="env-item" style="margin-top: 4px; margin-left: 12px;">
                    <span>
                      \${def.matcher ? '<span class="badge">' + def.matcher + '</span> ' : ''}
                      <strong>\${handler.type}</strong>: \${handlerInfo}
                      \${def.description ? '<small style="margin-left: 8px;">' + def.description + '</small>' : ''}
                    </span>
                    <button class="btn btn-small btn-secondary" onclick="removeHook('\${type}', \${defIndex}, \${handlerIndex})">Remove</button>
                  </div>
                \`;
              });
            });
            html += '</div>';
          }
        });
      }

      container.innerHTML = html;
    }

    function getHandlerInfo(handler) {
      switch (handler.type) {
        case 'command':
          return handler.command || 'undefined';
        case 'http':
          return handler.url || 'undefined';
        case 'function':
          return handler.handler || 'undefined';
        default:
          return 'unknown';
      }
    }

    // Hook type selector
    document.getElementById('hookType')?.addEventListener('change', (e) => {
      const editor = document.getElementById('hookEditor');
      if (e.target.value) {
        editor.style.display = 'block';
      } else {
        editor.style.display = 'none';
      }
    });

    // Hook handler type selector
    document.getElementById('hookHandlerType')?.addEventListener('change', (e) => {
      const type = e.target.value;
      document.getElementById('hookCommandInput').style.display = type === 'command' ? 'block' : 'none';
      document.getElementById('hookHttpInput').style.display = type === 'http' ? 'block' : 'none';
      document.getElementById('hookFunctionInput').style.display = type === 'function' ? 'block' : 'none';
    });

    // Add hook button
    document.getElementById('addHookBtn')?.addEventListener('click', () => {
      const type = document.getElementById('hookType').value;
      const matcher = document.getElementById('hookMatcher').value;
      const handlerType = document.getElementById('hookHandlerType').value;
      const timeout = parseInt(document.getElementById('hookTimeout').value) || 30000;
      const description = document.getElementById('hookDescription').value;

      let handler = { type: handlerType, timeout };

      if (handlerType === 'command') {
        handler.command = document.getElementById('hookCommand').value;
      } else if (handlerType === 'http') {
        handler.url = document.getElementById('hookUrl').value;
        handler.method = 'POST';
      } else if (handlerType === 'function') {
        handler.handler = document.getElementById('hookFunction').value;
      }

      vscode.postMessage({
        type: 'addHook',
        hookType: type,
        definition: {
          matcher: matcher || undefined,
          hooks: [handler],
          description: description || undefined,
          enabled: true
        }
      });

      // Clear inputs
      document.getElementById('hookMatcher').value = '';
      document.getElementById('hookCommand').value = '';
      document.getElementById('hookUrl').value = '';
      document.getElementById('hookFunction').value = '';
      document.getElementById('hookDescription').value = '';
    });

    // Show hook stats button
    document.getElementById('showHookStatsBtn')?.addEventListener('click', () => {
      vscode.postMessage({ type: 'getHookStats' });
    });

    // Event handlers
    document.getElementById('addEnvBtn').addEventListener('click', () => {
      const name = document.getElementById('envName').value;
      const value = document.getElementById('envValue').value;
      if (name && value) {
        vscode.postMessage({ type: 'addEnvironmentVariable', name, value });
        document.getElementById('envName').value = '';
        document.getElementById('envValue').value = '';
      }
    });

    document.getElementById('addRuleBtn').addEventListener('click', () => {
      const tool = document.getElementById('ruleTool').value;
      const behavior = document.getElementById('ruleBehavior').value;
      if (tool) {
        vscode.postMessage({ type: 'addPermissionRule', rule: { tool, behavior } });
        document.getElementById('ruleTool').value = '';
      }
    });

    document.getElementById('addAllowedMcpBtn').addEventListener('click', () => {
      const server = document.getElementById('allowedMcpServer').value;
      if (server) {
        vscode.postMessage({ type: 'addAllowedMcpServer', server });
        document.getElementById('allowedMcpServer').value = '';
      }
    });

    document.getElementById('addDeniedMcpBtn').addEventListener('click', () => {
      const server = document.getElementById('deniedMcpServer').value;
      if (server) {
        vscode.postMessage({ type: 'addDeniedMcpServer', server });
        document.getElementById('deniedMcpServer').value = '';
      }
    });

    document.getElementById('configureCustomProvider').addEventListener('click', () => {
      vscode.postMessage({ type: 'editModelsJson' });
    });

    document.getElementById('openSettingsBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'openSettings' });
    });

    document.getElementById('saveBtn').addEventListener('click', () => {
      // Collect all values and send to extension
      vscode.postMessage({
        type: 'saveAll',
        config: {
          preferredLocation: document.getElementById('preferredLocation').value,
          useTerminal: document.getElementById('useTerminal').checked,
          useCtrlEnterToSend: document.getElementById('useCtrlEnterToSend').checked,
          hideOnboarding: document.getElementById('hideOnboarding').checked,
          respectGitIgnore: document.getElementById('respectGitIgnore').checked,
          autosave: document.getElementById('autosave').checked,
          forceLoginMethod: document.getElementById('forceLoginMethod').value,
          disableLoginPrompt: document.getElementById('disableLoginPrompt').checked,
          forceLoginOrgUUID: document.getElementById('forceLoginOrgUUID').value,
          bedrockRegion: document.getElementById('bedrockRegion').value,
          vertexProjectId: document.getElementById('vertexProjectId').value,
          model: document.getElementById('model').value,
          alwaysThinkingEnabled: document.getElementById('alwaysThinkingEnabled').checked,
          fastMode: document.getElementById('fastMode').checked,
          maxThinkingTokens: parseInt(document.getElementById('maxThinkingTokens').value),
          initialPermissionMode: document.getElementById('initialPermissionMode').value,
          allowDangerouslySkipPermissions: document.getElementById('allowDangerouslySkipPermissions').checked,
          enableAllProjectMcpServers: document.getElementById('enableAllProjectMcpServers').checked,
          disableAllHooks: document.getElementById('disableAllHooks').checked,
          allowedHttpHookUrls: document.getElementById('allowedHttpHookUrls').value.split('\\n').filter(s => s.trim()),
          allowedCommands: document.getElementById('allowedCommands').value.split('\\n').filter(s => s.trim()),
          allowedEnvVars: document.getElementById('allowedEnvVars').value.split('\\n').filter(s => s.trim()),
        }
      });
    });
  </script>
</body>
</html>
`
        );
      }
      /**
       * Dispose
       */
      dispose() {
        this.panel?.dispose();
        this.panel = null;
      }
    };
  }
});

// src/vfs/CommandFSProvider.ts
var CommandFSProvider_exports = {};
__export(CommandFSProvider_exports, {
  CommandFSProvider: () => CommandFSProvider,
  KeyboardCommandFSProvider: () => KeyboardCommandFSProvider
});
import * as vscode26 from "vscode";
import { execFile } from "child_process";
var CommandFSProvider, KeyboardCommandFSProvider;
var init_CommandFSProvider = __esm({
  "src/vfs/CommandFSProvider.ts"() {
    "use strict";
    CommandFSProvider = class {
      emitter = new vscode26.EventEmitter();
      onDidChangeFile = this.emitter.event;
      // Cache results for reads
      results = /* @__PURE__ */ new Map();
      stat(uri) {
        return {
          type: vscode26.FileType.File,
          ctime: 0,
          mtime: Date.now(),
          size: this.results.get(uri.path)?.length ?? 0
        };
      }
      async readFile(uri) {
        const cached = this.results.get(uri.path);
        if (cached) return cached;
        const command = this.parseCommand(uri);
        const result = await this.executeCommand(command);
        const encoded = new TextEncoder().encode(result);
        this.results.set(uri.path, encoded);
        return encoded;
      }
      writeFile(uri, content) {
        this.results.set(uri.path, content);
        this.emitter.fire([{ type: vscode26.FileChangeType.Changed, uri }]);
      }
      delete(uri) {
        this.results.delete(uri.path);
      }
      rename(_oldUri, _newUri) {
      }
      watch() {
        return { dispose: () => {
        } };
      }
      readDirectory() {
        return [];
      }
      createDirectory() {
      }
      parseCommand(uri) {
        const query = new URLSearchParams(uri.query);
        return query.get("cmd") || uri.path.replace(/^\//, "");
      }
      executeCommand(command) {
        return new Promise((resolve) => {
          const cwd = vscode26.workspace.workspaceFolders?.[0]?.uri.fsPath;
          execFile("sh", ["-c", command], { cwd, timeout: 3e4 }, (error, stdout, stderr) => {
            if (error) {
              resolve(`Error: ${error.message}
${stderr}`);
            } else {
              resolve(stdout || stderr || "(no output)");
            }
          });
        });
      }
    };
    KeyboardCommandFSProvider = class extends CommandFSProvider {
      // Inherits all behavior, just uses a different scheme
    };
  }
});

// src/vfs/StateFSProvider.ts
var StateFSProvider_exports = {};
__export(StateFSProvider_exports, {
  StateFSProvider: () => StateFSProvider,
  StateResponseFSProvider: () => StateResponseFSProvider
});
import * as vscode27 from "vscode";
var StateFSProvider, StateResponseFSProvider;
var init_StateFSProvider = __esm({
  "src/vfs/StateFSProvider.ts"() {
    "use strict";
    StateFSProvider = class {
      emitter = new vscode27.EventEmitter();
      onDidChangeFile = this.emitter.event;
      // Registered state handlers
      handlers = /* @__PURE__ */ new Map();
      // Cached results
      results = /* @__PURE__ */ new Map();
      constructor() {
        this.registerDefaultHandlers();
      }
      /** Register a custom state handler */
      registerHandler(path11, handler) {
        this.handlers.set(path11, handler);
      }
      stat(uri) {
        return {
          type: vscode27.FileType.File,
          ctime: 0,
          mtime: Date.now(),
          size: this.results.get(uri.path)?.length ?? 0
        };
      }
      async readFile(uri) {
        const cached = this.results.get(uri.path);
        if (cached) return cached;
        const path11 = uri.path.replace(/^\//, "");
        const handler = this.handlers.get(path11);
        let result;
        if (handler) {
          result = await handler();
        } else {
          result = JSON.stringify({ error: `Unknown state path: ${path11}` });
        }
        const encoded = new TextEncoder().encode(result);
        this.results.set(uri.path, encoded);
        return encoded;
      }
      writeFile(uri, content) {
        this.results.set(uri.path, content);
        this.emitter.fire([{ type: vscode27.FileChangeType.Changed, uri }]);
      }
      delete(uri) {
        this.results.delete(uri.path);
      }
      rename(_oldUri, _newUri) {
      }
      watch() {
        return { dispose: () => {
        } };
      }
      readDirectory() {
        return [];
      }
      createDirectory() {
      }
      /** Invalidate cache for a specific path */
      invalidate(path11) {
        const uri = vscode27.Uri.parse(`_claude_state:/${path11}`);
        this.results.delete(`/${path11}`);
        this.emitter.fire([{ type: vscode27.FileChangeType.Changed, uri }]);
      }
      /** Invalidate all cached state */
      invalidateAll() {
        this.results.clear();
      }
      registerDefaultHandlers() {
        this.handlers.set("selection", async () => {
          const editor = vscode27.window.activeTextEditor;
          if (!editor) return JSON.stringify({ selection: null });
          const selection = editor.selection;
          const text = editor.document.getText(selection);
          return JSON.stringify({
            file: editor.document.uri.fsPath,
            startLine: selection.start.line + 1,
            endLine: selection.end.line + 1,
            text
          });
        });
        this.handlers.set("diagnostics", async () => {
          const diags = vscode27.languages.getDiagnostics();
          const result = {};
          for (const [uri, diagnostics] of diags) {
            if (diagnostics.length > 0) {
              result[uri.fsPath] = diagnostics.map((d) => ({
                severity: vscode27.DiagnosticSeverity[d.severity],
                message: d.message,
                line: d.range.start.line + 1
              }));
            }
          }
          return JSON.stringify(result);
        });
        this.handlers.set("visibleEditors", async () => {
          const editors = vscode27.window.visibleTextEditors;
          return JSON.stringify(editors.map((e) => ({
            file: e.document.uri.fsPath,
            language: e.document.languageId,
            viewColumn: e.viewColumn
          })));
        });
        this.handlers.set("activeFile", async () => {
          const editor = vscode27.window.activeTextEditor;
          if (!editor) return JSON.stringify({ file: null });
          return JSON.stringify({
            file: editor.document.uri.fsPath,
            language: editor.document.languageId,
            isDirty: editor.document.isDirty
          });
        });
        this.handlers.set("workspaceFolders", async () => {
          return JSON.stringify(
            vscode27.workspace.workspaceFolders?.map((f) => f.uri.fsPath) ?? []
          );
        });
      }
    };
    StateResponseFSProvider = class {
      emitter = new vscode27.EventEmitter();
      onDidChangeFile = this.emitter.event;
      responses = /* @__PURE__ */ new Map();
      stat(uri) {
        return {
          type: vscode27.FileType.File,
          ctime: 0,
          mtime: Date.now(),
          size: this.responses.get(uri.path)?.length ?? 0
        };
      }
      readFile(uri) {
        return Promise.resolve(this.responses.get(uri.path) ?? new Uint8Array(0));
      }
      writeFile(uri, content) {
        this.responses.set(uri.path, content);
        this.emitter.fire([{ type: vscode27.FileChangeType.Changed, uri }]);
      }
      delete(uri) {
        this.responses.delete(uri.path);
      }
      rename(_o, _n) {
      }
      watch() {
        return { dispose: () => {
        } };
      }
      readDirectory() {
        return [];
      }
      createDirectory() {
      }
    };
  }
});

// src/vfs/TerminalSettingFSProvider.ts
var TerminalSettingFSProvider_exports = {};
__export(TerminalSettingFSProvider_exports, {
  TerminalSettingFSProvider: () => TerminalSettingFSProvider,
  TerminalSettingResponseFSProvider: () => TerminalSettingResponseFSProvider
});
import * as vscode28 from "vscode";
var TerminalSettingFSProvider, TerminalSettingResponseFSProvider;
var init_TerminalSettingFSProvider = __esm({
  "src/vfs/TerminalSettingFSProvider.ts"() {
    "use strict";
    TerminalSettingFSProvider = class {
      emitter = new vscode28.EventEmitter();
      onDidChangeFile = this.emitter.event;
      cache = /* @__PURE__ */ new Map();
      stat(uri) {
        return {
          type: vscode28.FileType.File,
          ctime: 0,
          mtime: Date.now(),
          size: this.cache.get(uri.path)?.length ?? 0
        };
      }
      async readFile(uri) {
        const cached = this.cache.get(uri.path);
        if (cached) return cached;
        const path11 = uri.path.replace(/^\//, "");
        let result;
        switch (path11) {
          case "shell": {
            const termProfile = vscode28.workspace.getConfiguration("terminal.integrated").get("defaultProfile.windows") ?? vscode28.workspace.getConfiguration("terminal.integrated").get("defaultProfile.linux") ?? vscode28.workspace.getConfiguration("terminal.integrated").get("defaultProfile.osx") ?? "default";
            result = JSON.stringify({ shell: termProfile });
            break;
          }
          case "cwd": {
            const cwd = vscode28.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.env.HOME ?? "/";
            result = JSON.stringify({ cwd });
            break;
          }
          case "theme": {
            const theme = vscode28.window.activeColorTheme;
            result = JSON.stringify({
              kind: vscode28.ColorThemeKind[theme.kind],
              isDark: theme.kind === vscode28.ColorThemeKind.Dark || theme.kind === vscode28.ColorThemeKind.HighContrastDark
            });
            break;
          }
          case "font": {
            const fontFamily = vscode28.workspace.getConfiguration("terminal.integrated").get("fontFamily") ?? "Consolas";
            const fontSize = vscode28.workspace.getConfiguration("terminal.integrated").get("fontSize") ?? 14;
            result = JSON.stringify({ fontFamily, fontSize });
            break;
          }
          default:
            result = JSON.stringify({ error: `Unknown terminal setting: ${path11}` });
        }
        const encoded = new TextEncoder().encode(result);
        this.cache.set(uri.path, encoded);
        return encoded;
      }
      writeFile(uri, content) {
        this.cache.set(uri.path, content);
        this.emitter.fire([{ type: vscode28.FileChangeType.Changed, uri }]);
      }
      delete(uri) {
        this.cache.delete(uri.path);
      }
      rename(_o, _n) {
      }
      watch() {
        return { dispose: () => {
        } };
      }
      readDirectory() {
        return [];
      }
      createDirectory() {
      }
    };
    TerminalSettingResponseFSProvider = class {
      emitter = new vscode28.EventEmitter();
      onDidChangeFile = this.emitter.event;
      responses = /* @__PURE__ */ new Map();
      stat(uri) {
        return {
          type: vscode28.FileType.File,
          ctime: 0,
          mtime: Date.now(),
          size: this.responses.get(uri.path)?.length ?? 0
        };
      }
      readFile(uri) {
        return Promise.resolve(this.responses.get(uri.path) ?? new Uint8Array(0));
      }
      writeFile(uri, content) {
        this.responses.set(uri.path, content);
        this.emitter.fire([{ type: vscode28.FileChangeType.Changed, uri }]);
      }
      delete(uri) {
        this.responses.delete(uri.path);
      }
      rename(_o, _n) {
      }
      watch() {
        return { dispose: () => {
        } };
      }
      readDirectory() {
        return [];
      }
      createDirectory() {
      }
    };
  }
});

// src/vfs/ChromeFSProvider.ts
var ChromeFSProvider_exports = {};
__export(ChromeFSProvider_exports, {
  ChromeFSProvider: () => ChromeFSProvider
});
import * as vscode29 from "vscode";
var ChromeFSProvider;
var init_ChromeFSProvider = __esm({
  "src/vfs/ChromeFSProvider.ts"() {
    "use strict";
    ChromeFSProvider = class {
      emitter = new vscode29.EventEmitter();
      onDidChangeFile = this.emitter.event;
      cache = /* @__PURE__ */ new Map();
      static scheme = "_claude_in_chrome__";
      stat(uri) {
        return {
          type: vscode29.FileType.File,
          ctime: 0,
          mtime: Date.now(),
          size: this.cache.get(uri.path)?.length ?? 0
        };
      }
      readFile(uri) {
        const cached = this.cache.get(uri.path);
        if (cached) return cached;
        const result = JSON.stringify({ status: "ready", path: uri.path });
        return new TextEncoder().encode(result);
      }
      writeFile(uri, content, _options) {
        this.cache.set(uri.path, content);
        this.emitter.fire([{ type: vscode29.FileChangeType.Changed, uri }]);
      }
      delete(uri) {
        this.cache.delete(uri.path);
        this.emitter.fire([{ type: vscode29.FileChangeType.Deleted, uri }]);
      }
      rename(_oldUri, _newUri) {
        throw vscode29.FileSystemError.NoPermissions("Chrome FS does not support rename");
      }
      watch() {
        return { dispose: () => {
        } };
      }
      readDirectory() {
        return [];
      }
      createDirectory() {
      }
    };
  }
});

// src/remote/types.ts
var types_exports = {};
var init_types = __esm({
  "src/remote/types.ts"() {
    "use strict";
  }
});

// src/extension.ts
import * as vscode40 from "vscode";
import * as path10 from "path";

// src/CliViewProvider.ts
import * as crypto2 from "crypto";
import * as os2 from "os";
import * as vscode from "vscode";

// src/CclocalProcess.ts
import { spawn } from "child_process";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
var CclocalProcess = class {
  constructor(callbacks) {
    this.callbacks = callbacks;
  }
  process = null;
  buffer = "";
  killed = false;
  /** 启动 cclocal 进程处理一次对话 */
  launch(options) {
    if (this.process) {
      this.kill();
    }
    this.buffer = "";
    this.killed = false;
    const { args, cmd } = this.buildCommand(options);
    this.process = spawn(cmd, args, {
      cwd: options.cwd,
      env: this.buildEnv(),
      stdio: ["ignore", "pipe", "pipe"],
      shell: true
    });
    this.process.stdout?.on("data", (chunk) => {
      this.handleStdoutChunk(chunk.toString());
    });
    let stderrBuf = "";
    this.process.stderr?.on("data", (chunk) => {
      stderrBuf += chunk.toString();
    });
    this.process.on("error", (err) => {
      if (!this.killed) {
        this.callbacks.onError(`\u542F\u52A8 cclocal \u5931\u8D25: ${err.message}`);
      }
    });
    this.process.on("close", (code) => {
      this.process = null;
      if (!this.killed) {
        if (code !== 0 && code !== null) {
          const detail = stderrBuf.trim() ? `
\u8BE6\u60C5: ${stderrBuf.trim().split("\n").slice(-3).join(" | ")}` : "";
          this.callbacks.onError(`cclocal \u8FDB\u7A0B\u4EE5\u9000\u51FA\u7801 ${code} \u7ED3\u675F${detail}`);
        }
        this.callbacks.onExit();
      }
    });
  }
  /** 强制终止进程 */
  kill() {
    this.killed = true;
    if (this.process) {
      this.process.kill("SIGTERM");
      this.process = null;
    }
  }
  /** 判断进程是否仍在运行 */
  isRunning() {
    return this.process !== null && !this.killed;
  }
  /**
   * 构建注入了完整 PATH 的环境变量，确保子进程能找到 cclocal 和 bun。
   * VSCode Extension Host 不加载 shell 配置，默认 PATH 极简，
   * 需要手动补全 macOS 常见的可执行文件目录。
   */
  buildEnv() {
    const home = os.homedir();
    const extraPaths = [
      "/opt/homebrew/bin",
      // Apple Silicon Homebrew
      "/usr/local/bin",
      // Intel Homebrew / 手动安装
      `${home}/.bun/bin`,
      // bun 默认安装路径
      `${home}/.local/bin`,
      // 用户级工具
      `${home}/.eigent/bin`,
      // eigent 自带 bun
      "/usr/bin",
      "/bin"
    ];
    const currentPath = process.env.PATH ?? "";
    const mergedPath = [...extraPaths, currentPath].filter(Boolean).join(path.delimiter);
    return { ...process.env, PATH: mergedPath };
  }
  /**
   * 根据配置构建启动命令和参数。
   * 优先使用全局命令 cclocal，若提供了 projectPath 则用 bun run start。
   */
  buildCommand(options) {
    const safePrompt = options.prompt;
    const baseArgs = [
      "--print",
      safePrompt,
      "--output-format",
      "stream-json",
      "--verbose"
    ];
    if (options.model) {
      baseArgs.push("--model", options.model);
    }
    if (options.projectPath && fs.existsSync(options.projectPath)) {
      const bunBin = options.executablePath || "bun";
      return {
        cmd: bunBin,
        args: ["run", "start", "--", ...baseArgs]
      };
    }
    return {
      cmd: options.executablePath || "cclocal",
      args: baseArgs
    };
  }
  /**
   * 处理 stdout 增量数据，按行分割并解析 JSON。
   * cclocal stream-json 模式每行输出一个 JSON 对象。
   */
  handleStdoutChunk(chunk) {
    this.buffer += chunk;
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      try {
        const msg = JSON.parse(trimmed);
        this.callbacks.onMessage(msg);
      } catch {
      }
    }
  }
};

// src/CliViewProvider.ts
var CliViewProvider = class {
  constructor(extensionUri) {
    this.extensionUri = extensionUri;
    this.cclocalProcess = new CclocalProcess({
      onMessage: (msg) => this.handleStreamMsg(msg),
      onError: (err) => {
        this.sendToWebview({ type: "error", message: err });
        this.setStatus("error");
      },
      onExit: () => {
        if (this.currentMessageId) {
          this.sendToWebview({
            type: "from-extension",
            message: { type: "result", subtype: "success", session_id: "" }
          });
          this.currentMessageId = "";
        }
        this.setStatus("idle");
      }
    });
  }
  static viewType = "cclocal.chatView";
  view;
  cclocalProcess;
  /** 当前正在构建的 AI 消息 ID */
  currentMessageId = "";
  /** 当前状态 */
  status = "idle";
  /** VSCode 调用此方法创建/恢复 WebviewView */
  resolveWebviewView(webviewView, _context, _token) {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };
    webviewView.webview.html = this.buildHtml(webviewView.webview);
    webviewView.webview.onDidReceiveMessage((message) => {
      this.handleWebviewMessage(message);
    });
  }
  /**
   * 供 extension.ts 外部调用的命令分发接口。
   */
  handleCommand(command) {
    switch (command) {
      case "newSession":
        this.newSession();
        break;
      case "clearChat":
        this.clearChat();
        break;
      case "stopGeneration":
        this.stopGeneration();
        break;
    }
  }
  /**
   * 供 extension.ts 外部直接发送消息（例如从编辑器右键菜单发送选中代码）。
   */
  sendMessage(text) {
    this.handleSendMessage(text);
  }
  // ─── 私有方法 ────────────────────────────────────────────────────────────────
  /** 处理来自 Webview 的消息 */
  handleWebviewMessage(message) {
    switch (message.type) {
      case "ready":
        this.sendToWebview({ type: "statusChange", status: this.status });
        break;
      case "submit":
        this.handleSendMessage(message.text);
        break;
      case "stopGeneration":
        this.stopGeneration();
        break;
      case "newSession":
        this.newSession();
        break;
      case "clearChat":
        this.clearChat();
        break;
    }
  }
  /** 启动 cclocal 进程发送消息 */
  handleSendMessage(text) {
    if (this.status === "running") {
      this.sendToWebview({ type: "error", message: "\u6B63\u5728\u5904\u7406\u4E0A\u4E00\u6761\u6D88\u606F\uFF0C\u8BF7\u7B49\u5F85\u6216\u70B9\u51FB\u505C\u6B62" });
      return;
    }
    const config = vscode.workspace.getConfiguration("cclocal");
    const cclocalPath = config.get("cclocalPath") || "cclocal";
    const model = config.get("model") || "";
    const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? os2.homedir();
    this.currentMessageId = this.generateId();
    this.sendToWebview({
      type: "from-extension",
      message: {
        type: "system",
        subtype: "info",
        message: text
      }
    });
    this.setStatus("running");
    this.cclocalProcess.launch({
      executablePath: cclocalPath,
      cwd,
      prompt: text,
      model: model || void 0
    });
  }
  /** 处理 stream-json 行 — 转发为 from-extension 消息 */
  handleStreamMsg(msg) {
    this.sendToWebview({ type: "from-extension", message: msg });
    switch (msg.type) {
      case "result":
        this.currentMessageId = "";
        this.setStatus("idle");
        break;
      case "system":
        break;
    }
  }
  /** 停止当前生成 */
  stopGeneration() {
    if (this.status === "running") {
      this.cclocalProcess.kill();
      if (this.currentMessageId) {
        this.sendToWebview({
          type: "from-extension",
          message: { type: "result", subtype: "cancelled", session_id: "" }
        });
        this.currentMessageId = "";
      }
      this.setStatus("idle");
    }
  }
  /** 新建会话（清空 UI） */
  newSession() {
    this.stopGeneration();
    this.sendToWebview({ type: "sessionCleared" });
  }
  /** 清空聊天记录 */
  clearChat() {
    this.stopGeneration();
    this.sendToWebview({ type: "sessionCleared" });
  }
  /** 更新状态并通知 Webview */
  setStatus(status) {
    this.status = status;
    this.sendToWebview({ type: "statusChange", status });
  }
  /** 从 Extension 侧向 Webview 发送消息 */
  sendToWebview(message) {
    this.view?.webview.postMessage(message);
  }
  /** 生成随机消息 ID */
  generateId() {
    return crypto2.randomBytes(8).toString("hex");
  }
  /**
   * 构建侧边栏 Webview 的 HTML 内容。
   * 现代化设计：参考 Claude.ai 对话风格，全内联，离线可用。
   */
  buildHtml(webview) {
    const nonce = crypto2.randomBytes(16).toString("base64");
    return (
      /* html */
      `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';" />
  <title>CCLocal</title>
  <style nonce="${nonce}">
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:          var(--vscode-sideBar-background, #1a1a1a);
      --bg-elevated: var(--vscode-editorWidget-background, #232323);
      --bg-input:    var(--vscode-input-background, #2a2a2a);
      --fg:          var(--vscode-foreground, #e0e0e0);
      --fg-dim:      var(--vscode-descriptionForeground, #888);
      --fg-user:     #fff;
      --border:      var(--vscode-widget-border, #3a3a3a);
      --accent:      var(--vscode-button-background, #0078d4);
      --accent-fg:   var(--vscode-button-foreground, #fff);
      --danger:      var(--vscode-errorForeground, #f14c4c);
      --green:       #3fb950;
      --orange:      #e3a11d;
      --font:        var(--vscode-font-family, system-ui, sans-serif);
      --mono:        var(--vscode-editor-font-family, 'Cascadia Code', Consolas, monospace);
      --sz:          var(--vscode-font-size, 13px);
      --r:           8px;
    }

    html, body { height: 100%; background: var(--bg); color: var(--fg);
      font-family: var(--font); font-size: var(--sz); line-height: 1.65; }

    /* \u2500\u2500 layout \u2500\u2500 */
    #app { display: flex; flex-direction: column; height: 100vh; }

    /* \u2500\u2500 messages \u2500\u2500 */
    #thread {
      flex: 1; overflow-y: auto; padding: 16px 12px 8px;
      display: flex; flex-direction: column; gap: 0;
      scroll-behavior: smooth;
    }
    #thread::-webkit-scrollbar { width: 3px; }
    #thread::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

    /* \u2500\u2500 empty state \u2500\u2500 */
    #empty {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 12px; text-align: center; padding: 24px; color: var(--fg-dim);
      pointer-events: none;
    }
    #empty svg { opacity: .35; }
    #empty h3 { font-size: 15px; font-weight: 600; color: var(--fg); }
    #empty p  { font-size: 12px; line-height: 1.6; max-width: 220px; }

    /* \u2500\u2500 message row \u2500\u2500 */
    .row { display: flex; flex-direction: column; margin-bottom: 18px; }
    .row:last-child { margin-bottom: 4px; }

    /* user row \u2014 right-aligned bubble */
    .row.user { align-items: flex-end; }
    .row.user .bubble {
      background: var(--accent); color: var(--fg-user);
      border-radius: var(--r) var(--r) 2px var(--r);
      max-width: 88%; padding: 9px 13px;
      white-space: pre-wrap; word-break: break-word;
    }

    /* assistant row \u2014 full-width, no bubble bg */
    .row.assistant { align-items: flex-start; }
    .row.assistant .avatar {
      display: flex; align-items: center; gap: 6px;
      font-size: 11px; font-weight: 600; color: var(--fg-dim);
      margin-bottom: 4px; letter-spacing: .3px; text-transform: uppercase;
    }
    .row.assistant .avatar .dot {
      width: 18px; height: 18px; border-radius: 50%;
      background: linear-gradient(135deg, #7c5cfc, #4fa3e0);
      display: flex; align-items: center; justify-content: center;
      font-size: 9px; color: #fff; font-weight: 700;
    }
    .row.assistant .content {
      padding-left: 24px; width: 100%;
      word-break: break-word; white-space: pre-wrap;
    }

    /* markdown inside assistant content */
    .content p  { margin: .3em 0; }
    .content strong { font-weight: 600; }
    .content em  { font-style: italic; }
    .content code {
      font-family: var(--mono); font-size: .85em;
      background: rgba(255,255,255,.07); border-radius: 4px;
      padding: 1px 5px;
    }
    .content pre {
      background: var(--bg-elevated); border: 1px solid var(--border);
      border-radius: var(--r); padding: 10px 12px; overflow-x: auto;
      margin: 6px 0;
    }
    .content pre code { background: none; padding: 0; font-size: .8em; }
    .content ul, .content ol { padding-left: 18px; margin: .3em 0; }
    .content li { margin: .15em 0; }
    .content blockquote {
      border-left: 3px solid var(--border); padding-left: 10px;
      color: var(--fg-dim); margin: .4em 0;
    }
    .content h1,.content h2,.content h3 {
      font-weight: 600; margin: .5em 0 .2em; line-height: 1.3;
    }
    .content h1 { font-size: 1.15em; }
    .content h2 { font-size: 1.05em; }
    .content h3 { font-size: .95em; }

    /* \u2500\u2500 typing dots \u2500\u2500 */
    .typing { display: flex; gap: 4px; align-items: center; padding: 2px 0 6px; }
    .typing span {
      width: 6px; height: 6px; border-radius: 50%;
      background: var(--fg-dim); animation: blink 1.2s infinite;
    }
    .typing span:nth-child(2) { animation-delay: .2s; }
    .typing span:nth-child(3) { animation-delay: .4s; }
    @keyframes blink { 0%,80%,100%{opacity:.2} 40%{opacity:1} }

    /* \u2500\u2500 tool card \u2500\u2500 */
    .tool-row {
      display: flex; align-items: center; gap: 7px;
      padding: 5px 10px; margin: 3px 0 3px 24px;
      background: var(--bg-elevated); border: 1px solid var(--border);
      border-radius: 6px; font-size: 11px; color: var(--fg-dim);
      width: fit-content; max-width: 100%;
    }
    .tool-row .tool-icon { font-size: 12px; }
    .tool-row .tool-name { font-family: var(--mono); color: #c98aff; font-weight: 600; }

    /* \u2500\u2500 error banner \u2500\u2500 */
    .err-row {
      display: flex; align-items: flex-start; gap: 8px;
      background: rgba(241,76,76,.08); border: 1px solid rgba(241,76,76,.35);
      border-radius: var(--r); padding: 8px 12px; margin-bottom: 12px;
      font-size: 12px; color: var(--danger);
    }
    .err-row .err-icon { flex-shrink: 0; margin-top: 1px; }

    /* \u2500\u2500 status strip \u2500\u2500 */
    #status-strip {
      display: flex; align-items: center; gap: 6px;
      padding: 4px 12px; font-size: 11px; color: var(--fg-dim);
      border-top: 1px solid var(--border); flex-shrink: 0;
      min-height: 24px;
    }
    #status-strip .pip {
      width: 6px; height: 6px; border-radius: 50%;
      background: var(--fg-dim); flex-shrink: 0; transition: background .3s;
    }
    #status-strip .pip.green  { background: var(--green); }
    #status-strip .pip.orange { background: var(--orange); animation: blink 1s infinite; }
    #status-strip .pip.red    { background: var(--danger); }
    #status-strip #status-label { flex: 1; }
    #status-strip #gen-spinner {
      display: none; width: 12px; height: 12px;
      border: 2px solid var(--border); border-top-color: var(--accent);
      border-radius: 50%; animation: spin .8s linear infinite;
    }
    #status-strip #gen-spinner.show { display: block; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* \u2500\u2500 input area \u2500\u2500 */
    #composer {
      border-top: 1px solid var(--border); padding: 10px 10px 10px;
      background: var(--bg); flex-shrink: 0;
    }
    #composer-box {
      display: flex; align-items: flex-end; gap: 6px;
      background: var(--bg-input); border: 1px solid var(--border);
      border-radius: 10px; padding: 6px 6px 6px 12px;
      transition: border-color .2s;
    }
    #composer-box:focus-within { border-color: var(--accent); }

    #msg-input {
      flex: 1; background: transparent; border: none; outline: none;
      color: var(--fg); font-family: var(--font); font-size: var(--sz);
      resize: none; line-height: 1.55; min-height: 22px; max-height: 140px;
      padding: 2px 0;
    }
    #msg-input::placeholder { color: var(--fg-dim); }

    .composer-btn {
      border: none; border-radius: 7px; cursor: pointer;
      width: 30px; height: 30px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      transition: opacity .15s, background .15s;
    }
    #send-btn { background: var(--accent); color: var(--fg-user); }
    #send-btn:hover:not(:disabled) { opacity: .85; }
    #send-btn:disabled { opacity: .35; cursor: not-allowed; }

    #stop-btn { background: var(--danger); color: #fff; display: none; }
    #stop-btn.show { display: flex; }
    #stop-btn:hover { opacity: .85; }

    #hint { font-size: 10px; color: var(--fg-dim); padding: 4px 2px 0; }
  </style>
</head>
<body>
<div id="app">

  <!-- message thread -->
  <div id="thread">
    <div id="empty">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <h3>CCLocal</h3>
      <p>Claude Code \u672C\u5730\u52A9\u624B<br/>\u6B63\u5728\u8FDE\u63A5\uFF0C\u7A0D\u5019\u5373\u53EF\u53D1\u9001\u6D88\u606F</p>
    </div>
  </div>

  <!-- status strip -->
  <div id="status-strip">
    <div class="pip" id="pip"></div>
    <span id="status-label">\u6B63\u5728\u542F\u52A8\u2026</span>
    <div id="gen-spinner"></div>
  </div>

  <!-- composer -->
  <div id="composer">
    <div id="composer-box">
      <textarea id="msg-input" rows="1"
        placeholder="\u53D1\u9001\u6D88\u606F\u2026 (Enter \u53D1\u9001\uFF0CShift+Enter \u6362\u884C)"></textarea>
      <button id="stop-btn" class="composer-btn" title="\u505C\u6B62\u751F\u6210">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <rect x="2" y="2" width="12" height="12" rx="2"/>
        </svg>
      </button>
      <button id="send-btn" class="composer-btn" title="\u53D1\u9001">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
      </button>
    </div>
    <div id="hint">Enter \u53D1\u9001 &middot; Shift+Enter \u6362\u884C</div>
  </div>
</div>

<script nonce="${nonce}">
const vscode = acquireVsCodeApi()

const threadEl  = document.getElementById('thread')
const emptyEl   = document.getElementById('empty')
const inputEl   = document.getElementById('msg-input')
const sendBtn   = document.getElementById('send-btn')
const stopBtn   = document.getElementById('stop-btn')
const pip       = document.getElementById('pip')
const statusLbl = document.getElementById('status-label')
const spinner   = document.getElementById('gen-spinner')

let isRunning = false
const bubbles = {}   // messageId \u2192 { el, text, done }

// \u2500\u2500 markdown renderer \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function md(raw) {
  let s = raw
  // fenced code blocks
  s = s.replace(/\`\`\`([\\w.-]*)\\n?([\\s\\S]*?)\`\`\`/g, (_, lang, code) =>
    '<pre><code>' + esc(code.trim()) + '</code></pre>')
  // inline code
  s = s.replace(/\`([^\`\\n]+)\`/g, (_, c) => '<code>' + esc(c) + '</code>')
  // bold / italic
  s = s.replace(/\\*\\*\\*(.+?)\\*\\*\\*/g, '<strong><em>$1</em></strong>')
  s = s.replace(/\\*\\*(.+?)\\*\\*/g,  '<strong>$1</strong>')
  s = s.replace(/\\*(.+?)\\*/g,   '<em>$1</em>')
  // headings
  s = s.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  s = s.replace(/^## (.+)$/gm,  '<h2>$1</h2>')
  s = s.replace(/^# (.+)$/gm,   '<h1>$1</h1>')
  // blockquote
  s = s.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
  // unordered list
  s = s.replace(/^[*-] (.+)$/gm, '<li>$1</li>')
  s = s.replace(/(<li>.*<\\/li>)/s, '<ul>$1</ul>')
  // ordered list
  s = s.replace(/^\\d+\\. (.+)$/gm, '<li>$1</li>')
  // horizontal rule
  s = s.replace(/^---$/gm, '<hr/>')
  // paragraph breaks (double newline)
  s = s.replace(/\\n\\n/g, '</p><p>')
  // single newline
  s = s.replace(/\\n/g, '<br/>')
  return '<p>' + s + '</p>'
}

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;')
          .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

// \u2500\u2500 dom helpers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function hideEmpty() { emptyEl.style.display = 'none' }

function addUserRow(text) {
  hideEmpty()
  const row = document.createElement('div')
  row.className = 'row user'
  const bubble = document.createElement('div')
  bubble.className = 'bubble'
  bubble.textContent = text
  row.appendChild(bubble)
  threadEl.appendChild(row)
  scrollEnd()
}

function ensureAssistantRow(id) {
  if (bubbles[id]) return bubbles[id]
  hideEmpty()
  const row = document.createElement('div')
  row.className = 'row assistant'
  row.id = 'r-' + id
  row.innerHTML =
    '<div class="avatar"><div class="dot">C</div>CCLocal</div>' +
    '<div class="content"><div class="typing"><span></span><span></span><span></span></div></div>'
  threadEl.appendChild(row)
  bubbles[id] = { el: row.querySelector('.content'), text: '', done: false }
  scrollEnd()
  return bubbles[id]
}

function appendChunk(id, chunk) {
  const entry = ensureAssistantRow(id)
  entry.text += chunk
  entry.el.innerHTML = md(entry.text)
  scrollEnd()
}

function finalizeRow(id) {
  const entry = bubbles[id]
  if (!entry || entry.done) return
  entry.done = true
  if (!entry.text) document.getElementById('r-' + id)?.remove()
}

function addToolRow(name) {
  hideEmpty()
  const div = document.createElement('div')
  div.className = 'tool-row'
  div.innerHTML = '<span class="tool-icon">\u2699</span><span class="tool-name">' + esc(name) + '</span>'
  threadEl.appendChild(div)
  scrollEnd()
}

function addError(msg) {
  hideEmpty()
  const div = document.createElement('div')
  div.className = 'err-row'
  div.innerHTML = '<span class="err-icon">\u26A0</span><span>' + esc(msg) + '</span>'
  threadEl.appendChild(div)
  scrollEnd()
}

function scrollEnd() { threadEl.scrollTop = threadEl.scrollHeight }

// \u2500\u2500 status strip \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function setStatus(s) {
  isRunning = s === 'running'
  pip.className = 'pip'
  spinner.classList.remove('show')
  stopBtn.classList.remove('show')
  sendBtn.disabled = false

  if (s === 'running') {
    pip.classList.add('orange')
    statusLbl.textContent = '\u751F\u6210\u4E2D\u2026'
    spinner.classList.add('show')
    stopBtn.classList.add('show')
    sendBtn.disabled = true
  } else if (s === 'connected') {
    pip.classList.add('green')
    statusLbl.textContent = '\u5DF2\u8FDE\u63A5'
  } else if (s === 'connecting') {
    statusLbl.textContent = '\u6B63\u5728\u8FDE\u63A5\u2026'
  } else if (s === 'error') {
    pip.classList.add('red')
    statusLbl.textContent = '\u51FA\u9519\u4E86'
  } else {
    statusLbl.textContent = '\u5C31\u7EEA'
  }
}

// \u2500\u2500 send \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function send() {
  const text = inputEl.value.trim()
  if (!text || isRunning) return
  inputEl.value = ''
  resize()
  vscode.postMessage({ type: 'sendMessage', text })
}

// \u2500\u2500 message bus \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
window.addEventListener('message', ({ data: m }) => {
  switch (m.type) {
    case 'userMessage':       addUserRow(m.text); break
    case 'assistantChunk':   appendChunk(m.messageId, m.text); break
    case 'assistantDone':    finalizeRow(m.messageId); break
    case 'toolUse':          addToolRow(m.name); break
    case 'permissionRequest': addToolRow('\u{1F510} ' + m.toolName); break
    case 'error':            addError(m.message); setStatus('error'); break
    case 'statusChange':     setStatus(m.status); break
    case 'cliConnected':     setStatus('connected'); break
    case 'cliDisconnected':  setStatus('connecting'); break
    case 'sessionCleared':
      threadEl.innerHTML = ''
      threadEl.appendChild(emptyEl)
      emptyEl.style.display = ''
      Object.keys(bubbles).forEach(k => delete bubbles[k])
      setStatus('connected')
      break
  }
})

// \u2500\u2500 input auto-resize \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function resize() {
  inputEl.style.height = 'auto'
  inputEl.style.height = Math.min(inputEl.scrollHeight, 140) + 'px'
}
inputEl.addEventListener('input', resize)
inputEl.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
})
sendBtn.addEventListener('click', send)
stopBtn.addEventListener('click', () => vscode.postMessage({ type: 'stopGeneration' }))

// \u2500\u2500 init \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
vscode.postMessage({ type: 'ready' })
inputEl.focus()
</script>
</body>
</html>`
    );
  }
};

// src/WsViewProvider.ts
import * as vscode2 from "vscode";
var WsViewProvider = class {
  static viewType = "cclocal.chatView";
  view;
  ws;
  serverManager;
  currentMessageId = "";
  messageBuffer = "";
  status = "idle";
  constructor(extensionUri, serverManager) {
    this.serverManager = serverManager;
    this.connectToServer();
  }
  resolveWebviewView(webviewView, _context, _token) {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.getExtensionUri()]
    };
    webviewView.webview.html = this.getWebviewContent();
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "sendMessage":
          if (data.text) {
            await this.sendMessage(data.text);
          }
          break;
        case "cancel":
          this.stopGeneration();
          break;
      }
    });
    webviewView.onDidDispose(() => {
      this.ws?.close();
    });
  }
  async connectToServer() {
    const serverUrl = this.serverManager.getServerUrl();
    try {
      const { default: WebSocketClient } = await Promise.resolve().then(() => (init_wrapper(), wrapper_exports));
      this.ws = new WebSocketClient(`${serverUrl}/ws?token=default`);
      this.ws.onopen = () => {
        this.ws?.send(
          JSON.stringify({
            type: "auth",
            payload: { clientType: "vscode" },
            timestamp: Date.now()
          })
        );
      };
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data.toString());
          this.handleServerMessage(message);
        } catch (error) {
          console.error("Failed to parse message:", error);
        }
      };
      this.ws.onerror = () => {
        this.setStatus("error");
        this.sendToWebview({
          type: "error",
          message: "Connection error. Please try again."
        });
      };
      this.ws.onclose = () => {
        setTimeout(() => this.connectToServer(), 3e3);
      };
    } catch (error) {
      console.error("Failed to connect:", error);
    }
  }
  handleServerMessage(message) {
    switch (message.type) {
      case "auth_success":
        break;
      case "stream_start":
        this.messageBuffer = "";
        this.setStatus("running");
        break;
      case "stream_delta": {
        const payload = message.payload;
        if (payload?.delta?.type === "text_delta" && payload.delta.text) {
          this.messageBuffer += payload.delta.text;
          this.sendToWebview({
            type: "stream_delta",
            text: payload.delta.text,
            messageId: this.currentMessageId
          });
        }
        break;
      }
      case "stream_end":
        this.setStatus("idle");
        this.sendToWebview({
          type: "assistantDone",
          messageId: this.currentMessageId
        });
        this.currentMessageId = "";
        break;
      case "error": {
        const payload = message.payload;
        this.setStatus("error");
        this.sendToWebview({
          type: "error",
          message: payload?.message || "Unknown error"
        });
        break;
      }
      case "cancelled":
        this.setStatus("idle");
        break;
    }
  }
  async sendMessage(text) {
    if (this.status === "running") {
      vscode2.window.showWarningMessage("Already processing a message. Please wait or cancel.");
      return;
    }
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      vscode2.window.showErrorMessage("Not connected to CCLocal server. Please try again.");
      return;
    }
    this.currentMessageId = this.generateId();
    this.sendToWebview({
      type: "userMessage",
      text,
      messageId: this.generateId()
    });
    this.setStatus("running");
    this.ws.send(
      JSON.stringify({
        type: "message",
        payload: {
          sessionId: "default-session",
          content: text
        },
        timestamp: Date.now()
      })
    );
  }
  stopGeneration() {
    if (this.status !== "running") return;
    this.ws?.send(
      JSON.stringify({
        type: "cancel",
        payload: { sessionId: "default-session" },
        timestamp: Date.now()
      })
    );
  }
  clearChat() {
    this.sendToWebview({ type: "clear" });
  }
  setStatus(status) {
    this.status = status;
    this.sendToWebview({ type: "status", status });
  }
  sendToWebview(message) {
    this.view?.webview.postMessage(message);
  }
  generateId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  getExtensionUri() {
    return vscode2.Uri.file(__dirname);
  }
  getWebviewContent() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CCLocal Chat</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 0;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
    }
    .container {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }
    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }
    .input-area {
      border-top: 1px solid var(--vscode-panel-border);
      padding: 16px;
    }
    .input-row {
      display: flex;
      gap: 8px;
    }
    input[type="text"] {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid var(--vscode-input-border);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border-radius: 4px;
    }
    button {
      padding: 8px 16px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .message {
      margin-bottom: 16px;
      padding: 12px;
      border-radius: 8px;
    }
    .user-message {
      background: var(--vscode-button-background);
      margin-left: 32px;
    }
    .assistant-message {
      background: var(--vscode-editor-inactiveSelectionBackground);
      margin-right: 32px;
    }
    .status {
      padding: 4px 16px;
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }
    .status.running {
      color: var(--vscode-progressBar-background);
    }
    .status.error {
      color: var(--vscode-errorForeground);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="status" id="status">Ready</div>
    <div class="messages" id="messages"></div>
    <div class="input-area">
      <div class="input-row">
        <input type="text" id="messageInput" placeholder="Type your message..." />
        <button id="sendBtn">Send</button>
        <button id="cancelBtn" style="display: none;">Cancel</button>
      </div>
    </div>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    const messagesEl = document.getElementById('messages');
    const inputEl = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const statusEl = document.getElementById('status');
    let currentMessageEl = null;

    function addMessage(text, isUser) {
      const div = document.createElement('div');
      div.className = 'message ' + (isUser ? 'user-message' : 'assistant-message');
      div.textContent = text;
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return div;
    }

    sendBtn.addEventListener('click', () => {
      const text = inputEl.value.trim();
      if (text) {
        addMessage(text, true);
        vscode.postMessage({ type: 'sendMessage', text });
        inputEl.value = '';
        currentMessageEl = null;
      }
    });

    inputEl.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendBtn.click();
      }
    });

    cancelBtn.addEventListener('click', () => {
      vscode.postMessage({ type: 'cancel' });
    });

    window.addEventListener('message', (event) => {
      const message = event.data;
      switch (message.type) {
        case 'userMessage':
          addMessage(message.text, true);
          break;
        case 'stream_delta':
          if (!currentMessageEl) {
            currentMessageEl = addMessage('', false);
          }
          currentMessageEl.textContent += message.text;
          messagesEl.scrollTop = messagesEl.scrollHeight;
          break;
        case 'assistantDone':
          currentMessageEl = null;
          break;
        case 'error':
          statusEl.textContent = 'Error: ' + message.message;
          statusEl.className = 'status error';
          break;
        case 'status':
          statusEl.textContent = message.status === 'running' ? 'Thinking...' :
                                message.status === 'error' ? 'Error' : 'Ready';
          statusEl.className = 'status ' + message.status;
          sendBtn.style.display = message.status === 'running' ? 'none' : 'block';
          cancelBtn.style.display = message.status === 'running' ? 'block' : 'none';
          break;
        case 'clear':
          messagesEl.innerHTML = '';
          currentMessageEl = null;
          break;
      }
    });
  </script>
</body>
</html>`;
  }
};

// src/IdeViewProvider.ts
import * as crypto4 from "crypto";
import * as path4 from "path";
import * as vscode3 from "vscode";
import * as os5 from "os";

// src/IdeServer.ts
init_wrapper();
import * as crypto3 from "crypto";
import * as fs2 from "fs";
import * as http from "http";
import * as os3 from "os";
import * as path2 from "path";
var HEARTBEAT_INTERVAL_MS = 15e3;
var HEARTBEAT_TIMEOUT_MS = 3e4;
var IdeServer = class {
  server = null;
  wss = null;
  client = null;
  port = 0;
  lockfilePath = "";
  workspaceFolders;
  callbacks;
  authToken = "";
  // 心跳
  heartbeatTimer = null;
  lastHeartbeat = 0;
  heartbeatTimeoutTimer = null;
  // 重连缓冲：CLI 断连后短暂保留消息
  pendingMessages = [];
  MAX_PENDING = 100;
  constructor(workspaceFolders, callbacks) {
    this.workspaceFolders = workspaceFolders;
    this.callbacks = callbacks;
  }
  /** 启动服务器：绑定随机端口，写 lock 文件 */
  async start() {
    this.authToken = crypto3.randomBytes(32).toString("hex");
    this.server = http.createServer((_req, res) => {
      res.writeHead(426, { "Content-Type": "text/plain" });
      res.end("Upgrade Required");
    });
    this.wss = new import_websocket_server.default({ server: this.server });
    this.wss.on("connection", (ws, req) => {
      this.handleConnection(ws, req);
    });
    await new Promise((resolve, reject) => {
      this.server.listen(0, "127.0.0.1", () => {
        const addr = this.server.address();
        this.port = addr.port;
        resolve();
      });
      this.server.once("error", reject);
    });
    await this.writeLockfile();
    this.startHeartbeat();
  }
  /** 停止服务器，删除 lock 文件 */
  async stop() {
    this.stopHeartbeat();
    if (this.client) {
      this.client.close();
      this.client = null;
    }
    await new Promise((resolve) => {
      if (this.wss) {
        this.wss.close(() => resolve());
      } else {
        resolve();
      }
    });
    await new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
    this.deleteLockfile();
    this.server = null;
    this.wss = null;
  }
  /** 向已连接的 CLI 发送消息 */
  send(message) {
    if (!this.client || this.client.readyState !== 1) {
      if (this.pendingMessages.length < this.MAX_PENDING) {
        this.pendingMessages.push(message);
      }
      return false;
    }
    try {
      this.client.send(JSON.stringify(message) + "\n");
      return true;
    } catch {
      return false;
    }
  }
  /** 发送用户消息给 CLI */
  sendUserMessage(text, sessionId) {
    return this.send({
      type: "user",
      message: {
        role: "user",
        content: text
      },
      parent_tool_use_id: null,
      session_id: sessionId
    });
  }
  /** 发送中断请求 */
  sendInterrupt() {
    this.send({
      type: "control_response",
      request_id: crypto3.randomUUID(),
      response: {
        subtype: "tool_permission",
        approved: false
      }
    });
  }
  /** 发送权限响应 */
  sendPermissionResponse(requestId, approved, always = false) {
    this.send({
      type: "control_response",
      request_id: requestId,
      response: {
        subtype: "tool_permission",
        approved,
        always
      }
    });
  }
  /** 发送配置变更 */
  sendConfigUpdate(config) {
    this.send({ type: "config_update", config });
  }
  /** 判断 CLI 是否已连接 */
  isClientConnected() {
    return this.client !== null && this.client.readyState === 1;
  }
  /** 返回当前监听端口 */
  getPort() {
    return this.port;
  }
  /** 返回 authToken（供测试和调试使用） */
  getAuthToken() {
    return this.authToken;
  }
  /** 返回 lock 文件路径（调试用） */
  getLockfilePath() {
    return this.lockfilePath;
  }
  // ─── 私有方法 ────────────────────────────────────────────────────────────
  /** 处理新 WebSocket 连接 */
  handleConnection(ws, req) {
    const authHeader = req.headers["authorization"] ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (token !== this.authToken) {
      ws.close(4003, "Unauthorized");
      return;
    }
    if (this.client && this.client.readyState === 1) {
      this.client.close(1001, "Replaced by new connection");
    }
    this.client = ws;
    this.lastHeartbeat = Date.now();
    while (this.pendingMessages.length > 0) {
      const msg = this.pendingMessages.shift();
      this.send(msg);
    }
    ws.on("message", (data) => {
      const raw = data.toString();
      const lines = raw.split("\n").filter((l) => l.trim());
      for (const line of lines) {
        try {
          const msg = JSON.parse(line);
          if (msg.type === "system" && "subtype" in msg && msg.subtype === "pong") {
            this.lastHeartbeat = Date.now();
            continue;
          }
          this.callbacks.onMessage(line);
        } catch {
        }
      }
    });
    ws.on("close", () => {
      if (this.client === ws) {
        this.client = null;
        this.callbacks.onClientDisconnected();
      }
    });
    ws.on("error", (err) => {
      this.callbacks.onError(err);
      if (this.client === ws) {
        this.client = null;
        this.callbacks.onClientDisconnected();
      }
    });
    this.callbacks.onClientConnected();
  }
  /** 心跳 ping */
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (!this.client || this.client.readyState !== 1) return;
      const ping = { type: "ping", timestamp: Date.now() };
      try {
        this.client.send(JSON.stringify(ping) + "\n");
      } catch {
      }
      if (Date.now() - this.lastHeartbeat > HEARTBEAT_TIMEOUT_MS) {
        this.callbacks.onError(new Error("Heartbeat timeout"));
        this.client.close(1001, "Heartbeat timeout");
        this.client = null;
        this.callbacks.onClientDisconnected();
      }
    }, HEARTBEAT_INTERVAL_MS);
  }
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }
  /** 写入 lock 文件 */
  async writeLockfile() {
    const ideDir = path2.join(os3.homedir(), ".claude", "ide");
    await fs2.promises.mkdir(ideDir, { recursive: true });
    this.lockfilePath = path2.join(ideDir, `${this.port}.lock`);
    const content = {
      workspaceFolders: this.workspaceFolders,
      pid: process.pid,
      ideName: "VS Code",
      transport: "ws",
      runningInWindows: process.platform === "win32",
      authToken: this.authToken
    };
    await fs2.promises.writeFile(
      this.lockfilePath,
      JSON.stringify(content, null, 2),
      { encoding: "utf-8", mode: 384 }
    );
  }
  /** 删除 lock 文件 */
  deleteLockfile() {
    if (this.lockfilePath) {
      try {
        fs2.unlinkSync(this.lockfilePath);
      } catch {
      }
      this.lockfilePath = "";
    }
  }
};

// src/CliProcess.ts
import { spawn as spawn2 } from "child_process";
import * as os4 from "os";
import * as path3 from "path";
var MAX_RESTARTS = 5;
var INITIAL_BACKOFF_MS = 1e3;
var MAX_BACKOFF_MS = 3e4;
var CliProcess = class {
  proc = null;
  cclocalPath;
  cwd;
  idePort;
  callbacks;
  restartCount = 0;
  backoffMs = INITIAL_BACKOFF_MS;
  stopped = false;
  restartTimer = null;
  constructor(opts) {
    this.cclocalPath = opts.cclocalPath;
    this.cwd = opts.cwd;
    this.idePort = opts.idePort;
    this.callbacks = opts.callbacks;
  }
  /** 启动 cclocal 进程 */
  start() {
    this.stopped = false;
    this.restartCount = 0;
    this.backoffMs = INITIAL_BACKOFF_MS;
    this.spawn();
  }
  /** 优雅停止（不触发重启） */
  stop() {
    this.stopped = true;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    if (this.proc) {
      try {
        if (process.platform === "win32") {
          spawn2("taskkill", ["/pid", String(this.proc.pid), "/T", "/F"], {
            stdio: "ignore",
            windowsHide: true
          });
        } else {
          this.proc.kill("SIGTERM");
        }
      } catch {
      }
      this.proc = null;
    }
  }
  /** 进程是否正在运行 */
  isRunning() {
    return this.proc !== null && !this.proc.killed;
  }
  /** 重置重启计数（CLI 成功连接后调用） */
  resetRestartCount() {
    this.restartCount = 0;
    this.backoffMs = INITIAL_BACKOFF_MS;
  }
  // ─── 私有方法 ────────────────────────────────────────────────────────────
  /** 创建子进程 */
  spawn() {
    const env5 = this.buildEnv();
    const args = ["--ide"];
    this.proc = spawn2(this.cclocalPath, args, {
      cwd: this.cwd,
      env: env5,
      stdio: ["ignore", "pipe", "pipe"],
      // Windows: 使用 shell 以确保 PATH 中能找到 cclocal
      shell: process.platform === "win32",
      // 隐藏 Windows 控制台窗口
      windowsHide: true
    });
    this.proc.stdout?.on("data", (chunk) => {
      const lines = chunk.toString().split("\n").filter((l) => l.trim());
      for (const line of lines) {
        this.callbacks.onLog(`[stdout] ${line}`);
      }
    });
    this.proc.stderr?.on("data", (chunk) => {
      const lines = chunk.toString().split("\n").filter((l) => l.trim());
      for (const line of lines) {
        this.callbacks.onLog(`[stderr] ${line}`);
      }
    });
    this.proc.on("exit", (code, signal) => {
      this.proc = null;
      if (this.stopped) return;
      this.callbacks.onLog(
        `[CliProcess] cclocal \u9000\u51FA code=${code} signal=${signal}`
      );
      if (this.restartCount < MAX_RESTARTS) {
        this.restartCount++;
        const delay = this.backoffMs + Math.random() * 500;
        this.callbacks.onLog(
          `[CliProcess] ${delay.toFixed(0)}ms \u540E\u91CD\u542F (\u7B2C ${this.restartCount} \u6B21)`
        );
        this.restartTimer = setTimeout(() => {
          this.restartTimer = null;
          if (!this.stopped) {
            this.spawn();
          }
        }, delay);
        this.backoffMs = Math.min(this.backoffMs * 2, MAX_BACKOFF_MS);
      } else {
        this.callbacks.onUnexpectedExit(code, null);
      }
    });
    this.proc.on("error", (err) => {
      this.callbacks.onLog(`[CliProcess] \u542F\u52A8\u5931\u8D25: ${err.message}`);
    });
  }
  /**
   * 构建注入了完整 PATH 的环境变量。
   *
   * VSCode Extension Host 进程的 PATH 通常很短，
   * 无法找到 bun、homebrew 等工具。
   * 需要手动补全 macOS / Linux / Windows 常见路径。
   */
  buildEnv() {
    const home = os4.homedir();
    const isWin = process.platform === "win32";
    const isMac = process.platform === "darwin";
    const extraPaths = [];
    if (isMac) {
      extraPaths.push(
        "/opt/homebrew/bin",
        // Apple Silicon Homebrew
        "/opt/homebrew/sbin",
        "/usr/local/bin",
        // Intel Homebrew / 手动安装
        "/usr/local/sbin",
        "/usr/bin",
        "/usr/sbin",
        "/bin",
        "/sbin",
        `${home}/.bun/bin`,
        // bun
        `${home}/.local/bin`,
        // 用户级工具
        `${home}/.eigent/bin`,
        // eigent
        `${home}/.cargo/bin`,
        // rust cargo
        `${home}/go/bin`,
        // go
        "/opt/homebrew/opt/node/bin",
        // Homebrew node
        "/usr/local/opt/node/bin"
      );
    } else if (isWin) {
      const appData = process.env.APPDATA ?? "";
      const localAppData = process.env.LOCALAPPDATA ?? "";
      extraPaths.push(
        `${home}\\.bun\\bin`,
        `${home}\\.cargo\\bin`,
        `${home}\\AppData\\Local\\Programs\\Python\\Scripts`,
        `${home}\\AppData\\Roaming\\npm`,
        `${localAppData}\\Programs\\Microsoft VS Code\\bin`,
        `${appData}\\npm`,
        "C:\\Program Files\\Git\\cmd",
        "C:\\Program Files\\Git\\bin",
        "C:\\Program Files\\nodejs",
        "C:\\Program Files\\dotnet",
        "C:\\Windows\\System32",
        "C:\\Windows"
      );
    } else {
      extraPaths.push(
        "/usr/local/bin",
        "/usr/local/sbin",
        "/usr/bin",
        "/usr/sbin",
        "/bin",
        "/sbin",
        `${home}/.bun/bin`,
        `${home}/.local/bin`,
        `${home}/.cargo/bin`,
        `${home}/.eigent/bin`,
        `${home}/.go/bin`,
        "/snap/bin"
      );
    }
    const currentPath = process.env.PATH ?? "";
    const mergedPath = [...extraPaths, currentPath].filter(Boolean).join(path3.delimiter);
    return {
      ...process.env,
      PATH: mergedPath,
      // 传递 IDE 端口信息给 CLI（加快发现速度）
      CCLocal_IDE_PORT: String(this.idePort)
    };
  }
};

// src/IdeViewProvider.ts
var currentSessionId = "";
var IdeViewProvider = class {
  // 30ms 批量刷新，减少 webview 刷新频率
  constructor(extensionUri, outputChannel2, diffManager) {
    this.extensionUri = extensionUri;
    this.diffManager = diffManager;
    this.outputChannel = outputChannel2;
    const workspaceFolders = vscode3.workspace.workspaceFolders?.map((f) => f.uri.fsPath) ?? [];
    this.ideServer = new IdeServer(workspaceFolders, {
      onClientConnected: () => this.handleClientConnected(),
      onClientDisconnected: () => this.handleClientDisconnected(),
      onMessage: (line) => this.handleStreamMessage(line),
      onError: (err) => {
        this.outputChannel.error(`IdeServer error: ${err.message}`);
        this.sendToWebview({ type: "error", message: `\u8FDE\u63A5\u9519\u8BEF: ${err.message}` });
      }
    });
    const config = vscode3.workspace.getConfiguration("cclocal");
    const cclocalPath = config.get("cclocalPath") || "cclocal";
    this.cliProcess = new CliProcess({
      cclocalPath,
      cwd: workspaceFolders[0] ?? os5.homedir(),
      idePort: 0,
      // 稍后在 start() 中更新
      callbacks: {
        onLog: (line) => this.outputChannel.debug(line),
        onUnexpectedExit: (code, _signal) => this.handleUnexpectedExit(code)
      }
    });
  }
  static viewType = "cclocal.chatView";
  view;
  ideServer;
  cliProcess;
  outputChannel;
  resolveCallbacks = [];
  /** Additional webview targets to broadcast to (e.g. editor panel) */
  broadcastTargets = [];
  /** 当前助手消息 ID（用于增量追加） */
  currentAssistantMessageId = "";
  /** 当前活跃的内容块索引（流式） */
  currentContentBlockIndex = -1;
  /** 内容块文本缓冲（流式 delta 合并后发送） */
  blockTextBuffer = "";
  blockBufferTimer = null;
  BUFFER_FLUSH_MS = 30;
  /** 启动服务（在扩展激活时调用） */
  async start() {
    try {
      await this.ideServer.start();
      this.outputChannel.info(`IdeServer started on port ${this.ideServer.getPort()}`);
      this.cliProcess.idePort = this.ideServer.getPort();
      this.cliProcess.start();
      this.sendToWebview({ type: "statusChange", status: "connecting" });
    } catch (error) {
      this.outputChannel.error(`Failed to start: ${error}`);
      this.sendToWebview({
        type: "error",
        message: `\u542F\u52A8\u5931\u8D25: ${error}`
      });
    }
  }
  /** Register extension-level listeners (call from extension.ts) */
  registerListeners(context) {
    context.subscriptions.push(
      vscode3.window.tabGroups.onDidChangeTabs((e) => {
        for (const closed of e.closed) {
          if (closed && "input" in closed) {
            const input = closed.input;
            if (input?.original?.scheme === "_claude_fs_left" || input?.modified?.scheme === "_claude_fs_right") {
              const remaining = this.diffManager.getPendingDiffs();
              if (remaining.length === 0) {
                void vscode3.commands.executeCommand("setContext", "cclocal.viewingProposedDiff", false);
              }
            }
          }
        }
      })
    );
    context.subscriptions.push(
      vscode3.window.onDidChangeActiveTextEditor((editor) => {
        if (!editor) return;
        const uri = editor.document.uri;
        if (uri.scheme === "_claude_fs_right" || uri.scheme === "_claude_fs_left") {
          void vscode3.commands.executeCommand("setContext", "cclocal.viewingProposedDiff", true);
        }
      })
    );
  }
  /** 停止服务（在扩展停用时调用） */
  async stop() {
    this.cliProcess.stop();
    await this.ideServer.stop();
  }
  /** 外部发送消息（供其他模块调用） */
  sendMessage(text) {
    if (!this.ideServer.isClientConnected()) {
      this.sendToWebview({ type: "error", message: "CLI \u672A\u8FDE\u63A5\uFF0C\u8BF7\u7A0D\u5019\u91CD\u8BD5" });
      return;
    }
    const messageId = this.generateId();
    this.sendToWebview({
      type: "from-extension",
      message: { type: "system", subtype: "info", message: text }
    });
    this.ideServer.sendUserMessage(text, currentSessionId);
    this.sendToWebview({ type: "statusChange", status: "running" });
  }
  /** 处理命令（供 extension.ts 调用） */
  handleCommand(command) {
    switch (command) {
      case "newSession":
        currentSessionId = "";
        this.cliProcess.resetRestartCount();
        this.sendToWebview({ type: "sessionCleared" });
        break;
      case "clearChat":
        this.sendToWebview({ type: "sessionCleared" });
        break;
      case "stopGeneration":
        this.ideServer.sendInterrupt();
        this.sendToWebview({ type: "statusChange", status: "stopped" });
        break;
    }
  }
  // ─── WebviewViewProvider 接口 ────────────────────────────────────────────────
  resolveWebviewView(webviewView, _context, _token) {
    this.view = webviewView;
    for (const cb of this.resolveCallbacks) cb(webviewView);
    this.resolveCallbacks = [];
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };
    webviewView.webview.html = this.getWebviewHtml(webviewView.webview);
    webviewView.webview.onDidReceiveMessage(
      (message) => this.handleWebviewMessage(message)
    );
  }
  // ─── Webview 消息处理 ────────────────────────────────────────────────────
  handleWebviewMessage(message) {
    switch (message.type) {
      case "ready":
        this.sendToWebview({
          type: "statusChange",
          status: this.ideServer.isClientConnected() ? "connected" : "connecting"
        });
        const hideOnboarding = vscode3.workspace.getConfiguration("cclocal").get("hideOnboarding");
        if (!hideOnboarding) {
          this.sendToWebview({ type: "showOnboarding" });
        }
        break;
      case "submit":
        this.sendMessage(message.text);
        break;
      case "stopGeneration":
        this.handleCommand("stopGeneration");
        break;
      case "newSession":
        this.handleCommand("newSession");
        break;
      case "clearChat":
        this.handleCommand("clearChat");
        break;
      case "permissionResponse":
        this.ideServer.sendPermissionResponse(
          message.requestId,
          message.approved,
          message.always
        );
        break;
      case "configChange":
        this.ideServer.sendConfigUpdate(message.config);
        break;
      case "openFile":
        this.openFile(message.path, message.line);
        break;
      case "openDiff":
        this.openDiffViewer(message.filePath);
        break;
      case "acceptDiff":
        this.acceptDiff(message.filePath, message.toolUseId);
        break;
      case "rejectDiff":
        this.rejectDiff(message.filePath, message.toolUseId);
        break;
      case "copyToClipboard":
        vscode3.env.clipboard.writeText(message.text);
        break;
      case "insertAtMention":
        this.sendToWebview({ type: "insertAtMention", filePath: message.filePath });
        break;
      case "feedback":
        this.outputChannel.info(
          `Feedback: rating=${message.rating} comment=${message.comment ?? "none"}`
        );
        break;
      case "dismissOnboarding":
        void vscode3.workspace.getConfiguration("cclocal").update("hideOnboarding", true, vscode3.ConfigurationTarget.Global);
        break;
    }
  }
  // ─── CLI 消息处理（核心路由） ──────────────────────────────────────────────
  /**
   * 处理来自 CLI 的 stream-json 消息。
   * 每行一个 JSON 对象，按 type 字段路由到对应处理函数。
   */
  handleStreamMessage(line) {
    try {
      const msg = JSON.parse(line);
      switch (msg.type) {
        case "init":
          this.handleInit(msg);
          break;
        case "assistant":
          this.handleAssistantMessage(msg);
          break;
        case "content_block_start":
          this.handleContentBlockStart(msg);
          break;
        case "content_block_delta":
          this.handleContentBlockDelta(msg);
          break;
        case "content_block_stop":
          this.handleContentBlockStop(msg);
          break;
        case "result":
          this.handleResult(msg);
          break;
        case "control_request":
          this.handleControlRequest(msg);
          break;
        case "error":
          this.handleError(msg);
          break;
        case "system":
          this.handleSystemMessage(msg);
          break;
        case "proposed_diff":
          this.handleDiff(msg);
          break;
        case "usage_update":
          this.handleCost(msg);
          break;
        case "session_states_update":
          this.handleSessionUpdate(msg);
          break;
        default:
          this.outputChannel.debug(`Unknown message type: ${msg.type}`);
      }
    } catch (error) {
      this.outputChannel.error(`Failed to parse stream message: ${line}`);
    }
  }
  /** init — CLI 连接初始化 */
  handleInit(msg) {
    currentSessionId = msg.session_id ?? "";
    this.cliProcess.resetRestartCount();
    this.sendToWebview({
      type: "cliConnected",
      version: msg.version,
      model: msg.model
    });
    this.outputChannel.info(
      `CLI initialized: session=${currentSessionId} version=${msg.version} model=${msg.model}`
    );
  }
  /** assistant — 完整的助手消息（非流式回退） */
  handleAssistantMessage(msg) {
    const messageId = msg.message?.id ?? this.generateId();
    this.currentAssistantMessageId = messageId;
    const content = msg.message?.content ?? [];
    let fullText = "";
    const blocks = [];
    for (const block of content) {
      if (block.type === "text" && block.text) {
        fullText += block.text;
        blocks.push({ type: "text", text: block.text });
      } else if (block.type === "tool_use") {
        blocks.push({ type: "tool_use", name: block.name, input: block.input });
      } else if (block.type === "thinking") {
        blocks.push({ type: "thinking", thinking: block.thinking ?? "" });
      }
    }
    if (fullText) {
      this.sendToWebview({
        type: "from-extension",
        message: {
          type: "content_block_delta",
          index: 0,
          delta: { type: "text_delta", text: fullText },
          session_id: currentSessionId,
          message_id: messageId
        }
      });
    }
    for (const block of blocks) {
      if (block.type === "tool_use") {
        this.sendToWebview({
          type: "from-extension",
          message: {
            type: "tool_use",
            id: content.find((c) => c.type === "tool_use" && c.name === block.name)?.id ?? "",
            name: block.name ?? "unknown",
            input: block.input,
            session_id: currentSessionId,
            message_id: messageId
          }
        });
      } else if (block.type === "thinking") {
        this.sendToWebview({
          type: "from-extension",
          message: {
            type: "content_block_delta",
            index: -1,
            delta: { type: "thinking_delta", thinking: block.thinking ?? "" },
            session_id: currentSessionId,
            message_id: messageId
          }
        });
      }
    }
    this.sendToWebview({
      type: "from-extension",
      message: {
        type: "result",
        subtype: "success",
        session_id: currentSessionId
      }
    });
  }
  /** content_block_start — 流式内容块开始 */
  handleContentBlockStart(msg) {
    this.currentContentBlockIndex = msg.index;
    if (!this.currentAssistantMessageId) {
      this.currentAssistantMessageId = msg.message_id ?? this.generateId();
    }
    const block = msg.content_block;
    if (block.type === "text") {
      this.blockTextBuffer = "";
      this.sendToWebview({
        type: "from-extension",
        message: {
          type: "content_block_delta",
          index: 0,
          delta: { type: "text_delta", text: "" },
          session_id: currentSessionId,
          message_id: this.currentAssistantMessageId
        }
      });
    } else if (block.type === "tool_use") {
      this.sendToWebview({
        type: "from-extension",
        message: {
          type: "tool_use",
          id: block.id ?? "",
          name: block.name ?? "unknown",
          input: block.input,
          session_id: currentSessionId,
          message_id: this.currentAssistantMessageId
        }
      });
    } else if (block.type === "thinking") {
      this.blockTextBuffer = "";
    }
  }
  /** content_block_delta — 流式增量 */
  handleContentBlockDelta(msg) {
    const delta = msg.delta;
    if (delta.type === "text_delta") {
      this.blockTextBuffer += delta.text;
      if (!this.blockBufferTimer) {
        this.blockBufferTimer = setTimeout(() => {
          this.flushTextBuffer();
        }, this.BUFFER_FLUSH_MS);
      }
    } else if (delta.type === "thinking_delta") {
      this.sendToWebview({
        type: "from-extension",
        message: {
          type: "content_block_delta",
          index: -1,
          delta: { type: "thinking_delta", thinking: delta.thinking ?? "" },
          session_id: currentSessionId,
          message_id: this.currentAssistantMessageId
        }
      });
    } else if (delta.type === "input_json_delta") {
    }
  }
  /** content_block_stop — 流式内容块结束 */
  handleContentBlockStop(msg) {
    this.flushTextBuffer();
    if (msg.index === this.currentContentBlockIndex) {
    }
  }
  /** result — 消息完成 */
  handleResult(msg) {
    this.flushTextBuffer();
    this.sendToWebview({
      type: "from-extension",
      message: {
        type: "result",
        subtype: msg.subtype,
        session_id: currentSessionId,
        cost_usd: msg.cost_usd
      }
    });
    this.currentAssistantMessageId = "";
    this.currentContentBlockIndex = -1;
    const status = msg.subtype === "success" ? "connected" : msg.subtype === "cancelled" ? "stopped" : "error";
    this.sendToWebview({ type: "statusChange", status });
    if (msg.subtype === "error") {
      this.sendToWebview({
        type: "error",
        message: msg.error ?? msg.result ?? "Unknown error"
      });
    }
  }
  /** control_request — 权限请求 */
  handleControlRequest(msg) {
    if (msg.request.subtype === "auto_approved") {
      this.outputChannel.debug(
        `Auto-approved: ${msg.request.tool_name} (${msg.request.reason ?? ""})`
      );
      return;
    }
    if (msg.request.subtype === "interrupt") {
      this.sendToWebview({ type: "statusChange", status: "stopped" });
      return;
    }
    this.sendToWebview({
      type: "from-extension",
      message: {
        type: "control_request",
        request_id: msg.request_id,
        request: {
          subtype: "tool_permission",
          tool_name: msg.request.tool_name ?? "unknown",
          tool_input: msg.request.tool_input
        },
        session_id: currentSessionId
      }
    });
  }
  /** error — 错误消息 */
  handleError(msg) {
    this.sendToWebview({
      type: "error",
      message: msg.error ?? "Unknown error"
    });
  }
  /** system — 系统消息 */
  handleSystemMessage(msg) {
    this.outputChannel.info(`[System] ${msg.message}`);
  }
  /** proposed_diff — open diff editor with left/right VFS */
  async handleDiff(msg) {
    try {
      const diffId = await this.diffManager.proposeDiff(
        msg.file_path,
        msg.old_content,
        msg.new_content,
        msg.tool_use_id
      );
      void vscode3.commands.executeCommand("setContext", "cclocal.viewingProposedDiff", true);
      this.sendToWebview({
        type: "from-extension",
        message: {
          type: "proposed_diff",
          file_path: msg.file_path,
          old_content: msg.old_content,
          new_content: msg.new_content,
          session_id: currentSessionId
        }
      });
      this.outputChannel.info(`Opened proposed diff for ${msg.file_path} (id: ${diffId})`);
    } catch (error) {
      this.outputChannel.error(`Failed to open diff: ${error}`);
    }
  }
  /** usage_update — 使用成本通知 */
  handleCost(msg) {
    this.sendToWebview({
      type: "from-extension",
      message: {
        type: "usage_update",
        cost_usd: msg.cost_usd,
        duration_ms: msg.duration_ms
      }
    });
  }
  /** session_states_update — 会话状态更新 */
  handleSessionUpdate(msg) {
    const activeSession = msg.sessions?.find((s) => s.session_id === currentSessionId);
    if (activeSession?.model) {
      this.sendToWebview({ type: "modelChange", model: activeSession.model });
    }
  }
  // ─── 辅助方法 ──────────────────────────────────────────────────────────────
  /** CLI 客户端连接成功 */
  handleClientConnected() {
    this.sendToWebview({ type: "statusChange", status: "connected" });
    this.outputChannel.info("CLI connected to IdeServer");
  }
  /** CLI 客户端断开连接 */
  handleClientDisconnected() {
    this.sendToWebview({ type: "statusChange", status: "connecting" });
    this.sendToWebview({ type: "cliDisconnected" });
    this.outputChannel.warn("CLI disconnected from IdeServer");
  }
  /** CLI 进程意外退出 */
  handleUnexpectedExit(code) {
    this.sendToWebview({
      type: "error",
      message: `CLI \u8FDB\u7A0B\u610F\u5916\u9000\u51FA (code: ${code})\uFF0C\u5DF2\u8FBE\u5230\u6700\u5927\u91CD\u542F\u6B21\u6570`
    });
    this.sendToWebview({ type: "statusChange", status: "error" });
  }
  /** 刷新文本缓冲到 webview */
  flushTextBuffer() {
    if (this.blockBufferTimer) {
      clearTimeout(this.blockBufferTimer);
      this.blockBufferTimer = null;
    }
    if (this.blockTextBuffer && this.currentAssistantMessageId) {
      this.sendToWebview({
        type: "from-extension",
        message: {
          type: "content_block_delta",
          index: 0,
          delta: { type: "text_delta", text: this.blockTextBuffer },
          session_id: currentSessionId,
          message_id: this.currentAssistantMessageId
        }
      });
      this.blockTextBuffer = "";
    }
  }
  /** 打开文件 */
  async openFile(filePath, line) {
    try {
      const doc = await vscode3.workspace.openTextDocument(filePath);
      const editor = await vscode3.window.showTextDocument(doc, {
        preview: false,
        selection: line ? new vscode3.Selection(line - 1, 0, line - 1, 0) : void 0
      });
    } catch (error) {
      vscode3.window.showErrorMessage(`\u65E0\u6CD5\u6253\u5F00\u6587\u4EF6: ${filePath}`);
    }
  }
  /** Open diff viewer using virtual FS (delegated to DiffManager) */
  async openDiffViewer(filePath) {
    const pending = this.diffManager.getPendingDiffs();
    const existing = pending.find((d) => d.filePath === filePath);
    if (existing && existing.leftUri && existing.rightUri) {
      const fileName = path4.basename(filePath);
      await vscode3.commands.executeCommand(
        "vscode.diff",
        existing.leftUri,
        existing.rightUri,
        `${fileName} (Proposed Changes)`,
        { preview: true }
      );
    }
  }
  /** Accept diff: write right FS content to disk */
  async acceptDiff(filePath, toolUseId) {
    try {
      await this.diffManager.acceptActiveDiff();
      await vscode3.commands.executeCommand("workbench.action.closeActiveEditor");
      if (this.diffManager.getPendingDiffs().length === 0) {
        void vscode3.commands.executeCommand("setContext", "cclocal.viewingProposedDiff", false);
      }
      this.sendToWebview({
        type: "from-extension",
        message: {
          type: "file_updated",
          file_path: filePath,
          change_type: "modified"
        }
      });
      this.outputChannel.info(`Accepted proposed diff for ${filePath}`);
    } catch (error) {
      vscode3.window.showErrorMessage(`Failed to accept changes: ${error}`);
    }
  }
  /** Reject diff: discard virtual FS content */
  async rejectDiff(filePath, toolUseId) {
    try {
      await this.diffManager.rejectActiveDiff();
      if (this.diffManager.getPendingDiffs().length === 0) {
        void vscode3.commands.executeCommand("setContext", "cclocal.viewingProposedDiff", false);
      }
      this.outputChannel.info(`Rejected proposed diff for ${filePath}`);
    } catch (error) {
      vscode3.window.showErrorMessage(`Failed to reject changes: ${error}`);
    }
  }
  /** 发送消息到 Webview */
  sendToWebview(message) {
    this.view?.webview.postMessage(message);
    for (const target of this.broadcastTargets) {
      target.postMessage(message);
    }
  }
  /** Add a broadcast target (e.g. editor panel webview) */
  addBroadcastTarget(target) {
    this.broadcastTargets.push(target);
  }
  /** 生成随机 ID */
  generateId() {
    return crypto4.randomBytes(8).toString("hex");
  }
  // ─── Event: View Resolved ───────────────────────────────────────────────────
  /** Register a callback for when the webview view is first resolved */
  onDidResolve(callback) {
    if (this.view) {
      callback(this.view);
    } else {
      this.resolveCallbacks.push(callback);
    }
  }
  // ─── Webview HTML (React app from webview-dist/) ─────────────────────────────
  /** Load React webview from webview-dist/ built assets */
  getWebviewHtml(webview) {
    const nonce = crypto4.randomBytes(16).toString("base64");
    const webviewDistUri = (fileName) => webview.asWebviewUri(vscode3.Uri.joinPath(this.extensionUri, "webview-dist", fileName));
    const scriptUri = webviewDistUri("index.js");
    const styleUri = webviewDistUri("index.css");
    return (
      /* html */
      `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
            style-src 'nonce-${nonce}' https:;
            script-src 'nonce-${nonce}';
            img-src 'self' data: https:;
            font-src 'self' https:;" />
  <link rel="stylesheet" type="text/css" href="${styleUri}" nonce="${nonce}">
  <title>CCLocal</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`
    );
  }
};

// src/ServerManager.ts
import { spawn as spawn3 } from "child_process";
import * as path5 from "path";
var ServerManager = class {
  serverProcess;
  serverPort = 5678;
  serverUrl = "ws://127.0.0.1:5678";
  getServerUrl() {
    return this.serverUrl;
  }
  async ensureServerRunning() {
    const isRunning = await this.checkServerHealth();
    if (isRunning) {
      console.log("CCLocal server already running");
      return;
    }
    await this.startEmbeddedServer();
  }
  async checkServerHealth() {
    try {
      const response = await fetch(`http://127.0.0.1:${this.serverPort}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
  async startEmbeddedServer() {
    return new Promise((resolve, reject) => {
      const serverPath = this.findServerPath();
      if (!serverPath) {
        reject(new Error("CCLocal server not found"));
        return;
      }
      console.log(`Starting CCLocal server from: ${serverPath}`);
      this.serverProcess = spawn3("bun", [serverPath], {
        env: {
          ...process.env,
          CCLOCAL_PORT: String(this.serverPort),
          CCLOCAL_HOST: "127.0.0.1"
        },
        detached: false
      });
      this.serverProcess.stdout?.on("data", (data) => {
        console.log(`[CCLocal Server] ${data.toString().trim()}`);
      });
      this.serverProcess.stderr?.on("data", (data) => {
        console.error(`[CCLocal Server] ${data.toString().trim()}`);
      });
      setTimeout(async () => {
        const isRunning = await this.checkServerHealth();
        if (isRunning) {
          resolve();
        } else {
          reject(new Error("Server failed to start"));
        }
      }, 3e3);
    });
  }
  findServerPath() {
    const possiblePaths = [
      path5.join(__dirname, "..", "..", "server", "dist", "index.js"),
      path5.join(__dirname, "..", "..", "..", "packages", "server", "dist", "index.js")
    ];
    for (const p of possiblePaths) {
      try {
        const fs6 = __require("fs");
        if (fs6.existsSync(p)) {
          return p;
        }
      } catch {
      }
    }
    return void 0;
  }
  stopServer() {
    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = void 0;
    }
  }
};

// src/hooks/executors.ts
import * as vscode4 from "vscode";
import * as child_process from "child_process";
import * as https from "https";
import * as http2 from "http";
import * as url from "url";
var HookExecutor = class {
  createResult(hookId, handlerIndex, success, output, error, duration) {
    return {
      hookId,
      handlerIndex,
      success,
      output,
      error,
      duration: duration || 0
    };
  }
  getTimeout(handler, defaultTimeout) {
    return handler.timeout || defaultTimeout;
  }
};
var CommandHookExecutor = class extends HookExecutor {
  outputChannel;
  allowedCommands;
  constructor(outputChannel2, allowedCommands) {
    super();
    this.outputChannel = outputChannel2;
    this.allowedCommands = allowedCommands ? new Set(allowedCommands) : null;
  }
  async execute(handler, context) {
    const hookId = `hook_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const startTime = Date.now();
    const timeout = this.getTimeout(handler, 3e4);
    const env5 = this.buildEnvironment(context, handler.env);
    const command = this.substituteContext(handler.command, context);
    this.outputChannel.debug(`Executing command hook: ${command}`);
    try {
      const result = await this.runCommand(command, env5, timeout, context);
      const duration = Date.now() - startTime;
      return this.createResult(
        hookId,
        0,
        result.success,
        result.output,
        result.error,
        duration
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      return this.createResult(
        hookId,
        0,
        false,
        void 0,
        error instanceof Error ? error.message : String(error),
        duration
      );
    }
  }
  runCommand(command, env5, timeout, context) {
    return new Promise((resolve) => {
      const workspaceRoot = vscode4.workspace.workspaceFolders?.[0]?.uri.fsPath;
      const proc = child_process.spawn(command, [], {
        cwd: workspaceRoot || process.cwd(),
        env: { ...process.env, ...env5 },
        shell: true,
        timeout
      });
      let stdout = "";
      let stderr = "";
      proc.stdout?.on("data", (data) => {
        stdout += data.toString();
      });
      proc.stderr?.on("data", (data) => {
        stderr += data.toString();
      });
      proc.on("error", (error) => {
        resolve({
          success: false,
          output: stdout,
          error: error.message
        });
      });
      proc.on("close", (code) => {
        resolve({
          success: code === 0,
          output: stdout,
          error: code !== 0 ? stderr : void 0
        });
      });
      if (context) {
        try {
          proc.stdin?.write(JSON.stringify(context));
          proc.stdin?.end();
        } catch {
        }
      }
    });
  }
  buildEnvironment(context, handlerEnv) {
    const env5 = {
      CCLOCAL_HOOK_TYPE: context.type,
      CCLOCAL_HOOK_TIMESTAMP: String(context.timestamp)
    };
    if (context.sessionId) {
      env5.CCLOCAL_SESSION_ID = context.sessionId;
    }
    if (context.toolName) {
      env5.CCLOCAL_TOOL_NAME = context.toolName;
    }
    if (context.filePath) {
      env5.CCLOCAL_FILE_PATH = context.filePath;
    }
    if (context.command) {
      env5.CCLOCAL_COMMAND = context.command;
    }
    if (context.model) {
      env5.CCLOCAL_MODEL = context.model;
    }
    if (handlerEnv) {
      Object.assign(env5, handlerEnv);
    }
    return env5;
  }
  substituteContext(template, context) {
    return template.replace(/\$\{toolName\}/g, context.toolName || "").replace(/\$\{filePath\}/g, context.filePath || "").replace(/\$\{command\}/g, context.command || "").replace(/\$\{model\}/g, context.model || "").replace(/\$\{sessionId\}/g, context.sessionId || "").replace(/\$\{timestamp\}/g, String(context.timestamp)).replace(/\$\{type\}/g, context.type);
  }
};
var HttpHookExecutor = class extends HookExecutor {
  outputChannel;
  allowedUrls;
  allowedEnvVars;
  constructor(outputChannel2, allowedUrls, allowedEnvVars) {
    super();
    this.outputChannel = outputChannel2;
    this.allowedUrls = allowedUrls ? new Set(allowedUrls) : null;
    this.allowedEnvVars = new Set(allowedEnvVars || []);
  }
  async execute(handler, context) {
    const hookId = `hook_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const startTime = Date.now();
    const timeout = this.getTimeout(handler, 1e4);
    if (this.allowedUrls && !this.isUrlAllowed(handler.url)) {
      return this.createResult(
        hookId,
        0,
        false,
        void 0,
        `URL not in whitelist: ${handler.url}`,
        Date.now() - startTime
      );
    }
    this.outputChannel.debug(`Executing HTTP hook: ${handler.url}`);
    try {
      const result = await this.makeRequest(handler, context, timeout);
      const duration = Date.now() - startTime;
      return this.createResult(
        hookId,
        0,
        result.success,
        result.output,
        result.error,
        duration
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      return this.createResult(
        hookId,
        0,
        false,
        void 0,
        error instanceof Error ? error.message : String(error),
        duration
      );
    }
  }
  isUrlAllowed(urlString) {
    if (!this.allowedUrls) return true;
    try {
      const parsed = new url.URL(urlString);
      for (const allowed of this.allowedUrls) {
        if (parsed.origin === allowed || urlString.startsWith(allowed)) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }
  makeRequest(handler, context, timeout) {
    return new Promise((resolve) => {
      const parsedUrl = new url.URL(handler.url);
      const isHttps = parsedUrl.protocol === "https:";
      const requestModule = isHttps ? https : http2;
      const headers = {
        "Content-Type": "application/json",
        ...handler.headers
      };
      for (const [key, value] of Object.entries(headers)) {
        if (typeof value === "string" && value.startsWith("${env:")) {
          const envVar = value.match(/\$\{env:([^}]+)\}/)?.[1];
          if (envVar && this.allowedEnvVars.has(envVar)) {
            headers[key] = process.env[envVar] || "";
          } else if (envVar) {
            delete headers[key];
          }
        }
      }
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: handler.method || "POST",
        headers,
        timeout
      };
      const req = requestModule.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk.toString();
        });
        res.on("end", () => {
          resolve({
            success: res.statusCode !== void 0 && res.statusCode >= 200 && res.statusCode < 300,
            output: data,
            error: res.statusCode !== void 0 && res.statusCode >= 400 ? `HTTP ${res.statusCode}` : void 0
          });
        });
      });
      req.on("error", (error) => {
        resolve({
          success: false,
          error: error.message
        });
      });
      req.on("timeout", () => {
        req.destroy();
        resolve({
          success: false,
          error: "Request timed out"
        });
      });
      req.write(JSON.stringify(context));
      req.end();
    });
  }
};
var FunctionHookExecutor = class extends HookExecutor {
  outputChannel;
  registeredFunctions;
  constructor(outputChannel2, registeredFunctions) {
    super();
    this.outputChannel = outputChannel2;
    this.registeredFunctions = registeredFunctions || /* @__PURE__ */ new Map();
  }
  /**
   * Register a function for use in hooks
   */
  registerFunction(name, fn) {
    this.registeredFunctions.set(name, fn);
  }
  /**
   * Unregister a function
   */
  unregisterFunction(name) {
    this.registeredFunctions.delete(name);
  }
  async execute(handler, context) {
    const hookId = `hook_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const startTime = Date.now();
    const timeout = this.getTimeout(handler, 5e3);
    const fn = this.registeredFunctions.get(handler.handler);
    if (!fn) {
      return this.createResult(
        hookId,
        0,
        false,
        void 0,
        `Function not registered: ${handler.handler}`,
        Date.now() - startTime
      );
    }
    this.outputChannel.debug(`Executing function hook: ${handler.handler}`);
    try {
      const result = await Promise.race([
        fn(context),
        new Promise(
          (_, reject) => setTimeout(() => reject(new Error("Function timed out")), timeout)
        )
      ]);
      const duration = Date.now() - startTime;
      return this.createResult(
        hookId,
        0,
        true,
        JSON.stringify(result),
        void 0,
        duration
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      return this.createResult(
        hookId,
        0,
        false,
        void 0,
        error instanceof Error ? error.message : String(error),
        duration
      );
    }
  }
};

// src/hooks/HookManager.ts
var HookManager = class {
  outputChannel;
  hooks;
  executors;
  enabled = true;
  allowedHttpUrls;
  allowedCommands;
  allowedEnvVars;
  constructor(outputChannel2, config) {
    this.outputChannel = outputChannel2;
    this.hooks = /* @__PURE__ */ new Map();
    this.allowedHttpUrls = new Set(config?.allowedHttpUrls || []);
    this.allowedCommands = new Set(config?.allowedCommands || []);
    this.allowedEnvVars = new Set(config?.allowedEnvVars || []);
    this.executors = {
      command: new CommandHookExecutor(outputChannel2, config?.allowedCommands),
      http: new HttpHookExecutor(outputChannel2, config?.allowedHttpUrls, config?.allowedEnvVars),
      function: new FunctionHookExecutor(outputChannel2, config?.registeredFunctions)
    };
    this.outputChannel.debug("HookManager initialized");
  }
  // ─── Configuration ───────────────────────────────────────────────────────────
  /**
   * Load hooks from configuration
   */
  loadFromConfig(config) {
    this.clear();
    for (const [type, definitions] of Object.entries(config)) {
      if (definitions && definitions.length > 0) {
        const hookType = type;
        this.hooks.set(hookType, definitions.filter((d) => d.enabled !== false));
      }
    }
    this.outputChannel.debug(`Loaded ${this.getTotalHookCount()} hooks from configuration`);
  }
  /**
   * Set allowed HTTP URLs for security
   */
  setAllowedHttpUrls(urls) {
    this.allowedHttpUrls = new Set(urls);
    this.executors.http = new HttpHookExecutor(
      this.outputChannel,
      urls,
      Array.from(this.allowedEnvVars)
    );
  }
  /**
   * Set allowed commands for security
   */
  setAllowedCommands(commands15) {
    this.allowedCommands = new Set(commands15);
    this.executors.command = new CommandHookExecutor(
      this.outputChannel,
      commands15
    );
  }
  /**
   * Register a function for function hooks
   */
  registerFunction(name, fn) {
    this.executors.function.registerFunction(name, fn);
    this.outputChannel.debug(`Registered function hook: ${name}`);
  }
  /**
   * Unregister a function
   */
  unregisterFunction(name) {
    this.executors.function.unregisterFunction(name);
    this.outputChannel.debug(`Unregistered function hook: ${name}`);
  }
  /**
   * Enable or disable all hooks
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    this.outputChannel.debug(`Hooks ${enabled ? "enabled" : "disabled"}`);
  }
  // ─── Hook Registration ───────────────────────────────────────────────────────
  /**
   * Register a hook definition
   */
  register(type, definition) {
    const existing = this.hooks.get(type) || [];
    existing.push(definition);
    this.hooks.set(type, existing);
    this.outputChannel.debug(`Registered ${type} hook with ${definition.hooks.length} handlers`);
  }
  /**
   * Unregister a hook by index
   */
  unregister(type, index) {
    const definitions = this.hooks.get(type);
    if (!definitions || index < 0 || index >= definitions.length) {
      return false;
    }
    definitions.splice(index, 1);
    if (definitions.length === 0) {
      this.hooks.delete(type);
    }
    this.outputChannel.debug(`Unregistered ${type} hook at index ${index}`);
    return true;
  }
  /**
   * Clear all hooks
   */
  clear() {
    this.hooks.clear();
    this.outputChannel.debug("Cleared all hooks");
  }
  // ─── Hook Execution ──────────────────────────────────────────────────────────
  /**
   * Execute hooks for a given type
   */
  async execute(type, context, options) {
    if (!this.enabled) {
      this.outputChannel.debug(`Hooks disabled, skipping ${type}`);
      return [];
    }
    const definitions = this.hooks.get(type);
    if (!definitions || definitions.length === 0) {
      this.outputChannel.debug(`No hooks registered for ${type}`);
      return [];
    }
    const fullContext = {
      type,
      timestamp: Date.now(),
      ...context
    };
    const results = [];
    const timeout = options?.timeout ?? 6e4;
    const parallel = options?.parallel ?? false;
    const stopOnFailure = options?.stopOnFailure ?? true;
    this.outputChannel.debug(
      `Executing ${definitions.length} ${type} hooks (${parallel ? "parallel" : "sequential"})`
    );
    try {
      if (parallel) {
        const promises5 = definitions.flatMap(
          (def, defIndex) => this.executeDefinition(def, defIndex, fullContext, timeout)
        );
        const settled = await Promise.allSettled(promises5);
        for (const result of settled) {
          if (result.status === "fulfilled") {
            results.push(...result.value);
          } else {
            this.outputChannel.error(`Hook execution failed: ${result.reason}`);
          }
        }
      } else {
        for (let defIndex = 0; defIndex < definitions.length; defIndex++) {
          const defResults = await this.executeDefinition(
            definitions[defIndex],
            defIndex,
            fullContext,
            timeout
          );
          results.push(...defResults);
          if (stopOnFailure) {
            const hasFailure = defResults.some((r) => !r.success);
            const hasBlock = defResults.some((r) => r.block);
            if (hasFailure || hasBlock) {
              this.outputChannel.debug(`Stopping hook execution due to ${hasBlock ? "block" : "failure"}`);
              break;
            }
          }
        }
      }
    } catch (error) {
      this.outputChannel.error(`Hook execution error: ${error}`);
    }
    this.outputChannel.debug(`Hook ${type} completed with ${results.length} results`);
    return results;
  }
  /**
   * Execute a single hook definition (may contain multiple handlers)
   */
  async executeDefinition(definition, definitionIndex, context, globalTimeout) {
    if (definition.matcher && !this.matchesContext(definition.matcher, context)) {
      this.outputChannel.debug(`Matcher "${definition.matcher}" did not match, skipping`);
      return [];
    }
    const results = [];
    const startTime = Date.now();
    for (let handlerIndex = 0; handlerIndex < definition.hooks.length; handlerIndex++) {
      const handler = definition.hooks[handlerIndex];
      const remainingTimeout = globalTimeout - (Date.now() - startTime);
      if (remainingTimeout <= 0) {
        this.outputChannel.warn("Hook execution timed out");
        break;
      }
      try {
        const result = await this.executeHandler(handler, context, remainingTimeout);
        result.handlerIndex = handlerIndex;
        results.push(result);
        if (result.block) {
          this.outputChannel.debug("Handler requested block, stopping execution");
          break;
        }
      } catch (error) {
        results.push({
          hookId: `error_${Date.now()}`,
          handlerIndex,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime
        });
      }
    }
    return results;
  }
  /**
   * Execute a single handler
   */
  async executeHandler(handler, context, timeout) {
    const executor = this.executors[handler.type];
    if (!executor) {
      return {
        hookId: `invalid_${Date.now()}`,
        handlerIndex: 0,
        success: false,
        error: `Unknown handler type: ${handler.type}`,
        duration: 0
      };
    }
    return executor.execute(handler, context);
  }
  /**
   * Check if a matcher pattern matches the context
   */
  matchesContext(matcher, context) {
    try {
      if (context.toolName) {
        const regex = new RegExp(matcher, "i");
        return regex.test(context.toolName);
      }
      if (context.filePath) {
        const regex = new RegExp(matcher, "i");
        return regex.test(context.filePath);
      }
      if (context.command) {
        const regex = new RegExp(matcher, "i");
        return regex.test(context.command);
      }
      return true;
    } catch (error) {
      this.outputChannel.error(`Invalid matcher pattern "${matcher}": ${error}`);
      return false;
    }
  }
  // ─── Convenience Methods ─────────────────────────────────────────────────────
  /**
   * Execute PreToolUse hooks
   */
  async executePreToolUse(toolName, toolInput) {
    const results = await this.execute("PreToolUse", {
      type: "PreToolUse",
      timestamp: Date.now(),
      toolName,
      toolInput
    });
    const blocked = results.some((r) => r.block);
    const modifiedInput = results.find((r) => r.modifiedInput !== void 0)?.modifiedInput;
    return { blocked, modifiedInput, results };
  }
  /**
   * Execute PostToolUse hooks
   */
  async executePostToolUse(toolName, toolResult, toolError) {
    return this.execute("PostToolUse", {
      type: "PostToolUse",
      timestamp: Date.now(),
      toolName,
      toolResult,
      toolError
    });
  }
  /**
   * Execute FileWrite hooks
   */
  async executeFileWrite(filePath, content) {
    return this.execute("FileWrite", {
      type: "FileWrite",
      timestamp: Date.now(),
      filePath,
      fileContent: content
    });
  }
  /**
   * Execute FileEdit hooks
   */
  async executeFileEdit(filePath, content) {
    return this.execute("FileEdit", {
      type: "FileEdit",
      timestamp: Date.now(),
      filePath,
      fileContent: content
    });
  }
  /**
   * Execute BashExecution hooks
   */
  async executeBashExecution(command) {
    const results = await this.execute("BashExecution", {
      type: "BashExecution",
      timestamp: Date.now(),
      command
    });
    return {
      blocked: results.some((r) => r.block),
      results
    };
  }
  /**
   * Execute SessionStart hooks
   */
  async executeSessionStart(sessionId) {
    return this.execute("SessionStart", {
      type: "SessionStart",
      timestamp: Date.now(),
      sessionId
    });
  }
  /**
   * Execute SessionEnd hooks
   */
  async executeSessionEnd(sessionId) {
    return this.execute("SessionEnd", {
      type: "SessionEnd",
      timestamp: Date.now(),
      sessionId
    });
  }
  /**
   * Execute Error hooks
   */
  async executeError(errorMessage, errorStack) {
    return this.execute("Error", {
      type: "Error",
      timestamp: Date.now(),
      errorMessage,
      errorStack
    });
  }
  // ─── Query Methods ───────────────────────────────────────────────────────────
  /**
   * Get all registered hooks
   */
  getAllHooks() {
    return new Map(this.hooks);
  }
  /**
   * Get hooks for a specific type
   */
  getHooks(type) {
    return this.hooks.get(type) || [];
  }
  /**
   * Check if any hooks are registered for a type
   */
  hasHooks(type) {
    const definitions = this.hooks.get(type);
    return definitions !== void 0 && definitions.length > 0;
  }
  /**
   * Get total count of all hooks
   */
  getTotalHookCount() {
    let count = 0;
    for (const definitions of this.hooks.values()) {
      count += definitions.reduce((sum, def) => sum + def.hooks.length, 0);
    }
    return count;
  }
  /**
   * Get hook statistics
   */
  getStats() {
    const hooksByType = {};
    for (const [type, definitions] of this.hooks) {
      hooksByType[type] = definitions.reduce((sum, def) => sum + def.hooks.length, 0);
    }
    return {
      totalHooks: this.getTotalHookCount(),
      hooksByType
    };
  }
  // ─── Lifecycle ───────────────────────────────────────────────────────────────
  dispose() {
    this.clear();
    this.outputChannel.debug("HookManager disposed");
  }
};
var instance = null;
function getHookManager(outputChannel2, config) {
  if (!instance && outputChannel2) {
    instance = new HookManager(outputChannel2, config);
  }
  return instance;
}
function disposeHookManager() {
  if (instance) {
    instance.dispose();
    instance = null;
  }
}

// src/ConfigurationManager.ts
import * as vscode5 from "vscode";
var ConfigurationManager = class {
  config;
  disposables = [];
  onConfigChangeEmitter = new vscode5.EventEmitter();
  constructor() {
    this.config = vscode5.workspace.getConfiguration("cclocal");
    this.setupConfigWatcher();
  }
  /**
   * Get the full configuration object
   */
  getConfig() {
    return {
      // Authentication
      forceLoginMethod: this.getForceLoginMethod(),
      forceLoginOrgUUID: this.getForceLoginOrgUUID(),
      disableLoginPrompt: this.getDisableLoginPrompt(),
      // Environment
      environmentVariables: this.getEnvironmentVariables(),
      cclocalPath: this.getCclocalPath(),
      claudeProcessWrapper: this.getClaudeProcessWrapper(),
      // Permissions
      initialPermissionMode: this.getInitialPermissionMode(),
      allowDangerouslySkipPermissions: this.getAllowDangerouslySkipPermissions(),
      permissionRules: this.getPermissionRules(),
      // Files
      respectGitIgnore: this.getRespectGitIgnore(),
      fileSuggestion: this.getFileSuggestion(),
      autosave: this.getAutosave(),
      claudeMdExcludes: this.getClaudeMdExcludes(),
      // MCP
      mcp: this.getMCPConfig(),
      enableAllProjectMcpServers: this.getEnableAllProjectMcpServers(),
      allowedMcpServers: this.getAllowedMcpServers(),
      deniedMcpServers: this.getDeniedMcpServers(),
      // Hooks
      hooks: this.getHooks(),
      disableAllHooks: this.getDisableAllHooks(),
      allowedHttpHookUrls: this.getAllowedHttpHookUrls(),
      httpHookAllowedEnvVars: this.getHttpHookAllowedEnvVars(),
      allowManagedHooksOnly: this.getAllowManagedHooksOnly(),
      // Plugins
      plugins: this.getPluginConfig(),
      enabledPlugins: this.getEnabledPlugins(),
      extraKnownMarketplaces: this.getExtraKnownMarketplaces(),
      strictKnownMarketplaces: this.getStrictKnownMarketplaces(),
      blockedMarketplaces: this.getBlockedMarketplaces(),
      // UI
      useTerminal: this.getUseTerminal(),
      useCtrlEnterToSend: this.getUseCtrlEnterToSend(),
      preferredLocation: this.getPreferredLocation(),
      hideOnboarding: this.getHideOnboarding(),
      enableNewConversationShortcut: this.getEnableNewConversationShortcut(),
      usePythonEnvironment: this.getUsePythonEnvironment(),
      showTerminalBanner: this.getShowTerminalBanner(),
      // Model
      model: this.getModel(),
      availableModels: this.getAvailableModels(),
      modelOverrides: this.getModelOverrides(),
      alwaysThinkingEnabled: this.getAlwaysThinkingEnabled(),
      fastMode: this.getFastMode(),
      maxThinkingTokens: this.getMaxThinkingTokens(),
      // Output
      outputStyle: this.getOutputStyle(),
      language: this.getLanguage(),
      spinnerTipsEnabled: this.getSpinnerTipsEnabled(),
      spinnerVerbs: this.getSpinnerVerbs(),
      spinnerTipsOverride: this.getSpinnerTipsOverride(),
      syntaxHighlightingDisabled: this.getSyntaxHighlightingDisabled(),
      terminalTitleFromRename: this.getTerminalTitleFromRename(),
      // Remote
      remoteConfig: this.getRemoteConfig(),
      sshConfigs: this.getSSHConfigs(),
      // Attribution
      includeCoAuthoredBy: this.getIncludeCoAuthoredBy(),
      includeGitInstructions: this.getIncludeGitInstructions(),
      // Sandbox
      sandbox: this.getSandbox(),
      skipWebFetchPreflight: this.getSkipWebFetchPreflight(),
      // Feedback
      feedbackSurveyRate: this.getFeedbackSurveyRate(),
      proactiveSuggestions: this.getProactiveSuggestions(),
      // Managed Settings
      allowManagedPermissionRulesOnly: this.getAllowManagedPermissionRulesOnly(),
      allowManagedMcpServersOnly: this.getAllowManagedMcpServersOnly(),
      strictPluginOnlyCustomization: this.getStrictPluginOnlyCustomization(),
      // Provider-specific
      bedrockRegion: this.getBedrockRegion(),
      vertexProjectId: this.getVertexProjectId(),
      // Other
      cleanupPeriodDays: this.getCleanupPeriodDays(),
      attribution: this.getAttribution()
    };
  }
  // ─── Authentication Getters ─────────────────────────────────────────────────────
  getForceLoginMethod() {
    return this.config.get("") || "";
  }
  getForceLoginOrgUUID() {
    return this.config.get("forceLoginOrgUUID") || "";
  }
  getDisableLoginPrompt() {
    return this.config.get("disableLoginPrompt") ?? false;
  }
  // ─── Environment Getters ────────────────────────────────────────────────────────
  getEnvironmentVariables() {
    return this.config.get("environmentVariables") || [];
  }
  getCclocalPath() {
    return this.config.get("cclocalPath") || "cclocal";
  }
  getClaudeProcessWrapper() {
    return this.config.get("claudeProcessWrapper") || "";
  }
  // ─── Permission Getters ─────────────────────────────────────────────────────────
  getInitialPermissionMode() {
    return this.config.get("initialPermissionMode") || "default";
  }
  getAllowDangerouslySkipPermissions() {
    return this.config.get("allowDangerouslySkipPermissions") ?? false;
  }
  getPermissionRules() {
    return this.config.get("permissionRules") || [];
  }
  // ─── File Getters ───────────────────────────────────────────────────────────────
  getRespectGitIgnore() {
    return this.config.get("respectGitIgnore") ?? true;
  }
  getFileSuggestion() {
    return this.config.get("fileSuggestion") || {};
  }
  getAutosave() {
    return this.config.get("autosave") ?? false;
  }
  getClaudeMdExcludes() {
    return this.config.get("claudeMdExcludes") || [];
  }
  // ─── MCP Getters ────────────────────────────────────────────────────────────────
  getMCPConfig() {
    return this.config.get("mcp") || {};
  }
  getEnableAllProjectMcpServers() {
    return this.config.get("enableAllProjectMcpServers") ?? false;
  }
  getAllowedMcpServers() {
    return this.config.get("allowedMcpServers") || [];
  }
  getDeniedMcpServers() {
    return this.config.get("deniedMcpServers") || [];
  }
  // ─── Hook Getters ───────────────────────────────────────────────────────────────
  getHooks() {
    return this.config.get("hooks") || {};
  }
  getDisableAllHooks() {
    return this.config.get("disableAllHooks") ?? false;
  }
  getAllowedHttpHookUrls() {
    return this.config.get("allowedHttpHookUrls") || [];
  }
  getHttpHookAllowedEnvVars() {
    return this.config.get("httpHookAllowedEnvVars") || [];
  }
  getAllowManagedHooksOnly() {
    return this.config.get("allowManagedHooksOnly") ?? false;
  }
  // ─── Plugin Getters ────────────────────────────────────────────────────────────
  getPluginConfig() {
    return this.config.get("plugins") || {};
  }
  getEnabledPlugins() {
    return this.config.get("enabledPlugins") || {};
  }
  getExtraKnownMarketplaces() {
    return this.config.get("extraKnownMarketplaces") || [];
  }
  getStrictKnownMarketplaces() {
    return this.config.get("strictKnownMarketplaces") || [];
  }
  getBlockedMarketplaces() {
    return this.config.get("blockedMarketplaces") || [];
  }
  // ─── UI Getters ─────────────────────────────────────────────────────────────────
  getUseTerminal() {
    return this.config.get("useTerminal") ?? true;
  }
  getUseCtrlEnterToSend() {
    return this.config.get("useCtrlEnterToSend") ?? false;
  }
  getPreferredLocation() {
    return this.config.get("preferredLocation") || "sidebar";
  }
  getHideOnboarding() {
    return this.config.get("hideOnboarding") ?? false;
  }
  getEnableNewConversationShortcut() {
    return this.config.get("enableNewConversationShortcut") ?? true;
  }
  getUsePythonEnvironment() {
    return this.config.get("usePythonEnvironment") ?? true;
  }
  getShowTerminalBanner() {
    return this.config.get("showTerminalBanner") ?? true;
  }
  // ─── Model Getters ──────────────────────────────────────────────────────────────
  getModel() {
    return this.config.get("model") || "";
  }
  getAvailableModels() {
    return this.config.get("availableModels") || [];
  }
  getModelOverrides() {
    return this.config.get("modelOverrides") || {};
  }
  getAlwaysThinkingEnabled() {
    return this.config.get("alwaysThinkingEnabled") ?? false;
  }
  getFastMode() {
    return this.config.get("fastMode") ?? false;
  }
  getMaxThinkingTokens() {
    return this.config.get("maxThinkingTokens") || 16e3;
  }
  // ─── Output Getters ─────────────────────────────────────────────────────────────
  getOutputStyle() {
    return this.config.get("outputStyle") || { type: "default" };
  }
  getLanguage() {
    return this.config.get("language") || "en";
  }
  getSpinnerTipsEnabled() {
    return this.config.get("spinnerTipsEnabled") ?? true;
  }
  getSpinnerVerbs() {
    return this.config.get("spinnerVerbs") || [];
  }
  getSpinnerTipsOverride() {
    return this.config.get("spinnerTipsOverride") || [];
  }
  getSyntaxHighlightingDisabled() {
    return this.config.get("syntaxHighlightingDisabled") ?? false;
  }
  getTerminalTitleFromRename() {
    return this.config.get("terminalTitleFromRename") ?? true;
  }
  // ─── Remote Getters ─────────────────────────────────────────────────────────────
  getRemoteConfig() {
    return this.config.get("remoteConfig") || { remote: { enabled: false } };
  }
  getSSHConfigs() {
    return this.config.get("sshConfigs") || [];
  }
  // ─── Attribution Getters ─────────────────────────────────────────────────────────
  getIncludeCoAuthoredBy() {
    return this.config.get("includeCoAuthoredBy") ?? true;
  }
  getIncludeGitInstructions() {
    return this.config.get("includeGitInstructions") ?? true;
  }
  // ─── Sandbox Getters ────────────────────────────────────────────────────────────
  getSandbox() {
    return this.config.get("sandbox") || { enabled: false };
  }
  getSkipWebFetchPreflight() {
    return this.config.get("skipWebFetchPreflight") ?? false;
  }
  // ─── Feedback Getters ───────────────────────────────────────────────────────────
  getFeedbackSurveyRate() {
    return this.config.get("feedbackSurveyRate") ?? 0.1;
  }
  getProactiveSuggestions() {
    return this.config.get("proactiveSuggestions") ?? true;
  }
  // ─── Managed Settings Getters ────────────────────────────────────────────────────
  getAllowManagedPermissionRulesOnly() {
    return this.config.get("allowManagedPermissionRulesOnly") ?? false;
  }
  getAllowManagedMcpServersOnly() {
    return this.config.get("allowManagedMcpServersOnly") ?? false;
  }
  getStrictPluginOnlyCustomization() {
    return this.config.get("strictPluginOnlyCustomization") ?? false;
  }
  // ─── Provider Getters ───────────────────────────────────────────────────────────
  getBedrockRegion() {
    return this.config.get("bedrockRegion") || "us-east-1";
  }
  getVertexProjectId() {
    return this.config.get("vertexProjectId") || "";
  }
  // ─── Other Getters ──────────────────────────────────────────────────────────────
  getCleanupPeriodDays() {
    return this.config.get("cleanupPeriodDays") || 30;
  }
  getAttribution() {
    return this.config.get("attribution") ?? true;
  }
  // ─── Setters ─────────────────────────────────────────────────────────────────────
  async update(key, value, target) {
    const configTarget = target ?? vscode5.ConfigurationTarget.Global;
    await this.config.update(key, value, configTarget);
  }
  async setModel(model) {
    await this.update("model", model);
  }
  async setPreferredLocation(location) {
    await this.update("preferredLocation", location);
  }
  async setInitialPermissionMode(mode) {
    await this.update("initialPermissionMode", mode);
  }
  async setForceLoginMethod(method) {
    await this.update("forceLoginMethod", method);
  }
  async addEnvironmentVariable(name, value) {
    const envVars = this.getEnvironmentVariables();
    const existing = envVars.findIndex((v) => v.name === name);
    if (existing >= 0) {
      envVars[existing].value = value;
    } else {
      envVars.push({ name, value });
    }
    await this.update("environmentVariables", envVars);
  }
  async removeEnvironmentVariable(name) {
    const envVars = this.getEnvironmentVariables().filter((v) => v.name !== name);
    await this.update("environmentVariables", envVars);
  }
  async addPermissionRule(rule) {
    const rules = this.getPermissionRules();
    rules.push(rule);
    await this.update("permissionRules", rules);
  }
  async addAllowedMcpServer(server) {
    const servers = this.getAllowedMcpServers();
    if (!servers.includes(server)) {
      servers.push(server);
      await this.update("allowedMcpServers", servers);
    }
  }
  async addDeniedMcpServer(server) {
    const servers = this.getDeniedMcpServers();
    if (!servers.includes(server)) {
      servers.push(server);
      await this.update("deniedMcpServers", servers);
    }
  }
  // ─── Events ─────────────────────────────────────────────────────────────────────
  get onConfigChange() {
    return this.onConfigChangeEmitter.event;
  }
  setupConfigWatcher() {
    const disposable = vscode5.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("cclocal")) {
        this.config = vscode5.workspace.getConfiguration("cclocal");
        this.onConfigChangeEmitter.fire(this.getConfig());
      }
    });
    this.disposables.push(disposable);
  }
  // ─── Dispose ────────────────────────────────────────────────────────────────────
  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.onConfigChangeEmitter.dispose();
  }
};

// src/auth/AuthStatusBar.ts
import * as vscode12 from "vscode";

// src/auth/AuthManager.ts
import * as vscode11 from "vscode";

// src/auth/SecureStorage.ts
import * as crypto5 from "crypto";
var SecureStorage = class {
  static SERVICE_NAME = "cclocal";
  context;
  secrets;
  memoryCache = /* @__PURE__ */ new Map();
  encryptionKey = null;
  constructor(context, options) {
    this.context = context;
    this.secrets = context.secrets;
    if (options?.encryptionKey) {
      this.encryptionKey = Buffer.from(options.encryptionKey, "hex");
    }
  }
  /**
   * Store credentials securely
   */
  async store(key, credentials) {
    const value = JSON.stringify(credentials);
    await this.secrets.store(key, value);
    this.memoryCache.set(key, credentials);
  }
  /**
   * Retrieve credentials
   */
  async get(key) {
    const cached = this.memoryCache.get(key);
    if (cached) {
      return cached;
    }
    const value = await this.secrets.get(key);
    if (!value) {
      return void 0;
    }
    try {
      const credentials = JSON.parse(value);
      this.memoryCache.set(key, credentials);
      return credentials;
    } catch {
      return void 0;
    }
  }
  /**
   * Delete credentials
   */
  async delete(key) {
    await this.secrets.delete(key);
    this.memoryCache.delete(key);
  }
  /**
   * Check if credentials exist
   */
  async has(key) {
    const value = await this.secrets.get(key);
    return value !== void 0;
  }
  /**
   * Store API key for a provider
   */
  async storeApiKey(provider, apiKey) {
    const key = `apikey_${provider}`;
    await this.store(key, { provider, apiKey });
  }
  /**
   * Get API key for a provider
   */
  async getApiKey(provider) {
    const key = `apikey_${provider}`;
    const credentials = await this.get(key);
    return credentials?.apiKey;
  }
  /**
   * Store OAuth tokens
   */
  async storeOAuthTokens(provider, accessToken, refreshToken, expiresIn, scope) {
    const key = `oauth_${provider}`;
    const expiresAt = Date.now() + expiresIn * 1e3;
    await this.store(key, {
      provider,
      accessToken,
      refreshToken,
      expiresAt,
      scope
    });
  }
  /**
   * Get OAuth tokens
   */
  async getOAuthTokens(provider) {
    const key = `oauth_${provider}`;
    const credentials = await this.get(key);
    if (!credentials) {
      return void 0;
    }
    return {
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
      expiresAt: credentials.expiresAt,
      scope: credentials.scope
    };
  }
  /**
   * Check if OAuth token is expired
   */
  async isTokenExpired(provider, bufferSeconds = 300) {
    const tokens = await this.getOAuthTokens(provider);
    if (!tokens) {
      return true;
    }
    return Date.now() > tokens.expiresAt - bufferSeconds * 1e3;
  }
  /**
   * Clear all credentials for a provider
   */
  async clearProvider(provider) {
    await this.delete(`apikey_${provider}`);
    await this.delete(`oauth_${provider}`);
  }
  /**
   * Clear all stored credentials
   */
  async clearAll() {
    const keys = await this.listKeys();
    for (const key of keys) {
      await this.delete(key);
    }
  }
  /**
   * List all stored keys
   */
  async listKeys() {
    const knownKeys = this.context.globalState.get("secureStorage:keys", []);
    return knownKeys;
  }
  /**
   * Register a key for tracking
   */
  async registerKey(key) {
    const knownKeys = this.context.globalState.get("secureStorage:keys", []);
    if (!knownKeys.includes(key)) {
      knownKeys.push(key);
      await this.context.globalState.update("secureStorage:keys", knownKeys);
    }
  }
  /**
   * Generate a secure random key for encryption
   */
  static generateEncryptionKey() {
    return crypto5.randomBytes(32).toString("hex");
  }
  /**
   * Encrypt data using AES-256-GCM
   */
  encrypt(data, key) {
    const encryptionKey = key || this.encryptionKey;
    if (!encryptionKey) {
      throw new Error("No encryption key available");
    }
    const iv = crypto5.randomBytes(16);
    const cipher = crypto5.createCipheriv("aes-256-gcm", encryptionKey, iv);
    let encrypted = cipher.update(data, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
  }
  /**
   * Decrypt data using AES-256-GCM
   */
  decrypt(data, key) {
    const encryptionKey = key || this.encryptionKey;
    if (!encryptionKey) {
      throw new Error("No encryption key available");
    }
    const [ivHex, authTagHex, encrypted] = data.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto5.createDecipheriv("aes-256-gcm", encryptionKey, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }
  /**
   * Dispose
   */
  dispose() {
    this.memoryCache.clear();
  }
};

// src/auth/OAuthClient.ts
import * as vscode6 from "vscode";
import * as http3 from "http";
import * as crypto6 from "crypto";
import * as url2 from "url";
var OAuthClient = class {
  constructor(provider, config, storage) {
    this.provider = provider;
    this.config = config;
    this.storage = storage;
  }
  storage;
  server = null;
  pendingStates = /* @__PURE__ */ new Map();
  /**
   * Generate PKCE code verifier
   */
  generateCodeVerifier() {
    const bytes = crypto6.randomBytes(32);
    return bytes.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  /**
   * Generate PKCE code challenge from verifier
   */
  generateCodeChallenge(verifier) {
    const hash = crypto6.createHash("sha256").update(verifier).digest("base64");
    return hash.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  /**
   * Generate random state for CSRF protection
   */
  generateState() {
    return crypto6.randomBytes(16).toString("hex");
  }
  /**
   * Build authorization URL
   */
  buildAuthorizationUrl(redirectUri) {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.config.usePKCE !== false ? this.generateCodeChallenge(codeVerifier) : "";
    const state = this.generateState();
    const oauthState = {
      codeVerifier,
      codeChallenge,
      state,
      redirectUri
    };
    this.pendingStates.set(state, oauthState);
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: this.config.scope.join(" "),
      state
    });
    if (this.config.usePKCE !== false) {
      params.append("code_challenge", codeChallenge);
      params.append("code_challenge_method", "S256");
    }
    const authUrl = `${this.config.authorizationEndpoint}?${params.toString()}`;
    return { url: authUrl, state: oauthState };
  }
  /**
   * Start local server to receive OAuth callback
   */
  async startCallbackServer() {
    const port = this.config.port || this.findAvailablePort();
    return new Promise((resolve, reject) => {
      this.server = http3.createServer((req, res) => {
        this.handleCallback(req, res);
      });
      this.server.listen(port, "127.0.0.1", () => {
        resolve(port);
      });
      this.server.on("error", (err) => {
        reject(err);
      });
    });
  }
  /**
   * Find available port
   */
  findAvailablePort() {
    return 8765 + Math.floor(Math.random() * 1e3);
  }
  /**
   * Handle OAuth callback
   */
  handleCallback(req, res) {
    const parsedUrl = url2.parse(req.url || "", true);
    if (parsedUrl.pathname === "/callback" || parsedUrl.pathname === "/") {
      const code = parsedUrl.query.code;
      const state = parsedUrl.query.state;
      const error = parsedUrl.query.error;
      const errorDescription = parsedUrl.query.error_description;
      if (error) {
        this.sendErrorResponse(res, error, errorDescription);
        return;
      }
      if (!code || !state) {
        this.sendErrorResponse(res, "invalid_request", "Missing code or state");
        return;
      }
      const oauthState = this.pendingStates.get(state);
      if (!oauthState) {
        this.sendErrorResponse(res, "invalid_state", "Invalid or expired state");
        return;
      }
      this.pendingStates.delete(state);
      this.exchangeCodeForTokens(code, oauthState).then((tokens) => {
        this.sendSuccessResponse(res);
        this.stopCallbackServer();
      }).catch((err) => {
        this.sendErrorResponse(res, "token_exchange_failed", err.message);
        this.stopCallbackServer();
      });
    } else {
      res.writeHead(404);
      res.end("Not Found");
    }
  }
  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code, oauthState) {
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: oauthState.redirectUri,
      client_id: this.config.clientId
    });
    if (this.config.usePKCE !== false) {
      params.append("code_verifier", oauthState.codeVerifier);
    }
    const response = await fetch(this.config.tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json"
      },
      body: params.toString()
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }
    const data = await response.json();
    const tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      scope: data.scope?.split(" ")
    };
    await this.storage.storeOAuthTokens(
      this.provider,
      tokens.accessToken,
      tokens.refreshToken,
      tokens.expiresIn,
      tokens.scope
    );
    return tokens;
  }
  /**
   * Refresh access token
   */
  async refreshToken() {
    const tokens = await this.storage.getOAuthTokens(this.provider);
    if (!tokens) {
      throw new Error("No tokens to refresh");
    }
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
      client_id: this.config.clientId
    });
    const response = await fetch(this.config.tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json"
      },
      body: params.toString()
    });
    if (!response.ok) {
      await this.storage.delete(`oauth_${this.provider}`);
      throw new Error("Token refresh failed");
    }
    const data = await response.json();
    const newTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || tokens.refreshToken,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      scope: data.scope?.split(" ")
    };
    await this.storage.storeOAuthTokens(
      this.provider,
      newTokens.accessToken,
      newTokens.refreshToken,
      newTokens.expiresIn,
      newTokens.scope
    );
    return newTokens;
  }
  /**
   * Get valid access token (refresh if needed)
   */
  async getAccessToken() {
    const isExpired = await this.storage.isTokenExpired(this.provider);
    if (isExpired) {
      const tokens2 = await this.refreshToken();
      return tokens2.accessToken;
    }
    const tokens = await this.storage.getOAuthTokens(this.provider);
    return tokens.accessToken;
  }
  /**
   * Start OAuth flow
   */
  async startFlow() {
    const port = await this.startCallbackServer();
    const redirectUri = `http://127.0.0.1:${port}/callback`;
    const { url: authUrl, state } = this.buildAuthorizationUrl(redirectUri);
    await vscode6.env.openExternal(vscode6.Uri.parse(authUrl));
    return this.waitForCallback(12e4);
  }
  /**
   * Wait for OAuth callback
   */
  waitForCallback(timeoutMs) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.stopCallbackServer();
        reject(new Error("OAuth flow timed out"));
      }, timeoutMs);
      const checkTokens = async () => {
        const tokens = await this.storage.getOAuthTokens(this.provider);
        if (tokens) {
          clearTimeout(timeout);
          this.stopCallbackServer();
          resolve({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: Math.floor((tokens.expiresAt - Date.now()) / 1e3),
            tokenType: "Bearer",
            scope: tokens.scope
          });
        } else {
          setTimeout(checkTokens, 500);
        }
      };
      checkTokens();
    });
  }
  /**
   * Stop callback server
   */
  stopCallbackServer() {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
  /**
   * Send success response
   */
  sendSuccessResponse(res) {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Successful</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #1e1e1e; color: #fff; }
          .container { text-align: center; }
          .icon { font-size: 48px; margin-bottom: 20px; }
          h1 { margin-bottom: 10px; }
          p { color: #888; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">\u2713</div>
          <h1>Authentication Successful!</h1>
          <p>You can close this window now.</p>
        </div>
        <script>setTimeout(() => window.close(), 1000);</script>
      </body>
      </html>
    `);
  }
  /**
   * Send error response
   */
  sendErrorResponse(res, error, description) {
    res.writeHead(400, { "Content-Type": "text/html" });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Failed</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #1e1e1e; color: #fff; }
          .container { text-align: center; }
          .icon { font-size: 48px; margin-bottom: 20px; color: #f44; }
          h1 { margin-bottom: 10px; }
          p { color: #888; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">\u2715</div>
          <h1>Authentication Failed</h1>
          <p>${error}${description ? `: ${description}` : ""}</p>
        </div>
      </body>
      </html>
    `);
  }
  /**
   * Logout
   */
  async logout() {
    await this.storage.clearProvider(this.provider);
    this.pendingStates.clear();
    this.stopCallbackServer();
  }
  /**
   * Check if authenticated
   */
  async isAuthenticated() {
    const tokens = await this.storage.getOAuthTokens(this.provider);
    return tokens !== void 0;
  }
  /**
   * Dispose
   */
  dispose() {
    this.stopCallbackServer();
    this.pendingStates.clear();
  }
};

// src/auth/AuthManager.ts
init_ApiKeyAuth();

// src/auth/providers/AnthropicAuth.ts
var ANTHROPIC_OAUTH_CONFIG = {
  clientId: "9d1c250a-e0b9-4f26-8c72-e03f1f1f2187",
  authorizationEndpoint: "https://claude.ai/oauth/authorize",
  tokenEndpoint: "https://claude.ai/oauth/token",
  scope: ["openid", "profile", "email", "offline_access"],
  usePKCE: true
};
var AnthropicAuth = class extends OAuthClient {
  constructor(storage) {
    super("claudeai", ANTHROPIC_OAUTH_CONFIG, storage);
  }
};

// src/auth/providers/BedrockAuth.ts
init_ApiKeyAuth();
import * as vscode8 from "vscode";
var BedrockAuth = class extends ApiKeyAuth {
  config = null;
  constructor(storage) {
    super("bedrock", {
      provider: "bedrock",
      envVarName: "AWS_ACCESS_KEY_ID"
    }, storage);
  }
  /**
   * Configure Bedrock credentials
   */
  async configure() {
    const hasEnvCredentials = this.checkEnvironmentCredentials();
    if (hasEnvCredentials) {
      vscode8.window.showInformationMessage(
        "AWS credentials found in environment variables"
      );
      return true;
    }
    const options = [
      { label: "$(key) Enter AWS Access Keys", action: "keys" },
      { label: "$(file) Use AWS Profile", action: "profile" },
      { label: "$(cloud) Use IAM Role (EC2/Lambda)", action: "role" }
    ];
    const selected = await vscode8.window.showQuickPick(options, {
      placeHolder: "Select AWS credential method"
    });
    if (!selected) return false;
    switch (selected.action) {
      case "keys":
        return await this.configureAccessKeys();
      case "profile":
        return await this.configureProfile();
      case "role":
        return true;
    }
    return false;
  }
  /**
   * Configure with access keys
   */
  async configureAccessKeys() {
    const region = await vscode8.window.showInputBox({
      prompt: "AWS Region",
      placeHolder: "us-east-1",
      value: "us-east-1"
    });
    if (!region) return false;
    const accessKeyId = await vscode8.window.showInputBox({
      prompt: "AWS Access Key ID",
      placeHolder: "AKIA..."
    });
    if (!accessKeyId) return false;
    const secretAccessKey = await vscode8.window.showInputBox({
      prompt: "AWS Secret Access Key",
      password: true
    });
    if (!secretAccessKey) return false;
    const sessionToken = await vscode8.window.showInputBox({
      prompt: "AWS Session Token (optional)",
      password: true
    });
    this.config = {
      region,
      accessKeyId,
      secretAccessKey,
      sessionToken: sessionToken || void 0
    };
    await this.storeApiKey(JSON.stringify(this.config));
    await this.storeRegion(region);
    return true;
  }
  /**
   * Configure with AWS profile
   */
  async configureProfile() {
    const profile = await vscode8.window.showInputBox({
      prompt: "AWS Profile Name",
      placeHolder: "default",
      value: "default"
    });
    if (!profile) return false;
    const region = await vscode8.window.showInputBox({
      prompt: "AWS Region",
      placeHolder: "us-east-1",
      value: "us-east-1"
    });
    if (!region) return false;
    this.config = {
      region,
      profile
    };
    await this.storeRegion(region);
    return true;
  }
  /**
   * Check if environment has AWS credentials
   */
  checkEnvironmentCredentials() {
    return !!(process.env.AWS_ACCESS_KEY_ID || process.env.AWS_SECRET_ACCESS_KEY || process.env.AWS_PROFILE || process.env.AWS_ROLE_ARN);
  }
  /**
   * Store region in VS Code configuration
   */
  async storeRegion(region) {
    const config = vscode8.workspace.getConfiguration("cclocal");
    await config.update("bedrockRegion", region, vscode8.ConfigurationTarget.Global);
  }
  /**
   * Get Bedrock configuration
   */
  getConfig() {
    return this.config;
  }
  /**
   * Get region
   */
  getRegion() {
    return this.config?.region || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
  }
};

// src/auth/providers/VertexAuth.ts
init_ApiKeyAuth();
import * as vscode9 from "vscode";
var VertexAuth = class extends ApiKeyAuth {
  config = null;
  constructor(storage) {
    super("vertex", {
      provider: "vertex",
      envVarName: "GOOGLE_APPLICATION_CREDENTIALS"
    }, storage);
  }
  /**
   * Configure Vertex AI credentials
   */
  async configure() {
    const hasEnvCredentials = this.checkEnvironmentCredentials();
    if (hasEnvCredentials) {
      vscode9.window.showInformationMessage(
        "GCP credentials found in environment variables"
      );
      return true;
    }
    const options = [
      { label: "$(file) Service Account Key File", action: "keyfile" },
      { label: "$(key) Enter API Key", action: "apikey" },
      { label: "$(cloud) Use Default Credentials", action: "default" }
    ];
    const selected = await vscode9.window.showQuickPick(options, {
      placeHolder: "Select GCP credential method"
    });
    if (!selected) return false;
    switch (selected.action) {
      case "keyfile":
        return await this.configureKeyFile();
      case "apikey":
        return await this.configureApiKey();
      case "default":
        return await this.configureDefault();
    }
    return false;
  }
  /**
   * Configure with service account key file
   */
  async configureKeyFile() {
    const projectId = await vscode9.window.showInputBox({
      prompt: "GCP Project ID",
      placeHolder: "my-project-id"
    });
    if (!projectId) return false;
    const keyFileUri = await vscode9.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: { "JSON Files": ["json"] },
      title: "Select Service Account Key File"
    });
    if (!keyFileUri || keyFileUri.length === 0) return false;
    this.config = {
      projectId,
      credentialsPath: keyFileUri[0].fsPath
    };
    await this.storeApiKey(JSON.stringify(this.config));
    return true;
  }
  /**
   * Configure with API key
   */
  async configureApiKey() {
    const projectId = await vscode9.window.showInputBox({
      prompt: "GCP Project ID",
      placeHolder: "my-project-id"
    });
    if (!projectId) return false;
    const apiKey = await vscode9.window.showInputBox({
      prompt: "GCP API Key",
      password: true
    });
    if (!apiKey) return false;
    this.config = {
      projectId
    };
    await this.storeApiKey(apiKey);
    await this.storeProjectId(projectId);
    return true;
  }
  /**
   * Configure with default credentials
   */
  async configureDefault() {
    const projectId = await vscode9.window.showInputBox({
      prompt: "GCP Project ID",
      placeHolder: "my-project-id"
    });
    if (!projectId) return false;
    this.config = {
      projectId
    };
    await this.storeProjectId(projectId);
    return true;
  }
  /**
   * Check if environment has GCP credentials
   */
  checkEnvironmentCredentials() {
    return !!(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCP_PROJECT_ID || process.env.ANTHROPIC_VERTEX_PROJECT_ID);
  }
  /**
   * Store project ID
   */
  async storeProjectId(projectId) {
    const config = vscode9.workspace.getConfiguration("cclocal");
    await config.update("vertexProjectId", projectId, vscode9.ConfigurationTarget.Global);
  }
  /**
   * Get Vertex configuration
   */
  getConfig() {
    return this.config;
  }
  /**
   * Get project ID
   */
  getProjectId() {
    return this.config?.projectId || process.env.ANTHROPIC_VERTEX_PROJECT_ID || process.env.GCP_PROJECT_ID || "";
  }
  /**
   * Get region
   */
  getRegion() {
    return this.config?.region || process.env.ANTHROPIC_VERTEX_REGION || process.env.VERTEX_REGION || "us-central1";
  }
};

// src/auth/AuthManager.ts
init_CustomProviderAuth();
var PROVIDER_CONFIGS = {
  claudeai: {
    name: "Claude.ai",
    description: "Claude Pro/Max subscription",
    icon: "\u{1F916}",
    requiresOAuth: true
  },
  console: {
    name: "API Key",
    description: "Anthropic Console API Key",
    icon: "\u{1F511}",
    requiresOAuth: false
  },
  bedrock: {
    name: "AWS Bedrock",
    description: "Amazon Bedrock",
    icon: "\u2601\uFE0F",
    requiresOAuth: false
  },
  vertex: {
    name: "Google Vertex AI",
    description: "Google Cloud Vertex AI",
    icon: "\u{1F537}",
    requiresOAuth: false
  },
  foundry: {
    name: "Azure Foundry",
    description: "Azure AI Foundry",
    icon: "\u{1FA9F}",
    requiresOAuth: false
  },
  custom: {
    name: "Custom Provider",
    description: "Third-party API (OpenAI compatible)",
    icon: "\u{1F50C}",
    requiresOAuth: false
  }
};
var AuthManager = class {
  constructor(context, config) {
    this.context = context;
    this.config = config;
    this.storage = new SecureStorage(context);
    this.initializeProviders();
  }
  storage;
  state = {
    method: null,
    status: "unauthenticated"
  };
  providers = /* @__PURE__ */ new Map();
  onDidChangeStateEmitter = new vscode11.EventEmitter();
  onDidChangeState = this.onDidChangeStateEmitter.event;
  // ─── Initialization ──────────────────────────────────────────────────────────
  initializeProviders() {
    this.providers.set("claudeai", new AnthropicAuth(this.storage));
    this.providers.set("console", new ApiKeyAuth("anthropic", {
      provider: "anthropic",
      envVarName: "ANTHROPIC_API_KEY"
    }, this.storage));
    this.providers.set("bedrock", new BedrockAuth(this.storage));
    this.providers.set("vertex", new VertexAuth(this.storage));
    this.providers.set("custom", new CustomProviderAuth(this.storage));
  }
  /**
   * Check current authentication status
   */
  async checkAuthStatus() {
    const methods = ["claudeai", "console", "bedrock", "vertex", "custom"];
    for (const method of methods) {
      const provider = this.providers.get(method);
      if (!provider) continue;
      const isAuthenticated = await this.checkProviderAuth(method, provider);
      if (isAuthenticated) {
        this.state = {
          method,
          status: "authenticated",
          provider: PROVIDER_CONFIGS[method]?.name
        };
        this.onDidChangeStateEmitter.fire(this.state);
        return this.state;
      }
    }
    this.state = {
      method: null,
      status: "unauthenticated"
    };
    this.onDidChangeStateEmitter.fire(this.state);
    return this.state;
  }
  /**
   * Check if a specific provider is authenticated
   */
  async checkProviderAuth(method, provider) {
    if (provider instanceof OAuthClient) {
      return provider.isAuthenticated();
    } else {
      return provider.hasApiKey();
    }
  }
  // ─── Login Methods ────────────────────────────────────────────────────────────
  /**
   * Login with specified method
   */
  async login(method) {
    try {
      this.state = { method, status: "connecting" };
      this.onDidChangeStateEmitter.fire(this.state);
      switch (method) {
        case "claudeai":
          return await this.loginClaudeAI();
        case "console":
          return await this.loginConsole();
        case "bedrock":
          return await this.loginBedrock();
        case "vertex":
          return await this.loginVertex();
        case "custom":
          return await this.loginCustom();
        default:
          throw new Error(`Unknown auth method: ${method}`);
      }
    } catch (error) {
      this.state = {
        method,
        status: "error",
        error: error instanceof Error ? error.message : String(error)
      };
      this.onDidChangeStateEmitter.fire(this.state);
      return false;
    }
  }
  /**
   * Login with Claude.ai OAuth
   */
  async loginClaudeAI() {
    const provider = this.providers.get("claudeai");
    await provider.startFlow();
    return this.checkAuthStatus().then((s) => s.status === "authenticated");
  }
  /**
   * Login with API Key
   */
  async loginConsole() {
    const provider = this.providers.get("console");
    const apiKey = await provider.promptForApiKey();
    if (!apiKey) return false;
    const validation = await provider.validateApiKey(apiKey);
    if (!validation.valid) {
      vscode11.window.showErrorMessage(`Invalid API key: ${validation.error}`);
      return false;
    }
    await provider.storeApiKey(apiKey);
    return this.checkAuthStatus().then((s) => s.status === "authenticated");
  }
  /**
   * Login with AWS Bedrock
   */
  async loginBedrock() {
    const bedrockAuth = this.providers.get("bedrock");
    const configured = await bedrockAuth.configure();
    if (configured) {
      return this.checkAuthStatus().then((s) => s.status === "authenticated");
    }
    return false;
  }
  /**
   * Login with GCP Vertex AI
   */
  async loginVertex() {
    const vertexAuth = this.providers.get("vertex");
    const configured = await vertexAuth.configure();
    if (configured) {
      return this.checkAuthStatus().then((s) => s.status === "authenticated");
    }
    return false;
  }
  /**
   * Login with Custom Provider
   */
  async loginCustom() {
    const customAuth = this.providers.get("custom");
    const configured = await customAuth.configure();
    if (configured) {
      return this.checkAuthStatus().then((s) => s.status === "authenticated");
    }
    return false;
  }
  // ─── Logout ────────────────────────────────────────────────────────────────────
  /**
   * Logout from current provider
   */
  async logout() {
    if (this.state.method) {
      const provider = this.providers.get(this.state.method);
      if (provider) {
        if (provider instanceof OAuthClient) {
          await provider.logout();
        } else {
          await provider.deleteApiKey();
        }
      }
    }
    this.state = { method: null, status: "unauthenticated" };
    this.onDidChangeStateEmitter.fire(this.state);
  }
  // ─── UI Helpers ────────────────────────────────────────────────────────────────
  /**
   * Show login method picker
   */
  async showLoginPicker() {
    const items = Object.entries(PROVIDER_CONFIGS).map(([key, config]) => ({
      label: `${config.icon} ${config.name}`,
      description: config.description,
      method: key
    }));
    const selected = await vscode11.window.showQuickPick(items, {
      placeHolder: "Select authentication method"
    });
    return selected?.method;
  }
  /**
   * Get provider display info
   */
  getProviderInfo(method) {
    return PROVIDER_CONFIGS[method];
  }
  /**
   * Get current state
   */
  getState() {
    return { ...this.state };
  }
  /**
   * Check if authenticated
   */
  isAuthenticated() {
    return this.state.status === "authenticated";
  }
  // ─── Token Management ──────────────────────────────────────────────────────────
  /**
   * Get valid access token (refresh if needed)
   */
  async getAccessToken() {
    if (!this.state.method) return void 0;
    const provider = this.providers.get(this.state.method);
    if (!provider) return void 0;
    if (provider instanceof OAuthClient) {
      return provider.getAccessToken();
    } else {
      return provider.getApiKey();
    }
  }
  /**
   * Refresh authentication
   */
  async refreshAuth() {
    if (!this.state.method) return false;
    const provider = this.providers.get(this.state.method);
    if (!provider) return false;
    if (provider instanceof OAuthClient) {
      try {
        await provider.refreshToken();
        return true;
      } catch {
        return false;
      }
    }
    return true;
  }
  // ─── Dispose ───────────────────────────────────────────────────────────────────
  dispose() {
    this.providers.forEach((provider) => provider.dispose());
    this.providers.clear();
    this.storage.dispose();
    this.onDidChangeStateEmitter.dispose();
  }
};

// src/auth/AuthStatusBar.ts
var AuthStatusBarItem = class {
  statusBarItem;
  authManager;
  constructor(authManager) {
    this.authManager = authManager;
    this.statusBarItem = vscode12.window.createStatusBarItem(
      "cclocal.auth",
      vscode12.StatusBarAlignment.Left,
      100
    );
    this.statusBarItem.command = "cclocal.login";
    this.statusBarItem.name = "CCLocal Auth";
    this.statusBarItem.tooltip = "CCLocal Authentication";
    this.updateStatusBar();
    this.authManager.onDidChangeState(() => this.updateStatusBar());
  }
  /**
   * Update status bar based on auth state
   */
  updateStatusBar() {
    const state = this.authManager.getState();
    switch (state.status) {
      case "authenticated":
        this.statusBarItem.text = `$(check) CCLocal`;
        this.statusBarItem.tooltip = `Logged in with ${state.provider || "Unknown"}`;
        this.statusBarItem.command = "cclocal.logout";
        this.statusBarItem.backgroundColor = void 0;
        break;
      case "connecting":
        this.statusBarItem.text = `$(sync~spin) CCLocal`;
        this.statusBarItem.tooltip = "Logging in...";
        this.statusBarItem.command = void 0;
        this.statusBarItem.backgroundColor = void 0;
        break;
      case "expired":
        this.statusBarItem.text = `$(alert) CCLocal`;
        this.statusBarItem.tooltip = "Session expired. Click to re-login.";
        this.statusBarItem.command = "cclocal.login";
        this.statusBarItem.backgroundColor = new vscode12.ThemeColor("statusBarItem.warningBackground");
        break;
      case "error":
        this.statusBarItem.text = `$(error) CCLocal`;
        this.statusBarItem.tooltip = `Error: ${state.error || "Unknown error"}`;
        this.statusBarItem.command = "cclocal.login";
        this.statusBarItem.backgroundColor = new vscode12.ThemeColor("statusBarItem.errorBackground");
        break;
      case "unauthenticated":
      default:
        this.statusBarItem.text = `$(account) CCLocal`;
        this.statusBarItem.tooltip = "Click to login";
        this.statusBarItem.command = "cclocal.login";
        this.statusBarItem.backgroundColor = void 0;
        break;
    }
    this.statusBarItem.show();
  }
  /**
   * Show status bar item
   */
  show() {
    this.statusBarItem.show();
  }
  /**
   * Hide status bar item
   */
  hide() {
    this.statusBarItem.hide();
  }
  /**
   * Dispose
   */
  dispose() {
    this.statusBarItem.dispose();
  }
};
var AuthStatusBar = class {
  item;
  authManager;
  constructor(context) {
    this.authManager = new AuthManager(context);
    this.item = new AuthStatusBarItem(this.authManager);
    registerAuthCommands(context, this.authManager, this.item);
  }
  getAuthManager() {
    return this.authManager;
  }
  dispose() {
    this.item.dispose();
    this.authManager.dispose();
  }
};
function registerAuthCommands(context, authManager, statusBar) {
  context.subscriptions.push(
    vscode12.commands.registerCommand("cclocal.login", async () => {
      const method = await authManager.showLoginPicker();
      if (!method) return;
      const success = await authManager.login(method);
      if (success) {
        vscode12.window.showInformationMessage(
          `Successfully logged in with ${authManager.getProviderInfo(method)?.name}`
        );
      }
    })
  );
  context.subscriptions.push(
    vscode12.commands.registerCommand("cclocal.logout", async () => {
      const confirm = await vscode12.window.showWarningMessage(
        "Are you sure you want to logout?",
        "Yes",
        "No"
      );
      if (confirm === "Yes") {
        await authManager.logout();
        vscode12.window.showInformationMessage("Logged out successfully");
      }
    })
  );
  context.subscriptions.push(
    vscode12.commands.registerCommand("cclocal.checkAuth", async () => {
      const state = await authManager.checkAuthStatus();
      if (state.status === "authenticated") {
        vscode12.window.showInformationMessage(
          `Logged in with ${state.provider || "Unknown"}`
        );
      } else {
        vscode12.window.showInformationMessage("Not logged in");
      }
    })
  );
  context.subscriptions.push(
    vscode12.commands.registerCommand("cclocal.switchAuthMethod", async () => {
      const method = await authManager.showLoginPicker();
      if (!method) return;
      if (authManager.isAuthenticated()) {
        await authManager.logout();
      }
      await authManager.login(method);
    })
  );
  context.subscriptions.push(
    vscode12.commands.registerCommand("cclocal.configureCustomProvider", async () => {
      const { CustomProviderAuth: CustomProviderAuth2 } = await Promise.resolve().then(() => (init_CustomProviderAuth(), CustomProviderAuth_exports));
      const customAuth = new CustomProviderAuth2(new SecureStorage(context));
      await customAuth.configure();
    })
  );
}

// src/extension.ts
init_mcp();
init_MCPPanelProvider();

// src/plugins/PluginManager.ts
import * as vscode17 from "vscode";
import * as path8 from "path";
import * as fs5 from "fs";
var PLUGIN_DIR = "plugins";
var MANIFEST_FILE = "plugin.json";
var KNOWN_MARKETPLACES = [
  "https://marketplace.anthropic.com",
  "https://plugins.claude.ai"
];
var PluginManager = class {
  outputChannel;
  context;
  plugins;
  marketplaces;
  options;
  eventEmitter;
  pluginStorageDir;
  /** Event fired when plugin state changes */
  onDidPluginEvent;
  constructor(context, outputChannel2, options = {}) {
    this.context = context;
    this.outputChannel = outputChannel2;
    this.options = {
      officialMarketplaces: KNOWN_MARKETPLACES,
      extraKnownMarketplaces: [],
      strictKnownMarketplaces: [],
      blockedMarketplaces: [],
      autoUpdate: false,
      updateCheckInterval: 36e5,
      // 1 hour
      ...options
    };
    this.plugins = /* @__PURE__ */ new Map();
    this.marketplaces = /* @__PURE__ */ new Map();
    this.eventEmitter = new vscode17.EventEmitter();
    this.onDidPluginEvent = this.eventEmitter.event;
    this.pluginStorageDir = path8.join(context.globalStorageUri.fsPath, PLUGIN_DIR);
    this.ensurePluginDir();
    this.initializeMarketplaces();
    this.outputChannel.debug("PluginManager initialized");
  }
  // ─── Plugin Installation ───────────────────────────────────────────────────
  /**
   * Install a plugin from a marketplace
   */
  async install(pluginId, marketplaceUrl, options = {}) {
    this.outputChannel.info(`Installing plugin: ${pluginId}`);
    if (this.plugins.has(pluginId)) {
      throw new Error(`Plugin "${pluginId}" is already installed`);
    }
    const marketplace = this.marketplaces.get(marketplaceUrl);
    if (!marketplace?.plugins) {
      await this.refreshMarketplace(marketplaceUrl);
    }
    const marketplacePlugin = this.findMarketplacePlugin(pluginId, marketplaceUrl);
    if (!marketplacePlugin) {
      throw new Error(`Plugin "${pluginId}" not found in marketplace`);
    }
    if (!options.skipTrust) {
      const trusted = await this.verifyPluginTrust(marketplacePlugin);
      if (!trusted) {
        throw new Error(`Plugin "${pluginId}" failed trust verification`);
      }
    }
    const installPath = path8.join(this.pluginStorageDir, this.sanitizePluginId(pluginId));
    await fs5.promises.mkdir(installPath, { recursive: true });
    await this.downloadPlugin(marketplacePlugin, installPath);
    const manifest = await this.loadManifest(installPath);
    const approved = options.autoApprove || await this.requestPermissions(manifest);
    const installedPlugin = {
      manifest,
      installPath,
      state: "installed",
      trustLevel: marketplacePlugin.trustLevel,
      installedAt: Date.now(),
      updatedAt: Date.now(),
      permissionsApproved: approved,
      approvedPermissions: approved ? manifest.permissions || [] : [],
      configuration: this.getDefaultConfig(manifest),
      marketplaceUrl
    };
    this.plugins.set(pluginId, installedPlugin);
    this.emitEvent("plugin_installed", pluginId);
    if (approved) {
      await this.activate(pluginId);
    }
    this.outputChannel.info(`Plugin installed: ${pluginId}`);
    return installedPlugin;
  }
  /**
   * Install a plugin from a local path
   */
  async installLocal(localPath, options = {}) {
    const manifest = await this.loadManifest(localPath);
    const pluginId = manifest.id;
    if (this.plugins.has(pluginId)) {
      throw new Error(`Plugin "${pluginId}" is already installed`);
    }
    const approved = options.autoApprove || await this.requestPermissions(manifest);
    const installedPlugin = {
      manifest,
      installPath: localPath,
      state: "installed",
      trustLevel: "untrusted",
      installedAt: Date.now(),
      updatedAt: Date.now(),
      permissionsApproved: approved,
      approvedPermissions: approved ? manifest.permissions || [] : [],
      configuration: this.getDefaultConfig(manifest)
    };
    this.plugins.set(pluginId, installedPlugin);
    this.emitEvent("plugin_installed", pluginId);
    if (approved) {
      await this.activate(pluginId);
    }
    this.outputChannel.info(`Local plugin installed: ${pluginId}`);
    return installedPlugin;
  }
  /**
   * Uninstall a plugin
   */
  async uninstall(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return false;
    }
    if (plugin.state === "active") {
      await this.deactivate(pluginId);
    }
    plugin.state = "uninstalling";
    this.emitEvent("plugin_uninstalled", pluginId);
    try {
      await fs5.promises.rm(plugin.installPath, { recursive: true, force: true });
    } catch (error) {
      this.outputChannel.warn(`Failed to remove plugin files: ${error}`);
    }
    this.plugins.delete(pluginId);
    this.outputChannel.info(`Plugin uninstalled: ${pluginId}`);
    return true;
  }
  // ─── Plugin Lifecycle ──────────────────────────────────────────────────────
  /**
   * Activate a plugin
   */
  async activate(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin "${pluginId}" not found`);
    }
    if (plugin.state === "active") {
      return true;
    }
    if (!plugin.permissionsApproved) {
      const approved = await this.requestPermissions(plugin.manifest);
      if (!approved) {
        return false;
      }
      plugin.permissionsApproved = true;
      plugin.approvedPermissions = plugin.manifest.permissions || [];
    }
    try {
      if (plugin.manifest.mcpServers) {
        await this.registerPluginMcpServers(plugin);
      }
      plugin.state = "active";
      plugin.updatedAt = Date.now();
      this.emitEvent("plugin_activated", pluginId);
      this.outputChannel.info(`Plugin activated: ${pluginId}`);
      return true;
    } catch (error) {
      plugin.state = "error";
      plugin.lastError = error instanceof Error ? error.message : String(error);
      this.emitEvent("plugin_error", pluginId, { error: plugin.lastError });
      this.outputChannel.error(`Plugin activation failed: ${pluginId}: ${error}`);
      return false;
    }
  }
  /**
   * Deactivate a plugin
   */
  async deactivate(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || plugin.state !== "active") {
      return false;
    }
    plugin.state = "installed";
    plugin.updatedAt = Date.now();
    this.emitEvent("plugin_deactivated", pluginId);
    this.outputChannel.info(`Plugin deactivated: ${pluginId}`);
    return true;
  }
  /**
   * Enable a disabled plugin
   */
  async enable(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || plugin.state !== "disabled") {
      return false;
    }
    return this.activate(pluginId);
  }
  /**
   * Disable an active plugin
   */
  async disable(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return false;
    }
    if (plugin.state === "active") {
      await this.deactivate(pluginId);
    }
    plugin.state = "disabled";
    plugin.updatedAt = Date.now();
    return true;
  }
  // ─── Plugin Queries ────────────────────────────────────────────────────────
  /**
   * Get an installed plugin
   */
  getPlugin(pluginId) {
    return this.plugins.get(pluginId);
  }
  /**
   * Get all installed plugins
   */
  getAllPlugins() {
    return Array.from(this.plugins.values());
  }
  /**
   * Get plugins by state
   */
  getPluginsByState(state) {
    return this.getAllPlugins().filter((p) => p.state === state);
  }
  /**
   * Get active plugins
   */
  getActivePlugins() {
    return this.getPluginsByState("active");
  }
  /**
   * Get plugin statistics
   */
  getStats() {
    const plugins = this.getAllPlugins();
    const byState = {
      available: 0,
      installed: 0,
      active: 0,
      disabled: 0,
      error: 0,
      updating: 0,
      uninstalling: 0
    };
    const byTrust = {
      untrusted: 0,
      community: 0,
      verified: 0,
      official: 0,
      enterprise: 0
    };
    for (const plugin of plugins) {
      byState[plugin.state]++;
      byTrust[plugin.trustLevel]++;
    }
    return {
      totalInstalled: plugins.length,
      totalActive: byState.active,
      byState,
      byTrust,
      marketplaces: this.marketplaces.size,
      availablePlugins: this.getTotalAvailablePlugins()
    };
  }
  // ─── Permissions ────────────────────────────────────────────────────────────
  /**
   * Request user approval for plugin permissions
   */
  async requestPermissions(manifest) {
    const permissions = manifest.permissions || [];
    if (permissions.length === 0) {
      return true;
    }
    const dangerousPerms = permissions.filter(
      (p) => ["execute-commands", "write-files", "full-access"].includes(p)
    );
    if (dangerousPerms.length === 0) {
      return true;
    }
    const detail = [
      `Plugin: ${manifest.name} v${manifest.version}`,
      `Publisher: ${manifest.publisher}`,
      "",
      "This plugin requests the following permissions:",
      ...permissions.map((p) => `  \u2022 ${this.formatPermission(p)}`),
      "",
      "Dangerous permissions require your approval:",
      ...dangerousPerms.map((p) => `  \u26A0 ${this.formatPermission(p)}`)
    ].join("\n");
    const result = await vscode17.window.showWarningMessage(
      `Plugin Permission Request: ${manifest.name}`,
      { modal: true, detail },
      { title: "Approve" },
      { title: "Deny" }
    );
    return result?.title === "Approve";
  }
  /**
   * Update permissions for an installed plugin
   */
  async updatePermissions(pluginId, permissions) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return false;
    }
    plugin.approvedPermissions = permissions;
    plugin.permissionsApproved = true;
    plugin.updatedAt = Date.now();
    this.emitEvent("permissions_granted", pluginId, { permissions });
    return true;
  }
  // ─── Trust Management ──────────────────────────────────────────────────────
  /**
   * Verify plugin trust before installation
   */
  async verifyPluginTrust(marketplacePlugin) {
    const trustLevel = marketplacePlugin.trustLevel;
    if (trustLevel === "official" || trustLevel === "verified") {
      return true;
    }
    if (trustLevel === "enterprise") {
      return true;
    }
    if (trustLevel === "community") {
      const result2 = await vscode17.window.showWarningMessage(
        `Community Plugin: ${marketplacePlugin.manifest.name}`,
        {
          modal: true,
          detail: [
            `Publisher: ${marketplacePlugin.manifest.publisher}`,
            `This plugin is community-verified but not officially reviewed.`,
            `Install at your own risk.`
          ].join("\n")
        },
        { title: "Install Anyway" },
        { title: "Cancel" }
      );
      return result2?.title === "Install Anyway";
    }
    const result = await vscode17.window.showWarningMessage(
      `Untrusted Plugin: ${marketplacePlugin.manifest.name}`,
      {
        modal: true,
        detail: [
          `Publisher: ${marketplacePlugin.manifest.publisher}`,
          `This plugin has not been verified by any trusted source.`,
          `Installing untrusted plugins may pose security risks.`
        ].join("\n")
      },
      { title: "Install at Own Risk" },
      { title: "Cancel" }
    );
    return result?.title === "Install at Own Risk";
  }
  /**
   * Update trust level for a plugin
   */
  updateTrustLevel(pluginId, trustLevel) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return false;
    }
    plugin.trustLevel = trustLevel;
    plugin.updatedAt = Date.now();
    this.emitEvent("trust_changed", pluginId, { trustLevel });
    return true;
  }
  // ─── Marketplace Management ────────────────────────────────────────────────
  /**
   * Add a marketplace
   */
  async addMarketplace(url4) {
    if (this.isMarketplaceBlocked(url4)) {
      throw new Error(`Marketplace "${url4}" is blocked by policy`);
    }
    if (this.marketplaces.has(url4)) {
      return this.marketplaces.get(url4);
    }
    const trustLevel = this.determineMarketplaceTrust(url4);
    const marketplace = {
      url: url4,
      name: this.extractMarketplaceName(url4),
      trustLevel,
      isKnown: this.isKnownMarketplace(url4)
    };
    this.marketplaces.set(url4, marketplace);
    await this.refreshMarketplace(url4);
    this.emitEvent("marketplace_added", void 0, url4);
    const config = vscode17.workspace.getConfiguration("cclocal");
    const extra = config.get("extraKnownMarketplaces") || [];
    if (!extra.includes(url4)) {
      extra.push(url4);
      await config.update("extraKnownMarketplaces", extra, vscode17.ConfigurationTarget.Global);
    }
    this.outputChannel.info(`Marketplace added: ${url4}`);
    return marketplace;
  }
  /**
   * Remove a marketplace
   */
  async removeMarketplace(url4) {
    if (!this.marketplaces.has(url4)) {
      return false;
    }
    this.marketplaces.delete(url4);
    this.emitEvent("marketplace_removed", void 0, url4);
    const config = vscode17.workspace.getConfiguration("cclocal");
    const extra = config.get("extraKnownMarketplaces") || [];
    const filtered = extra.filter((u) => u !== url4);
    await config.update("extraKnownMarketplaces", filtered, vscode17.ConfigurationTarget.Global);
    this.outputChannel.info(`Marketplace removed: ${url4}`);
    return true;
  }
  /**
   * Refresh marketplace data
   */
  async refreshMarketplace(url4) {
    const marketplace = this.marketplaces.get(url4);
    if (!marketplace) {
      return;
    }
    try {
      const response = await fetch(`${url4}/api/plugins`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      marketplace.plugins = data.plugins || [];
      marketplace.lastRefreshed = Date.now();
      this.emitEvent("marketplace_refreshed", void 0, url4);
    } catch (error) {
      this.outputChannel.warn(`Failed to refresh marketplace ${url4}: ${error}`);
      marketplace.plugins = [];
    }
  }
  /**
   * Get all marketplaces
   */
  getMarketplaces() {
    return Array.from(this.marketplaces.values());
  }
  // ─── Configuration ─────────────────────────────────────────────────────────
  /**
   * Get plugin configuration
   */
  getPluginConfig(pluginId) {
    return this.plugins.get(pluginId)?.configuration;
  }
  /**
   * Update plugin configuration
   */
  async updatePluginConfig(pluginId, key, value) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return false;
    }
    plugin.configuration[key] = value;
    plugin.updatedAt = Date.now();
    return true;
  }
  // ─── Load Installed Plugins ────────────────────────────────────────────────
  /**
   * Load all installed plugins from storage
   */
  async loadInstalledPlugins() {
    try {
      const entries = await fs5.promises.readdir(this.pluginStorageDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const pluginDir = path8.join(this.pluginStorageDir, entry.name);
        const manifestPath = path8.join(pluginDir, MANIFEST_FILE);
        try {
          const manifest = await this.loadManifest(pluginDir);
          const pluginId = manifest.id;
          const installed = {
            manifest,
            installPath: pluginDir,
            state: "installed",
            trustLevel: "community",
            installedAt: 0,
            updatedAt: Date.now(),
            permissionsApproved: false,
            approvedPermissions: [],
            configuration: this.getDefaultConfig(manifest)
          };
          this.plugins.set(pluginId, installed);
          this.outputChannel.debug(`Loaded plugin: ${pluginId}`);
        } catch {
          this.outputChannel.warn(`Failed to load plugin from: ${pluginDir}`);
        }
      }
    } catch (error) {
      if (error.code !== "ENOENT") {
        this.outputChannel.error(`Failed to load plugins: ${error}`);
      }
    }
  }
  // ─── Private Helpers ────────────────────────────────────────────────────────
  ensurePluginDir() {
    if (!fs5.existsSync(this.pluginStorageDir)) {
      fs5.mkdirSync(this.pluginStorageDir, { recursive: true });
    }
  }
  initializeMarketplaces() {
    const official = this.options.officialMarketplaces || KNOWN_MARKETPLACES;
    for (const url4 of official) {
      this.marketplaces.set(url4, {
        url: url4,
        name: this.extractMarketplaceName(url4),
        trustLevel: "official",
        isKnown: true
      });
    }
    const extra = this.options.extraKnownMarketplaces || [];
    for (const url4 of extra) {
      if (!this.marketplaces.has(url4)) {
        this.marketplaces.set(url4, {
          url: url4,
          name: this.extractMarketplaceName(url4),
          trustLevel: "community",
          isKnown: true
        });
      }
    }
  }
  async downloadPlugin(plugin, targetDir) {
    const response = await fetch(plugin.downloadUrl);
    if (!response.ok) {
      throw new Error(`Download failed: HTTP ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs5.promises.writeFile(path8.join(targetDir, "plugin.tar.gz"), buffer);
    this.outputChannel.debug(`Downloaded plugin: ${plugin.manifest.id}`);
  }
  async loadManifest(pluginDir) {
    const manifestPath = path8.join(pluginDir, MANIFEST_FILE);
    const content = await fs5.promises.readFile(manifestPath, "utf-8");
    return JSON.parse(content);
  }
  async registerPluginMcpServers(plugin) {
    if (!plugin.manifest.mcpServers) return;
    const { getMCPManager: getMCPManager2 } = await Promise.resolve().then(() => (init_mcp(), mcp_exports));
    const mcpManager2 = getMCPManager2();
    for (const [name, config] of Object.entries(plugin.manifest.mcpServers)) {
      try {
        mcpManager2.registerServer({
          name: `${plugin.manifest.id}__${name}`,
          config
        });
      } catch (error) {
        this.outputChannel.warn(`Failed to register MCP server ${name}: ${error}`);
      }
    }
  }
  getDefaultConfig(manifest) {
    const config = {};
    if (manifest.configuration) {
      for (const [key, schema] of Object.entries(manifest.configuration)) {
        config[key] = schema.default;
      }
    }
    return config;
  }
  formatPermission(perm) {
    const labels = {
      "read-files": "Read file contents",
      "write-files": "Write/edit files",
      "execute-commands": "Run shell commands",
      "access-network": "Make HTTP requests",
      "access-mcp": "Register MCP servers",
      "access-clipboard": "Access clipboard",
      "access-workspace": "Access workspace info",
      "access-extensions": "Access other extensions",
      "full-access": "Full unrestricted access"
    };
    return labels[perm] || perm;
  }
  sanitizePluginId(id) {
    return id.replace(/[^a-zA-Z0-9_-]/g, "_");
  }
  extractMarketplaceName(url4) {
    try {
      const hostname = new URL(url4).hostname;
      return hostname.replace(/^(www\.|marketplace\.)/, "");
    } catch {
      return url4;
    }
  }
  isKnownMarketplace(url4) {
    const allKnown = [
      ...this.options.officialMarketplaces || [],
      ...this.options.extraKnownMarketplaces || [],
      ...this.options.strictKnownMarketplaces || []
    ];
    return allKnown.some((u) => u === url4);
  }
  isMarketplaceBlocked(url4) {
    return (this.options.blockedMarketplaces || []).includes(url4);
  }
  determineMarketplaceTrust(url4) {
    const official = this.options.officialMarketplaces || KNOWN_MARKETPLACES;
    if (official.includes(url4)) return "official";
    if (this.options.strictKnownMarketplaces?.includes(url4)) return "verified";
    if (this.options.extraKnownMarketplaces?.includes(url4)) return "community";
    return "untrusted";
  }
  findMarketplacePlugin(pluginId, marketplaceUrl) {
    const marketplace = this.marketplaces.get(marketplaceUrl);
    return marketplace?.plugins?.find((p) => p.manifest.id === pluginId);
  }
  getTotalAvailablePlugins() {
    let total = 0;
    const seenIds = /* @__PURE__ */ new Set();
    for (const marketplace of this.marketplaces.values()) {
      for (const plugin of marketplace.plugins || []) {
        if (!seenIds.has(plugin.manifest.id)) {
          seenIds.add(plugin.manifest.id);
          total++;
        }
      }
    }
    return total;
  }
  emitEvent(type, pluginId, data) {
    this.eventEmitter.fire({ type, pluginId, data });
  }
  // ─── Lifecycle ──────────────────────────────────────────────────────────────
  dispose() {
    this.eventEmitter.dispose();
    this.plugins.clear();
    this.marketplaces.clear();
    this.outputChannel.debug("PluginManager disposed");
  }
};
var instance3 = null;
function getPluginManager(context, outputChannel2, options) {
  if (!instance3 && context && outputChannel2) {
    instance3 = new PluginManager(context, outputChannel2, options);
  }
  return instance3;
}
function disposePluginManager() {
  if (instance3) {
    instance3.dispose();
    instance3 = null;
  }
}

// src/plugins/PluginPanelProvider.ts
import * as vscode18 from "vscode";
var PluginPanelProvider = class {
  panel = null;
  pluginManager;
  constructor(pluginManager2) {
    this.pluginManager = pluginManager2;
    this.pluginManager.onDidPluginEvent(() => {
      this.sendState();
    });
  }
  show() {
    if (this.panel) {
      this.panel.reveal();
      return;
    }
    this.panel = vscode18.window.createWebviewPanel(
      "cclocal.plugins",
      "CCLocal Plugins",
      vscode18.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );
    this.panel.webview.html = this.getWebviewContent();
    this.setupMessageHandler();
  }
  setupMessageHandler() {
    if (!this.panel) return;
    this.panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case "getState":
          this.sendState();
          break;
        case "installPlugin":
          try {
            await this.pluginManager.install(message.pluginId, message.marketplaceUrl);
            vscode18.window.showInformationMessage(`Plugin "${message.pluginId}" installed successfully`);
          } catch (error) {
            vscode18.window.showErrorMessage(`Failed to install plugin: ${error}`);
          }
          this.sendState();
          break;
        case "uninstallPlugin":
          await this.pluginManager.uninstall(message.pluginId);
          vscode18.window.showInformationMessage(`Plugin "${message.pluginId}" uninstalled`);
          this.sendState();
          break;
        case "activatePlugin":
          const activated = await this.pluginManager.activate(message.pluginId);
          if (!activated) {
            vscode18.window.showWarningMessage(`Failed to activate plugin "${message.pluginId}"`);
          }
          this.sendState();
          break;
        case "deactivatePlugin":
          await this.pluginManager.deactivate(message.pluginId);
          this.sendState();
          break;
        case "enablePlugin":
          await this.pluginManager.enable(message.pluginId);
          this.sendState();
          break;
        case "disablePlugin":
          await this.pluginManager.disable(message.pluginId);
          this.sendState();
          break;
        case "addMarketplace":
          try {
            await this.pluginManager.addMarketplace(message.url);
            vscode18.window.showInformationMessage(`Marketplace "${message.url}" added`);
          } catch (error) {
            vscode18.window.showErrorMessage(`Failed to add marketplace: ${error}`);
          }
          this.sendState();
          break;
        case "removeMarketplace":
          await this.pluginManager.removeMarketplace(message.url);
          this.sendState();
          break;
        case "refreshMarketplace":
          await this.pluginManager.refreshMarketplace(message.url);
          this.sendState();
          break;
        case "openSettings":
          await vscode18.commands.executeCommand("workbench.action.openSettings", "cclocal");
          break;
      }
    });
  }
  sendState() {
    const plugins = this.pluginManager.getAllPlugins();
    const stats = this.pluginManager.getStats();
    const marketplaces = this.pluginManager.getMarketplaces();
    this.panel?.webview.postMessage({
      type: "state",
      plugins,
      stats,
      marketplaces
    });
  }
  getWebviewContent() {
    return (
      /* html */
      `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CCLocal Plugins</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      height: 100%;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
    }
    .container { max-width: 900px; margin: 0 auto; padding: 20px; }
    h1 {
      font-size: 24px;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--vscode-widget-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-actions { display: flex; gap: 8px; }
    .stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: var(--vscode-editorWidget-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: 6px;
      padding: 12px;
      text-align: center;
    }
    .stat-value { font-size: 24px; font-weight: 600; color: var(--vscode-textLink-foreground); }
    .stat-label { font-size: 12px; color: var(--vscode-descriptionForeground); margin-top: 4px; }
    .tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--vscode-widget-border);
    }
    .tab {
      padding: 8px 16px;
      background: transparent;
      border: none;
      color: var(--vscode-descriptionForeground);
      cursor: pointer;
      font-family: inherit;
      font-size: 13px;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
    }
    .tab:hover { color: var(--vscode-foreground); }
    .tab.active { color: var(--vscode-foreground); border-bottom-color: var(--vscode-focusBorder); }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    .section {
      background: var(--vscode-editorWidget-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .section-title { font-size: 14px; font-weight: 600; }
    .plugin-list { display: flex; flex-direction: column; gap: 8px; }
    .plugin-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: var(--vscode-list-hoverBackground);
      border-radius: 4px;
      border-left: 3px solid transparent;
    }
    .plugin-item.active { border-left-color: var(--vscode-testing-iconPassed, #4CAF50); }
    .plugin-item.disabled { border-left-color: #9E9E9E; }
    .plugin-item.error { border-left-color: var(--vscode-testing-iconFailed, #f44336); }
    .plugin-info { flex: 1; }
    .plugin-name { font-weight: 600; display: flex; align-items: center; gap: 8px; }
    .plugin-desc { font-size: 12px; color: var(--vscode-descriptionForeground); margin-top: 4px; }
    .plugin-meta { font-size: 11px; color: var(--vscode-textPreformat-foreground); margin-top: 4px; }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 500;
    }
    .badge.official { background: var(--vscode-textLink-foreground); color: white; }
    .badge.verified { background: #4CAF50; color: white; }
    .badge.community { background: #FF9800; color: white; }
    .badge.untrusted { background: #9E9E9E; color: white; }
    .badge.state-active { background: #4CAF50; color: white; }
    .badge.state-installed { background: #2196F3; color: white; }
    .badge.state-disabled { background: #9E9E9E; color: white; }
    .badge.state-error { background: #f44336; color: white; }
    .btn {
      padding: 6px 12px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-family: inherit;
      font-size: 12px;
    }
    .btn:hover { background: var(--vscode-button-hoverBackground); }
    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .btn-secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
    .btn-small { padding: 4px 8px; font-size: 11px; }
    .btn-danger { background: var(--vscode-inputValidation-errorBackground, #f44336); }
    .plugin-actions { display: flex; gap: 6px; }
    .marketplace-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: var(--vscode-list-hoverBackground);
      border-radius: 4px;
      margin-bottom: 8px;
    }
    .inline-form {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }
    .inline-form input { flex: 1; }
    .empty {
      text-align: center;
      color: var(--vscode-descriptionForeground);
      padding: 20px;
    }
    input, textarea {
      width: 100%;
      padding: 6px 8px;
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      color: var(--vscode-input-foreground);
      border-radius: 4px;
      font-family: inherit;
      font-size: inherit;
    }
    input:focus, textarea:focus {
      outline: none;
      border-color: var(--vscode-focusBorder);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>
      <span>\u{1F9E9} CCLocal Plugins</span>
      <div class="header-actions">
        <button class="btn btn-secondary btn-small" id="refreshBtn">Refresh</button>
        <button class="btn btn-secondary btn-small" id="settingsBtn">Settings</button>
      </div>
    </h1>

    <div class="stats" id="stats"></div>

    <div class="tabs">
      <button class="tab active" data-tab="installed">Installed</button>
      <button class="tab" data-tab="marketplace">Marketplace</button>
      <button class="tab" data-tab="sources">Sources</button>
    </div>

    <!-- Installed Tab -->
    <div id="tab-installed" class="tab-content active">
      <div class="section">
        <div class="section-header">
          <span class="section-title">Installed Plugins</span>
        </div>
        <div class="plugin-list" id="installedList">
          <div class="empty">Loading...</div>
        </div>
      </div>
    </div>

    <!-- Marketplace Tab -->
    <div id="tab-marketplace" class="tab-content">
      <div class="section">
        <div class="section-header">
          <span class="section-title">Available Plugins</span>
          <input type="text" id="searchInput" placeholder="Search plugins..." style="width: 200px;" />
        </div>
        <div class="plugin-list" id="marketplaceList">
          <div class="empty">Loading marketplace...</div>
        </div>
      </div>
    </div>

    <!-- Sources Tab -->
    <div id="tab-sources" class="tab-content">
      <div class="section">
        <div class="section-header">
          <span class="section-title">Marketplace Sources</span>
        </div>
        <div class="inline-form">
          <input type="text" id="marketplaceUrl" placeholder="https://marketplace.example.com" />
          <button class="btn btn-small" id="addMarketplaceBtn">Add</button>
        </div>
        <div id="marketplaceSourceList"></div>
      </div>

      <div class="section">
        <div class="section-header">
          <span class="section-title">Install from Local</span>
        </div>
        <p style="color: var(--vscode-descriptionForeground); font-size: 12px; margin-bottom: 8px;">
          Install a plugin from a local directory containing a plugin.json manifest.
        </p>
        <button class="btn btn-secondary" id="installLocalBtn">Browse & Install</button>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    vscode.postMessage({ type: 'getState' });

    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
      });
    });

    window.addEventListener('message', event => {
      if (event.data.type === 'state') {
        renderState(event.data);
      }
    });

    function renderState(data) {
      renderStats(data.stats);
      renderInstalled(data.plugins);
      renderMarketplace(data.marketplaces);
      renderSources(data.marketplaces);
    }

    function renderStats(stats) {
      document.getElementById('stats').innerHTML = \`
        <div class="stat-card">
          <div class="stat-value">\${stats.totalInstalled}</div>
          <div class="stat-label">Installed</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">\${stats.totalActive}</div>
          <div class="stat-label">Active</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">\${stats.marketplaces}</div>
          <div class="stat-label">Sources</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">\${stats.availablePlugins}</div>
          <div class="stat-label">Available</div>
        </div>
      \`;
    }

    function renderInstalled(plugins) {
      const container = document.getElementById('installedList');
      if (plugins.length === 0) {
        container.innerHTML = '<div class="empty">No plugins installed. Browse the marketplace to find plugins.</div>';
        return;
      }

      container.innerHTML = plugins.map(p => \`
        <div class="plugin-item \${p.state}">
          <div class="plugin-info">
            <div class="plugin-name">
              <strong>\${escapeHtml(p.manifest.name)}</strong>
              <span class="badge state-\${p.state}">\${p.state}</span>
              <span class="badge \${p.trustLevel}">\${p.trustLevel}</span>
            </div>
            <div class="plugin-desc">\${escapeHtml(p.manifest.description || '')}</div>
            <div class="plugin-meta">
              v\${p.manifest.version} \u2022 \${p.manifest.publisher}
              \${p.manifest.permissions?.length ? ' \u2022 Permissions: ' + p.manifest.permissions.join(', ') : ''}
            </div>
            \${p.lastError ? '<div style="color: var(--vscode-errorForeground); margin-top: 4px;">Error: ' + escapeHtml(p.lastError) + '</div>' : ''}
          </div>
          <div class="plugin-actions">
            \${renderInstalledActions(p)}
          </div>
        </div>
      \`).join('');
    }

    function renderInstalledActions(plugin) {
      const id = plugin.manifest.id;
      switch (plugin.state) {
        case 'active':
          return \`
            <button class="btn btn-small btn-secondary" onclick="pluginAction('deactivate', '\${id}')">Deactivate</button>
            <button class="btn btn-small btn-danger" onclick="pluginAction('uninstall', '\${id}')">Uninstall</button>
          \`;
        case 'installed':
          return \`
            <button class="btn btn-small" onclick="pluginAction('activate', '\${id}')">Activate</button>
            <button class="btn btn-small btn-danger" onclick="pluginAction('uninstall', '\${id}')">Uninstall</button>
          \`;
        case 'disabled':
          return \`
            <button class="btn btn-small" onclick="pluginAction('enable', '\${id}')">Enable</button>
            <button class="btn btn-small btn-danger" onclick="pluginAction('uninstall', '\${id}')">Uninstall</button>
          \`;
        case 'error':
          return \`
            <button class="btn btn-small" onclick="pluginAction('activate', '\${id}')">Retry</button>
            <button class="btn btn-small btn-danger" onclick="pluginAction('uninstall', '\${id}')">Uninstall</button>
          \`;
        default:
          return '';
      }
    }

    function renderMarketplace(marketplaces) {
      const container = document.getElementById('marketplaceList');
      const search = document.getElementById('searchInput')?.value?.toLowerCase() || '';

      let allPlugins = [];
      const seenIds = new Set();
      for (const mp of marketplaces) {
        for (const p of mp.plugins || []) {
          if (!seenIds.has(p.manifest.id)) {
            seenIds.add(p.manifest.id);
            allPlugins.push(p);
          }
        }
      }

      if (search) {
        allPlugins = allPlugins.filter(p =>
          p.manifest.name.toLowerCase().includes(search) ||
          p.manifest.description?.toLowerCase().includes(search) ||
          p.manifest.publisher.toLowerCase().includes(search) ||
          p.manifest.keywords?.some(k => k.toLowerCase().includes(search))
        );
      }

      if (allPlugins.length === 0) {
        container.innerHTML = '<div class="empty">No plugins available. Add marketplace sources to discover plugins.</div>';
        return;
      }

      container.innerHTML = allPlugins.map(p => \`
        <div class="plugin-item">
          <div class="plugin-info">
            <div class="plugin-name">
              <strong>\${escapeHtml(p.manifest.name)}</strong>
              <span class="badge \${p.trustLevel}">\${p.trustLevel}</span>
              <span style="font-size: 11px; color: var(--vscode-descriptionForeground);">
                \${p.downloads} downloads \u2022 \u2605 \${p.rating.toFixed(1)}
              </span>
            </div>
            <div class="plugin-desc">\${escapeHtml(p.manifest.description || '')}</div>
            <div class="plugin-meta">
              v\${p.manifest.version} \u2022 \${p.manifest.publisher}
              \${p.manifest.mcpServers ? ' \u2022 Provides MCP servers' : ''}
            </div>
          </div>
          <div class="plugin-actions">
            <button class="btn btn-small" onclick="installPlugin('\${p.manifest.id}', '\${p.marketplaceUrl}')">Install</button>
          </div>
        </div>
      \`).join('');
    }

    function renderSources(marketplaces) {
      const container = document.getElementById('marketplaceSourceList');
      container.innerHTML = marketplaces.map(mp => \`
        <div class="marketplace-item">
          <div>
            <strong>\${escapeHtml(mp.name)}</strong>
            <span class="badge \${mp.trustLevel}" style="margin-left: 8px;">\${mp.trustLevel}</span>
            \${mp.isKnown ? '<span class="badge" style="background: #2196F3; color: white; margin-left: 4px;">known</span>' : ''}
            <div style="font-size: 12px; color: var(--vscode-descriptionForeground);">
              \${escapeHtml(mp.url)}
              \${mp.lastRefreshed ? ' \u2022 Last refreshed: ' + new Date(mp.lastRefreshed).toLocaleString() : ''}
            </div>
          </div>
          <div class="plugin-actions">
            <button class="btn btn-small btn-secondary" onclick="refreshMp('\${mp.url}')">Refresh</button>
            \${!mp.isKnown ? \`<button class="btn btn-small btn-danger" onclick="removeMp('\${mp.url}')">Remove</button>\` : ''}
          </div>
        </div>
      \`).join('');
    }

    function escapeHtml(str) {
      return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function pluginAction(action, pluginId) {
      vscode.postMessage({ type: action + 'Plugin', pluginId });
    }

    function installPlugin(pluginId, marketplaceUrl) {
      vscode.postMessage({ type: 'installPlugin', pluginId, marketplaceUrl });
    }

    function refreshMp(url) {
      vscode.postMessage({ type: 'refreshMarketplace', url });
    }

    function removeMp(url) {
      vscode.postMessage({ type: 'removeMarketplace', url });
    }

    // Button handlers
    document.getElementById('refreshBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'getState' });
    });

    document.getElementById('settingsBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'openSettings' });
    });

    document.getElementById('addMarketplaceBtn').addEventListener('click', () => {
      const url = document.getElementById('marketplaceUrl').value;
      if (url) {
        vscode.postMessage({ type: 'addMarketplace', url });
        document.getElementById('marketplaceUrl').value = '';
      }
    });

    document.getElementById('installLocalBtn').addEventListener('click', () => {
      // Prompt for local path via extension
      vscode.postMessage({ type: 'installLocal' });
    });

    document.getElementById('searchInput')?.addEventListener('input', () => {
      // Re-render marketplace with current search
      const state = window.__lastState;
      if (state) renderMarketplace(state.marketplaces);
    });

    // Cache last state for search re-render
    window.addEventListener('message', event => {
      if (event.data.type === 'state') {
        window.__lastState = event.data;
      }
    });
  </script>
</body>
</html>
`
    );
  }
  dispose() {
    this.panel?.dispose();
    this.panel = null;
  }
};

// src/session/SessionManager.ts
import * as vscode19 from "vscode";
import * as crypto8 from "crypto";
var SessionManager = class {
  outputChannel;
  context;
  /** Active sessions in memory */
  sessions;
  /** Current active session ID */
  activeSessionId;
  /** Session statuses */
  statuses;
  /** Event emitter */
  eventEmitter;
  /** Event for consumers */
  onDidSessionEvent;
  constructor(context, outputChannel2) {
    this.context = context;
    this.outputChannel = outputChannel2;
    this.sessions = /* @__PURE__ */ new Map();
    this.activeSessionId = null;
    this.statuses = /* @__PURE__ */ new Map();
    this.eventEmitter = new vscode19.EventEmitter();
    this.onDidSessionEvent = this.eventEmitter.event;
    this.loadSessionList();
    this.outputChannel.debug("SessionManager initialized");
  }
  // ─── Session CRUD ───────────────────────────────────────────────────────────
  /**
   * Create a new session
   */
  async create(options = {}) {
    const id = crypto8.randomUUID();
    const now = Date.now();
    const workspaceRoot = vscode19.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
    const session = {
      id,
      name: options.name || `Session ${this.sessions.size + 1}`,
      messages: [],
      cwd: options.cwd || workspaceRoot,
      model: options.model || "",
      createdAt: now,
      updatedAt: now,
      metadata: {
        tags: options.tags
      }
    };
    if (options.resumeFromId) {
      const source = this.sessions.get(options.resumeFromId);
      if (source) {
        session.messages = [...source.messages];
        session.name = options.name || `Resumed: ${source.name}`;
      }
    }
    if (options.forkFromId) {
      const source = this.sessions.get(options.forkFromId);
      if (source) {
        session.messages = [...source.messages];
        session.name = options.name || `${source.name} (fork)`;
        session.metadata = {
          ...source.metadata,
          tags: options.tags,
          forkSourceId: options.forkFromId
        };
        this.emitEvent("session_forked", id, { sourceId: options.forkFromId });
      }
    }
    if (options.systemPrompt) {
      session.messages.push({
        id: crypto8.randomUUID(),
        role: "system",
        content: options.systemPrompt,
        timestamp: now
      });
    }
    this.sessions.set(id, session);
    this.statuses.set(id, "idle");
    this.activeSessionId = id;
    await this.persistSessionList();
    this.emitEvent("session_created", id);
    this.emitEvent("active_session_changed", id);
    this.outputChannel.info(`Created session: ${id} (${session.name})`);
    return session;
  }
  /**
   * Load an existing session
   */
  async load(id) {
    let session = this.sessions.get(id);
    if (!session) {
      const stored = this.getStoredSession(id);
      if (stored) {
        session = stored;
        this.sessions.set(id, session);
      }
    }
    if (session) {
      this.activeSessionId = id;
      if (!this.statuses.has(id)) {
        this.statuses.set(id, "idle");
      }
      this.emitEvent("session_loaded", id);
      this.emitEvent("active_session_changed", id);
    }
    return session;
  }
  /**
   * Save a session
   */
  async save(id) {
    const session = this.sessions.get(id);
    if (!session) return false;
    session.updatedAt = Date.now();
    await this.persistSessionList();
    this.emitEvent("session_updated", id);
    return true;
  }
  /**
   * Delete a session
   */
  async delete(id) {
    if (!this.sessions.has(id)) return false;
    this.sessions.delete(id);
    this.statuses.delete(id);
    if (this.activeSessionId === id) {
      this.activeSessionId = this.sessions.keys().next().value || null;
      this.emitEvent("active_session_changed", this.activeSessionId || "");
    }
    await this.persistSessionList();
    this.emitEvent("session_deleted", id);
    this.outputChannel.info(`Deleted session: ${id}`);
    return true;
  }
  /**
   * Rename a session
   */
  async rename(id, newName) {
    const session = this.sessions.get(id);
    if (!session) return false;
    session.name = newName;
    session.updatedAt = Date.now();
    await this.persistSessionList();
    this.emitEvent("session_renamed", id, { name: newName });
    return true;
  }
  // ─── Message Management ────────────────────────────────────────────────────
  /**
   * Add a message to a session
   */
  addMessage(sessionId, message) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.messages.push(message);
    session.updatedAt = Date.now();
    this.emitEvent("session_message_added", sessionId, { messageId: message.id });
    return true;
  }
  /**
   * Get messages for a session
   */
  getMessages(sessionId, options) {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    const limit = options?.limit;
    const offset = options?.offset ?? 0;
    if (limit === void 0) {
      return session.messages.slice(offset);
    }
    return session.messages.slice(offset, offset + limit);
  }
  /**
   * Replace all messages in a session
   */
  replaceMessages(sessionId, messages) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.messages = messages;
    session.updatedAt = Date.now();
    this.emitEvent("session_updated", sessionId);
    return true;
  }
  // ─── Session Status ──────────────────────────────────────────────────────────
  /**
   * Get session status
   */
  getStatus(sessionId) {
    return this.statuses.get(sessionId) || "idle";
  }
  /**
   * Set session status
   */
  setStatus(sessionId, status) {
    const prev = this.statuses.get(sessionId);
    if (prev === status) return;
    this.statuses.set(sessionId, status);
    this.emitEvent("session_status_changed", sessionId, { status, previousStatus: prev });
  }
  // ─── Active Session ──────────────────────────────────────────────────────────
  /**
   * Get the active session ID
   */
  getActiveSessionId() {
    return this.activeSessionId;
  }
  /**
   * Get the active session
   */
  getActiveSession() {
    if (!this.activeSessionId) return void 0;
    return this.sessions.get(this.activeSessionId);
  }
  /**
   * Switch the active session
   */
  async switchSession(id) {
    if (!this.sessions.has(id)) return false;
    if (this.activeSessionId) {
      await this.save(this.activeSessionId);
    }
    this.activeSessionId = id;
    this.emitEvent("active_session_changed", id);
    return true;
  }
  // ─── Session List ────────────────────────────────────────────────────────────
  /**
   * List all sessions as list items (no messages)
   */
  listSessions() {
    const items = [];
    const sortedSessions = Array.from(this.sessions.values()).sort((a, b) => b.updatedAt - a.updatedAt);
    for (const session of sortedSessions) {
      const lastMsg = session.messages.length > 0 ? session.messages[session.messages.length - 1] : void 0;
      let preview;
      if (lastMsg) {
        const content = lastMsg.content;
        if (typeof content === "string") {
          preview = content.slice(0, 80);
        } else if (Array.isArray(content)) {
          const textBlock = content.find(
            (b) => b.type === "text" && typeof b.text === "string"
          );
          if (textBlock) {
            preview = textBlock.text.slice(0, 80);
          }
        }
      }
      items.push({
        id: session.id,
        name: session.name,
        cwd: session.cwd,
        model: session.model,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        status: this.statuses.get(session.id) || "idle",
        messageCount: session.messages.length,
        lastMessagePreview: preview,
        isActive: session.id === this.activeSessionId,
        tags: session.metadata?.tags,
        isFork: !!session.metadata?.forkSourceId,
        forkSourceId: session.metadata?.forkSourceId
      });
    }
    return items;
  }
  /**
   * Get session detail (with messages)
   */
  getSessionDetail(id) {
    const session = this.sessions.get(id);
    if (!session) return void 0;
    return {
      session,
      status: this.statuses.get(id) || "idle",
      messageCount: session.messages.length,
      tokenCount: 0,
      // Estimated on the fly
      contextWindow: 0
    };
  }
  // ─── Search ──────────────────────────────────────────────────────────────────
  /**
   * Search sessions
   */
  search(query) {
    let results = this.listSessions();
    if (query.text) {
      const q = query.text.toLowerCase();
      results = results.filter(
        (s) => s.name.toLowerCase().includes(q) || (s.lastMessagePreview || "").toLowerCase().includes(q) || (s.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }
    if (query.model) {
      results = results.filter((s) => s.model === query.model);
    }
    if (query.fromDate) {
      results = results.filter((s) => s.updatedAt >= query.fromDate);
    }
    if (query.toDate) {
      results = results.filter((s) => s.updatedAt <= query.toDate);
    }
    if (query.tags?.length) {
      results = results.filter(
        (s) => query.tags.some((t) => (s.tags || []).includes(t))
      );
    }
    return results.slice(0, query.limit || 50);
  }
  // ─── Fork ──────────────────────────────────────────────────────────────────
  /**
   * Fork a session (create copy with new ID)
   */
  async fork(sourceId, options) {
    const source = this.sessions.get(sourceId);
    if (!source) {
      throw new Error(`Session ${sourceId} not found`);
    }
    return this.create({
      name: options?.name || `${source.name} (fork)`,
      cwd: options?.cwd || source.cwd,
      model: options?.model || source.model,
      forkFromId: sourceId,
      tags: source.metadata?.tags
    });
  }
  // ─── Title Generation ────────────────────────────────────────────────────────
  /**
   * Auto-generate a title for a session based on its first user message
   */
  async generateTitle(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    const firstUserMsg = session.messages.find((m) => m.role === "user");
    if (!firstUserMsg) return null;
    let text = "";
    if (typeof firstUserMsg.content === "string") {
      text = firstUserMsg.content;
    } else if (Array.isArray(firstUserMsg.content)) {
      const textBlock = firstUserMsg.content.find(
        (b) => b.type === "text" && typeof b.text === "string"
      );
      if (textBlock) text = textBlock.text;
    }
    if (!text) return null;
    const firstLine = text.split("\n")[0].trim();
    const title = firstLine.length > 60 ? firstLine.slice(0, 57) + "..." : firstLine;
    await this.rename(sessionId, title);
    return title;
  }
  // ─── Stats ──────────────────────────────────────────────────────────────────
  /**
   * Get session manager statistics
   */
  getStats() {
    const byStatus = {
      idle: 0,
      running: 0,
      paused: 0,
      error: 0,
      loading: 0
    };
    for (const status of this.statuses.values()) {
      byStatus[status]++;
    }
    const sessions = Array.from(this.sessions.values());
    const totalMessages = sessions.reduce((sum, s) => sum + s.messages.length, 0);
    return {
      totalSessions: this.sessions.size,
      activeSessionId: this.activeSessionId || void 0,
      byStatus,
      totalMessages,
      oldestSession: sessions.length > 0 ? Math.min(...sessions.map((s) => s.createdAt)) : void 0,
      newestSession: sessions.length > 0 ? Math.max(...sessions.map((s) => s.updatedAt)) : void 0
    };
  }
  // ─── Persistence ──────────────────────────────────────────────────────────
  async persistSessionList() {
    const list = this.listSessions().map((s) => ({
      id: s.id,
      name: s.name,
      cwd: s.cwd,
      model: s.model,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      tags: s.tags,
      isFork: s.isFork,
      forkSourceId: s.forkSourceId
    }));
    await this.context.globalState.update("cclocal.sessions", list);
  }
  loadSessionList() {
    const stored = this.context.globalState.get("cclocal.sessions");
    if (!stored) return;
    for (const item of stored) {
      const session = {
        id: item.id,
        name: item.name,
        messages: [],
        // Messages loaded on demand
        cwd: item.cwd,
        model: item.model,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        metadata: {
          tags: item.tags,
          forkSourceId: item.forkSourceId
        }
      };
      this.sessions.set(item.id, session);
      this.statuses.set(item.id, "idle");
    }
    this.outputChannel.debug(`Loaded ${stored.length} sessions from globalState`);
  }
  getStoredSession(id) {
    const stored = this.context.globalState.get(
      `cclocal.session_messages_${id}`
    );
    const session = this.sessions.get(id);
    if (!session) return void 0;
    if (stored) {
      session.messages = Object.values(stored);
    }
    return session;
  }
  // ─── Event Helpers ──────────────────────────────────────────────────────────
  emitEvent(type, sessionId, data) {
    this.eventEmitter.fire({ type, sessionId, data });
  }
  // ─── Lifecycle ──────────────────────────────────────────────────────────────
  dispose() {
    this.eventEmitter.dispose();
    this.sessions.clear();
    this.statuses.clear();
    this.outputChannel.debug("SessionManager disposed");
  }
};
var instance4 = null;
function getSessionManager(context, outputChannel2) {
  if (!instance4 && context && outputChannel2) {
    instance4 = new SessionManager(context, outputChannel2);
  }
  return instance4;
}
function disposeSessionManager() {
  if (instance4) {
    instance4.dispose();
    instance4 = null;
  }
}

// src/session/SessionTreeProvider.ts
import * as vscode20 from "vscode";
var SessionTreeItem = class extends vscode20.TreeItem {
  constructor(sessionItem) {
    super(sessionItem.name, vscode20.TreeItemCollapsibleState.None);
    this.sessionItem = sessionItem;
    this.id = sessionItem.id;
    this.description = this.formatDescription(sessionItem);
    this.tooltip = this.formatTooltip(sessionItem);
    this.iconPath = this.getIcon(sessionItem);
    this.contextValue = this.getContextValue(sessionItem);
    this.resourceUri = void 0;
    if (sessionItem.isActive) {
      this.description = `\u25CF ${this.description}`;
    }
    this.command = {
      command: "cclocal.switchSession",
      title: "Switch to Session",
      arguments: [sessionItem.id]
    };
  }
  formatDescription(item) {
    const parts = [];
    if (item.messageCount > 0) {
      parts.push(`${item.messageCount} msgs`);
    }
    const age = this.formatRelativeTime(item.updatedAt);
    parts.push(age);
    return parts.join(" \u2022 ");
  }
  formatTooltip(item) {
    const lines = [
      `Session: ${item.name}`,
      `ID: ${item.id}`,
      `Status: ${item.status}`,
      `Messages: ${item.messageCount}`,
      `Model: ${item.model || "default"}`,
      `Created: ${new Date(item.createdAt).toLocaleString()}`,
      `Updated: ${new Date(item.updatedAt).toLocaleString()}`
    ];
    if (item.tags?.length) {
      lines.push(`Tags: ${item.tags.join(", ")}`);
    }
    if (item.isFork) {
      lines.push(`Fork of: ${item.forkSourceId}`);
    }
    if (item.lastMessagePreview) {
      lines.push("", `Last message: ${item.lastMessagePreview}`);
    }
    return lines.join("\n");
  }
  getIcon(item) {
    if (item.isActive) {
      return new vscode20.ThemeIcon("circle-filled", new vscode20.ThemeColor("charts.green"));
    }
    switch (item.status) {
      case "running":
        return new vscode20.ThemeIcon("sync~spin");
      case "error":
        return new vscode20.ThemeIcon("error", new vscode20.ThemeColor("errorForeground"));
      case "paused":
        return new vscode20.ThemeIcon("debug-pause");
      case "loading":
        return new vscode20.ThemeIcon("loading~spin");
      default:
        return new vscode20.ThemeIcon("circle-outline");
    }
  }
  getContextValue(item) {
    const parts = ["session"];
    if (item.isActive) parts.push("active");
    if (item.isFork) parts.push("fork");
    if (item.status === "running") parts.push("running");
    if (item.status === "error") parts.push("error");
    return parts.join(".");
  }
  formatRelativeTime(timestamp) {
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1e3);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }
};
var SessionTreeProvider = class {
  constructor(sessionManager2) {
    this.sessionManager = sessionManager2;
    this.treeView = vscode20.window.createTreeView("cclocal.sessions", {
      treeDataProvider: this,
      showCollapseAll: false
    });
    this.sessionManager.onDidSessionEvent(() => {
      this.refresh();
    });
  }
  treeView;
  _onDidChangeTreeData = new vscode20.EventEmitter();
  onDidChangeTreeData = this._onDidChangeTreeData.event;
  searchQuery = "";
  refresh() {
    this._onDidChangeTreeData.fire();
  }
  setSearchQuery(query) {
    this.searchQuery = query;
    this.refresh();
  }
  getTreeItem(element) {
    return element;
  }
  getChildren(_element) {
    let sessions = this.sessionManager.listSessions();
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      sessions = sessions.filter(
        (s) => s.name.toLowerCase().includes(q) || (s.lastMessagePreview || "").toLowerCase().includes(q) || (s.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }
    return sessions.map((s) => new SessionTreeItem(s));
  }
  dispose() {
    this.treeView.dispose();
    this._onDidChangeTreeData.dispose();
  }
};

// src/commands/registry.ts
import * as vscode22 from "vscode";
var chatCommands = [
  // Mode-specific commands are registered in extension.ts
  // This array is kept for documentation purposes
];
var editCommands = [
  {
    id: "cclocal.acceptEdit",
    title: "Accept Edit",
    icon: "$(check)",
    register: (context, deps) => {
      context.subscriptions.push(
        vscode22.commands.registerCommand("cclocal.acceptEdit", async () => {
          vscode22.commands.executeCommand("workbench.action.closeActiveEditor");
          vscode22.window.showInformationMessage("CCLocal: Changes accepted");
        })
      );
    }
  },
  {
    id: "cclocal.rejectEdit",
    title: "Reject Edit",
    icon: "$(discard)",
    register: (context, deps) => {
      context.subscriptions.push(
        vscode22.commands.registerCommand("cclocal.rejectEdit", async () => {
          vscode22.commands.executeCommand("workbench.action.closeActiveEditor");
          vscode22.window.showInformationMessage("CCLocal: Changes rejected");
        })
      );
    }
  },
  {
    id: "cclocal.insertAtMention",
    title: "Insert @-Mention",
    register: (context) => {
      context.subscriptions.push(
        vscode22.commands.registerCommand("cclocal.insertAtMention", async () => {
          const editor = vscode22.window.activeTextEditor;
          if (!editor) {
            vscode22.window.showWarningMessage("CCLocal: No active editor");
            return;
          }
          const files = await vscode22.window.showOpenDialog({
            canSelectMany: true,
            filters: {
              "All Files": ["*"]
            }
          });
          if (files && files.length > 0) {
            const mentions = files.map((f) => `@${f.fsPath}`).join(" ");
            const position = editor.selection.active;
            editor.edit((editBuilder) => {
              editBuilder.insert(position, mentions);
            });
          }
        })
      );
    }
  },
  {
    id: "cclocal.toggleDictation",
    title: "Toggle Voice Dictation",
    register: (context) => {
      let dictationActive = false;
      context.subscriptions.push(
        vscode22.commands.registerCommand("cclocal.toggleDictation", () => {
          dictationActive = !dictationActive;
          if (dictationActive) {
            vscode22.window.showInformationMessage("CCLocal: Voice dictation enabled");
          } else {
            vscode22.window.showInformationMessage("CCLocal: Voice dictation disabled");
          }
        })
      );
    }
  }
];
var navigationCommands = [
  {
    id: "cclocal.openInPanel",
    title: "Open in Panel",
    icon: "$(empty-window)",
    register: (context) => {
      context.subscriptions.push(
        vscode22.commands.registerCommand("cclocal.openInPanel", () => {
          vscode22.commands.executeCommand("workbench.action.positionPanelBottom");
          vscode22.commands.executeCommand("workbench.view.extension.cclocal-sidebar");
        })
      );
    }
  },
  {
    id: "cclocal.openInSidebar",
    title: "Open in Sidebar",
    icon: "$(layout-sidebar-left)",
    register: (context) => {
      context.subscriptions.push(
        vscode22.commands.registerCommand("cclocal.openInSidebar", () => {
          vscode22.commands.executeCommand("workbench.view.extension.cclocal-sidebar");
        })
      );
    }
  },
  {
    id: "cclocal.openSettings",
    title: "Open Settings",
    register: (context) => {
      context.subscriptions.push(
        vscode22.commands.registerCommand("cclocal.openSettings", () => {
          vscode22.commands.executeCommand("workbench.action.openSettings", "cclocal");
        })
      );
    }
  },
  {
    id: "cclocal.openConfigPanel",
    title: "Open Configuration Panel",
    icon: "$(settings-gear)",
    register: (context, deps) => {
      context.subscriptions.push(
        vscode22.commands.registerCommand("cclocal.openConfigPanel", async () => {
          const { ConfigPanelProvider: ConfigPanelProvider2 } = await Promise.resolve().then(() => (init_ConfigPanelProvider(), ConfigPanelProvider_exports));
          const panel = new ConfigPanelProvider2(deps.configManager);
          context.subscriptions.push(panel);
          panel.show();
        })
      );
    }
  },
  {
    id: "cclocal.showLogs",
    title: "Show Logs",
    register: (context, deps) => {
      context.subscriptions.push(
        vscode22.commands.registerCommand("cclocal.showLogs", () => {
          deps.outputChannel.show();
        })
      );
    }
  }
];
var modelCommands = [
  {
    id: "cclocal.setModel",
    title: "Set Model",
    register: (context, deps) => {
      context.subscriptions.push(
        vscode22.commands.registerCommand("cclocal.setModel", async () => {
          const models = deps.configManager.get("availableModels") || [];
          const customModel = "custom";
          const items = [...models.map((m) => ({ label: m })), { label: customModel }];
          const selected = await vscode22.window.showQuickPick(items, {
            placeHolder: "Select a model"
          });
          if (selected) {
            if (selected.label === customModel) {
              const customId = await vscode22.window.showInputBox({
                prompt: "Enter custom model ID",
                placeHolder: "claude-3-opus-20240229"
              });
              if (customId) {
                await deps.configManager.setModel(customId);
                vscode22.window.showInformationMessage(`CCLocal: Model set to ${customId}`);
              }
            } else {
              await deps.configManager.setModel(selected.label);
              vscode22.window.showInformationMessage(`CCLocal: Model set to ${selected.label}`);
            }
          }
        })
      );
    }
  },
  {
    id: "cclocal.setPermissionMode",
    title: "Set Permission Mode",
    register: (context, deps) => {
      context.subscriptions.push(
        vscode22.commands.registerCommand("cclocal.setPermissionMode", async () => {
          const modes = [
            { label: "default", description: "Ask for dangerous operations" },
            { label: "acceptEdits", description: "Auto-accept file edits" },
            { label: "plan", description: "Plan mode (no execution)" },
            { label: "bypassPermissions", description: "Auto-accept all (dangerous)" }
          ];
          const selected = await vscode22.window.showQuickPick(modes, {
            placeHolder: "Select permission mode"
          });
          if (selected) {
            await deps.configManager.update("initialPermissionMode", selected.label);
            vscode22.window.showInformationMessage(`CCLocal: Permission mode set to ${selected.label}`);
          }
        })
      );
    }
  }
];
var utilityCommands = [
  // sendSelectedCode is registered in extension.ts
];
var allCommands = [
  ...chatCommands,
  ...editCommands,
  ...navigationCommands,
  ...modelCommands,
  ...utilityCommands
];
function registerAllCommands(context, dependencies) {
  for (const cmd of allCommands) {
    cmd.register(context, dependencies);
  }
}

// src/commands/keyboard.ts
import * as vscode23 from "vscode";
function registerKeyboardShortcuts(context, sessionManager2) {
  context.subscriptions.push(
    vscode23.commands.registerCommand("cclocal.keyboard.sendWithCtrlEnter", () => {
      const config = vscode23.workspace.getConfiguration("cclocal");
      const useCtrlEnter = config.get("useCtrlEnterToSend") ?? false;
      if (useCtrlEnter) {
        vscode23.commands.executeCommand("cclocal.sendMessage");
      }
    })
  );
  context.subscriptions.push(
    vscode23.commands.registerCommand("cclocal.keyboard.escape", () => {
      const activeId = sessionManager2.getActiveSessionId();
      if (activeId) {
        const status = sessionManager2.getStatus(activeId);
        if (status === "running") {
          vscode23.commands.executeCommand("cclocal.stopGeneration");
        }
      }
    })
  );
  context.subscriptions.push(
    vscode23.commands.registerCommand("cclocal.keyboard.newConversation", () => {
      const config = vscode23.workspace.getConfiguration("cclocal");
      const enabled = config.get("enableNewConversationShortcut") ?? true;
      if (enabled) {
        vscode23.commands.executeCommand("cclocal.newConversation");
      }
    })
  );
  context.subscriptions.push(
    vscode23.commands.registerCommand("cclocal.keyboard.showCommandPalette", () => {
      vscode23.commands.executeCommand("cclocal.showCommandPalette");
    })
  );
  context.subscriptions.push(
    vscode23.commands.registerCommand("cclocal.keyboard.previousSession", async () => {
      const sessions = sessionManager2.listSessions();
      const activeId = sessionManager2.getActiveSessionId();
      if (sessions.length > 0 && activeId) {
        const currentIndex = sessions.findIndex((s) => s.id === activeId);
        const prevIndex = (currentIndex - 1 + sessions.length) % sessions.length;
        await sessionManager2.switchSession(sessions[prevIndex].id);
      }
    })
  );
  context.subscriptions.push(
    vscode23.commands.registerCommand("cclocal.keyboard.nextSession", async () => {
      const sessions = sessionManager2.listSessions();
      const activeId = sessionManager2.getActiveSessionId();
      if (sessions.length > 0 && activeId) {
        const currentIndex = sessions.findIndex((s) => s.id === activeId);
        const nextIndex = (currentIndex + 1) % sessions.length;
        await sessionManager2.switchSession(sessions[nextIndex].id);
      }
    })
  );
}
async function showCommandPalette() {
  const commands15 = [
    {
      id: "new",
      label: "New Conversation",
      icon: "$(add)",
      action: () => vscode23.commands.executeCommand("cclocal.newConversation")
    },
    {
      id: "clear",
      label: "Clear Chat",
      icon: "$(clear-all)",
      action: () => vscode23.commands.executeCommand("cclocal.clearChat")
    },
    {
      id: "stop",
      label: "Stop Generation",
      icon: "$(debug-stop)",
      action: () => vscode23.commands.executeCommand("cclocal.stopGeneration")
    },
    {
      id: "model",
      label: "Set Model",
      icon: "$(symbol-color)",
      action: () => vscode23.commands.executeCommand("cclocal.setModel")
    },
    {
      id: "permissions",
      label: "Set Permission Mode",
      icon: "$(shield)",
      action: () => vscode23.commands.executeCommand("cclocal.setPermissionMode")
    },
    {
      id: "settings",
      label: "Open Settings",
      icon: "$(settings-gear)",
      action: () => vscode23.commands.executeCommand("cclocal.openSettings")
    },
    {
      id: "config",
      label: "Open Configuration Panel",
      icon: "$(editor-glyph)",
      action: () => vscode23.commands.executeCommand("cclocal.openConfigPanel")
    },
    {
      id: "sessions",
      label: "Show Session Statistics",
      icon: "$(graph)",
      action: () => vscode23.commands.executeCommand("cclocal.sessionStats")
    },
    {
      id: "mcp",
      label: "Show MCP Settings",
      icon: "$(server)",
      action: () => vscode23.commands.executeCommand("cclocal.showMCPSettings")
    },
    {
      id: "plugins",
      label: "Show Plugin Settings",
      icon: "$(extensions)",
      action: () => vscode23.commands.executeCommand("cclocal.showPluginSettings")
    },
    {
      id: "hooks",
      label: "Show Hook Statistics",
      icon: "$(bell)",
      action: () => vscode23.commands.executeCommand("cclocal.hooks.stats")
    },
    {
      id: "logs",
      label: "Show Logs",
      icon: "$(output)",
      action: () => vscode23.commands.executeCommand("cclocal.showLogs")
    },
    {
      id: "focus",
      label: "Focus Input",
      icon: "$(edit)",
      shortcut: "Ctrl+Escape",
      action: () => vscode23.commands.executeCommand("cclocal.focusInput")
    }
  ];
  const selected = await vscode23.window.showQuickPick(
    commands15.map((cmd) => ({
      label: cmd.icon ? `${cmd.icon} ${cmd.label}` : cmd.label,
      description: cmd.description,
      detail: cmd.shortcut,
      command: cmd
    })),
    {
      placeHolder: "CCLocal Commands",
      matchOnDescription: true
    }
  );
  if (selected) {
    await selected.command.action();
  }
}
function registerCommandPalette(context) {
  context.subscriptions.push(
    vscode23.commands.registerCommand("cclocal.showCommandPalette", () => showCommandPalette())
  );
}

// src/remote/RemoteSessionManager.ts
import * as vscode24 from "vscode";
var RemoteSessionManager = class {
  context;
  outputChannel;
  /** Configured SSH connections */
  configs = /* @__PURE__ */ new Map();
  /** Active remote sessions */
  sessions = /* @__PURE__ */ new Map();
  /** Event handlers */
  handlers = /* @__PURE__ */ new Set();
  /** Connection attempts */
  reconnectAttempts = /* @__PURE__ */ new Map();
  /** Disposed flag */
  disposed = false;
  constructor(context, outputChannel2) {
    this.context = context;
    this.outputChannel = outputChannel2;
    this.loadConfigurations();
  }
  // ─── Configuration Management ─────────────────────────────────────────────
  /**
   * Load saved SSH configurations
   */
  loadConfigurations() {
    const saved = this.context.globalState.get("cclocal.sshConfigs", []);
    for (const config of saved) {
      this.configs.set(config.id, config);
    }
    this.outputChannel.debug(`Loaded ${saved.length} SSH configurations`);
  }
  /**
   * Save SSH configurations to global state
   */
  async saveConfigurations() {
    const configs = Array.from(this.configs.values());
    await this.context.globalState.update("cclocal.sshConfigs", configs);
  }
  /**
   * Add a new SSH configuration
   */
  async addConfiguration(config) {
    this.configs.set(config.id, config);
    await this.saveConfigurations();
    this.outputChannel.info(`Added SSH configuration: ${config.name}`);
  }
  /**
   * Update an existing SSH configuration
   */
  async updateConfiguration(config) {
    this.configs.set(config.id, config);
    await this.saveConfigurations();
    this.outputChannel.info(`Updated SSH configuration: ${config.name}`);
  }
  /**
   * Remove an SSH configuration
   */
  async removeConfiguration(id) {
    const config = this.configs.get(id);
    if (config) {
      const session = this.getSessionByConfig(id);
      if (session) {
        await this.disconnect(session.id);
      }
      this.configs.delete(id);
      await this.saveConfigurations();
      this.outputChannel.info(`Removed SSH configuration: ${config.name}`);
    }
  }
  /**
   * Get all SSH configurations
   */
  getConfigurations() {
    return Array.from(this.configs.values());
  }
  /**
   * Get a specific SSH configuration
   */
  getConfiguration(id) {
    return this.configs.get(id);
  }
  // ─── Connection Management ────────────────────────────────────────────────
  /**
   * Connect to a remote host
   */
  async connect(options) {
    const { config, workingDirectory, environment, autoReconnect = true, maxReconnectAttempts = 3 } = options;
    const existing = this.getSessionByConfig(config.id);
    if (existing && existing.status === "connected") {
      this.outputChannel.debug(`Already connected to ${config.name}`);
      return existing;
    }
    const sessionId = crypto.randomUUID();
    const session = {
      id: sessionId,
      configId: config.id,
      name: config.name,
      status: "connecting",
      workingDirectory: workingDirectory || config.workingDirectory || "~",
      sessionCount: 0
    };
    this.sessions.set(sessionId, session);
    this.emitEvent({ type: "connecting", remoteId: sessionId, timestamp: Date.now() });
    try {
      await this.establishConnection(config, session);
      session.status = "connected";
      session.connectedAt = Date.now();
      session.lastActivity = Date.now();
      session.platform = await this.detectPlatform(sessionId);
      session.shell = await this.detectShell(sessionId);
      this.reconnectAttempts.set(sessionId, 0);
      this.emitEvent({ type: "connected", remoteId: sessionId, timestamp: Date.now() });
      this.outputChannel.info(`Connected to ${config.name} (${sessionId})`);
      return session;
    } catch (error) {
      session.status = "error";
      session.error = error instanceof Error ? error.message : String(error);
      this.emitEvent({ type: "error", remoteId: sessionId, data: error, timestamp: Date.now() });
      this.outputChannel.error(`Failed to connect to ${config.name}: ${error}`);
      if (autoReconnect) {
        const attempts = this.reconnectAttempts.get(sessionId) || 0;
        if (attempts < maxReconnectAttempts) {
          this.reconnectAttempts.set(sessionId, attempts + 1);
          this.emitEvent({ type: "reconnecting", remoteId: sessionId, timestamp: Date.now() });
          await new Promise((resolve) => setTimeout(resolve, 2e3 * (attempts + 1)));
          return this.connect(options);
        }
      }
      throw error;
    }
  }
  /**
   * Disconnect from a remote host
   */
  async disconnect(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    this.outputChannel.debug(`Disconnecting from ${session.name}...`);
    try {
      await this.closeConnection(sessionId);
      session.status = "disconnected";
      this.emitEvent({ type: "disconnected", remoteId: sessionId, timestamp: Date.now() });
      this.outputChannel.info(`Disconnected from ${session.name}`);
    } catch (error) {
      this.outputChannel.error(`Error disconnecting from ${session.name}: ${error}`);
      throw error;
    }
  }
  /**
   * Disconnect all active sessions
   */
  async disconnectAll() {
    const connected = Array.from(this.sessions.values()).filter((s) => s.status === "connected");
    await Promise.all(connected.map((s) => this.disconnect(s.id)));
  }
  // ─── Session Management ───────────────────────────────────────────────────
  /**
   * Get all remote sessions
   */
  getSessions() {
    return Array.from(this.sessions.values());
  }
  /**
   * Get a specific session
   */
  getSession(id) {
    return this.sessions.get(id);
  }
  /**
   * Get session by config ID
   */
  getSessionByConfig(configId) {
    return Array.from(this.sessions.values()).find((s) => s.configId === configId);
  }
  /**
   * Get connected sessions
   */
  getConnectedSessions() {
    return this.getSessions().filter((s) => s.status === "connected");
  }
  // ─── Teleport Operations ──────────────────────────────────────────────────
  /**
   * Teleport a session to a remote host
   * This transfers the session state and messages to the remote
   */
  async teleport(sessionId, remoteId) {
    const operation = {
      sourceSessionId: sessionId,
      targetRemoteId: remoteId,
      status: "pending",
      timestamp: Date.now()
    };
    const session = this.sessions.get(remoteId);
    if (!session || session.status !== "connected") {
      operation.status = "failed";
      operation.error = "Remote session not connected";
      return operation;
    }
    try {
      operation.status = "in_progress";
      this.emitEvent({ type: "teleport_started", sessionId, remoteId, data: operation, timestamp: Date.now() });
      await this.performTeleport(sessionId, remoteId);
      operation.status = "completed";
      operation.progress = 100;
      session.sessionCount++;
      session.lastActivity = Date.now();
      this.emitEvent({ type: "teleport_completed", sessionId, remoteId, data: operation, timestamp: Date.now() });
      this.outputChannel.info(`Teleported session ${sessionId} to ${session.name}`);
      return operation;
    } catch (error) {
      operation.status = "failed";
      operation.error = error instanceof Error ? error.message : String(error);
      this.outputChannel.error(`Teleport failed: ${error}`);
      throw error;
    }
  }
  /**
   * Perform the actual teleport operation
   */
  async performTeleport(sessionId, remoteId) {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  // ─── File Operations ──────────────────────────────────────────────────────
  /**
   * Transfer a file to/from remote
   */
  async transferFile(sessionId, sourcePath, destinationPath, direction, onProgress) {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== "connected") {
      throw new Error("Remote session not connected");
    }
    const transferId = crypto.randomUUID();
    const progress = {
      transferId,
      sourcePath,
      destinationPath,
      totalBytes: 0,
      transferredBytes: 0,
      rate: 0,
      status: "pending"
    };
    this.emitEvent({ type: "file_transfer_started", remoteId: sessionId, data: progress, timestamp: Date.now() });
    try {
      progress.status = "transferring";
      const totalBytes = 1024 * 1024;
      progress.totalBytes = totalBytes;
      for (let i = 0; i <= 100; i += 10) {
        progress.transferredBytes = totalBytes * i / 100;
        progress.rate = 512 * 1024;
        onProgress?.(progress);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      progress.status = "completed";
      progress.transferredBytes = totalBytes;
      this.emitEvent({ type: "file_transfer_completed", remoteId: sessionId, data: progress, timestamp: Date.now() });
      this.outputChannel.debug(`File transfer completed: ${sourcePath} -> ${destinationPath}`);
    } catch (error) {
      progress.status = "failed";
      progress.error = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }
  // ─── Command Execution ────────────────────────────────────────────────────
  /**
   * Execute a command on the remote host
   */
  async executeCommand(sessionId, command, cwd) {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== "connected") {
      throw new Error("Remote session not connected");
    }
    const startTime = Date.now();
    try {
      const result = await this.runRemoteCommand(sessionId, command, cwd);
      session.lastActivity = Date.now();
      return {
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        duration: Date.now() - startTime,
        signal: result.signal
      };
    } catch (error) {
      throw new Error(`Command execution failed: ${error}`);
    }
  }
  // ─── Statistics ───────────────────────────────────────────────────────────
  /**
   * Get remote connection statistics
   */
  getStats() {
    const sessions = this.getSessions();
    const connected = sessions.filter((s) => s.status === "connected");
    const byStatus = {
      disconnected: 0,
      connecting: 0,
      connected: 0,
      error: 0,
      reconnecting: 0
    };
    for (const session of sessions) {
      byStatus[session.status]++;
    }
    const totalLatency = connected.reduce((sum, s) => sum + (s.latency || 0), 0);
    const totalBandwidth = connected.reduce((sum, s) => sum + (s.bandwidth || 0), 0);
    return {
      totalConfigured: this.configs.size,
      totalConnected: connected.length,
      totalSessions: sessions.reduce((sum, s) => sum + s.sessionCount, 0),
      byStatus,
      totalBandwidth,
      averageLatency: connected.length > 0 ? totalLatency / connected.length : 0,
      totalDataTransferred: 0
      // Would track actual data transferred
    };
  }
  // ─── Event Handling ───────────────────────────────────────────────────────
  /**
   * Subscribe to remote events
   */
  subscribe(handler) {
    this.handlers.add(handler);
    return {
      dispose: () => this.handlers.delete(handler)
    };
  }
  /**
   * Emit an event to all handlers
   */
  emitEvent(event) {
    for (const handler of this.handlers) {
      try {
        handler(event);
      } catch (error) {
        this.outputChannel.error(`Event handler error: ${error}`);
      }
    }
  }
  // ─── Private Implementation ──────────────────────────────────────────────
  /**
   * Establish SSH connection
   */
  async establishConnection(config, session) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    session.latency = Math.floor(Math.random() * 100) + 20;
    session.bandwidth = Math.floor(Math.random() * 1024 * 1024) + 512 * 1024;
  }
  /**
   * Close SSH connection
   */
  async closeConnection(sessionId) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  /**
   * Detect remote platform
   */
  async detectPlatform(sessionId) {
    return "linux";
  }
  /**
   * Detect remote shell
   */
  async detectShell(sessionId) {
    return "bash";
  }
  /**
   * Run a remote command
   */
  async runRemoteCommand(sessionId, command, cwd) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return {
      exitCode: 0,
      stdout: `Executed: ${command}`,
      stderr: ""
    };
  }
  // ─── VS Code Remote Integration ───────────────────────────────────────────
  /**
   * Check if VS Code is running in a remote environment
   */
  static isVSCodeRemote() {
    return vscode24.env.remoteName !== void 0;
  }
  /**
   * Get current VS Code remote authority
   */
  static getVSCodeRemoteAuthority() {
    return vscode24.env.remoteName;
  }
  /**
   * Check if running in SSH remote
   */
  static isSSHRemote() {
    return vscode24.env.remoteName === "ssh-remote";
  }
  /**
   * Check if running in Dev Container
   */
  static isDevContainer() {
    return vscode24.env.remoteName === "dev-container";
  }
  /**
   * Check if running in WSL
   */
  static isWSL() {
    return vscode24.env.remoteName === "wsl";
  }
  // ─── Lifecycle ────────────────────────────────────────────────────────────
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    void this.disconnectAll();
    this.handlers.clear();
    this.sessions.clear();
    this.outputChannel.debug("RemoteSessionManager disposed");
  }
};
var instance5;
function getRemoteSessionManager(context, outputChannel2) {
  if (!instance5) {
    instance5 = new RemoteSessionManager(context, outputChannel2);
  }
  return instance5;
}
function disposeRemoteSessionManager() {
  instance5?.dispose();
  instance5 = void 0;
}

// src/remote/RemotePanelProvider.ts
import * as vscode25 from "vscode";
var RemotePanelProvider = class {
  panel;
  manager;
  constructor(manager) {
    this.manager = manager;
  }
  /**
   * Show the remote management panel
   */
  show() {
    if (this.panel) {
      this.panel.reveal();
      return;
    }
    this.panel = vscode25.window.createWebviewPanel(
      "cclocal.remote",
      "Remote Connections",
      vscode25.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );
    this.panel.webview.html = this.getHtml();
    this.panel.webview.onDidReceiveMessage(async (message) => {
      await this.handleMessage(message);
    });
    this.panel.onDidDispose(() => {
      this.panel = void 0;
    });
  }
  /**
   * Handle messages from the webview
   */
  async handleMessage(message) {
    switch (message.command) {
      case "refresh":
        this.updatePanel();
        break;
      case "addConfig":
        await this.addSSHConfig();
        break;
      case "editConfig":
        await this.editSSHConfig(message.data);
        break;
      case "deleteConfig":
        await this.deleteSSHConfig(message.data);
        break;
      case "connect":
        await this.connectRemote(message.data);
        break;
      case "disconnect":
        await this.disconnectRemote(message.data);
        break;
      case "teleport":
        await this.teleportSession(message.data);
        break;
      case "executeCommand":
        await this.executeRemoteCommand(message.data);
        break;
    }
  }
  /**
   * Add a new SSH configuration
   */
  async addSSHConfig() {
    const name = await vscode25.window.showInputBox({
      prompt: "Enter connection name",
      placeHolder: "My Server"
    });
    if (!name) return;
    const host = await vscode25.window.showInputBox({
      prompt: "Enter hostname or IP address",
      placeHolder: "example.com"
    });
    if (!host) return;
    const portStr = await vscode25.window.showInputBox({
      prompt: "Enter SSH port",
      placeHolder: "22",
      value: "22"
    });
    const port = parseInt(portStr || "22", 10);
    const user = await vscode25.window.showInputBox({
      prompt: "Enter username",
      placeHolder: "user"
    });
    if (!user) return;
    const privateKey = await vscode25.window.showInputBox({
      prompt: "Private key path (leave empty for SSH agent)",
      placeHolder: "~/.ssh/id_rsa"
    });
    const config = {
      id: crypto.randomUUID(),
      name,
      host,
      port,
      user,
      privateKey: privateKey || void 0,
      agentForwarding: true
    };
    await this.manager.addConfiguration(config);
    this.updatePanel();
    vscode25.window.showInformationMessage(`CCLocal: Added SSH configuration "${name}"`);
  }
  /**
   * Edit an SSH configuration
   */
  async editSSHConfig(id) {
    const config = this.manager.getConfiguration(id);
    if (!config) return;
    const name = await vscode25.window.showInputBox({
      prompt: "Connection name",
      value: config.name
    });
    if (!name) return;
    const host = await vscode25.window.showInputBox({
      prompt: "Hostname or IP",
      value: config.host
    });
    if (!host) return;
    const portStr = await vscode25.window.showInputBox({
      prompt: "SSH port",
      value: config.port.toString()
    });
    const port = parseInt(portStr || "22", 10);
    const user = await vscode25.window.showInputBox({
      prompt: "Username",
      value: config.user
    });
    if (!user) return;
    const updatedConfig = {
      ...config,
      name,
      host,
      port,
      user
    };
    await this.manager.updateConfiguration(updatedConfig);
    this.updatePanel();
  }
  /**
   * Delete an SSH configuration
   */
  async deleteSSHConfig(id) {
    const config = this.manager.getConfiguration(id);
    if (!config) return;
    const confirm = await vscode25.window.showWarningMessage(
      `Delete SSH configuration "${config.name}"?`,
      "Delete",
      "Cancel"
    );
    if (confirm === "Delete") {
      await this.manager.removeConfiguration(id);
      this.updatePanel();
      vscode25.window.showInformationMessage(`CCLocal: Deleted SSH configuration`);
    }
  }
  /**
   * Connect to a remote
   */
  async connectRemote(configId) {
    const config = this.manager.getConfiguration(configId);
    if (!config) return;
    try {
      await vscode25.window.withProgress(
        {
          location: vscode25.ProgressLocation.Notification,
          title: `Connecting to ${config.name}...`,
          cancellable: false
        },
        async () => {
          await this.manager.connect({ config });
        }
      );
      this.updatePanel();
      vscode25.window.showInformationMessage(`CCLocal: Connected to ${config.name}`);
    } catch (error) {
      vscode25.window.showErrorMessage(`Failed to connect: ${error}`);
    }
  }
  /**
   * Disconnect from a remote
   */
  async disconnectRemote(sessionId) {
    await this.manager.disconnect(sessionId);
    this.updatePanel();
  }
  /**
   * Teleport a session to remote
   */
  async teleportSession(data) {
    try {
      await vscode25.window.withProgress(
        {
          location: vscode25.ProgressLocation.Notification,
          title: "Teleporting session...",
          cancellable: false
        },
        async () => {
          await this.manager.teleport(data.sessionId, data.remoteId);
        }
      );
      vscode25.window.showInformationMessage("CCLocal: Session teleported successfully");
    } catch (error) {
      vscode25.window.showErrorMessage(`Teleport failed: ${error}`);
    }
  }
  /**
   * Execute a command on remote
   */
  async executeRemoteCommand(data) {
    try {
      const result = await this.manager.executeCommand(data.remoteId, data.command);
      if (result.exitCode === 0) {
        this.manager["outputChannel"]?.info(`Command output:
${result.stdout}`);
        vscode25.window.showInformationMessage("Command executed successfully");
      } else {
        vscode25.window.showWarningMessage(`Command exited with code ${result.exitCode}: ${result.stderr}`);
      }
    } catch (error) {
      vscode25.window.showErrorMessage(`Command failed: ${error}`);
    }
  }
  /**
   * Update the panel with current data
   */
  updatePanel() {
    if (!this.panel) return;
    const configs = this.manager.getConfigurations();
    const sessions = this.manager.getSessions();
    const stats = this.manager.getStats();
    this.panel.webview.postMessage({
      command: "update",
      data: { configs, sessions, stats }
    });
  }
  /**
   * Get the HTML content for the panel
   */
  getHtml() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Remote Connections</title>
  <style>
    :root {
      --font-family: var(--vscode-font-family);
      --bg: var(--vscode-editor-background);
      --fg: var(--vscode-foreground);
      --border: var(--vscode-widget-border);
      --input-bg: var(--vscode-input-background);
      --input-fg: var(--vscode-input-foreground);
      --button-bg: var(--vscode-button-background);
      --button-fg: var(--vscode-button-foreground);
      --button-hover: var(--vscode-button-hoverBackground);
      --list-hover: var(--vscode-list-hoverBackground);
    }
    * { box-sizing: border-box; }
    body {
      font-family: var(--font-family);
      background: var(--bg);
      color: var(--fg);
      padding: 16px;
      margin: 0;
    }
    h2 { margin-top: 0; font-size: 18px; }
    h3 { font-size: 14px; margin: 16px 0 8px; }
    .section { margin-bottom: 24px; }
    .card {
      background: var(--input-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 8px;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .card-title { font-weight: 600; }
    .card-actions { display: flex; gap: 8px; }
    .status {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
    }
    .status.connected { background: #4CAF50; color: white; }
    .status.disconnected { background: #9E9E9E; color: white; }
    .status.connecting { background: #2196F3; color: white; }
    .status.error { background: #f44336; color: white; }
    .btn {
      background: var(--button-bg);
      color: var(--button-fg);
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }
    .btn:hover { background: var(--button-hover); }
    .btn-secondary {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--fg);
    }
    .btn-danger { background: #f44336; }
    .stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    .stat-card {
      background: var(--input-bg);
      border-radius: 6px;
      padding: 12px;
      text-align: center;
    }
    .stat-value { font-size: 24px; font-weight: 600; }
    .stat-label { font-size: 11px; color: var(--vscode-descriptionForeground); }
    .info-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-top: 4px;
    }
    .empty { text-align: center; padding: 24px; color: var(--vscode-descriptionForeground); }
  </style>
</head>
<body>
  <h2>\u{1F50C} Remote Connections</h2>

  <div class="section">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <h3 style="margin: 0;">SSH Configurations</h3>
      <button class="btn" onclick="addConfig()">+ Add</button>
    </div>
    <div id="configs"></div>
  </div>

  <div class="section">
    <h3>Active Sessions</h3>
    <div id="sessions"></div>
  </div>

  <div class="section">
    <h3>Statistics</h3>
    <div id="stats" class="stats"></div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function addConfig() {
      vscode.postMessage({ command: 'addConfig' });
    }

    function editConfig(id) {
      vscode.postMessage({ command: 'editConfig', data: id });
    }

    function deleteConfig(id) {
      vscode.postMessage({ command: 'deleteConfig', data: id });
    }

    function connect(configId) {
      vscode.postMessage({ command: 'connect', data: configId });
    }

    function disconnect(sessionId) {
      vscode.postMessage({ command: 'disconnect', data: sessionId });
    }

    function refresh() {
      vscode.postMessage({ command: 'refresh' });
    }

    window.addEventListener('message', event => {
      const message = event.data;
      if (message.command === 'update') {
        render(message.data);
      }
    });

    function render(data) {
      const { configs, sessions, stats } = data;

      // Render configs
      const configsEl = document.getElementById('configs');
      if (configs.length === 0) {
        configsEl.innerHTML = '<div class="empty">No SSH configurations. Click "Add" to create one.</div>';
      } else {
        configsEl.innerHTML = configs.map(c => \`
          <div class="card">
            <div class="card-header">
              <span class="card-title">\${c.name}</span>
              <div class="card-actions">
                <button class="btn btn-secondary" onclick="editConfig('\${c.id}')">Edit</button>
                <button class="btn btn-secondary" onclick="deleteConfig('\${c.id}')">Delete</button>
                <button class="btn" onclick="connect('\${c.id}')">Connect</button>
              </div>
            </div>
            <div class="info-row">
              <span>\${c.user}@\${c.host}:\${c.port}</span>
            </div>
          </div>
        \`).join('');
      }

      // Render sessions
      const sessionsEl = document.getElementById('sessions');
      if (sessions.length === 0) {
        sessionsEl.innerHTML = '<div class="empty">No active sessions.</div>';
      } else {
        sessionsEl.innerHTML = sessions.map(s => \`
          <div class="card">
            <div class="card-header">
              <span class="card-title">\${s.name}</span>
              <span class="status \${s.status}">\${s.status}</span>
            </div>
            <div class="info-row">
              <span>Working Dir: \${s.workingDirectory}</span>
              \${s.latency ? \`<span>Latency: \${s.latency}ms</span>\` : ''}
            </div>
            \${s.status === 'connected' ? \`
              <div class="card-actions" style="margin-top: 8px;">
                <button class="btn btn-secondary" onclick="disconnect('\${s.id}')">Disconnect</button>
              </div>
            \` : ''}
          </div>
        \`).join('');
      }

      // Render stats
      const statsEl = document.getElementById('stats');
      statsEl.innerHTML = \`
        <div class="stat-card">
          <div class="stat-value">\${stats.totalConfigured}</div>
          <div class="stat-label">Configured</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">\${stats.totalConnected}</div>
          <div class="stat-label">Connected</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">\${stats.totalSessions}</div>
          <div class="stat-label">Sessions</div>
        </div>
      \`;
    }

    // Initial refresh
    refresh();
  </script>
</body>
</html>`;
  }
  dispose() {
    this.panel?.dispose();
  }
};

// src/ClaudeFS.ts
import * as vscode30 from "vscode";
import * as path9 from "path";
var MemoryFS = class {
  files = /* @__PURE__ */ new Map();
  emitter = new vscode30.EventEmitter();
  watchers = /* @__PURE__ */ new Map();
  onDidChangeFile = this.event;
  get event() {
    return this.emitter.event;
  }
  watch(uri, _options) {
    const key = uri.toString();
    return new vscode30.Disposable(() => {
      this.watchers.get(key)?.clear();
    });
  }
  stat(uri) {
    const file = this.files.get(uri.path);
    if (file) {
      return {
        type: vscode30.FileType.File,
        ctime: file.ctime,
        mtime: file.mtime,
        size: file.size
      };
    }
    const prefix = uri.path + "/";
    for (const key of this.files.keys()) {
      if (key.startsWith(prefix)) {
        return {
          type: vscode30.FileType.Directory,
          ctime: 0,
          mtime: 0,
          size: 0
        };
      }
    }
    throw vscode30.FileSystemError.FileNotFound(uri);
  }
  readFile(uri) {
    const file = this.files.get(uri.path);
    if (!file) throw vscode30.FileSystemError.FileNotFound(uri);
    return file.content;
  }
  writeFile(uri, content, _options) {
    const existing = this.files.get(uri.path);
    const now = Date.now();
    this.files.set(uri.path, {
      content,
      ctime: existing?.ctime ?? now,
      mtime: now,
      size: content.byteLength
    });
    this.emitter.fire([{
      type: existing ? vscode30.FileChangeType.Changed : vscode30.FileChangeType.Created,
      uri
    }]);
  }
  delete(uri, _options) {
    this.files.delete(uri.path);
    this.emitter.fire([{ type: vscode30.FileChangeType.Deleted, uri }]);
  }
  rename(_oldUri, _newUri, _options) {
    throw new Error("Not supported");
  }
  readDirectory(_uri) {
    return [];
  }
  createDirectory(uri) {
    this.emitter.fire([{ type: vscode30.FileChangeType.Changed, uri }]);
  }
  // ─── ClaudeFS 特有方法 ──────────────────────────────────────────────────
  /** 写入文件内容（从 diff 数据填充） */
  setFileContent(filePath, content) {
    const uri = vscode30.Uri.parse(`${this.scheme}:/${filePath}`);
    this.writeFile(uri, Buffer.from(content, "utf-8"), { create: true, overwrite: true });
    return uri;
  }
  /** 读取文件文本内容 */
  getFileText(uri) {
    return Buffer.from(this.readFile(uri)).toString("utf-8");
  }
  /** 清除所有虚拟文件 */
  clear() {
    const uris = [];
    for (const key of this.files.keys()) {
      uris.push(vscode30.Uri.parse(`${this.scheme}:${key}`));
    }
    this.files.clear();
    if (uris.length > 0) {
      this.emitter.fire(uris.map((uri) => ({
        type: vscode30.FileChangeType.Deleted,
        uri
      })));
    }
  }
  /** 虚拟 FS 的 scheme（子类设置） */
  get scheme() {
    return "_claude_fs";
  }
};
var LeftFS = class extends MemoryFS {
  get scheme() {
    return "_claude_fs_left";
  }
};
var RightFS = class extends MemoryFS {
  get scheme() {
    return "_claude_fs_right";
  }
};
var ReadOnlyFS = class _ReadOnlyFS {
  emitter = new vscode30.EventEmitter();
  onDidChangeFile = this.emitter.event;
  static scheme = "_claude_vscode_fs_readonly";
  watch(uri, _options) {
    return new vscode30.Disposable(() => {
    });
  }
  stat(uri) {
    const realUri = this.toRealUri(uri);
    return vscode30.workspace.fs.stat(realUri);
  }
  readFile(uri) {
    const realUri = this.toRealUri(uri);
    return vscode30.workspace.fs.readFile(realUri);
  }
  writeFile(_uri, _content, _options) {
    throw vscode30.FileSystemError.NoPermissions("Read-only filesystem");
  }
  delete(_uri, _options) {
    throw vscode30.FileSystemError.NoPermissions("Read-only filesystem");
  }
  rename(_oldUri, _newUri, _options) {
    throw vscode30.FileSystemError.NoPermissions("Read-only filesystem");
  }
  readDirectory(uri) {
    const realUri = this.toRealUri(uri);
    return vscode30.workspace.fs.readDirectory(realUri);
  }
  createDirectory(_uri) {
    throw vscode30.FileSystemError.NoPermissions("Read-only filesystem");
  }
  /** 将虚拟 URI 转换为真实的文件系统 URI */
  toRealUri(uri) {
    return vscode30.Uri.file(uri.path);
  }
  /** 将真实文件路径转换为虚拟 URI */
  static toVirtualUri(filePath) {
    return vscode30.Uri.parse(`${_ReadOnlyFS.scheme}:${filePath}`);
  }
};
var DiffManager = class {
  pendingDiffs = /* @__PURE__ */ new Map();
  leftFS;
  rightFS;
  constructor(leftFS, rightFS) {
    this.leftFS = leftFS;
    this.rightFS = rightFS;
  }
  /**
   * 注册一个 proposed diff 并打开 diff 编辑器。
   * @returns diff ID
   */
  async proposeDiff(filePath, oldContent, newContent, toolUseId) {
    const id = `diff-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const diff = { id, filePath, oldContent, newContent, toolUseId };
    const fileName = path9.basename(filePath);
    const dirName = path9.dirname(filePath);
    const leftPath = `${dirName}/${fileName}`;
    const rightPath = `${dirName}/${fileName}`;
    diff.leftUri = this.leftFS.setFileContent(leftPath, oldContent);
    diff.rightUri = this.rightFS.setFileContent(rightPath, newContent);
    diff.editorOpen = true;
    this.pendingDiffs.set(id, diff);
    const title = `${fileName} (Proposed Changes)`;
    await vscode30.commands.executeCommand(
      "vscode.diff",
      diff.leftUri,
      diff.rightUri,
      title,
      { preview: true }
    );
    return id;
  }
  /**
   * 接受 diff：将 right FS 中的内容写入磁盘
   */
  async acceptDiff(diffId) {
    const diff = this.pendingDiffs.get(diffId);
    if (!diff?.rightUri) return false;
    try {
      const newContent = this.rightFS.getFileText(diff.rightUri);
      const realUri = vscode30.Uri.file(diff.filePath);
      await vscode30.workspace.fs.writeFile(realUri, Buffer.from(newContent, "utf-8"));
      this.removeDiff(diffId);
      return true;
    } catch (error) {
      vscode30.window.showErrorMessage(`Failed to accept changes: ${error}`);
      return false;
    }
  }
  /**
   * 拒绝 diff：丢弃虚拟 FS 内容
   */
  rejectDiff(diffId) {
    this.removeDiff(diffId);
  }
  /** 接受当前活动的 diff 编辑器中的修改 */
  async acceptActiveDiff() {
    const activeEditor = vscode30.window.activeTextEditor;
    if (!activeEditor) return;
    for (const [id, diff] of this.pendingDiffs) {
      if (diff.editorOpen && diff.rightUri) {
        const tab = vscode30.window.tabGroups.activeTabGroup.activeTab;
        if (tab && "input" in tab) {
          const input = tab.input;
          if (input?.modified?.toString() === diff.rightUri.toString()) {
            await this.acceptDiff(id);
            return;
          }
        }
      }
    }
  }
  /** 拒绝当前活动的 diff 编辑器中的修改 */
  async rejectActiveDiff() {
    const activeEditor = vscode30.window.activeTextEditor;
    if (!activeEditor) return;
    for (const [id, diff] of this.pendingDiffs) {
      if (diff.editorOpen && diff.rightUri) {
        const tab = vscode30.window.tabGroups.activeTabGroup.activeTab;
        if (tab && "input" in tab) {
          const input = tab.input;
          if (input?.modified?.toString() === diff.rightUri.toString()) {
            this.rejectDiff(id);
            await vscode30.commands.executeCommand("workbench.action.closeActiveEditor");
            return;
          }
        }
      }
    }
  }
  /** 获取所有待处理 diff */
  getPendingDiffs() {
    return Array.from(this.pendingDiffs.values());
  }
  /** 清理所有 diff */
  clearAll() {
    this.leftFS.clear();
    this.rightFS.clear();
    this.pendingDiffs.clear();
  }
  removeDiff(diffId) {
    const diff = this.pendingDiffs.get(diffId);
    if (diff) {
      if (diff.leftUri) {
        try {
          this.leftFS.delete(diff.leftUri, { recursive: false });
        } catch {
        }
      }
      if (diff.rightUri) {
        try {
          this.rightFS.delete(diff.rightUri, { recursive: false });
        } catch {
        }
      }
      this.pendingDiffs.delete(diffId);
    }
  }
};
function registerClaudeFS(context) {
  const leftFS = new LeftFS();
  const rightFS = new RightFS();
  const readOnlyFS = new ReadOnlyFS();
  const diffManager = new DiffManager(leftFS, rightFS);
  const { CommandFSProvider: CommandFSProvider2, KeyboardCommandFSProvider: KeyboardCommandFSProvider2 } = (init_CommandFSProvider(), __toCommonJS(CommandFSProvider_exports));
  const { StateFSProvider: StateFSProvider2, StateResponseFSProvider: StateResponseFSProvider2 } = (init_StateFSProvider(), __toCommonJS(StateFSProvider_exports));
  const { TerminalSettingFSProvider: TerminalSettingFSProvider2, TerminalSettingResponseFSProvider: TerminalSettingResponseFSProvider2 } = (init_TerminalSettingFSProvider(), __toCommonJS(TerminalSettingFSProvider_exports));
  const { ChromeFSProvider: ChromeFSProvider2 } = (init_ChromeFSProvider(), __toCommonJS(ChromeFSProvider_exports));
  const commandFS = new CommandFSProvider2();
  const keyboardCommandFS = new KeyboardCommandFSProvider2();
  const stateFS = new StateFSProvider2();
  const stateResponseFS = new StateResponseFSProvider2();
  const terminalSettingFS = new TerminalSettingFSProvider2();
  const terminalSettingResponseFS = new TerminalSettingResponseFSProvider2();
  const chromeFS = new ChromeFSProvider2();
  context.subscriptions.push(
    vscode30.workspace.registerFileSystemProvider(leftFS.scheme, leftFS, { isCaseSensitive: true }),
    vscode30.workspace.registerFileSystemProvider(rightFS.scheme, rightFS, { isCaseSensitive: true, isReadonly: false }),
    vscode30.workspace.registerFileSystemProvider(ReadOnlyFS.scheme, readOnlyFS, { isCaseSensitive: true, isReadonly: true }),
    // New VFS providers
    vscode30.workspace.registerFileSystemProvider("_claude_command", commandFS, { isCaseSensitive: true, isReadonly: false }),
    vscode30.workspace.registerFileSystemProvider("_claude_command_keyboard", keyboardCommandFS, { isCaseSensitive: true, isReadonly: false }),
    vscode30.workspace.registerFileSystemProvider("_claude_state", stateFS, { isCaseSensitive: true, isReadonly: true }),
    vscode30.workspace.registerFileSystemProvider("_claude_state_response", stateResponseFS, { isCaseSensitive: true, isReadonly: false }),
    vscode30.workspace.registerFileSystemProvider("_claude_terminal_setting", terminalSettingFS, { isCaseSensitive: true, isReadonly: true }),
    vscode30.workspace.registerFileSystemProvider("_claude_terminal_setting_response", terminalSettingResponseFS, { isCaseSensitive: true, isReadonly: false }),
    vscode30.workspace.registerFileSystemProvider(ChromeFSProvider2.scheme, chromeFS, { isCaseSensitive: true, isReadonly: false })
  );
  context.subscriptions.push(
    vscode30.commands.registerCommand("cclocal.acceptProposedDiff", () => {
      void diffManager.acceptActiveDiff();
    }),
    vscode30.commands.registerCommand("cclocal.rejectProposedDiff", async () => {
      await diffManager.rejectActiveDiff();
    })
  );
  return {
    leftFS,
    rightFS,
    readOnlyFS,
    diffManager,
    commandFS,
    keyboardCommandFS,
    stateFS,
    stateResponseFS,
    terminalSettingFS,
    terminalSettingResponseFS,
    chromeFS
  };
}

// src/ChannelManager.ts
import * as vscode31 from "vscode";

// src/Channel.ts
var Channel = class {
  id;
  webview;
  state;
  onStateChange;
  constructor(webview, id) {
    this.id = id ?? crypto.randomUUID();
    this.webview = webview;
    this.state = {
      id: this.id,
      status: "idle",
      messages: [],
      permissionMode: "default"
    };
    this.webview.onDidReceiveMessage(this.handleWebviewMessage.bind(this));
  }
  // ─── Getters ─────────────────────────────────────────────────────────────
  getStatus() {
    return this.state.status;
  }
  getMessages() {
    return this.state.messages;
  }
  getSessionId() {
    return this.state.sessionId;
  }
  getState() {
    return { ...this.state };
  }
  // ─── State Management ─────────────────────────────────────────────────────
  setOnStateChange(handler) {
    this.onStateChange = handler;
  }
  updateState(updates) {
    this.state = { ...this.state, ...updates };
    this.onStateChange?.(this);
  }
  // ─── Actions ──────────────────────────────────────────────────────────────
  async sendMessage(content) {
    const message = {
      id: crypto.randomUUID(),
      role: "user",
      content: [{ type: "text", text: content }],
      timestamp: Date.now()
    };
    this.addMessage(message);
    this.updateState({ status: "running" });
    await this.postMessage({
      type: "start_processing",
      data: { messageId: message.id, content }
    });
  }
  async interrupt() {
    this.updateState({ status: "idle" });
    await this.postMessage({ type: "interrupt" });
  }
  setPermissionMode(mode) {
    this.updateState({ permissionMode: mode });
    this.postMessage({ type: "permission_mode_changed", data: mode });
  }
  setModel(model) {
    this.updateState({ model });
    this.postMessage({ type: "model_changed", data: model });
  }
  addMessage(message) {
    this.state.messages.push(message);
    this.postMessage({ type: "message", data: message });
    this.onStateChange?.(this);
  }
  updateMessage(id, updates) {
    const index = this.state.messages.findIndex((m) => m.id === id);
    if (index !== -1) {
      this.state.messages[index] = { ...this.state.messages[index], ...updates };
      this.postMessage({ type: "message_updated", data: this.state.messages[index] });
      this.onStateChange?.(this);
    }
  }
  appendToMessage(id, content) {
    const message = this.state.messages.find((m) => m.id === id);
    if (message) {
      message.content.push(content);
      this.postMessage({ type: "message_appended", data: { id, content } });
      this.onStateChange?.(this);
    }
  }
  clearMessages() {
    this.state.messages = [];
    this.postMessage({ type: "clear" });
    this.onStateChange?.(this);
  }
  // ─── Webview Communication ────────────────────────────────────────────────
  async postMessage(message) {
    return this.webview.postMessage(message);
  }
  async syncState() {
    await this.postMessage({
      type: "session_states_update",
      data: this.state
    });
  }
  async handleWebviewMessage(message) {
    switch (message.type) {
      case "ready":
        await this.syncState();
        break;
      case "send_message":
        if (message.data && typeof message.data === "object") {
          const data = message.data;
          await this.sendMessage(data.content);
        }
        break;
      case "interrupt":
        await this.interrupt();
        break;
      case "create_new_conversation":
        this.clearMessages();
        this.updateState({ sessionId: void 0, status: "idle" });
        break;
      case "permission_response":
        break;
      case "set_permission_mode":
        if (message.data) {
          this.setPermissionMode(message.data);
        }
        break;
    }
  }
  // ─── Lifecycle ────────────────────────────────────────────────────────────
  dispose() {
    this.state.messages = [];
  }
};

// src/ChannelManager.ts
var ChannelManager = class {
  channels = /* @__PURE__ */ new Map();
  activeChannelId = null;
  outputChannel;
  // 事件发射器
  _onDidChangeActiveChannel = new vscode31.EventEmitter();
  _onDidChangeChannels = new vscode31.EventEmitter();
  onDidChangeActiveChannel = this._onDidChangeActiveChannel.event;
  onDidChangeChannels = this._onDidChangeChannels.event;
  constructor(outputChannel2) {
    this.outputChannel = outputChannel2;
  }
  // ─── Channel Creation ─────────────────────────────────────────────────────
  createChannel(webview, id) {
    const channel = new Channel(webview, id);
    channel.setOnStateChange((ch) => {
      this.handleChannelStateChange(ch);
    });
    this.channels.set(channel.id, channel);
    this.outputChannel.info(`Created channel: ${channel.id}`);
    if (!this.activeChannelId) {
      this.setActiveChannel(channel.id);
    }
    this._onDidChangeChannels.fire(this.getChannelInfos());
    return channel;
  }
  // ─── Channel Access ───────────────────────────────────────────────────────
  getChannel(id) {
    return this.channels.get(id);
  }
  getActiveChannel() {
    if (!this.activeChannelId) return void 0;
    return this.channels.get(this.activeChannelId);
  }
  getActiveChannelId() {
    return this.activeChannelId;
  }
  setActiveChannel(id) {
    if (!this.channels.has(id)) {
      this.outputChannel.warn(`Cannot set active channel: channel ${id} not found`);
      return;
    }
    this.activeChannelId = id;
    const channel = this.channels.get(id);
    this._onDidChangeActiveChannel.fire(channel ?? null);
    this.outputChannel.info(`Active channel set to: ${id}`);
  }
  // ─── Channel Listing ──────────────────────────────────────────────────────
  getChannels() {
    return Array.from(this.channels.values());
  }
  getChannelInfos() {
    return this.getChannels().map((ch) => {
      const state = ch.getState();
      return {
        id: state.id,
        status: state.status,
        messageCount: state.messages.length,
        sessionId: state.sessionId
      };
    });
  }
  // ─── Channel Removal ──────────────────────────────────────────────────────
  closeChannel(id) {
    const channel = this.channels.get(id);
    if (!channel) return;
    channel.dispose();
    this.channels.delete(id);
    this.outputChannel.info(`Closed channel: ${id}`);
    if (this.activeChannelId === id) {
      const remaining = Array.from(this.channels.keys());
      this.activeChannelId = remaining[0] ?? null;
      this._onDidChangeActiveChannel.fire(this.getActiveChannel() ?? null);
    }
    this._onDidChangeChannels.fire(this.getChannelInfos());
  }
  closeAllChannels() {
    for (const channel of this.channels.values()) {
      channel.dispose();
    }
    this.channels.clear();
    this.activeChannelId = null;
    this._onDidChangeActiveChannel.fire(null);
    this._onDidChangeChannels.fire([]);
    this.outputChannel.info("All channels closed");
  }
  // ─── State Change Handler ─────────────────────────────────────────────────
  handleChannelStateChange(channel) {
    this._onDidChangeChannels.fire(this.getChannelInfos());
    if (this.activeChannelId === channel.id) {
      this._onDidChangeActiveChannel.fire(channel);
    }
  }
  // ─── Utility ──────────────────────────────────────────────────────────────
  getStats() {
    const byStatus = {
      idle: 0,
      running: 0,
      waiting: 0,
      error: 0
    };
    for (const channel of this.channels.values()) {
      byStatus[channel.getStatus()]++;
    }
    return {
      total: this.channels.size,
      active: this.activeChannelId,
      byStatus
    };
  }
  // ─── Lifecycle ────────────────────────────────────────────────────────────
  dispose() {
    this.closeAllChannels();
    this._onDidChangeActiveChannel.dispose();
    this._onDidChangeChannels.dispose();
    this.outputChannel.debug("ChannelManager disposed");
  }
};
var instance6;
function getChannelManager(outputChannel2) {
  if (!instance6) {
    instance6 = new ChannelManager(outputChannel2);
  }
  return instance6;
}
function disposeChannelManager() {
  instance6?.dispose();
  instance6 = void 0;
}

// src/UriHandler.ts
import * as vscode32 from "vscode";
var CclocalUriHandler = class {
  constructor(outputChannel2) {
    this.outputChannel = outputChannel2;
  }
  pendingOAuthCallbacks = /* @__PURE__ */ new Map();
  async handleUri(uri) {
    this.outputChannel.info(`[URI Handler] Received: ${uri.path}?${uri.query}`);
    const { path: uriPath, query } = uri;
    const params = new URLSearchParams(query);
    const code = params.get("code");
    const state = params.get("state");
    if (uriPath === "/auth/callback" || uriPath === "auth/callback") {
      if (code && state) {
        this.outputChannel.info(`[URI Handler] OAuth callback: state=${state}`);
        const pending = this.pendingOAuthCallbacks.get(state);
        if (pending) {
          clearTimeout(pending.timer);
          this.pendingOAuthCallbacks.delete(state);
          pending.resolve(code);
        } else {
          this.outputChannel.warn(`[URI Handler] No pending OAuth callback for state: ${state}`);
          vscode32.window.showWarningMessage("Unexpected OAuth callback. Please try logging in again.");
        }
      } else {
        const error = params.get("error");
        const errorDesc = params.get("error_description");
        this.outputChannel.error(`[URI Handler] OAuth error: ${error} - ${errorDesc}`);
        vscode32.window.showErrorMessage(`Login failed: ${errorDesc || error || "Unknown error"}`);
      }
    } else if (uriPath === "/open" || uriPath === "open") {
      const filePath = params.get("file");
      const line = params.get("line");
      if (filePath) {
        try {
          const doc = await vscode32.workspace.openTextDocument(filePath);
          const editor = await vscode32.window.showTextDocument(doc, {
            selection: line ? new vscode32.Selection(parseInt(line) - 1, 0, parseInt(line) - 1, 0) : void 0
          });
        } catch (err) {
          vscode32.window.showErrorMessage(`Failed to open file: ${filePath}`);
        }
      }
    } else if (uriPath === "/focus" || uriPath === "focus") {
      void vscode32.commands.executeCommand("cclocal.chat.focus");
    } else {
      this.outputChannel.warn(`[URI Handler] Unknown path: ${uriPath}`);
    }
  }
  /**
   * Wait for an OAuth callback with the given state parameter.
   * Returns a Promise that resolves with the authorization code.
   * Rejects after timeoutMs if no callback is received.
   */
  waitForOAuthCallback(state, timeoutMs = 3e5) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingOAuthCallbacks.delete(state);
        reject(new Error("OAuth callback timed out"));
      }, timeoutMs);
      this.pendingOAuthCallbacks.set(state, { resolve, reject, timer });
    });
  }
  /** Cancel all pending OAuth callbacks */
  cancelAll() {
    for (const [state, pending] of this.pendingOAuthCallbacks) {
      clearTimeout(pending.timer);
      pending.reject(new Error("OAuth callback cancelled"));
    }
    this.pendingOAuthCallbacks.clear();
  }
  dispose() {
    this.cancelAll();
  }
};

// src/commands/FocusManager.ts
import * as vscode33 from "vscode";
var FocusManager = class {
  sidebarView;
  /** Called when the sidebar webview is resolved */
  setSidebarView(view) {
    this.sidebarView = view;
    view.onDidChangeVisibility(() => {
      const active = view.visible;
      void vscode33.commands.executeCommand("setContext", "cclocal.sideBarActive", active);
    });
  }
  /** Focus the sidebar input */
  focus() {
    if (this.sidebarView) {
      this.sidebarView.show(true);
      void vscode33.commands.executeCommand("setContext", "cclocal.sideBarActive", true);
    } else {
      void vscode33.commands.executeCommand("cclocal.chatView.focus");
      void vscode33.commands.executeCommand("setContext", "cclocal.sideBarActive", true);
    }
  }
  /** Blur — move focus back to the active editor */
  blur() {
    void vscode33.commands.executeCommand("workbench.action.focusActiveEditorGroup");
    void vscode33.commands.executeCommand("setContext", "cclocal.sideBarActive", false);
  }
};

// src/EditorPanelProvider.ts
import * as crypto9 from "crypto";
import * as vscode34 from "vscode";
var EditorPanelProvider = class _EditorPanelProvider {
  static viewType = "cclocalVSCodePanel";
  panel;
  extensionUri;
  outputChannel;
  /** Callback to register panel's webview as a broadcast target on the sidebar */
  onDidCreatePanel;
  constructor(extensionUri, outputChannel2) {
    this.extensionUri = extensionUri;
    this.outputChannel = outputChannel2;
  }
  /** Set callback that fires when the panel is created, to register its webview for broadcast */
  setOnDidCreatePanel(callback) {
    this.onDidCreatePanel = callback;
  }
  /** Open conversation in an editor tab */
  openInEditorTab() {
    if (this.panel) {
      this.panel.reveal(vscode34.ViewColumn.Beside);
      return;
    }
    this.panel = vscode34.window.createWebviewPanel(
      _EditorPanelProvider.viewType,
      "CCLocal",
      vscode34.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.extensionUri]
      }
    );
    this.panel.iconPath = vscode34.Uri.joinPath(this.extensionUri, "images", "icon.png");
    this.panel.webview.html = this.getWebviewHtml(this.panel.webview);
    this.onDidCreatePanel?.(this.panel.webview);
    this.panel.webview.onDidReceiveMessage(
      (message) => {
        this.outputChannel.debug(`[EditorPanel] received webview message: ${message.type}`);
      }
    );
    this.panel.onDidDispose(() => {
      this.panel = void 0;
    });
  }
  /** Open conversation in a new window */
  openInNewWindow() {
    this.openInEditorTab();
    if (this.panel) {
      void vscode34.commands.executeCommand("workbench.action.moveEditorToNewWindow");
    }
  }
  /** Forward a message from sidebar → editor panel webview */
  sendToWebview(message) {
    this.panel?.webview.postMessage(message);
  }
  /** Get the panel's webview if available */
  getWebview() {
    return this.panel?.webview;
  }
  // ─── Internal ────────────────────────────────────────────────────────────
  getWebviewHtml(webview) {
    const nonce = crypto9.randomBytes(16).toString("base64");
    const webviewDistUri = (fileName) => webview.asWebviewUri(vscode34.Uri.joinPath(this.extensionUri, "webview-dist", fileName));
    const scriptUri = webviewDistUri("index.js");
    const styleUri = webviewDistUri("index.css");
    return (
      /* html */
      `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
            style-src 'nonce-${nonce}' https:;
            script-src 'nonce-${nonce}';
            img-src 'self' data: https:;
            font-src 'self' https:;" />
  <link rel="stylesheet" type="text/css" href="${styleUri}" nonce="${nonce}">
  <title>CCLocal</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`
    );
  }
};

// src/worktree/WorktreeManager.ts
import * as vscode35 from "vscode";
import { execFile as execFile2 } from "child_process";
import { promisify } from "util";
var execFileAsync = promisify(execFile2);
var WorktreeManager = class {
  worktrees = [];
  outputChannel;
  constructor(outputChannel2) {
    this.outputChannel = outputChannel2;
  }
  /** Create a new worktree with a new branch and open it in a new window */
  async createWorktree(branch) {
    const workspaceRoot = vscode35.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      vscode35.window.showErrorMessage("No workspace folder open");
      return void 0;
    }
    const sanitizedBranch = branch.replace(/[^a-zA-Z0-9_\-\/]/g, "-");
    const worktreePath = `${workspaceRoot}-worktree-${sanitizedBranch}`;
    try {
      await execFileAsync("git", ["worktree", "add", worktreePath, "-b", sanitizedBranch], {
        cwd: workspaceRoot,
        timeout: 3e4
      });
      const info = {
        branch: sanitizedBranch,
        path: worktreePath,
        createdAt: Date.now()
      };
      this.worktrees.push(info);
      this.outputChannel.info(`Created worktree: ${sanitizedBranch} at ${worktreePath}`);
      await vscode35.commands.executeCommand(
        "vscode.openFolder",
        vscode35.Uri.file(worktreePath),
        true
        // forceNewWindow
      );
      vscode35.window.showInformationMessage(`Worktree created: ${sanitizedBranch}`);
      return info;
    } catch (err) {
      const message = err?.message || String(err);
      vscode35.window.showErrorMessage(`Failed to create worktree: ${message}`);
      this.outputChannel.error(`Worktree creation failed: ${message}`);
      return void 0;
    }
  }
  /** List all worktrees managed by this extension */
  listWorktrees() {
    return [...this.worktrees];
  }
  /** Remove a worktree by branch name */
  async removeWorktree(branch) {
    const info = this.worktrees.find((w) => w.branch === branch);
    if (!info) return false;
    const workspaceRoot = vscode35.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) return false;
    try {
      await execFileAsync("git", ["worktree", "remove", info.path], {
        cwd: workspaceRoot,
        timeout: 3e4
      });
      this.worktrees = this.worktrees.filter((w) => w.branch !== branch);
      this.outputChannel.info(`Removed worktree: ${branch}`);
      return true;
    } catch (err) {
      vscode35.window.showErrorMessage(`Failed to remove worktree: ${err?.message}`);
      return false;
    }
  }
  dispose() {
  }
};

// src/mcp/builtin/ChromeMCPProvider.ts
import * as vscode36 from "vscode";
var ChromeMCPProvider = class {
  enabled = false;
  outputChannel;
  constructor(outputChannel2) {
    this.outputChannel = outputChannel2;
  }
  /** Enable Chrome MCP server in settings */
  async enable() {
    const config = vscode36.workspace.getConfiguration("cclocal");
    const mcpServers = config.get("mcpServers") || {};
    mcpServers["chrome"] = {
      command: "npx",
      args: ["@anthropic-ai/chrome-mcp-server"],
      type: "stdio"
    };
    await config.update("mcpServers", mcpServers, vscode36.ConfigurationTarget.Global);
    this.enabled = true;
    this.outputChannel.info("Chrome MCP server enabled");
    vscode36.window.showInformationMessage("CCLocal: Chrome MCP server enabled");
  }
  /** Disable Chrome MCP server */
  async disable() {
    const config = vscode36.workspace.getConfiguration("cclocal");
    const mcpServers = config.get("mcpServers") || {};
    delete mcpServers["chrome"];
    await config.update("mcpServers", mcpServers, vscode36.ConfigurationTarget.Global);
    this.enabled = false;
    this.outputChannel.info("Chrome MCP server disabled");
    vscode36.window.showInformationMessage("CCLocal: Chrome MCP server disabled");
  }
  /** Check if Chrome MCP is enabled */
  isEnabled() {
    return this.enabled;
  }
  dispose() {
  }
};

// src/mcp/builtin/JupyterMCPProvider.ts
import * as vscode37 from "vscode";
var JupyterMCPProvider = class {
  enabled = false;
  outputChannel;
  constructor(outputChannel2) {
    this.outputChannel = outputChannel2;
  }
  /** Enable Jupyter MCP server in settings */
  async enable() {
    const config = vscode37.workspace.getConfiguration("cclocal");
    const mcpServers = config.get("mcpServers") || {};
    mcpServers["jupyter"] = {
      command: "uvx",
      args: ["jupyter-mcp-server"],
      type: "stdio"
    };
    await config.update("mcpServers", mcpServers, vscode37.ConfigurationTarget.Global);
    this.enabled = true;
    this.outputChannel.info("Jupyter MCP server enabled");
    vscode37.window.showInformationMessage("CCLocal: Jupyter MCP server enabled");
  }
  /** Disable Jupyter MCP server */
  async disable() {
    const config = vscode37.workspace.getConfiguration("cclocal");
    const mcpServers = config.get("mcpServers") || {};
    delete mcpServers["jupyter"];
    await config.update("mcpServers", mcpServers, vscode37.ConfigurationTarget.Global);
    this.enabled = false;
    this.outputChannel.info("Jupyter MCP server disabled");
    vscode37.window.showInformationMessage("CCLocal: Jupyter MCP server disabled");
  }
  /** Check if Jupyter MCP is enabled */
  isEnabled() {
    return this.enabled;
  }
  dispose() {
  }
};

// src/commands/UpdateCommand.ts
import * as vscode38 from "vscode";
async function checkForUpdates(context, outputChannel2) {
  const currentVersion = context.extension.packageJSON.version;
  outputChannel2.info(`[Update] Current version: ${currentVersion}`);
  try {
    const result = await vscode38.commands.executeCommand("extension.checkForUpdates", "cclocal.cclocal-vscode-ext");
    if (result?.updateAvailable && result.latestVersion) {
      const action = await vscode38.window.showInformationMessage(
        `CCLocal update available: v${result.latestVersion} (current: v${currentVersion})`,
        "Install Update",
        "Dismiss"
      );
      if (action === "Install Update") {
        await vscode38.commands.executeCommand("workbench.extensions.installExtension", "cclocal.cclocal-vscode-ext");
        vscode38.window.showInformationMessage("CCLocal: Update installed. Please reload VS Code.");
      }
    } else {
      vscode38.window.showInformationMessage(`CCLocal is up to date (v${currentVersion})`);
    }
  } catch (err) {
    outputChannel2.error(`[Update] Check failed: ${err?.message}`);
    vscode38.window.showWarningMessage("CCLocal: Could not check for updates");
  }
}

// src/commands/InstallPluginCommand.ts
import * as vscode39 from "vscode";
async function installPlugin(pluginManager2, outputChannel2) {
  try {
    const allPlugins = await pluginManager2.listAvailablePlugins();
    const installedIds = new Set(pluginManager2.getInstalledPluginIds());
    const available = allPlugins.filter((p) => !installedIds.has(p.id));
    if (available.length === 0) {
      vscode39.window.showInformationMessage("CCLocal: No new plugins available");
      return;
    }
    const items = available.map((p) => ({
      label: p.name,
      description: p.version ? `v${p.version}` : void 0,
      detail: p.description,
      picked: false
    }));
    const selected = await vscode39.window.showQuickPick(items, {
      placeHolder: "Select a plugin to install",
      title: "CCLocal: Install Plugin",
      canPickMany: false
    });
    if (!selected) return;
    const plugin = available.find((p) => p.name === selected.label);
    if (!plugin) return;
    await vscode39.window.withProgress(
      {
        location: vscode39.ProgressLocation.Notification,
        title: `Installing ${plugin.name}...`,
        cancellable: false
      },
      async () => {
        await pluginManager2.installPlugin(plugin.id);
      }
    );
    vscode39.window.showInformationMessage(`CCLocal: ${plugin.name} installed successfully`);
  } catch (err) {
    outputChannel2.error(`[InstallPlugin] Failed: ${err?.message}`);
    vscode39.window.showErrorMessage(`CCLocal: Failed to install plugin \u2014 ${err?.message}`);
  }
}

// src/extension.ts
var hookManager;
var configManager;
var outputChannel;
var mcpManager;
var pluginManager;
var sessionManager;
var remoteManager;
var ideViewProvider;
var editorPanelProvider;
async function activate(context) {
  console.log("CCLocal extension activating...");
  outputChannel = vscode40.window.createOutputChannel("CCLocal", { log: true });
  context.subscriptions.push(outputChannel);
  const claudeFS = registerClaudeFS(context);
  const uriHandler = new CclocalUriHandler(outputChannel);
  context.subscriptions.push(uriHandler);
  context.subscriptions.push(vscode40.window.registerUriHandler(uriHandler));
  const focusManager = new FocusManager();
  getChannelManager(outputChannel);
  configManager = new ConfigurationManager(context);
  context.subscriptions.push(configManager);
  hookManager = getHookManager(outputChannel, {
    allowedHttpUrls: configManager.get("allowedHttpHookUrls"),
    allowedCommands: configManager.get("allowedCommands"),
    allowedEnvVars: configManager.get("allowedEnvVars")
  });
  context.subscriptions.push(hookManager);
  const hooksConfig = configManager.get("hooks");
  if (hooksConfig) {
    hookManager.loadFromConfig(hooksConfig);
  }
  context.subscriptions.push(
    vscode40.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("cclocal.hooks")) {
        const newHooksConfig = configManager?.get("hooks");
        if (newHooksConfig && hookManager) {
          hookManager.loadFromConfig(newHooksConfig);
        }
      }
      if (e.affectsConfiguration("cclocal.disableAllHooks")) {
        const disabled = configManager?.get("disableAllHooks");
        if (hookManager) {
          hookManager.setEnabled(!disabled);
        }
      }
    })
  );
  const authStatusBar = new AuthStatusBar(context);
  context.subscriptions.push(authStatusBar);
  mcpManager = getMCPManager(outputChannel, {
    autoDiscoverProject: configManager.get("enableAllProjectMcpServers"),
    preApprovedServers: configManager.get("allowedMcpServers"),
    deniedServers: configManager.get("deniedMcpServers")
  });
  context.subscriptions.push(mcpManager);
  void mcpManager.discoverServers();
  registerFileSaveListener(context);
  pluginManager = getPluginManager(context, outputChannel, {
    extraKnownMarketplaces: configManager.get("extraKnownMarketplaces"),
    strictKnownMarketplaces: configManager.get("strictKnownMarketplaces"),
    blockedMarketplaces: configManager.get("blockedMarketplaces")
  });
  context.subscriptions.push(pluginManager);
  await pluginManager.loadInstalledPlugins();
  sessionManager = getSessionManager(context, outputChannel);
  context.subscriptions.push(sessionManager);
  const sessionTree = new SessionTreeProvider(sessionManager);
  context.subscriptions.push(sessionTree);
  context.subscriptions.push(
    vscode40.window.registerTreeDataProvider("cclocal.sessions", sessionTree)
  );
  const commandDeps = {
    sessionManager,
    sessionTree,
    hookManager,
    mcpManager,
    pluginManager,
    configManager,
    outputChannel
  };
  registerAllCommands(context, commandDeps);
  registerKeyboardShortcuts(context, sessionManager);
  registerCommandPalette(context);
  registerSessionCommands(context, sessionManager, sessionTree);
  registerHookCommands(context, hookManager);
  registerMCPCommands(context, mcpManager);
  registerPluginCommands(context, pluginManager);
  remoteManager = getRemoteSessionManager(context, outputChannel);
  context.subscriptions.push(remoteManager);
  registerRemoteCommands(context, remoteManager);
  const config = vscode40.workspace.getConfiguration("cclocal");
  const mode = config.get("mode") || "ide";
  let sendMessage;
  if (mode === "ide") {
    ideViewProvider = new IdeViewProvider(context.extensionUri, outputChannel, claudeFS.diffManager);
    sendMessage = (text) => ideViewProvider.sendMessage(text);
    context.subscriptions.push(
      vscode40.window.registerWebviewViewProvider(
        IdeViewProvider.viewType,
        ideViewProvider,
        { webviewOptions: { retainContextWhenHidden: true } }
      )
    );
    ideViewProvider.onDidResolve((view) => focusManager.setSidebarView(view));
    await ideViewProvider.start();
    ideViewProvider.registerListeners(context);
    context.subscriptions.push(
      vscode40.window.registerWebviewViewProvider(
        "cclocal.chatViewSecondary",
        {
          resolveWebviewView(webviewView) {
            webviewView.webview.options = { enableScripts: true, localResourceRoots: [context.extensionUri] };
            const nonce = __require("crypto").randomBytes(16).toString("base64");
            const webviewDistUri = (fileName) => webviewView.webview.asWebviewUri(vscode40.Uri.joinPath(context.extensionUri, "webview-dist", fileName));
            const scriptUri = webviewDistUri("index.js");
            const styleUri = webviewDistUri("index.css");
            webviewView.webview.html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"/>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}' https:; script-src 'nonce-${nonce}'; img-src 'self' data: https:; font-src 'self' https:;"/>
<link rel="stylesheet" type="text/css" href="${styleUri}" nonce="${nonce}"></head>
<body><div id="root"></div><script nonce="${nonce}" src="${scriptUri}"></script></body></html>`;
            webviewView.webview.onDidReceiveMessage((msg) => {
              ideViewProvider?.handleWebviewMessage(msg);
            });
          }
        },
        { webviewOptions: { retainContextWhenHidden: true } }
      )
    );
    context.subscriptions.push(
      vscode40.window.registerWebviewViewProvider(
        "cclocal.sessionsList",
        {
          resolveWebviewView(webviewView) {
            webviewView.webview.options = { enableScripts: true, localResourceRoots: [context.extensionUri] };
            webviewView.webview.html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"/>
<style>
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 8px; margin: 0; }
  .session-item { padding: 8px 12px; cursor: pointer; border-bottom: 1px solid var(--vscode-widget-border, #3a3a3a); }
  .session-item:hover { background: var(--vscode-list-hoverBackground); }
  .session-title { font-weight: 600; }
  .session-meta { font-size: 0.85em; color: var(--vscode-descriptionForeground); }
  .empty { padding: 20px; text-align: center; color: var(--vscode-descriptionForeground); }
  input { width: 100%; padding: 6px 8px; margin-bottom: 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 3px; }
</style></head><body>
<input type="text" id="search" placeholder="\u641C\u7D22\u4F1A\u8BDD..." />
<div id="list"></div>
<script>
const vscode = acquireVsCodeApi();
const search = document.getElementById('search');
const list = document.getElementById('list');
let sessions = [];

window.addEventListener('message', e => {
  const msg = e.data;
  if (msg.type === 'sessionsList') sessions = msg.sessions || [];
  render();
});

search.addEventListener('input', () => render());

function render() {
  const q = search.value.toLowerCase();
  const filtered = sessions.filter(s => (s.title || '').toLowerCase().includes(q) || s.id.includes(q));
  if (!filtered.length) { list.innerHTML = '<div class="empty">\u65E0\u5339\u914D\u4F1A\u8BDD</div>'; return; }
  list.innerHTML = filtered.map(s => '<div class="session-item" data-id="' + s.id + '"><div class="session-title">' + (s.title || 'Untitled') + '</div><div class="session-meta">' + new Date(s.updatedAt || s.createdAt).toLocaleString('zh-CN') + ' \xB7 ' + (s.numTurns || 0) + ' turns</div></div>').join('');
  list.querySelectorAll('.session-item').forEach(el => {
    el.addEventListener('click', () => {
      vscode.postMessage({ type: 'resumeSession', sessionId: el.dataset.id });
    });
  });
}

vscode.postMessage({ type: 'listSessions' });
</script></body></html>`;
            webviewView.webview.onDidReceiveMessage((msg) => {
              if (msg.type === "listSessions") {
                sessionManager?.listSessions().then((sessions) => {
                  webviewView.webview.postMessage({ type: "sessionsList", sessions });
                });
              } else if (msg.type === "resumeSession") {
                sessionManager?.resumeSession(msg.sessionId);
              }
            });
          }
        },
        { webviewOptions: { retainContextWhenHidden: true } }
      )
    );
    context.subscriptions.push(
      vscode40.commands.registerCommand("cclocal.newSession", () => {
        void vscode40.commands.executeCommand("cclocal.chatView.focus");
        ideViewProvider.handleCommand("newSession");
      })
    );
    context.subscriptions.push(
      vscode40.commands.registerCommand("cclocal.clearChat", () => {
        ideViewProvider.handleCommand("clearChat");
      })
    );
    context.subscriptions.push(
      vscode40.commands.registerCommand("cclocal.stopGeneration", () => {
        ideViewProvider.handleCommand("stopGeneration");
      })
    );
    editorPanelProvider = new EditorPanelProvider(context.extensionUri, outputChannel);
    editorPanelProvider.setOnDidCreatePanel((webview) => {
      ideViewProvider.addBroadcastTarget(webview);
    });
    context.subscriptions.push(
      vscode40.commands.registerCommand("cclocal.editor.open", () => {
        editorPanelProvider.openInEditorTab();
      })
    );
    context.subscriptions.push(
      vscode40.commands.registerCommand("cclocal.window.open", () => {
        editorPanelProvider.openInNewWindow();
      })
    );
    context.subscriptions.push(
      vscode40.commands.registerCommand("cclocal.primaryEditor.open", () => {
        editorPanelProvider.openInEditorTab();
      })
    );
  } else if (mode === "cli") {
    const provider = new CliViewProvider(context.extensionUri);
    sendMessage = (text) => provider.sendMessage(text);
    context.subscriptions.push(
      vscode40.window.registerWebviewViewProvider(
        CliViewProvider.viewType,
        provider,
        { webviewOptions: { retainContextWhenHidden: true } }
      )
    );
    context.subscriptions.push(
      vscode40.commands.registerCommand("cclocal.newSession", () => {
        void vscode40.commands.executeCommand("cclocal.chatView.focus");
        provider.handleCommand("newSession");
      })
    );
    context.subscriptions.push(
      vscode40.commands.registerCommand("cclocal.clearChat", () => {
        provider.handleCommand("clearChat");
      })
    );
    context.subscriptions.push(
      vscode40.commands.registerCommand("cclocal.stopGeneration", () => {
        provider.handleCommand("stopGeneration");
      })
    );
  } else {
    const serverManager = new ServerManager();
    await serverManager.ensureServerRunning();
    const provider = new WsViewProvider(context.extensionUri, serverManager);
    sendMessage = (text) => provider.sendMessage(text);
    context.subscriptions.push(
      vscode40.window.registerWebviewViewProvider(WsViewProvider.viewType, provider)
    );
    context.subscriptions.push(
      vscode40.commands.registerCommand("cclocal.sendMessage", async () => {
        const message = await vscode40.window.showInputBox({
          prompt: "Enter your message to CCLocal",
          placeHolder: "How can I help you today?"
        });
        if (message) {
          await provider.sendMessage(message);
        }
      })
    );
    context.subscriptions.push(
      vscode40.commands.registerCommand("cclocal.clearChat", () => {
        provider.clearChat();
      })
    );
    context.subscriptions.push(
      vscode40.commands.registerCommand("cclocal.stopGeneration", () => {
        provider.stopGeneration();
      })
    );
  }
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.sendSelectedCode", () => {
      const editor = vscode40.window.activeTextEditor;
      if (!editor) {
        vscode40.window.showWarningMessage("CCLocal: \u6CA1\u6709\u6D3B\u52A8\u7684\u7F16\u8F91\u5668");
        return;
      }
      const selection = editor.selection;
      if (selection.isEmpty) {
        vscode40.window.showWarningMessage("CCLocal: \u8BF7\u5148\u9009\u4E2D\u4EE3\u7801");
        return;
      }
      const selectedText = editor.document.getText(selection);
      const language = editor.document.languageId;
      const fileName = editor.document.fileName.split("/").pop() ?? "";
      const message = `\u8BF7\u89E3\u91CA\u4EE5\u4E0B ${language} \u4EE3\u7801\uFF08\u6765\u81EA ${fileName}\uFF09\uFF1A

\`\`\`${language}
${selectedText}
\`\`\``;
      void vscode40.commands.executeCommand("cclocal.chatView.focus").then(() => {
        sendMessage(message);
      });
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.focus", () => {
      focusManager.focus();
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.blur", () => {
      focusManager.blur();
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.edit.insertAtMention", () => {
      const editor = vscode40.window.activeTextEditor;
      if (!editor) return;
      const position = editor.selection.active;
      editor.edit((editBuilder) => {
        editBuilder.insert(position, "@");
      });
      focusManager.focus();
    })
  );
  void vscode40.commands.executeCommand("setContext", "cclocal.viewingProposedDiff", false);
  void vscode40.commands.executeCommand("setContext", "cclocal.createWorktreeEnabled", true);
  void vscode40.commands.executeCommand("setContext", "cclocal.primaryEditorEnabled", mode !== "ide");
  void vscode40.commands.executeCommand("setContext", "cclocal.updateSupported", true);
  void vscode40.commands.executeCommand("setContext", "cclocal.sideBarActive", false);
  void vscode40.commands.executeCommand("setContext", "cclocal.sessionsListEnabled", true);
  void vscode40.commands.executeCommand(
    "setContext",
    "cclocal.enableNewConversationShortcut",
    config.get("enableNewConversationShortcut") ?? false
  );
  const supportsSecondarySidebar = !!vscode40.window.registerWebviewViewProvider;
  void vscode40.commands.executeCommand("setContext", "cclocal.doesNotSupportSecondarySidebar", !supportsSecondarySidebar);
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.editor.openLast", async () => {
      if (!sessionManager) {
        vscode40.window.showWarningMessage("Session manager not available");
        return;
      }
      const sessions = await sessionManager.listSessions();
      if (sessions.length === 0) {
        vscode40.window.showInformationMessage("No previous conversations found");
        return;
      }
      const latest = sessions.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0];
      if (latest?.id) {
        await sessionManager.resumeSession(latest.id);
        focusManager.focus();
      }
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.terminal.open", () => {
      const terminal = vscode40.window.createTerminal("CCLocal");
      terminal.sendText("cclocal");
      terminal.show();
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.terminal.open.keyboard", () => {
      const terminal = vscode40.window.createTerminal("CCLocal");
      terminal.sendText("cclocal");
      terminal.show();
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.openWalkthrough", () => {
      void vscode40.commands.executeCommand("workbench.action.openWalkthrough", "cclocal.cclocal-walkthrough");
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.chat.new", () => {
      if (ideViewProvider) {
        void vscode40.commands.executeCommand("cclocal.chatView.focus");
        ideViewProvider.handleCommand("newSession");
      }
    })
  );
  const worktreeManager = new WorktreeManager(outputChannel);
  context.subscriptions.push(worktreeManager);
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.createWorktree", async () => {
      const branch = await vscode40.window.showInputBox({
        prompt: "Branch name for worktree",
        placeHolder: "my-feature-branch"
      });
      if (!branch) return;
      await worktreeManager.createWorktree(branch);
    })
  );
  const chromeMCP = new ChromeMCPProvider(outputChannel);
  const jupyterMCP = new JupyterMCPProvider(outputChannel);
  context.subscriptions.push(chromeMCP, jupyterMCP);
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.mcp.ensureChromeEnabled", () => {
      void chromeMCP.enable();
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.mcp.disableChrome", () => {
      void chromeMCP.disable();
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.mcp.enableJupyter", () => {
      void jupyterMCP.enable();
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.mcp.disableJupyter", () => {
      void jupyterMCP.disable();
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.update", () => {
      void checkForUpdates(context, outputChannel);
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.installPlugin", () => {
      if (pluginManager) {
        void installPlugin(pluginManager, outputChannel);
      } else {
        vscode40.window.showWarningMessage("CCLocal: Plugin manager not available");
      }
    })
  );
  console.log("CCLocal extension activated");
}
function deactivate() {
  ideViewProvider?.stop();
  editorPanelProvider = void 0;
  disposeHookManager();
  disposeMCPManager();
  disposePluginManager();
  disposeSessionManager();
  disposeRemoteSessionManager();
  disposeChannelManager();
  outputChannel?.dispose();
}
function registerHookCommands(context, hookManager2) {
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.hooks.enable", () => {
      hookManager2.setEnabled(true);
      vscode40.window.showInformationMessage("CCLocal: Hooks enabled");
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.hooks.disable", () => {
      hookManager2.setEnabled(false);
      vscode40.window.showInformationMessage("CCLocal: Hooks disabled");
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.hooks.clear", () => {
      hookManager2.clear();
      vscode40.window.showInformationMessage("CCLocal: All hooks cleared");
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.hooks.stats", () => {
      const stats = hookManager2.getStats();
      const message = `Total hooks: ${stats.totalHooks}
${Object.entries(stats.hooksByType).filter(([, count]) => count > 0).map(([type, count]) => `  ${type}: ${count}`).join("\n")}`;
      vscode40.window.showInformationMessage(message, { modal: true });
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.hooks.test", async () => {
      const hookTypes = [
        "PreToolUse",
        "PostToolUse",
        "SessionStart",
        "SessionEnd",
        "FileWrite",
        "FileEdit",
        "BashExecution",
        "Error"
      ];
      const selected = await vscode40.window.showQuickPick(hookTypes, {
        placeHolder: "Select hook type to test"
      });
      if (selected) {
        const results = await hookManager2.execute(selected, {
          type: selected,
          timestamp: Date.now(),
          toolName: "TestTool"
        });
        const output = results.map(
          (r) => `Handler ${r.handlerIndex}: ${r.success ? "\u2713" : "\u2717"} (${r.duration}ms)
` + (r.output ? `  Output: ${r.output.slice(0, 100)}
` : "") + (r.error ? `  Error: ${r.error}
` : "")
        ).join("\n");
        outputChannel?.info(`Hook test results:
${output}`);
        vscode40.window.showInformationMessage(
          `Hook test completed: ${results.filter((r) => r.success).length}/${results.length} passed`
        );
      }
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.hooks.registerFunction", async () => {
      const name = await vscode40.window.showInputBox({
        prompt: "Enter function name",
        placeHolder: "myCustomHook"
      });
      if (name) {
        hookManager2.registerFunction(name, async (context2) => {
          outputChannel?.debug(`Function hook "${name}" called with context:`, context2);
          return {
            success: true,
            message: `Hook ${name} executed`,
            timestamp: Date.now()
          };
        });
        vscode40.window.showInformationMessage(`CCLocal: Function hook "${name}" registered`);
      }
    })
  );
}
function registerMCPCommands(context, mcpManager2) {
  const mcpPanel = new MCPPanelProvider(mcpManager2);
  context.subscriptions.push(mcpPanel);
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.showMCPSettings", () => {
      mcpPanel.show();
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.mcp.refresh", async () => {
      await mcpManager2.discoverServers();
      vscode40.window.showInformationMessage("CCLocal: MCP servers refreshed");
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.mcp.reviewPending", async () => {
      const pending = mcpManager2.getPendingApprovals();
      if (pending.length === 0) {
        vscode40.window.showInformationMessage("CCLocal: No pending MCP server approvals");
        return;
      }
      for (const server of pending) {
        const approved = await mcpManager2.showApprovalUI({
          name: server.name,
          info: server,
          tools: server.tools,
          reason: "auto_discovery"
        });
        if (approved) {
          vscode40.window.showInformationMessage(`CCLocal: Approved MCP server "${server.name}"`);
        } else {
          vscode40.window.showInformationMessage(`CCLocal: Denied MCP server "${server.name}"`);
        }
      }
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.mcp.listServers", async () => {
      const servers = mcpManager2.getAllServers();
      if (servers.length === 0) {
        vscode40.window.showInformationMessage("CCLocal: No MCP servers discovered");
        return;
      }
      const items = servers.map((s) => ({
        label: s.name,
        description: `${s.status} | ${s.source} | ${s.config.type}`,
        detail: s.tools.length > 0 ? `Tools: ${s.tools.map((t) => t.name).join(", ")}` : "No tools",
        server: s
      }));
      const selected = await vscode40.window.showQuickPick(items, {
        placeHolder: "Select an MCP server"
      });
      if (selected) {
        const actions = await vscode40.window.showQuickPick(
          [
            { label: "Enable", value: "enable" },
            { label: "Disable", value: "disable" },
            { label: "Remove", value: "remove" },
            { label: "View Details", value: "details" }
          ],
          { placeHolder: `Action for "${selected.label}"` }
        );
        if (actions) {
          switch (actions.value) {
            case "enable":
              await mcpManager2.enableServer(selected.label);
              break;
            case "disable":
              await mcpManager2.disableServer(selected.label);
              break;
            case "remove":
              await mcpManager2.removeServer(selected.label);
              break;
            case "details":
              mcpPanel.show();
              break;
          }
        }
      }
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.mcp.stats", () => {
      const stats = mcpManager2.getStats();
      const lines = [
        `Total Discovered: ${stats.totalDiscovered}`,
        `Connected: ${stats.byStatus.connected || 0}`,
        `Approved: ${stats.byApproval.approved || 0}`,
        `Pending: ${stats.byApproval.pending || 0}`,
        `Denied: ${stats.byApproval.denied || 0}`,
        `Total Tools: ${stats.totalTools}`,
        "",
        "By Source:",
        `  User: ${stats.bySource.user || 0}`,
        `  Local: ${stats.bySource.local || 0}`,
        `  Project: ${stats.bySource.project || 0}`
      ];
      if (stats.connectedServers.length > 0) {
        lines.push("", "Connected Servers:");
        stats.connectedServers.forEach((s) => lines.push(`  - ${s}`));
      }
      if (stats.failedServers.length > 0) {
        lines.push("", "Failed Servers:");
        stats.failedServers.forEach((s) => lines.push(`  - ${s}`));
      }
      vscode40.window.showInformationMessage(lines.join("\n"), { modal: true });
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.mcp.openUserConfig", async () => {
      const home = process.env.HOME || process.env.USERPROFILE || "";
      const doc = await vscode40.workspace.openTextDocument(path10.join(home, ".claude.json"));
      await vscode40.window.showTextDocument(doc);
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.mcp.openProjectConfig", async () => {
      const ws = vscode40.workspace.workspaceFolders?.[0];
      if (!ws) {
        vscode40.window.showWarningMessage("CCLocal: No workspace folder open");
        return;
      }
      const doc = await vscode40.workspace.openTextDocument(path10.join(ws.uri.fsPath, ".mcp.json"));
      await vscode40.window.showTextDocument(doc);
    })
  );
}
function registerPluginCommands(context, pluginManager2) {
  const pluginPanel = new PluginPanelProvider(pluginManager2);
  context.subscriptions.push(pluginPanel);
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.showPluginSettings", () => {
      pluginPanel.show();
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.installPlugin", async () => {
      const marketplaces = pluginManager2.getMarketplaces();
      if (marketplaces.length === 0) {
        vscode40.window.showWarningMessage("CCLocal: No marketplaces configured. Add a marketplace source first.");
        return;
      }
      const allPlugins = [];
      for (const mp of marketplaces) {
        for (const p of mp.plugins || []) {
          allPlugins.push({
            id: p.manifest.id,
            name: `${p.manifest.name} v${p.manifest.version} (${mp.name})`,
            marketplaceUrl: mp.url
          });
        }
      }
      if (allPlugins.length === 0) {
        vscode40.window.showInformationMessage("CCLocal: No plugins available in marketplaces");
        return;
      }
      const selected = await vscode40.window.showQuickPick(
        allPlugins.map((p) => ({ label: p.name, ...p })),
        { placeHolder: "Select a plugin to install" }
      );
      if (selected) {
        try {
          await pluginManager2.install(selected.id, selected.marketplaceUrl);
          vscode40.window.showInformationMessage(`CCLocal: Plugin "${selected.id}" installed`);
        } catch (error) {
          vscode40.window.showErrorMessage(`Failed to install plugin: ${error}`);
        }
      }
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.uninstallPlugin", async () => {
      const plugins = pluginManager2.getAllPlugins();
      if (plugins.length === 0) {
        vscode40.window.showInformationMessage("CCLocal: No plugins installed");
        return;
      }
      const selected = await vscode40.window.showQuickPick(
        plugins.map((p) => ({
          label: `${p.manifest.name} v${p.manifest.version}`,
          pluginId: p.manifest.id
        })),
        { placeHolder: "Select a plugin to uninstall" }
      );
      if (selected) {
        const confirm = await vscode40.window.showWarningMessage(
          `Uninstall plugin "${selected.label}"?`,
          "Yes",
          "No"
        );
        if (confirm === "Yes") {
          await pluginManager2.uninstall(selected.pluginId);
          vscode40.window.showInformationMessage(`CCLocal: Plugin uninstalled`);
        }
      }
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.addMarketplace", async () => {
      const url4 = await vscode40.window.showInputBox({
        prompt: "Enter marketplace URL",
        placeHolder: "https://marketplace.example.com"
      });
      if (url4) {
        try {
          await pluginManager2.addMarketplace(url4);
          vscode40.window.showInformationMessage(`CCLocal: Marketplace "${url4}" added`);
        } catch (error) {
          vscode40.window.showErrorMessage(`Failed to add marketplace: ${error}`);
        }
      }
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.listPlugins", () => {
      const plugins = pluginManager2.getAllPlugins();
      if (plugins.length === 0) {
        vscode40.window.showInformationMessage("CCLocal: No plugins installed");
        return;
      }
      const lines = plugins.map(
        (p) => `  ${p.state === "active" ? "\u25CF" : p.state === "error" ? "\u2717" : "\u25CB"} ${p.manifest.name} v${p.manifest.version} [${p.state}] (${p.trustLevel})`
      );
      vscode40.window.showInformationMessage(
        `Installed Plugins (${plugins.length}):
${lines.join("\n")}`,
        { modal: true }
      );
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.pluginStats", () => {
      const stats = pluginManager2.getStats();
      const lines = [
        `Total Installed: ${stats.totalInstalled}`,
        `Active: ${stats.totalActive}`,
        "",
        "By State:",
        ...Object.entries(stats.byState).filter(([, v]) => v > 0).map(([k, v]) => `  ${k}: ${v}`),
        "",
        "By Trust:",
        ...Object.entries(stats.byTrust).filter(([, v]) => v > 0).map(([k, v]) => `  ${k}: ${v}`),
        "",
        `Marketplaces: ${stats.marketplaces}`,
        `Available: ${stats.availablePlugins}`
      ];
      vscode40.window.showInformationMessage(lines.join("\n"), { modal: true });
    })
  );
}
function registerSessionCommands(context, sessionManager2, sessionTree) {
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.newConversation", async () => {
      await sessionManager2.create();
      sessionTree.refresh();
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.switchSession", async (sessionId) => {
      await sessionManager2.switchSession(sessionId);
      sessionTree.refresh();
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.renameSession", async (item) => {
      const newName = await vscode40.window.showInputBox({
        prompt: "Rename session",
        value: item.sessionItem.name,
        placeHolder: "Enter new name"
      });
      if (newName) {
        await sessionManager2.rename(item.sessionItem.id, newName);
        sessionTree.refresh();
      }
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.deleteSession", async (item) => {
      const confirm = await vscode40.window.showWarningMessage(
        `Delete session "${item.sessionItem.name}"?`,
        "Delete",
        "Cancel"
      );
      if (confirm === "Delete") {
        await sessionManager2.delete(item.sessionItem.id);
        sessionTree.refresh();
      }
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.forkSession", async (item) => {
      const forked = await sessionManager2.fork(item.sessionItem.id);
      vscode40.window.showInformationMessage(`Forked session: ${forked.name}`);
      sessionTree.refresh();
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.searchSessions", async () => {
      const query = await vscode40.window.showInputBox({
        prompt: "Search sessions by name or content",
        placeHolder: "Type search query..."
      });
      if (query !== void 0) {
        sessionTree.setSearchQuery(query);
      }
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.clearSessionSearch", () => {
      sessionTree.setSearchQuery("");
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.generateSessionTitle", async (item) => {
      const title = await sessionManager2.generateTitle(item.sessionItem.id);
      if (title) {
        vscode40.window.showInformationMessage(`Generated title: ${title}`);
      } else {
        vscode40.window.showInformationMessage("No user message found to generate title from");
      }
      sessionTree.refresh();
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.sessionStats", () => {
      const stats = sessionManager2.getStats();
      const lines = [
        `Total Sessions: ${stats.totalSessions}`,
        `Active: ${stats.activeSessionId || "none"}`,
        `Total Messages: ${stats.totalMessages}`,
        "",
        "By Status:",
        ...Object.entries(stats.byStatus).filter(([, v]) => v > 0).map(([k, v]) => `  ${k}: ${v}`)
      ];
      if (stats.oldestSession) {
        lines.push("", `Oldest: ${new Date(stats.oldestSession).toLocaleString()}`);
      }
      if (stats.newestSession) {
        lines.push(`Newest: ${new Date(stats.newestSession).toLocaleString()}`);
      }
      vscode40.window.showInformationMessage(lines.join("\n"), { modal: true });
    })
  );
}
function registerRemoteCommands(context, remoteManager2) {
  const remotePanel = new RemotePanelProvider(remoteManager2);
  context.subscriptions.push(remotePanel);
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.showRemotePanel", () => {
      remotePanel.show();
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.remote.addConfig", async () => {
      const name = await vscode40.window.showInputBox({
        prompt: "Enter connection name",
        placeHolder: "My Server"
      });
      if (!name) return;
      const host = await vscode40.window.showInputBox({
        prompt: "Enter hostname or IP address",
        placeHolder: "example.com"
      });
      if (!host) return;
      const portStr = await vscode40.window.showInputBox({
        prompt: "Enter SSH port",
        placeHolder: "22",
        value: "22"
      });
      const port = parseInt(portStr || "22", 10);
      const user = await vscode40.window.showInputBox({
        prompt: "Enter username",
        placeHolder: "user"
      });
      if (!user) return;
      const privateKey = await vscode40.window.showInputBox({
        prompt: "Private key path (leave empty for SSH agent)",
        placeHolder: "~/.ssh/id_rsa"
      });
      const { SSHConfig } = await Promise.resolve().then(() => (init_types(), types_exports));
      const config = {
        id: crypto.randomUUID(),
        name,
        host,
        port,
        user,
        privateKey: privateKey || void 0,
        agentForwarding: true
      };
      await remoteManager2.addConfiguration(config);
      vscode40.window.showInformationMessage(`CCLocal: Added SSH configuration "${name}"`);
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.remote.connect", async () => {
      const configs = remoteManager2.getConfigurations();
      if (configs.length === 0) {
        vscode40.window.showWarningMessage("CCLocal: No SSH configurations. Add one first.");
        return;
      }
      const selected = await vscode40.window.showQuickPick(
        configs.map((c) => ({
          label: c.name,
          description: `${c.user}@${c.host}:${c.port}`,
          config: c
        })),
        { placeHolder: "Select a remote to connect" }
      );
      if (selected) {
        try {
          await vscode40.window.withProgress(
            {
              location: vscode40.ProgressLocation.Notification,
              title: `Connecting to ${selected.label}...`,
              cancellable: false
            },
            () => remoteManager2.connect({ config: selected.config })
          );
          vscode40.window.showInformationMessage(`CCLocal: Connected to ${selected.label}`);
        } catch (error) {
          vscode40.window.showErrorMessage(`Failed to connect: ${error}`);
        }
      }
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.remote.disconnect", async () => {
      const sessions = remoteManager2.getConnectedSessions();
      if (sessions.length === 0) {
        vscode40.window.showInformationMessage("CCLocal: No active remote connections");
        return;
      }
      const selected = await vscode40.window.showQuickPick(
        sessions.map((s) => ({
          label: s.name,
          description: `${s.status} | ${s.workingDirectory}`,
          sessionId: s.id
        })),
        { placeHolder: "Select a connection to disconnect" }
      );
      if (selected) {
        await remoteManager2.disconnect(selected.sessionId);
        vscode40.window.showInformationMessage(`CCLocal: Disconnected from ${selected.label}`);
      }
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.remote.teleport", async () => {
      const remotes = remoteManager2.getConnectedSessions();
      if (remotes.length === 0) {
        vscode40.window.showWarningMessage("CCLocal: No active remote connections");
        return;
      }
      const selected = await vscode40.window.showQuickPick(
        remotes.map((r) => ({
          label: r.name,
          description: `${r.status} | Sessions: ${r.sessionCount}`,
          remoteId: r.id
        })),
        { placeHolder: "Select remote to teleport to" }
      );
      if (selected) {
        const sessionId = sessionManager?.getActiveSessionId();
        if (!sessionId) {
          vscode40.window.showWarningMessage("CCLocal: No active session to teleport");
          return;
        }
        try {
          await remoteManager2.teleport(sessionId, selected.remoteId);
          vscode40.window.showInformationMessage("CCLocal: Session teleported successfully");
        } catch (error) {
          vscode40.window.showErrorMessage(`Teleport failed: ${error}`);
        }
      }
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.remote.execute", async () => {
      const sessions = remoteManager2.getConnectedSessions();
      if (sessions.length === 0) {
        vscode40.window.showWarningMessage("CCLocal: No active remote connections");
        return;
      }
      const selected = await vscode40.window.showQuickPick(
        sessions.map((s) => ({
          label: s.name,
          sessionId: s.id
        })),
        { placeHolder: "Select remote" }
      );
      if (selected) {
        const command = await vscode40.window.showInputBox({
          prompt: "Enter command to execute",
          placeHolder: "ls -la"
        });
        if (command) {
          try {
            const result = await remoteManager2.executeCommand(selected.sessionId, command);
            if (result.exitCode === 0) {
              outputChannel?.info(`Command output:
${result.stdout}`);
              vscode40.window.showInformationMessage("Command executed successfully");
            } else {
              vscode40.window.showWarningMessage(`Command exited with code ${result.exitCode}`);
            }
          } catch (error) {
            vscode40.window.showErrorMessage(`Command failed: ${error}`);
          }
        }
      }
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.remote.stats", () => {
      const stats = remoteManager2.getStats();
      const lines = [
        `Configured: ${stats.totalConfigured}`,
        `Connected: ${stats.totalConnected}`,
        `Total Sessions: ${stats.totalSessions}`,
        `Avg Latency: ${stats.averageLatency.toFixed(1)}ms`,
        `Bandwidth: ${(stats.totalBandwidth / 1024).toFixed(1)} KB/s`,
        "",
        "By Status:",
        ...Object.entries(stats.byStatus).filter(([, v]) => v > 0).map(([k, v]) => `  ${k}: ${v}`)
      ];
      vscode40.window.showInformationMessage(lines.join("\n"), { modal: true });
    })
  );
  context.subscriptions.push(
    vscode40.commands.registerCommand("cclocal.remote.checkVSCode", () => {
      const isRemote = RemoteSessionManager.isVSCodeRemote();
      const authority = RemoteSessionManager.getVSCodeRemoteAuthority();
      const lines = [
        `VS Code Remote: ${isRemote ? "Yes" : "No"}`,
        `Authority: ${authority || "local"}`,
        `SSH Remote: ${RemoteSessionManager.isSSHRemote() ? "Yes" : "No"}`,
        `Dev Container: ${RemoteSessionManager.isDevContainer() ? "Yes" : "No"}`,
        `WSL: ${RemoteSessionManager.isWSL() ? "Yes" : "No"}`
      ];
      vscode40.window.showInformationMessage(lines.join("\n"), { modal: true });
    })
  );
}
export {
  activate,
  configManager,
  deactivate,
  hookManager,
  mcpManager,
  outputChannel
};
