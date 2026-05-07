"use strict";var ri=Object.create;var _e=Object.defineProperty;var ni=Object.getOwnPropertyDescriptor;var oi=Object.getOwnPropertyNames;var ai=Object.getPrototypeOf,ci=Object.prototype.hasOwnProperty;var Tt=(s,e)=>()=>(s&&(e=s(s=0)),e);var E=(s,e)=>()=>(e||s((e={exports:{}}).exports,e),e.exports),Ke=(s,e)=>{for(var t in e)_e(s,t,{get:e[t],enumerable:!0})},Mt=(s,e,t,i)=>{if(e&&typeof e=="object"||typeof e=="function")for(let r of oi(e))!ci.call(s,r)&&r!==t&&_e(s,r,{get:()=>e[r],enumerable:!(i=ni(e,r))||i.enumerable});return s};var f=(s,e,t)=>(t=s!=null?ri(ai(s)):{},Mt(e||!s||!s.__esModule?_e(t,"default",{value:s,enumerable:!0}):t,s)),li=s=>Mt(_e({},"__esModule",{value:!0}),s);var I=E((an,Ft)=>{"use strict";var Rt=["nodebuffer","arraybuffer","fragments"],Wt=typeof Blob<"u";Wt&&Rt.push("blob");Ft.exports={BINARY_TYPES:Rt,CLOSE_TIMEOUT:3e4,EMPTY_BUFFER:Buffer.alloc(0),GUID:"258EAFA5-E914-47DA-95CA-C5AB0DC85B11",hasBlob:Wt,kForOnEventAttribute:Symbol("kIsForOnEventAttribute"),kListener:Symbol("kListener"),kStatusCode:Symbol("status-code"),kWebSocket:Symbol("websocket"),NOOP:()=>{}}});var de=E((cn,Pe)=>{"use strict";var{EMPTY_BUFFER:pi}=I(),Xe=Buffer[Symbol.species];function gi(s,e){if(s.length===0)return pi;if(s.length===1)return s[0];let t=Buffer.allocUnsafe(e),i=0;for(let r=0;r<s.length;r++){let n=s[r];t.set(n,i),i+=n.length}return i<e?new Xe(t.buffer,t.byteOffset,i):t}function Nt(s,e,t,i,r){for(let n=0;n<r;n++)t[i+n]=s[n]^e[n&3]}function Ut(s,e){for(let t=0;t<s.length;t++)s[t]^=e[t&3]}function mi(s){return s.length===s.buffer.byteLength?s.buffer:s.buffer.slice(s.byteOffset,s.byteOffset+s.length)}function Ze(s){if(Ze.readOnly=!0,Buffer.isBuffer(s))return s;let e;return s instanceof ArrayBuffer?e=new Xe(s):ArrayBuffer.isView(s)?e=new Xe(s.buffer,s.byteOffset,s.byteLength):(e=Buffer.from(s),Ze.readOnly=!1),e}Pe.exports={concat:gi,mask:Nt,toArrayBuffer:mi,toBuffer:Ze,unmask:Ut};if(!process.env.WS_NO_BUFFER_UTIL)try{let s=require("bufferutil");Pe.exports.mask=function(e,t,i,r,n){n<48?Nt(e,t,i,r,n):s.mask(e,t,i,r,n)},Pe.exports.unmask=function(e,t){e.length<32?Ut(e,t):s.unmask(e,t)}}catch{}});var At=E((ln,$t)=>{"use strict";var Bt=Symbol("kDone"),Qe=Symbol("kRun"),et=class{constructor(e){this[Bt]=()=>{this.pending--,this[Qe]()},this.concurrency=e||1/0,this.jobs=[],this.pending=0}add(e){this.jobs.push(e),this[Qe]()}[Qe](){if(this.pending!==this.concurrency&&this.jobs.length){let e=this.jobs.shift();this.pending++,e(this[Bt])}}};$t.exports=et});var Z=E((dn,Vt)=>{"use strict";var he=require("zlib"),qt=de(),vi=At(),{kStatusCode:jt}=I(),yi=Buffer[Symbol.species],bi=Buffer.from([0,0,255,255]),Me=Symbol("permessage-deflate"),R=Symbol("total-length"),K=Symbol("callback"),U=Symbol("buffers"),X=Symbol("error"),Te,tt=class{constructor(e){if(this._options=e||{},this._threshold=this._options.threshold!==void 0?this._options.threshold:1024,this._maxPayload=this._options.maxPayload|0,this._isServer=!!this._options.isServer,this._deflate=null,this._inflate=null,this.params=null,!Te){let t=this._options.concurrencyLimit!==void 0?this._options.concurrencyLimit:10;Te=new vi(t)}}static get extensionName(){return"permessage-deflate"}offer(){let e={};return this._options.serverNoContextTakeover&&(e.server_no_context_takeover=!0),this._options.clientNoContextTakeover&&(e.client_no_context_takeover=!0),this._options.serverMaxWindowBits&&(e.server_max_window_bits=this._options.serverMaxWindowBits),this._options.clientMaxWindowBits?e.client_max_window_bits=this._options.clientMaxWindowBits:this._options.clientMaxWindowBits==null&&(e.client_max_window_bits=!0),e}accept(e){return e=this.normalizeParams(e),this.params=this._isServer?this.acceptAsServer(e):this.acceptAsClient(e),this.params}cleanup(){if(this._inflate&&(this._inflate.close(),this._inflate=null),this._deflate){let e=this._deflate[K];this._deflate.close(),this._deflate=null,e&&e(new Error("The deflate stream was closed while data was being processed"))}}acceptAsServer(e){let t=this._options,i=e.find(r=>!(t.serverNoContextTakeover===!1&&r.server_no_context_takeover||r.server_max_window_bits&&(t.serverMaxWindowBits===!1||typeof t.serverMaxWindowBits=="number"&&t.serverMaxWindowBits>r.server_max_window_bits)||typeof t.clientMaxWindowBits=="number"&&!r.client_max_window_bits));if(!i)throw new Error("None of the extension offers can be accepted");return t.serverNoContextTakeover&&(i.server_no_context_takeover=!0),t.clientNoContextTakeover&&(i.client_no_context_takeover=!0),typeof t.serverMaxWindowBits=="number"&&(i.server_max_window_bits=t.serverMaxWindowBits),typeof t.clientMaxWindowBits=="number"?i.client_max_window_bits=t.clientMaxWindowBits:(i.client_max_window_bits===!0||t.clientMaxWindowBits===!1)&&delete i.client_max_window_bits,i}acceptAsClient(e){let t=e[0];if(this._options.clientNoContextTakeover===!1&&t.client_no_context_takeover)throw new Error('Unexpected parameter "client_no_context_takeover"');if(!t.client_max_window_bits)typeof this._options.clientMaxWindowBits=="number"&&(t.client_max_window_bits=this._options.clientMaxWindowBits);else if(this._options.clientMaxWindowBits===!1||typeof this._options.clientMaxWindowBits=="number"&&t.client_max_window_bits>this._options.clientMaxWindowBits)throw new Error('Unexpected or invalid parameter "client_max_window_bits"');return t}normalizeParams(e){return e.forEach(t=>{Object.keys(t).forEach(i=>{let r=t[i];if(r.length>1)throw new Error(`Parameter "${i}" must have only a single value`);if(r=r[0],i==="client_max_window_bits"){if(r!==!0){let n=+r;if(!Number.isInteger(n)||n<8||n>15)throw new TypeError(`Invalid value for parameter "${i}": ${r}`);r=n}else if(!this._isServer)throw new TypeError(`Invalid value for parameter "${i}": ${r}`)}else if(i==="server_max_window_bits"){let n=+r;if(!Number.isInteger(n)||n<8||n>15)throw new TypeError(`Invalid value for parameter "${i}": ${r}`);r=n}else if(i==="client_no_context_takeover"||i==="server_no_context_takeover"){if(r!==!0)throw new TypeError(`Invalid value for parameter "${i}": ${r}`)}else throw new Error(`Unknown parameter "${i}"`);t[i]=r})}),e}decompress(e,t,i){Te.add(r=>{this._decompress(e,t,(n,o)=>{r(),i(n,o)})})}compress(e,t,i){Te.add(r=>{this._compress(e,t,(n,o)=>{r(),i(n,o)})})}_decompress(e,t,i){let r=this._isServer?"client":"server";if(!this._inflate){let n=`${r}_max_window_bits`,o=typeof this.params[n]!="number"?he.Z_DEFAULT_WINDOWBITS:this.params[n];this._inflate=he.createInflateRaw({...this._options.zlibInflateOptions,windowBits:o}),this._inflate[Me]=this,this._inflate[R]=0,this._inflate[U]=[],this._inflate.on("error",_i),this._inflate.on("data",Gt)}this._inflate[K]=i,this._inflate.write(e),t&&this._inflate.write(bi),this._inflate.flush(()=>{let n=this._inflate[X];if(n){this._inflate.close(),this._inflate=null,i(n);return}let o=qt.concat(this._inflate[U],this._inflate[R]);this._inflate._readableState.endEmitted?(this._inflate.close(),this._inflate=null):(this._inflate[R]=0,this._inflate[U]=[],t&&this.params[`${r}_no_context_takeover`]&&this._inflate.reset()),i(null,o)})}_compress(e,t,i){let r=this._isServer?"server":"client";if(!this._deflate){let n=`${r}_max_window_bits`,o=typeof this.params[n]!="number"?he.Z_DEFAULT_WINDOWBITS:this.params[n];this._deflate=he.createDeflateRaw({...this._options.zlibDeflateOptions,windowBits:o}),this._deflate[R]=0,this._deflate[U]=[],this._deflate.on("data",wi)}this._deflate[K]=i,this._deflate.write(e),this._deflate.flush(he.Z_SYNC_FLUSH,()=>{if(!this._deflate)return;let n=qt.concat(this._deflate[U],this._deflate[R]);t&&(n=new yi(n.buffer,n.byteOffset,n.length-4)),this._deflate[K]=null,this._deflate[R]=0,this._deflate[U]=[],t&&this.params[`${r}_no_context_takeover`]&&this._deflate.reset(),i(null,n)})}};Vt.exports=tt;function wi(s){this[U].push(s),this[R]+=s.length}function Gt(s){if(this[R]+=s.length,this[Me]._maxPayload<1||this[R]<=this[Me]._maxPayload){this[U].push(s);return}this[X]=new RangeError("Max payload size exceeded"),this[X].code="WS_ERR_UNSUPPORTED_MESSAGE_LENGTH",this[X][jt]=1009,this.removeListener("data",Gt),this.reset()}function _i(s){if(this[Me]._inflate=null,this[X]){this[K](this[X]);return}s[jt]=1007,this[K](s)}});var Q=E((hn,Oe)=>{"use strict";var{isUtf8:zt}=require("buffer"),{hasBlob:xi}=I(),Si=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,1,1,1,1,0,0,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1,0];function Ei(s){return s>=1e3&&s<=1014&&s!==1004&&s!==1005&&s!==1006||s>=3e3&&s<=4999}function st(s){let e=s.length,t=0;for(;t<e;)if(!(s[t]&128))t++;else if((s[t]&224)===192){if(t+1===e||(s[t+1]&192)!==128||(s[t]&254)===192)return!1;t+=2}else if((s[t]&240)===224){if(t+2>=e||(s[t+1]&192)!==128||(s[t+2]&192)!==128||s[t]===224&&(s[t+1]&224)===128||s[t]===237&&(s[t+1]&224)===160)return!1;t+=3}else if((s[t]&248)===240){if(t+3>=e||(s[t+1]&192)!==128||(s[t+2]&192)!==128||(s[t+3]&192)!==128||s[t]===240&&(s[t+1]&240)===128||s[t]===244&&s[t+1]>143||s[t]>244)return!1;t+=4}else return!1;return!0}function ki(s){return xi&&typeof s=="object"&&typeof s.arrayBuffer=="function"&&typeof s.type=="string"&&typeof s.stream=="function"&&(s[Symbol.toStringTag]==="Blob"||s[Symbol.toStringTag]==="File")}Oe.exports={isBlob:ki,isValidStatusCode:Ei,isValidUTF8:st,tokenChars:Si};if(zt)Oe.exports.isValidUTF8=function(s){return s.length<24?st(s):zt(s)};else if(!process.env.WS_NO_UTF_8_VALIDATE)try{let s=require("utf-8-validate");Oe.exports.isValidUTF8=function(e){return e.length<32?st(e):s(e)}}catch{}});var at=E((fn,Qt)=>{"use strict";var{Writable:Ci}=require("stream"),Ht=Z(),{BINARY_TYPES:Pi,EMPTY_BUFFER:Jt,kStatusCode:Ti,kWebSocket:Mi}=I(),{concat:it,toArrayBuffer:Oi,unmask:Li}=de(),{isValidStatusCode:Di,isValidUTF8:Yt}=Q(),Le=Buffer[Symbol.species],P=0,Kt=1,Xt=2,Zt=3,rt=4,nt=5,De=6,ot=class extends Ci{constructor(e={}){super(),this._allowSynchronousEvents=e.allowSynchronousEvents!==void 0?e.allowSynchronousEvents:!0,this._binaryType=e.binaryType||Pi[0],this._extensions=e.extensions||{},this._isServer=!!e.isServer,this._maxPayload=e.maxPayload|0,this._skipUTF8Validation=!!e.skipUTF8Validation,this[Mi]=void 0,this._bufferedBytes=0,this._buffers=[],this._compressed=!1,this._payloadLength=0,this._mask=void 0,this._fragmented=0,this._masked=!1,this._fin=!1,this._opcode=0,this._totalPayloadLength=0,this._messageLength=0,this._fragments=[],this._errored=!1,this._loop=!1,this._state=P}_write(e,t,i){if(this._opcode===8&&this._state==P)return i();this._bufferedBytes+=e.length,this._buffers.push(e),this.startLoop(i)}consume(e){if(this._bufferedBytes-=e,e===this._buffers[0].length)return this._buffers.shift();if(e<this._buffers[0].length){let i=this._buffers[0];return this._buffers[0]=new Le(i.buffer,i.byteOffset+e,i.length-e),new Le(i.buffer,i.byteOffset,e)}let t=Buffer.allocUnsafe(e);do{let i=this._buffers[0],r=t.length-e;e>=i.length?t.set(this._buffers.shift(),r):(t.set(new Uint8Array(i.buffer,i.byteOffset,e),r),this._buffers[0]=new Le(i.buffer,i.byteOffset+e,i.length-e)),e-=i.length}while(e>0);return t}startLoop(e){this._loop=!0;do switch(this._state){case P:this.getInfo(e);break;case Kt:this.getPayloadLength16(e);break;case Xt:this.getPayloadLength64(e);break;case Zt:this.getMask();break;case rt:this.getData(e);break;case nt:case De:this._loop=!1;return}while(this._loop);this._errored||e()}getInfo(e){if(this._bufferedBytes<2){this._loop=!1;return}let t=this.consume(2);if(t[0]&48){let r=this.createError(RangeError,"RSV2 and RSV3 must be clear",!0,1002,"WS_ERR_UNEXPECTED_RSV_2_3");e(r);return}let i=(t[0]&64)===64;if(i&&!this._extensions[Ht.extensionName]){let r=this.createError(RangeError,"RSV1 must be clear",!0,1002,"WS_ERR_UNEXPECTED_RSV_1");e(r);return}if(this._fin=(t[0]&128)===128,this._opcode=t[0]&15,this._payloadLength=t[1]&127,this._opcode===0){if(i){let r=this.createError(RangeError,"RSV1 must be clear",!0,1002,"WS_ERR_UNEXPECTED_RSV_1");e(r);return}if(!this._fragmented){let r=this.createError(RangeError,"invalid opcode 0",!0,1002,"WS_ERR_INVALID_OPCODE");e(r);return}this._opcode=this._fragmented}else if(this._opcode===1||this._opcode===2){if(this._fragmented){let r=this.createError(RangeError,`invalid opcode ${this._opcode}`,!0,1002,"WS_ERR_INVALID_OPCODE");e(r);return}this._compressed=i}else if(this._opcode>7&&this._opcode<11){if(!this._fin){let r=this.createError(RangeError,"FIN must be set",!0,1002,"WS_ERR_EXPECTED_FIN");e(r);return}if(i){let r=this.createError(RangeError,"RSV1 must be clear",!0,1002,"WS_ERR_UNEXPECTED_RSV_1");e(r);return}if(this._payloadLength>125||this._opcode===8&&this._payloadLength===1){let r=this.createError(RangeError,`invalid payload length ${this._payloadLength}`,!0,1002,"WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH");e(r);return}}else{let r=this.createError(RangeError,`invalid opcode ${this._opcode}`,!0,1002,"WS_ERR_INVALID_OPCODE");e(r);return}if(!this._fin&&!this._fragmented&&(this._fragmented=this._opcode),this._masked=(t[1]&128)===128,this._isServer){if(!this._masked){let r=this.createError(RangeError,"MASK must be set",!0,1002,"WS_ERR_EXPECTED_MASK");e(r);return}}else if(this._masked){let r=this.createError(RangeError,"MASK must be clear",!0,1002,"WS_ERR_UNEXPECTED_MASK");e(r);return}this._payloadLength===126?this._state=Kt:this._payloadLength===127?this._state=Xt:this.haveLength(e)}getPayloadLength16(e){if(this._bufferedBytes<2){this._loop=!1;return}this._payloadLength=this.consume(2).readUInt16BE(0),this.haveLength(e)}getPayloadLength64(e){if(this._bufferedBytes<8){this._loop=!1;return}let t=this.consume(8),i=t.readUInt32BE(0);if(i>Math.pow(2,21)-1){let r=this.createError(RangeError,"Unsupported WebSocket frame: payload length > 2^53 - 1",!1,1009,"WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH");e(r);return}this._payloadLength=i*Math.pow(2,32)+t.readUInt32BE(4),this.haveLength(e)}haveLength(e){if(this._payloadLength&&this._opcode<8&&(this._totalPayloadLength+=this._payloadLength,this._totalPayloadLength>this._maxPayload&&this._maxPayload>0)){let t=this.createError(RangeError,"Max payload size exceeded",!1,1009,"WS_ERR_UNSUPPORTED_MESSAGE_LENGTH");e(t);return}this._masked?this._state=Zt:this._state=rt}getMask(){if(this._bufferedBytes<4){this._loop=!1;return}this._mask=this.consume(4),this._state=rt}getData(e){let t=Jt;if(this._payloadLength){if(this._bufferedBytes<this._payloadLength){this._loop=!1;return}t=this.consume(this._payloadLength),this._masked&&this._mask[0]|this._mask[1]|this._mask[2]|this._mask[3]&&Li(t,this._mask)}if(this._opcode>7){this.controlMessage(t,e);return}if(this._compressed){this._state=nt,this.decompress(t,e);return}t.length&&(this._messageLength=this._totalPayloadLength,this._fragments.push(t)),this.dataMessage(e)}decompress(e,t){this._extensions[Ht.extensionName].decompress(e,this._fin,(r,n)=>{if(r)return t(r);if(n.length){if(this._messageLength+=n.length,this._messageLength>this._maxPayload&&this._maxPayload>0){let o=this.createError(RangeError,"Max payload size exceeded",!1,1009,"WS_ERR_UNSUPPORTED_MESSAGE_LENGTH");t(o);return}this._fragments.push(n)}this.dataMessage(t),this._state===P&&this.startLoop(t)})}dataMessage(e){if(!this._fin){this._state=P;return}let t=this._messageLength,i=this._fragments;if(this._totalPayloadLength=0,this._messageLength=0,this._fragmented=0,this._fragments=[],this._opcode===2){let r;this._binaryType==="nodebuffer"?r=it(i,t):this._binaryType==="arraybuffer"?r=Oi(it(i,t)):this._binaryType==="blob"?r=new Blob(i):r=i,this._allowSynchronousEvents?(this.emit("message",r,!0),this._state=P):(this._state=De,setImmediate(()=>{this.emit("message",r,!0),this._state=P,this.startLoop(e)}))}else{let r=it(i,t);if(!this._skipUTF8Validation&&!Yt(r)){let n=this.createError(Error,"invalid UTF-8 sequence",!0,1007,"WS_ERR_INVALID_UTF8");e(n);return}this._state===nt||this._allowSynchronousEvents?(this.emit("message",r,!1),this._state=P):(this._state=De,setImmediate(()=>{this.emit("message",r,!1),this._state=P,this.startLoop(e)}))}}controlMessage(e,t){if(this._opcode===8){if(e.length===0)this._loop=!1,this.emit("conclude",1005,Jt),this.end();else{let i=e.readUInt16BE(0);if(!Di(i)){let n=this.createError(RangeError,`invalid status code ${i}`,!0,1002,"WS_ERR_INVALID_CLOSE_CODE");t(n);return}let r=new Le(e.buffer,e.byteOffset+2,e.length-2);if(!this._skipUTF8Validation&&!Yt(r)){let n=this.createError(Error,"invalid UTF-8 sequence",!0,1007,"WS_ERR_INVALID_UTF8");t(n);return}this._loop=!1,this.emit("conclude",i,r),this.end()}this._state=P;return}this._allowSynchronousEvents?(this.emit(this._opcode===9?"ping":"pong",e),this._state=P):(this._state=De,setImmediate(()=>{this.emit(this._opcode===9?"ping":"pong",e),this._state=P,this.startLoop(t)}))}createError(e,t,i,r,n){this._loop=!1,this._errored=!0;let o=new e(i?`Invalid WebSocket frame: ${t}`:t);return Error.captureStackTrace(o,this.createError),o.code=n,o[Ti]=r,o}};Qt.exports=ot});var dt=E((pn,ss)=>{"use strict";var{Duplex:un}=require("stream"),{randomFillSync:Ii}=require("crypto"),es=Z(),{EMPTY_BUFFER:Ri,kWebSocket:Wi,NOOP:Fi}=I(),{isBlob:ee,isValidStatusCode:Ni}=Q(),{mask:ts,toBuffer:q}=de(),T=Symbol("kByteLength"),Ui=Buffer.alloc(4),Ie=8*1024,j,te=Ie,M=0,Bi=1,$i=2,ct=class s{constructor(e,t,i){this._extensions=t||{},i&&(this._generateMask=i,this._maskBuffer=Buffer.alloc(4)),this._socket=e,this._firstFragment=!0,this._compress=!1,this._bufferedBytes=0,this._queue=[],this._state=M,this.onerror=Fi,this[Wi]=void 0}static frame(e,t){let i,r=!1,n=2,o=!1;t.mask&&(i=t.maskBuffer||Ui,t.generateMask?t.generateMask(i):(te===Ie&&(j===void 0&&(j=Buffer.alloc(Ie)),Ii(j,0,Ie),te=0),i[0]=j[te++],i[1]=j[te++],i[2]=j[te++],i[3]=j[te++]),o=(i[0]|i[1]|i[2]|i[3])===0,n=6);let a;typeof e=="string"?(!t.mask||o)&&t[T]!==void 0?a=t[T]:(e=Buffer.from(e),a=e.length):(a=e.length,r=t.mask&&t.readOnly&&!o);let l=a;a>=65536?(n+=8,l=127):a>125&&(n+=2,l=126);let c=Buffer.allocUnsafe(r?a+n:n);return c[0]=t.fin?t.opcode|128:t.opcode,t.rsv1&&(c[0]|=64),c[1]=l,l===126?c.writeUInt16BE(a,2):l===127&&(c[2]=c[3]=0,c.writeUIntBE(a,4,6)),t.mask?(c[1]|=128,c[n-4]=i[0],c[n-3]=i[1],c[n-2]=i[2],c[n-1]=i[3],o?[c,e]:r?(ts(e,i,c,n,a),[c]):(ts(e,i,e,0,a),[c,e])):[c,e]}close(e,t,i,r){let n;if(e===void 0)n=Ri;else{if(typeof e!="number"||!Ni(e))throw new TypeError("First argument must be a valid error code number");if(t===void 0||!t.length)n=Buffer.allocUnsafe(2),n.writeUInt16BE(e,0);else{let a=Buffer.byteLength(t);if(a>123)throw new RangeError("The message must not be greater than 123 bytes");n=Buffer.allocUnsafe(2+a),n.writeUInt16BE(e,0),typeof t=="string"?n.write(t,2):n.set(t,2)}}let o={[T]:n.length,fin:!0,generateMask:this._generateMask,mask:i,maskBuffer:this._maskBuffer,opcode:8,readOnly:!1,rsv1:!1};this._state!==M?this.enqueue([this.dispatch,n,!1,o,r]):this.sendFrame(s.frame(n,o),r)}ping(e,t,i){let r,n;if(typeof e=="string"?(r=Buffer.byteLength(e),n=!1):ee(e)?(r=e.size,n=!1):(e=q(e),r=e.length,n=q.readOnly),r>125)throw new RangeError("The data size must not be greater than 125 bytes");let o={[T]:r,fin:!0,generateMask:this._generateMask,mask:t,maskBuffer:this._maskBuffer,opcode:9,readOnly:n,rsv1:!1};ee(e)?this._state!==M?this.enqueue([this.getBlobData,e,!1,o,i]):this.getBlobData(e,!1,o,i):this._state!==M?this.enqueue([this.dispatch,e,!1,o,i]):this.sendFrame(s.frame(e,o),i)}pong(e,t,i){let r,n;if(typeof e=="string"?(r=Buffer.byteLength(e),n=!1):ee(e)?(r=e.size,n=!1):(e=q(e),r=e.length,n=q.readOnly),r>125)throw new RangeError("The data size must not be greater than 125 bytes");let o={[T]:r,fin:!0,generateMask:this._generateMask,mask:t,maskBuffer:this._maskBuffer,opcode:10,readOnly:n,rsv1:!1};ee(e)?this._state!==M?this.enqueue([this.getBlobData,e,!1,o,i]):this.getBlobData(e,!1,o,i):this._state!==M?this.enqueue([this.dispatch,e,!1,o,i]):this.sendFrame(s.frame(e,o),i)}send(e,t,i){let r=this._extensions[es.extensionName],n=t.binary?2:1,o=t.compress,a,l;typeof e=="string"?(a=Buffer.byteLength(e),l=!1):ee(e)?(a=e.size,l=!1):(e=q(e),a=e.length,l=q.readOnly),this._firstFragment?(this._firstFragment=!1,o&&r&&r.params[r._isServer?"server_no_context_takeover":"client_no_context_takeover"]&&(o=a>=r._threshold),this._compress=o):(o=!1,n=0),t.fin&&(this._firstFragment=!0);let c={[T]:a,fin:t.fin,generateMask:this._generateMask,mask:t.mask,maskBuffer:this._maskBuffer,opcode:n,readOnly:l,rsv1:o};ee(e)?this._state!==M?this.enqueue([this.getBlobData,e,this._compress,c,i]):this.getBlobData(e,this._compress,c,i):this._state!==M?this.enqueue([this.dispatch,e,this._compress,c,i]):this.dispatch(e,this._compress,c,i)}getBlobData(e,t,i,r){this._bufferedBytes+=i[T],this._state=$i,e.arrayBuffer().then(n=>{if(this._socket.destroyed){let a=new Error("The socket was closed while the blob was being read");process.nextTick(lt,this,a,r);return}this._bufferedBytes-=i[T];let o=q(n);t?this.dispatch(o,t,i,r):(this._state=M,this.sendFrame(s.frame(o,i),r),this.dequeue())}).catch(n=>{process.nextTick(Ai,this,n,r)})}dispatch(e,t,i,r){if(!t){this.sendFrame(s.frame(e,i),r);return}let n=this._extensions[es.extensionName];this._bufferedBytes+=i[T],this._state=Bi,n.compress(e,i.fin,(o,a)=>{if(this._socket.destroyed){let l=new Error("The socket was closed while data was being compressed");lt(this,l,r);return}this._bufferedBytes-=i[T],this._state=M,i.readOnly=!1,this.sendFrame(s.frame(a,i),r),this.dequeue()})}dequeue(){for(;this._state===M&&this._queue.length;){let e=this._queue.shift();this._bufferedBytes-=e[3][T],Reflect.apply(e[0],this,e.slice(1))}}enqueue(e){this._bufferedBytes+=e[3][T],this._queue.push(e)}sendFrame(e,t){e.length===2?(this._socket.cork(),this._socket.write(e[0]),this._socket.write(e[1],t),this._socket.uncork()):this._socket.write(e[0],t)}};ss.exports=ct;function lt(s,e,t){typeof t=="function"&&t(e);for(let i=0;i<s._queue.length;i++){let r=s._queue[i],n=r[r.length-1];typeof n=="function"&&n(e)}}function Ai(s,e,t){lt(s,e,t),s.onerror(e)}});var hs=E((gn,ds)=>{"use strict";var{kForOnEventAttribute:fe,kListener:ht}=I(),is=Symbol("kCode"),rs=Symbol("kData"),ns=Symbol("kError"),os=Symbol("kMessage"),as=Symbol("kReason"),se=Symbol("kTarget"),cs=Symbol("kType"),ls=Symbol("kWasClean"),W=class{constructor(e){this[se]=null,this[cs]=e}get target(){return this[se]}get type(){return this[cs]}};Object.defineProperty(W.prototype,"target",{enumerable:!0});Object.defineProperty(W.prototype,"type",{enumerable:!0});var G=class extends W{constructor(e,t={}){super(e),this[is]=t.code===void 0?0:t.code,this[as]=t.reason===void 0?"":t.reason,this[ls]=t.wasClean===void 0?!1:t.wasClean}get code(){return this[is]}get reason(){return this[as]}get wasClean(){return this[ls]}};Object.defineProperty(G.prototype,"code",{enumerable:!0});Object.defineProperty(G.prototype,"reason",{enumerable:!0});Object.defineProperty(G.prototype,"wasClean",{enumerable:!0});var ie=class extends W{constructor(e,t={}){super(e),this[ns]=t.error===void 0?null:t.error,this[os]=t.message===void 0?"":t.message}get error(){return this[ns]}get message(){return this[os]}};Object.defineProperty(ie.prototype,"error",{enumerable:!0});Object.defineProperty(ie.prototype,"message",{enumerable:!0});var ue=class extends W{constructor(e,t={}){super(e),this[rs]=t.data===void 0?null:t.data}get data(){return this[rs]}};Object.defineProperty(ue.prototype,"data",{enumerable:!0});var qi={addEventListener(s,e,t={}){for(let r of this.listeners(s))if(!t[fe]&&r[ht]===e&&!r[fe])return;let i;if(s==="message")i=function(n,o){let a=new ue("message",{data:o?n:n.toString()});a[se]=this,Re(e,this,a)};else if(s==="close")i=function(n,o){let a=new G("close",{code:n,reason:o.toString(),wasClean:this._closeFrameReceived&&this._closeFrameSent});a[se]=this,Re(e,this,a)};else if(s==="error")i=function(n){let o=new ie("error",{error:n,message:n.message});o[se]=this,Re(e,this,o)};else if(s==="open")i=function(){let n=new W("open");n[se]=this,Re(e,this,n)};else return;i[fe]=!!t[fe],i[ht]=e,t.once?this.once(s,i):this.on(s,i)},removeEventListener(s,e){for(let t of this.listeners(s))if(t[ht]===e&&!t[fe]){this.removeListener(s,t);break}}};ds.exports={CloseEvent:G,ErrorEvent:ie,Event:W,EventTarget:qi,MessageEvent:ue};function Re(s,e,t){typeof s=="object"&&s.handleEvent?s.handleEvent.call(s,t):s.call(e,t)}});var We=E((mn,fs)=>{"use strict";var{tokenChars:pe}=Q();function L(s,e,t){s[e]===void 0?s[e]=[t]:s[e].push(t)}function ji(s){let e=Object.create(null),t=Object.create(null),i=!1,r=!1,n=!1,o,a,l=-1,c=-1,d=-1,h=0;for(;h<s.length;h++)if(c=s.charCodeAt(h),o===void 0)if(d===-1&&pe[c]===1)l===-1&&(l=h);else if(h!==0&&(c===32||c===9))d===-1&&l!==-1&&(d=h);else if(c===59||c===44){if(l===-1)throw new SyntaxError(`Unexpected character at index ${h}`);d===-1&&(d=h);let w=s.slice(l,d);c===44?(L(e,w,t),t=Object.create(null)):o=w,l=d=-1}else throw new SyntaxError(`Unexpected character at index ${h}`);else if(a===void 0)if(d===-1&&pe[c]===1)l===-1&&(l=h);else if(c===32||c===9)d===-1&&l!==-1&&(d=h);else if(c===59||c===44){if(l===-1)throw new SyntaxError(`Unexpected character at index ${h}`);d===-1&&(d=h),L(t,s.slice(l,d),!0),c===44&&(L(e,o,t),t=Object.create(null),o=void 0),l=d=-1}else if(c===61&&l!==-1&&d===-1)a=s.slice(l,h),l=d=-1;else throw new SyntaxError(`Unexpected character at index ${h}`);else if(r){if(pe[c]!==1)throw new SyntaxError(`Unexpected character at index ${h}`);l===-1?l=h:i||(i=!0),r=!1}else if(n)if(pe[c]===1)l===-1&&(l=h);else if(c===34&&l!==-1)n=!1,d=h;else if(c===92)r=!0;else throw new SyntaxError(`Unexpected character at index ${h}`);else if(c===34&&s.charCodeAt(h-1)===61)n=!0;else if(d===-1&&pe[c]===1)l===-1&&(l=h);else if(l!==-1&&(c===32||c===9))d===-1&&(d=h);else if(c===59||c===44){if(l===-1)throw new SyntaxError(`Unexpected character at index ${h}`);d===-1&&(d=h);let w=s.slice(l,d);i&&(w=w.replace(/\\/g,""),i=!1),L(t,a,w),c===44&&(L(e,o,t),t=Object.create(null),o=void 0),a=void 0,l=d=-1}else throw new SyntaxError(`Unexpected character at index ${h}`);if(l===-1||n||c===32||c===9)throw new SyntaxError("Unexpected end of input");d===-1&&(d=h);let y=s.slice(l,d);return o===void 0?L(e,y,t):(a===void 0?L(t,y,!0):i?L(t,a,y.replace(/\\/g,"")):L(t,a,y),L(e,o,t)),e}function Gi(s){return Object.keys(s).map(e=>{let t=s[e];return Array.isArray(t)||(t=[t]),t.map(i=>[e].concat(Object.keys(i).map(r=>{let n=i[r];return Array.isArray(n)||(n=[n]),n.map(o=>o===!0?r:`${r}=${o}`).join("; ")})).join("; ")).join(", ")}).join(", ")}fs.exports={format:Gi,parse:ji}});var Be=E((bn,Es)=>{"use strict";var Vi=require("events"),zi=require("https"),Hi=require("http"),gs=require("net"),Ji=require("tls"),{randomBytes:Yi,createHash:Ki}=require("crypto"),{Duplex:vn,Readable:yn}=require("stream"),{URL:ft}=require("url"),B=Z(),Xi=at(),Zi=dt(),{isBlob:Qi}=Q(),{BINARY_TYPES:us,CLOSE_TIMEOUT:er,EMPTY_BUFFER:Fe,GUID:tr,kForOnEventAttribute:ut,kListener:sr,kStatusCode:ir,kWebSocket:_,NOOP:ms}=I(),{EventTarget:{addEventListener:rr,removeEventListener:nr}}=hs(),{format:or,parse:ar}=We(),{toBuffer:cr}=de(),vs=Symbol("kAborted"),pt=[8,13],F=["CONNECTING","OPEN","CLOSING","CLOSED"],lr=/^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/,m=class s extends Vi{constructor(e,t,i){super(),this._binaryType=us[0],this._closeCode=1006,this._closeFrameReceived=!1,this._closeFrameSent=!1,this._closeMessage=Fe,this._closeTimer=null,this._errorEmitted=!1,this._extensions={},this._paused=!1,this._protocol="",this._readyState=s.CONNECTING,this._receiver=null,this._sender=null,this._socket=null,e!==null?(this._bufferedAmount=0,this._isServer=!1,this._redirects=0,t===void 0?t=[]:Array.isArray(t)||(typeof t=="object"&&t!==null?(i=t,t=[]):t=[t]),ys(this,e,t,i)):(this._autoPong=i.autoPong,this._closeTimeout=i.closeTimeout,this._isServer=!0)}get binaryType(){return this._binaryType}set binaryType(e){us.includes(e)&&(this._binaryType=e,this._receiver&&(this._receiver._binaryType=e))}get bufferedAmount(){return this._socket?this._socket._writableState.length+this._sender._bufferedBytes:this._bufferedAmount}get extensions(){return Object.keys(this._extensions).join()}get isPaused(){return this._paused}get onclose(){return null}get onerror(){return null}get onopen(){return null}get onmessage(){return null}get protocol(){return this._protocol}get readyState(){return this._readyState}get url(){return this._url}setSocket(e,t,i){let r=new Xi({allowSynchronousEvents:i.allowSynchronousEvents,binaryType:this.binaryType,extensions:this._extensions,isServer:this._isServer,maxPayload:i.maxPayload,skipUTF8Validation:i.skipUTF8Validation}),n=new Zi(e,this._extensions,i.generateMask);this._receiver=r,this._sender=n,this._socket=e,r[_]=this,n[_]=this,e[_]=this,r.on("conclude",fr),r.on("drain",ur),r.on("error",pr),r.on("message",gr),r.on("ping",mr),r.on("pong",vr),n.onerror=yr,e.setTimeout&&e.setTimeout(0),e.setNoDelay&&e.setNoDelay(),t.length>0&&e.unshift(t),e.on("close",_s),e.on("data",Ue),e.on("end",xs),e.on("error",Ss),this._readyState=s.OPEN,this.emit("open")}emitClose(){if(!this._socket){this._readyState=s.CLOSED,this.emit("close",this._closeCode,this._closeMessage);return}this._extensions[B.extensionName]&&this._extensions[B.extensionName].cleanup(),this._receiver.removeAllListeners(),this._readyState=s.CLOSED,this.emit("close",this._closeCode,this._closeMessage)}close(e,t){if(this.readyState!==s.CLOSED){if(this.readyState===s.CONNECTING){k(this,this._req,"WebSocket was closed before the connection was established");return}if(this.readyState===s.CLOSING){this._closeFrameSent&&(this._closeFrameReceived||this._receiver._writableState.errorEmitted)&&this._socket.end();return}this._readyState=s.CLOSING,this._sender.close(e,t,!this._isServer,i=>{i||(this._closeFrameSent=!0,(this._closeFrameReceived||this._receiver._writableState.errorEmitted)&&this._socket.end())}),ws(this)}}pause(){this.readyState===s.CONNECTING||this.readyState===s.CLOSED||(this._paused=!0,this._socket.pause())}ping(e,t,i){if(this.readyState===s.CONNECTING)throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");if(typeof e=="function"?(i=e,e=t=void 0):typeof t=="function"&&(i=t,t=void 0),typeof e=="number"&&(e=e.toString()),this.readyState!==s.OPEN){gt(this,e,i);return}t===void 0&&(t=!this._isServer),this._sender.ping(e||Fe,t,i)}pong(e,t,i){if(this.readyState===s.CONNECTING)throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");if(typeof e=="function"?(i=e,e=t=void 0):typeof t=="function"&&(i=t,t=void 0),typeof e=="number"&&(e=e.toString()),this.readyState!==s.OPEN){gt(this,e,i);return}t===void 0&&(t=!this._isServer),this._sender.pong(e||Fe,t,i)}resume(){this.readyState===s.CONNECTING||this.readyState===s.CLOSED||(this._paused=!1,this._receiver._writableState.needDrain||this._socket.resume())}send(e,t,i){if(this.readyState===s.CONNECTING)throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");if(typeof t=="function"&&(i=t,t={}),typeof e=="number"&&(e=e.toString()),this.readyState!==s.OPEN){gt(this,e,i);return}let r={binary:typeof e!="string",mask:!this._isServer,compress:!0,fin:!0,...t};this._extensions[B.extensionName]||(r.compress=!1),this._sender.send(e||Fe,r,i)}terminate(){if(this.readyState!==s.CLOSED){if(this.readyState===s.CONNECTING){k(this,this._req,"WebSocket was closed before the connection was established");return}this._socket&&(this._readyState=s.CLOSING,this._socket.destroy())}}};Object.defineProperty(m,"CONNECTING",{enumerable:!0,value:F.indexOf("CONNECTING")});Object.defineProperty(m.prototype,"CONNECTING",{enumerable:!0,value:F.indexOf("CONNECTING")});Object.defineProperty(m,"OPEN",{enumerable:!0,value:F.indexOf("OPEN")});Object.defineProperty(m.prototype,"OPEN",{enumerable:!0,value:F.indexOf("OPEN")});Object.defineProperty(m,"CLOSING",{enumerable:!0,value:F.indexOf("CLOSING")});Object.defineProperty(m.prototype,"CLOSING",{enumerable:!0,value:F.indexOf("CLOSING")});Object.defineProperty(m,"CLOSED",{enumerable:!0,value:F.indexOf("CLOSED")});Object.defineProperty(m.prototype,"CLOSED",{enumerable:!0,value:F.indexOf("CLOSED")});["binaryType","bufferedAmount","extensions","isPaused","protocol","readyState","url"].forEach(s=>{Object.defineProperty(m.prototype,s,{enumerable:!0})});["open","error","close","message"].forEach(s=>{Object.defineProperty(m.prototype,`on${s}`,{enumerable:!0,get(){for(let e of this.listeners(s))if(e[ut])return e[sr];return null},set(e){for(let t of this.listeners(s))if(t[ut]){this.removeListener(s,t);break}typeof e=="function"&&this.addEventListener(s,e,{[ut]:!0})}})});m.prototype.addEventListener=rr;m.prototype.removeEventListener=nr;Es.exports=m;function ys(s,e,t,i){let r={allowSynchronousEvents:!0,autoPong:!0,closeTimeout:er,protocolVersion:pt[1],maxPayload:104857600,skipUTF8Validation:!1,perMessageDeflate:!0,followRedirects:!1,maxRedirects:10,...i,socketPath:void 0,hostname:void 0,protocol:void 0,timeout:void 0,method:"GET",host:void 0,path:void 0,port:void 0};if(s._autoPong=r.autoPong,s._closeTimeout=r.closeTimeout,!pt.includes(r.protocolVersion))throw new RangeError(`Unsupported protocol version: ${r.protocolVersion} (supported versions: ${pt.join(", ")})`);let n;if(e instanceof ft)n=e;else try{n=new ft(e)}catch{throw new SyntaxError(`Invalid URL: ${e}`)}n.protocol==="http:"?n.protocol="ws:":n.protocol==="https:"&&(n.protocol="wss:"),s._url=n.href;let o=n.protocol==="wss:",a=n.protocol==="ws+unix:",l;if(n.protocol!=="ws:"&&!o&&!a?l=`The URL's protocol must be one of "ws:", "wss:", "http:", "https:", or "ws+unix:"`:a&&!n.pathname?l="The URL's pathname is empty":n.hash&&(l="The URL contains a fragment identifier"),l){let u=new SyntaxError(l);if(s._redirects===0)throw u;Ne(s,u);return}let c=o?443:80,d=Yi(16).toString("base64"),h=o?zi.request:Hi.request,y=new Set,w;if(r.createConnection=r.createConnection||(o?hr:dr),r.defaultPort=r.defaultPort||c,r.port=n.port||c,r.host=n.hostname.startsWith("[")?n.hostname.slice(1,-1):n.hostname,r.headers={...r.headers,"Sec-WebSocket-Version":r.protocolVersion,"Sec-WebSocket-Key":d,Connection:"Upgrade",Upgrade:"websocket"},r.path=n.pathname+n.search,r.timeout=r.handshakeTimeout,r.perMessageDeflate&&(w=new B({...r.perMessageDeflate,isServer:!1,maxPayload:r.maxPayload}),r.headers["Sec-WebSocket-Extensions"]=or({[B.extensionName]:w.offer()})),t.length){for(let u of t){if(typeof u!="string"||!lr.test(u)||y.has(u))throw new SyntaxError("An invalid or duplicated subprotocol was specified");y.add(u)}r.headers["Sec-WebSocket-Protocol"]=t.join(",")}if(r.origin&&(r.protocolVersion<13?r.headers["Sec-WebSocket-Origin"]=r.origin:r.headers.Origin=r.origin),(n.username||n.password)&&(r.auth=`${n.username}:${n.password}`),a){let u=r.path.split(":");r.socketPath=u[0],r.path=u[1]}let b;if(r.followRedirects){if(s._redirects===0){s._originalIpc=a,s._originalSecure=o,s._originalHostOrSocketPath=a?r.socketPath:n.host;let u=i&&i.headers;if(i={...i,headers:{}},u)for(let[x,J]of Object.entries(u))i.headers[x.toLowerCase()]=J}else if(s.listenerCount("redirect")===0){let u=a?s._originalIpc?r.socketPath===s._originalHostOrSocketPath:!1:s._originalIpc?!1:n.host===s._originalHostOrSocketPath;(!u||s._originalSecure&&!o)&&(delete r.headers.authorization,delete r.headers.cookie,u||delete r.headers.host,r.auth=void 0)}r.auth&&!i.headers.authorization&&(i.headers.authorization="Basic "+Buffer.from(r.auth).toString("base64")),b=s._req=h(r),s._redirects&&s.emit("redirect",s.url,b)}else b=s._req=h(r);r.timeout&&b.on("timeout",()=>{k(s,b,"Opening handshake has timed out")}),b.on("error",u=>{b===null||b[vs]||(b=s._req=null,Ne(s,u))}),b.on("response",u=>{let x=u.headers.location,J=u.statusCode;if(x&&r.followRedirects&&J>=300&&J<400){if(++s._redirects>r.maxRedirects){k(s,b,"Maximum redirects exceeded");return}b.abort();let ne;try{ne=new ft(x,e)}catch{let Y=new SyntaxError(`Invalid URL: ${x}`);Ne(s,Y);return}ys(s,ne,t,i)}else s.emit("unexpected-response",b,u)||k(s,b,`Unexpected server response: ${u.statusCode}`)}),b.on("upgrade",(u,x,J)=>{if(s.emit("upgrade",u),s.readyState!==m.CONNECTING)return;b=s._req=null;let ne=u.headers.upgrade;if(ne===void 0||ne.toLowerCase()!=="websocket"){k(s,x,"Invalid Upgrade header");return}let kt=Ki("sha1").update(d+tr).digest("base64");if(u.headers["sec-websocket-accept"]!==kt){k(s,x,"Invalid Sec-WebSocket-Accept header");return}let Y=u.headers["sec-websocket-protocol"],oe;if(Y!==void 0?y.size?y.has(Y)||(oe="Server sent an invalid subprotocol"):oe="Server sent a subprotocol but none was requested":y.size&&(oe="Server sent no subprotocol"),oe){k(s,x,oe);return}Y&&(s._protocol=Y);let Ct=u.headers["sec-websocket-extensions"];if(Ct!==void 0){if(!w){k(s,x,"Server sent a Sec-WebSocket-Extensions header but no extension was requested");return}let Je;try{Je=ar(Ct)}catch{k(s,x,"Invalid Sec-WebSocket-Extensions header");return}let Pt=Object.keys(Je);if(Pt.length!==1||Pt[0]!==B.extensionName){k(s,x,"Server indicated an extension that was not requested");return}try{w.accept(Je[B.extensionName])}catch{k(s,x,"Invalid Sec-WebSocket-Extensions header");return}s._extensions[B.extensionName]=w}s.setSocket(x,J,{allowSynchronousEvents:r.allowSynchronousEvents,generateMask:r.generateMask,maxPayload:r.maxPayload,skipUTF8Validation:r.skipUTF8Validation})}),r.finishRequest?r.finishRequest(b,s):b.end()}function Ne(s,e){s._readyState=m.CLOSING,s._errorEmitted=!0,s.emit("error",e),s.emitClose()}function dr(s){return s.path=s.socketPath,gs.connect(s)}function hr(s){return s.path=void 0,!s.servername&&s.servername!==""&&(s.servername=gs.isIP(s.host)?"":s.host),Ji.connect(s)}function k(s,e,t){s._readyState=m.CLOSING;let i=new Error(t);Error.captureStackTrace(i,k),e.setHeader?(e[vs]=!0,e.abort(),e.socket&&!e.socket.destroyed&&e.socket.destroy(),process.nextTick(Ne,s,i)):(e.destroy(i),e.once("error",s.emit.bind(s,"error")),e.once("close",s.emitClose.bind(s)))}function gt(s,e,t){if(e){let i=Qi(e)?e.size:cr(e).length;s._socket?s._sender._bufferedBytes+=i:s._bufferedAmount+=i}if(t){let i=new Error(`WebSocket is not open: readyState ${s.readyState} (${F[s.readyState]})`);process.nextTick(t,i)}}function fr(s,e){let t=this[_];t._closeFrameReceived=!0,t._closeMessage=e,t._closeCode=s,t._socket[_]!==void 0&&(t._socket.removeListener("data",Ue),process.nextTick(bs,t._socket),s===1005?t.close():t.close(s,e))}function ur(){let s=this[_];s.isPaused||s._socket.resume()}function pr(s){let e=this[_];e._socket[_]!==void 0&&(e._socket.removeListener("data",Ue),process.nextTick(bs,e._socket),e.close(s[ir])),e._errorEmitted||(e._errorEmitted=!0,e.emit("error",s))}function ps(){this[_].emitClose()}function gr(s,e){this[_].emit("message",s,e)}function mr(s){let e=this[_];e._autoPong&&e.pong(s,!this._isServer,ms),e.emit("ping",s)}function vr(s){this[_].emit("pong",s)}function bs(s){s.resume()}function yr(s){let e=this[_];e.readyState!==m.CLOSED&&(e.readyState===m.OPEN&&(e._readyState=m.CLOSING,ws(e)),this._socket.end(),e._errorEmitted||(e._errorEmitted=!0,e.emit("error",s)))}function ws(s){s._closeTimer=setTimeout(s._socket.destroy.bind(s._socket),s._closeTimeout)}function _s(){let s=this[_];if(this.removeListener("close",_s),this.removeListener("data",Ue),this.removeListener("end",xs),s._readyState=m.CLOSING,!this._readableState.endEmitted&&!s._closeFrameReceived&&!s._receiver._writableState.errorEmitted&&this._readableState.length!==0){let e=this.read(this._readableState.length);s._receiver.write(e)}s._receiver.end(),this[_]=void 0,clearTimeout(s._closeTimer),s._receiver._writableState.finished||s._receiver._writableState.errorEmitted?s.emitClose():(s._receiver.on("error",ps),s._receiver.on("finish",ps))}function Ue(s){this[_]._receiver.write(s)||this.pause()}function xs(){let s=this[_];s._readyState=m.CLOSING,s._receiver.end(),this.end()}function Ss(){let s=this[_];this.removeListener("error",Ss),this.on("error",ms),s&&(s._readyState=m.CLOSING,this.destroy())}});var Ts=E((_n,Ps)=>{"use strict";var wn=Be(),{Duplex:br}=require("stream");function ks(s){s.emit("close")}function wr(){!this.destroyed&&this._writableState.finished&&this.destroy()}function Cs(s){this.removeListener("error",Cs),this.destroy(),this.listenerCount("error")===0&&this.emit("error",s)}function _r(s,e){let t=!0,i=new br({...e,autoDestroy:!1,emitClose:!1,objectMode:!1,writableObjectMode:!1});return s.on("message",function(n,o){let a=!o&&i._readableState.objectMode?n.toString():n;i.push(a)||s.pause()}),s.once("error",function(n){i.destroyed||(t=!1,i.destroy(n))}),s.once("close",function(){i.destroyed||i.push(null)}),i._destroy=function(r,n){if(s.readyState===s.CLOSED){n(r),process.nextTick(ks,i);return}let o=!1;s.once("error",function(l){o=!0,n(l)}),s.once("close",function(){o||n(r),process.nextTick(ks,i)}),t&&s.terminate()},i._final=function(r){if(s.readyState===s.CONNECTING){s.once("open",function(){i._final(r)});return}s._socket!==null&&(s._socket._writableState.finished?(r(),i._readableState.endEmitted&&i.destroy()):(s._socket.once("finish",function(){r()}),s.close()))},i._read=function(){s.isPaused&&s.resume()},i._write=function(r,n,o){if(s.readyState===s.CONNECTING){s.once("open",function(){i._write(r,n,o)});return}s.send(r,o)},i.on("end",wr),i.on("error",Cs),i}Ps.exports=_r});var mt=E((xn,Ms)=>{"use strict";var{tokenChars:xr}=Q();function Sr(s){let e=new Set,t=-1,i=-1,r=0;for(r;r<s.length;r++){let o=s.charCodeAt(r);if(i===-1&&xr[o]===1)t===-1&&(t=r);else if(r!==0&&(o===32||o===9))i===-1&&t!==-1&&(i=r);else if(o===44){if(t===-1)throw new SyntaxError(`Unexpected character at index ${r}`);i===-1&&(i=r);let a=s.slice(t,i);if(e.has(a))throw new SyntaxError(`The "${a}" subprotocol is duplicated`);e.add(a),t=i=-1}else throw new SyntaxError(`Unexpected character at index ${r}`)}if(t===-1||i!==-1)throw new SyntaxError("Unexpected end of input");let n=s.slice(t,r);if(e.has(n))throw new SyntaxError(`The "${n}" subprotocol is duplicated`);return e.add(n),e}Ms.exports={parse:Sr}});var Fs=E((En,Ws)=>{"use strict";var Er=require("events"),$e=require("http"),{Duplex:Sn}=require("stream"),{createHash:kr}=require("crypto"),Os=We(),V=Z(),Cr=mt(),Pr=Be(),{CLOSE_TIMEOUT:Tr,GUID:Mr,kWebSocket:Or}=I(),Lr=/^[+/0-9A-Za-z]{22}==$/,Ls=0,Ds=1,Rs=2,vt=class extends Er{constructor(e,t){if(super(),e={allowSynchronousEvents:!0,autoPong:!0,maxPayload:100*1024*1024,skipUTF8Validation:!1,perMessageDeflate:!1,handleProtocols:null,clientTracking:!0,closeTimeout:Tr,verifyClient:null,noServer:!1,backlog:null,server:null,host:null,path:null,port:null,WebSocket:Pr,...e},e.port==null&&!e.server&&!e.noServer||e.port!=null&&(e.server||e.noServer)||e.server&&e.noServer)throw new TypeError('One and only one of the "port", "server", or "noServer" options must be specified');if(e.port!=null?(this._server=$e.createServer((i,r)=>{let n=$e.STATUS_CODES[426];r.writeHead(426,{"Content-Length":n.length,"Content-Type":"text/plain"}),r.end(n)}),this._server.listen(e.port,e.host,e.backlog,t)):e.server&&(this._server=e.server),this._server){let i=this.emit.bind(this,"connection");this._removeListeners=Dr(this._server,{listening:this.emit.bind(this,"listening"),error:this.emit.bind(this,"error"),upgrade:(r,n,o)=>{this.handleUpgrade(r,n,o,i)}})}e.perMessageDeflate===!0&&(e.perMessageDeflate={}),e.clientTracking&&(this.clients=new Set,this._shouldEmitClose=!1),this.options=e,this._state=Ls}address(){if(this.options.noServer)throw new Error('The server is operating in "noServer" mode');return this._server?this._server.address():null}close(e){if(this._state===Rs){e&&this.once("close",()=>{e(new Error("The server is not running"))}),process.nextTick(ge,this);return}if(e&&this.once("close",e),this._state!==Ds)if(this._state=Ds,this.options.noServer||this.options.server)this._server&&(this._removeListeners(),this._removeListeners=this._server=null),this.clients?this.clients.size?this._shouldEmitClose=!0:process.nextTick(ge,this):process.nextTick(ge,this);else{let t=this._server;this._removeListeners(),this._removeListeners=this._server=null,t.close(()=>{ge(this)})}}shouldHandle(e){if(this.options.path){let t=e.url.indexOf("?");if((t!==-1?e.url.slice(0,t):e.url)!==this.options.path)return!1}return!0}handleUpgrade(e,t,i,r){t.on("error",Is);let n=e.headers["sec-websocket-key"],o=e.headers.upgrade,a=+e.headers["sec-websocket-version"];if(e.method!=="GET"){z(this,e,t,405,"Invalid HTTP method");return}if(o===void 0||o.toLowerCase()!=="websocket"){z(this,e,t,400,"Invalid Upgrade header");return}if(n===void 0||!Lr.test(n)){z(this,e,t,400,"Missing or invalid Sec-WebSocket-Key header");return}if(a!==13&&a!==8){z(this,e,t,400,"Missing or invalid Sec-WebSocket-Version header",{"Sec-WebSocket-Version":"13, 8"});return}if(!this.shouldHandle(e)){me(t,400);return}let l=e.headers["sec-websocket-protocol"],c=new Set;if(l!==void 0)try{c=Cr.parse(l)}catch{z(this,e,t,400,"Invalid Sec-WebSocket-Protocol header");return}let d=e.headers["sec-websocket-extensions"],h={};if(this.options.perMessageDeflate&&d!==void 0){let y=new V({...this.options.perMessageDeflate,isServer:!0,maxPayload:this.options.maxPayload});try{let w=Os.parse(d);w[V.extensionName]&&(y.accept(w[V.extensionName]),h[V.extensionName]=y)}catch{z(this,e,t,400,"Invalid or unacceptable Sec-WebSocket-Extensions header");return}}if(this.options.verifyClient){let y={origin:e.headers[`${a===8?"sec-websocket-origin":"origin"}`],secure:!!(e.socket.authorized||e.socket.encrypted),req:e};if(this.options.verifyClient.length===2){this.options.verifyClient(y,(w,b,u,x)=>{if(!w)return me(t,b||401,u,x);this.completeUpgrade(h,n,c,e,t,i,r)});return}if(!this.options.verifyClient(y))return me(t,401)}this.completeUpgrade(h,n,c,e,t,i,r)}completeUpgrade(e,t,i,r,n,o,a){if(!n.readable||!n.writable)return n.destroy();if(n[Or])throw new Error("server.handleUpgrade() was called more than once with the same socket, possibly due to a misconfiguration");if(this._state>Ls)return me(n,503);let c=["HTTP/1.1 101 Switching Protocols","Upgrade: websocket","Connection: Upgrade",`Sec-WebSocket-Accept: ${kr("sha1").update(t+Mr).digest("base64")}`],d=new this.options.WebSocket(null,void 0,this.options);if(i.size){let h=this.options.handleProtocols?this.options.handleProtocols(i,r):i.values().next().value;h&&(c.push(`Sec-WebSocket-Protocol: ${h}`),d._protocol=h)}if(e[V.extensionName]){let h=e[V.extensionName].params,y=Os.format({[V.extensionName]:[h]});c.push(`Sec-WebSocket-Extensions: ${y}`),d._extensions=e}this.emit("headers",c,r),n.write(c.concat(`\r
`).join(`\r
`)),n.removeListener("error",Is),d.setSocket(n,o,{allowSynchronousEvents:this.options.allowSynchronousEvents,maxPayload:this.options.maxPayload,skipUTF8Validation:this.options.skipUTF8Validation}),this.clients&&(this.clients.add(d),d.on("close",()=>{this.clients.delete(d),this._shouldEmitClose&&!this.clients.size&&process.nextTick(ge,this)})),a(d,r)}};Ws.exports=vt;function Dr(s,e){for(let t of Object.keys(e))s.on(t,e[t]);return function(){for(let i of Object.keys(e))s.removeListener(i,e[i])}}function ge(s){s._state=Rs,s.emit("close")}function Is(){this.destroy()}function me(s,e,t,i){t=t||$e.STATUS_CODES[e],i={Connection:"close","Content-Type":"text/html","Content-Length":Buffer.byteLength(t),...i},s.once("finish",s.destroy),s.end(`HTTP/1.1 ${e} ${$e.STATUS_CODES[e]}\r
`+Object.keys(i).map(r=>`${r}: ${i[r]}`).join(`\r
`)+`\r
\r
`+t)}function z(s,e,t,i,r,n){if(s.listenerCount("wsClientError")){let o=new Error(r);Error.captureStackTrace(o,z),s.emit("wsClientError",o,t,e)}else me(t,i,r,n)}});var js={};Ke(js,{PerMessageDeflate:()=>Bs.default,Receiver:()=>$s.default,Sender:()=>As.default,WebSocket:()=>yt.default,WebSocketServer:()=>Ae.default,createWebSocketStream:()=>Ns.default,default:()=>Ir,extension:()=>Us.default,subprotocol:()=>qs.default});var Ns,Us,Bs,$s,As,qs,yt,Ae,Ir,bt=Tt(()=>{Ns=f(Ts(),1),Us=f(We(),1),Bs=f(Z(),1),$s=f(at(),1),As=f(dt(),1),qs=f(mt(),1),yt=f(Be(),1),Ae=f(Fs(),1),Ir=yt.default});var ei={};Ke(ei,{WsViewProvider:()=>Et});var ye,Et,ti=Tt(()=>{"use strict";ye=f(require("vscode"),1),Et=class{static viewType="cclocal.chatView";view;ws;serverManager;currentMessageId="";messageBuffer="";status="idle";constructor(e,t){this.serverManager=t,this.connectToServer()}resolveWebviewView(e,t,i){this.view=e,e.webview.options={enableScripts:!0,localResourceRoots:[this.getExtensionUri()]},e.webview.html=this.getWebviewContent(),e.webview.onDidReceiveMessage(async r=>{switch(r.type){case"sendMessage":r.text&&await this.sendMessage(r.text);break;case"cancel":this.stopGeneration();break}}),e.onDidDispose(()=>{this.ws?.close()})}async connectToServer(){let e=this.serverManager.getServerUrl();try{let{default:t}=await Promise.resolve().then(()=>(bt(),js));this.ws=new t(`${e}/ws?token=default`),this.ws.onopen=()=>{this.ws?.send(JSON.stringify({type:"auth",payload:{clientType:"vscode"},timestamp:Date.now()}))},this.ws.onmessage=i=>{try{let r=JSON.parse(i.data.toString());this.handleServerMessage(r)}catch(r){console.error("Failed to parse message:",r)}},this.ws.onerror=()=>{this.setStatus("error"),this.sendToWebview({type:"error",message:"Connection error. Please try again."})},this.ws.onclose=()=>{setTimeout(()=>this.connectToServer(),3e3)}}catch(t){console.error("Failed to connect:",t)}}handleServerMessage(e){switch(e.type){case"auth_success":break;case"stream_start":this.messageBuffer="",this.setStatus("running");break;case"stream_delta":{let t=e.payload;t?.delta?.type==="text_delta"&&t.delta.text&&(this.messageBuffer+=t.delta.text,this.sendToWebview({type:"stream_delta",text:t.delta.text,messageId:this.currentMessageId}));break}case"stream_end":this.setStatus("idle"),this.sendToWebview({type:"assistantDone",messageId:this.currentMessageId}),this.currentMessageId="";break;case"error":{let t=e.payload;this.setStatus("error"),this.sendToWebview({type:"error",message:t?.message||"Unknown error"});break}case"cancelled":this.setStatus("idle");break}}async sendMessage(e){if(this.status==="running"){ye.window.showWarningMessage("Already processing a message. Please wait or cancel.");return}if(!this.ws||this.ws.readyState!==WebSocket.OPEN){ye.window.showErrorMessage("Not connected to CCLocal server. Please try again.");return}this.currentMessageId=this.generateId(),this.sendToWebview({type:"userMessage",text:e,messageId:this.generateId()}),this.setStatus("running"),this.ws.send(JSON.stringify({type:"message",payload:{sessionId:"default-session",content:e},timestamp:Date.now()}))}stopGeneration(){this.status==="running"&&this.ws?.send(JSON.stringify({type:"cancel",payload:{sessionId:"default-session"},timestamp:Date.now()}))}clearChat(){this.sendToWebview({type:"clear"})}setStatus(e){this.status=e,this.sendToWebview({type:"status",status:e})}sendToWebview(e){this.view?.webview.postMessage(e)}generateId(){return`msg_${Date.now()}_${Math.random().toString(36).substr(2,9)}`}getExtensionUri(){return ye.Uri.file(__dirname)}getWebviewContent(){return`<!DOCTYPE html>
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
</html>`}}});var Qr={};Ke(Qr,{activate:()=>Wr,deactivate:()=>Zr});module.exports=li(Qr);var v=f(require("vscode"),1),si=f(require("path"),1);var N=f(require("vscode"),1),xe=class{config;disposables=[];onConfigChangeEmitter=new N.EventEmitter;constructor(){this.config=N.workspace.getConfiguration("cclocal"),this.setupConfigWatcher()}getConfig(){return{cclocalPath:this.getCclocalPath(),model:this.getModel(),mode:this.getMode(),environmentVariables:this.getEnvironmentVariables(),initialPermissionMode:this.getInitialPermissionMode(),useTerminal:this.getUseTerminal(),autosave:this.getAutosave(),useCtrlEnterToSend:this.getUseCtrlEnterToSend(),preferredLocation:this.getPreferredLocation(),hideOnboarding:this.getHideOnboarding(),showToolInput:this.getShowToolInput(),maxMessageHistory:this.getMaxMessageHistory(),enableThinkingDisplay:this.getEnableThinkingDisplay(),thinkingExpandedByDefault:this.getThinkingExpandedByDefault()}}getCclocalPath(){return this.config.get("cclocalPath")||"cclocal"}getModel(){return this.config.get("model")||""}getMode(){return this.config.get("mode")||"ide"}getEnvironmentVariables(){return this.config.get("environmentVariables")||{}}getInitialPermissionMode(){return this.config.get("initialPermissionMode")||"default"}getUseTerminal(){return this.config.get("useTerminal")??!0}getAutosave(){return this.config.get("autosave")??!1}getUseCtrlEnterToSend(){return this.config.get("useCtrlEnterToSend")??!1}getPreferredLocation(){return this.config.get("preferredLocation")||"sidebar"}getHideOnboarding(){return this.config.get("hideOnboarding")??!1}getShowToolInput(){return this.config.get("showToolInput")??!0}getMaxMessageHistory(){return this.config.get("maxMessageHistory")||100}getEnableThinkingDisplay(){return this.config.get("enableThinkingDisplay")??!0}getThinkingExpandedByDefault(){return this.config.get("thinkingExpandedByDefault")??!1}async update(e,t,i){let r=i??N.ConfigurationTarget.Global;await this.config.update(e,t,r)}async setPreferredLocation(e){await this.update("preferredLocation",e)}async setInitialPermissionMode(e){await this.update("initialPermissionMode",e)}async setModel(e){await this.update("model",e)}get onConfigChange(){return this.onConfigChangeEmitter.event}setupConfigWatcher(){let e=N.workspace.onDidChangeConfiguration(t=>{t.affectsConfiguration("cclocal")&&(this.config=N.workspace.getConfiguration("cclocal"),this.onConfigChangeEmitter.fire(this.getConfig()))});this.disposables.push(e)}dispose(){this.disposables.forEach(e=>e.dispose()),this.onConfigChangeEmitter.dispose()}};var g=f(require("vscode"),1),Ot=f(require("path"),1),Se=require("vscode"),ae=class s{static scheme="cclocal-diff";files=new Map;originalFiles=new Map;_onDidChangeFile=new Se.EventEmitter;_onDidCreateFile=new Se.EventEmitter;_onDidDeleteFile=new Se.EventEmitter;onDidChangeFile=this._onDidChangeFile.event;onDidCreateFile=this._onDidCreateFile.event;onDidDeleteFile=this._onDidDeleteFile.event;stat(e){let t=this.files.get(e.path);if(!t)throw g.FileSystemError.FileNotFound(e);return{type:g.FileType.File,ctime:t.timestamp,mtime:t.timestamp,size:t.content.length}}readFile(e){let t=this.files.get(e.path);if(!t)throw g.FileSystemError.FileNotFound(e);return t.content}writeFile(e,t,i){let r=this.files.get(e.path);if(!r&&!i.create)throw g.FileSystemError.FileNotFound(e);if(r&&!i.overwrite)throw g.FileSystemError.FileExists(e);this.files.set(e.path,{uri:e,content:t,timestamp:Date.now()}),this._onDidChangeFile.fire([{type:g.FileChangeType.Changed,uri:e}])}delete(e,t){if(!this.files.has(e.path))throw g.FileSystemError.FileNotFound(e);this.files.delete(e.path),this.originalFiles.delete(e.path),this._onDidDeleteFile.fire(e)}rename(e,t,i){let r=this.files.get(e.path);if(!r)throw g.FileSystemError.FileNotFound(e);if(!i.overwrite&&this.files.has(t.path))throw g.FileSystemError.FileExists(t);this.files.delete(e.path),this.files.set(t.path,{...r,uri:t}),this._onDidDeleteFile.fire(e),this._onDidCreateFile.fire(t)}readDirectory(e){return[]}createDirectory(e){}watch(e,t){return new g.Disposable(()=>{})}createVirtualFile(e,t,i){let r=this.normalizePath(e),n=g.Uri.parse(`${s.scheme}://${r}`),o=Buffer.from(t,"utf8"),a=i?Buffer.from(i,"utf8"):void 0;return this.files.set(n.path,{uri:n,content:o,originalContent:a,timestamp:Date.now()}),a&&this.originalFiles.set(n.path,a),this._onDidCreateFile.fire(n),n}getOriginalContent(e){return this.originalFiles.get(e.path)}async acceptChanges(e){let t=this.files.get(e.path);if(!t)throw new Error(`Virtual file not found: ${e.path}`);let i=this.extractRealPath(e),r=g.Uri.file(i);await g.workspace.fs.writeFile(r,t.content),this.files.delete(e.path),this.originalFiles.delete(e.path),this._onDidDeleteFile.fire(e)}rejectChanges(e){this.files.has(e.path)&&(this.files.delete(e.path),this.originalFiles.delete(e.path),this._onDidDeleteFile.fire(e))}isVirtualFile(e){return e.scheme===s.scheme}clearAll(){let e=Array.from(this.files.keys());this.files.clear(),this.originalFiles.clear(),e.forEach(t=>{this._onDidDeleteFile.fire(g.Uri.parse(`${s.scheme}://${t}`))})}getAllVirtualFiles(){return Array.from(this.files.values())}normalizePath(e){return e.replace(/\\/g,"/")}extractRealPath(e){return e.path}},Ee=class{vfs;currentDiff=null;disposables=[];constructor(e){this.vfs=e}async showDiffPreview(e,t,i={}){let r=g.Uri.file(e),n;try{let l=await g.workspace.fs.readFile(r);n=Buffer.from(l).toString("utf8")}catch{n=""}let o=this.vfs.createVirtualFile(e,t,n);this.currentDiff={virtualUri:o,realUri:r};let a=i.title||`Review: ${Ot.basename(e)}`;await g.commands.executeCommand("vscode.diff",r,o,a),await g.commands.executeCommand("setContext","cclocal.viewingProposedDiff",!0)}async acceptDiff(){this.currentDiff&&(await this.vfs.acceptChanges(this.currentDiff.virtualUri),this.currentDiff=null,await g.commands.executeCommand("setContext","cclocal.viewingProposedDiff",!1))}async rejectDiff(){this.currentDiff&&(this.vfs.rejectChanges(this.currentDiff.virtualUri),this.currentDiff=null,await g.commands.executeCommand("setContext","cclocal.viewingProposedDiff",!1),await g.commands.executeCommand("workbench.action.closeActiveEditor"))}hasActiveDiff(){return this.currentDiff!==null}dispose(){this.disposables.forEach(e=>e.dispose()),this.vfs.clearAll()}};var ce=f(require("vscode"),1),Lt={Read:"low",Glob:"low",Grep:"low",WebFetch:"low",WebSearch:"low",Edit:"medium",Write:"medium",Bash:"high",Agent:"high"},Dt=["Edit","Write","MultiEdit"],di=["Bash","Agent"],ke=class{config;savedPermissions=new Map;pendingRequests=new Map;onPermissionRequestEmitter=new ce.EventEmitter;onPermissionChangeEmitter=new ce.EventEmitter;constructor(e){this.config=e}async checkPermission(e,t,i){let r=this.config.getInitialPermissionMode(),n=this.savedPermissions.get(e);if(n)return{behavior:n};if(r==="bypassPermissions")return{behavior:"allow"};if(r==="plan")return{behavior:"deny",message:"Plan mode is active. No operations will be executed."};if(r==="acceptEdits"&&Dt.includes(e))return{behavior:"allow"};let o=Lt[e]||"medium";if(o==="low"&&r!=="default")return{behavior:"allow"};let a={id:this.generateRequestId(),toolName:e,toolInput:t,description:i||this.generateDescription(e,t),riskLevel:o,timestamp:Date.now()};return this.requestUserPermission(a)}async requestUserPermission(e){return new Promise(t=>{this.pendingRequests.set(e.id,{resolve:t}),this.onPermissionRequestEmitter.fire(e),this.showPermissionNotification(e)})}async showPermissionNotification(e){let t=["Allow Once","Allow Always","Deny"],i=await ce.window.showInformationMessage(`[CCLocal] ${e.toolName}: ${e.description}`,{modal:!1},...t);if(i){let r=this.parseNotificationResponse(i);this.handlePermissionResponse(e.id,r.behavior,r.always)}}handlePermissionResponse(e,t,i){let r=this.pendingRequests.get(e);r&&(i&&r&&Array.from(this.pendingRequests.entries()).find(([o])=>o===e)&&this.savedPermissions.set(e.split("-")[0],t),r.resolve({behavior:t,always:i}),this.pendingRequests.delete(e))}addPermissionRule(e,t){this.savedPermissions.set(e,t),this.onPermissionChangeEmitter.fire()}removePermissionRule(e){this.savedPermissions.delete(e),this.onPermissionChangeEmitter.fire()}getSavedPermissions(){return new Map(this.savedPermissions)}clearSavedPermissions(){this.savedPermissions.clear(),this.onPermissionChangeEmitter.fire()}isFileEditTool(e){return Dt.includes(e)}isDangerousTool(e){return di.includes(e)}getRiskLevel(e){return Lt[e]||"medium"}get onPermissionRequest(){return this.onPermissionRequestEmitter.event}get onPermissionChange(){return this.onPermissionChangeEmitter.event}generateRequestId(){return`perm_${Date.now()}_${Math.random().toString(36).slice(2,8)}`}generateDescription(e,t){let i=t;switch(e){case"Read":return`Read file: ${i?.file_path||"unknown"}`;case"Edit":return`Edit file: ${i?.file_path||"unknown"}`;case"Write":return`Write file: ${i?.file_path||"unknown"}`;case"Bash":return`Execute command: ${i?.command?.slice(0,50)||"unknown"}...`;case"Glob":return`Search files: ${i?.pattern||"unknown"}`;case"Grep":return`Search content: ${i?.pattern||"unknown"}`;case"WebFetch":return`Fetch URL: ${i?.url||"unknown"}`;case"WebSearch":return`Search web: ${i?.query||"unknown"}`;default:return`Execute tool: ${e}`}}parseNotificationResponse(e){switch(e){case"Allow Once":return{behavior:"allow"};case"Allow Always":return{behavior:"allow",always:!0};case"Deny":return{behavior:"deny"};default:return{behavior:"deny"}}}dispose(){this.onPermissionRequestEmitter.dispose(),this.onPermissionChangeEmitter.dispose(),this.pendingRequests.clear()}};var It=f(require("vscode"),1),le=f(require("path"),1),S=f(require("fs"),1),hi="sessions",fi=50,ui=30,Ce=class{context;sessionsDir;constructor(e){this.context=e,this.sessionsDir=this.getSessionsDirectory(),this.ensureSessionsDirectory()}async saveSession(e,t){let i={id:e,messages:t,metadata:{id:e,timestamp:Date.now(),workspace:this.getCurrentWorkspace(),messageCount:t.length,title:this.generateTitle(t)}};await this.context.globalState.update(`session.${e}`,i),await this.saveSessionToFile(i)}async loadSession(e){let t=this.context.globalState.get(`session.${e}`);return t?t.messages:(await this.loadSessionFromFile(e))?.messages}async getSessionMetadata(e){let t=this.context.globalState.get(`session.${e}`);return t?t.metadata:(await this.loadSessionFromFile(e))?.metadata}async listSessions(){let e=[],t=this.context.globalState.keys().filter(r=>r.startsWith("session."));for(let r of t){let n=this.context.globalState.get(r);n?.metadata&&e.push(n.metadata)}let i=await this.listFileSessions();for(let r of i)e.some(n=>n.id===r.id)||e.push(r);return e.sort((r,n)=>n.timestamp-r.timestamp),e.slice(0,fi)}async deleteSession(e){await this.context.globalState.update(`session.${e}`,void 0),await this.deleteSessionFile(e)}async getRecentSession(){let e=this.getCurrentWorkspace(),i=(await this.listSessions()).find(r=>r.workspace===e);if(i)return this.loadSessionFromFile(i.id)}generateSessionId(){return`sess_${Date.now()}_${Math.random().toString(36).slice(2,8)}`}async cleanupExpiredSessions(){let e=await this.listSessions(),t=Date.now()-ui*24*60*60*1e3;for(let i of e)i.timestamp<t&&await this.deleteSession(i.id)}async clearAllSessions(){let e=this.context.globalState.keys().filter(t=>t.startsWith("session."));for(let t of e)await this.context.globalState.update(t,void 0);if(S.existsSync(this.sessionsDir)){let t=S.readdirSync(this.sessionsDir);for(let i of t)i.endsWith(".json")&&S.unlinkSync(le.join(this.sessionsDir,i))}}async saveSessionToFile(e){let t=this.getSessionFilePath(e.id),i=JSON.stringify(e,null,2);try{await S.promises.writeFile(t,i,"utf8")}catch(r){console.error(`Failed to save session to file: ${r}`)}}async loadSessionFromFile(e){let t=this.getSessionFilePath(e);try{let i=await S.promises.readFile(t,"utf8");return JSON.parse(i)}catch{return}}async listFileSessions(){let e=[];try{let t=await S.promises.readdir(this.sessionsDir);for(let i of t){if(!i.endsWith(".json"))continue;let r=le.join(this.sessionsDir,i);try{let n=await S.promises.readFile(r,"utf8"),o=JSON.parse(n);e.push(o.metadata)}catch{}}}catch{}return e}async deleteSessionFile(e){let t=this.getSessionFilePath(e);try{await S.promises.unlink(t)}catch{}}getSessionsDirectory(){let e=this.context.globalStorageUri.fsPath;return le.join(e,hi)}getSessionFilePath(e){return le.join(this.sessionsDir,`${e}.json`)}ensureSessionsDirectory(){S.existsSync(this.sessionsDir)||S.mkdirSync(this.sessionsDir,{recursive:!0})}getCurrentWorkspace(){return It.workspace.workspaceFolders?.[0]?.uri.fsPath}generateTitle(e){let t=e.find(n=>n.role==="user");if(!t)return"New Conversation";let i=t.content.find(n=>n.type==="text");if(!i||i.type!=="text")return"New Conversation";let r=i.text.trim();return r.length<=50?r:r.slice(0,47)+"..."}};var p=f(require("vscode"),1),Gs=f(require("http"),1),Vs=f(require("crypto"),1),$=f(require("fs"),1),wt=f(require("path"),1),zs=f(require("os"),1);bt();var Rr=[{name:"read_file",description:"Read a file from the IDE workspace",inputSchema:{type:"object",properties:{path:{type:"string",description:"The absolute path to the file to read"}},required:["path"]}},{name:"write_file",description:"Write content to a file in the IDE workspace",inputSchema:{type:"object",properties:{path:{type:"string",description:"The absolute path to the file to write"},content:{type:"string",description:"The content to write to the file"}},required:["path","content"]}},{name:"get_diagnostics",description:"Get IDE diagnostics (errors, warnings) for a file",inputSchema:{type:"object",properties:{path:{type:"string",description:"The file path to get diagnostics for"}},required:["path"]}},{name:"get_selection",description:"Get the currently selected text in the editor",inputSchema:{type:"object",properties:{}}},{name:"open_file",description:"Open a file in the IDE editor",inputSchema:{type:"object",properties:{path:{type:"string",description:"The path to the file to open"},line:{type:"number",description:"Optional line number to scroll to"}},required:["path"]}},{name:"save_file",description:"Save the currently active file",inputSchema:{type:"object",properties:{}}},{name:"list_files",description:"List files in a directory",inputSchema:{type:"object",properties:{path:{type:"string",description:"The directory path to list"}},required:["path"]}},{name:"get_workspace_folders",description:"Get the list of workspace folders",inputSchema:{type:"object",properties:{}}}],qe=class{constructor(e){this.outputChannel=e}server=null;wss=null;clients=new Set;port=0;authToken="";lockfilePath=null;async start(){return this.authToken=Vs.randomBytes(32).toString("hex"),this.server=Gs.createServer(),this.wss=new Ae.default({server:this.server}),this.wss.on("connection",(e,t)=>{this.handleConnection(e,t)}),new Promise((e,t)=>{this.server.listen(0,"127.0.0.1",()=>{let i=this.server.address();typeof i=="object"&&i?(this.port=i.port,this.outputChannel.info(`MCP server started on port ${this.port}`),this.writeLockfile(),e(this.port)):t(new Error("Failed to get server port"))})})}async stop(){this.clients.forEach(e=>e.close()),this.clients.clear(),this.wss&&(await new Promise(e=>{this.wss.close(()=>e())}),this.wss=null),this.server&&(await new Promise(e=>{this.server.close(()=>e())}),this.server=null),this.removeLockfile()}getPort(){return this.port}getAuthToken(){return this.authToken}handleConnection(e,t){if(new URL(t.url||"","http://localhost").searchParams.get("token")!==this.authToken){e.close(1008,"Unauthorized");return}this.clients.add(e),this.outputChannel.info("MCP client connected"),e.on("message",n=>{this.handleMessage(e,n)}),e.on("close",()=>{this.clients.delete(e),this.outputChannel.info("MCP client disconnected")}),e.on("error",n=>{this.outputChannel.error(`MCP WebSocket error: ${n}`),this.clients.delete(e)}),this.sendToolsList(e)}handleMessage(e,t){try{let i=JSON.parse(t.toString());switch(i.method){case"tools/list":this.sendToolsList(e,i.id);break;case"tools/call":this.handleToolCall(e,i.id,i.params);break;default:this.sendError(e,i.id,`Unknown method: ${i.method}`)}}catch(i){this.outputChannel.error(`Failed to parse MCP message: ${i}`)}}async handleToolCall(e,t,i){try{let r;switch(i.name){case"read_file":r=await this.toolReadFile(i.arguments);break;case"write_file":r=await this.toolWriteFile(i.arguments);break;case"get_diagnostics":r=await this.toolGetDiagnostics(i.arguments);break;case"get_selection":r=await this.toolGetSelection();break;case"open_file":r=await this.toolOpenFile(i.arguments);break;case"save_file":r=await this.toolSaveFile();break;case"list_files":r=await this.toolListFiles(i.arguments);break;case"get_workspace_folders":r=await this.toolGetWorkspaceFolders();break;default:r={content:[{type:"text",text:`Unknown tool: ${i.name}`}],isError:!0}}this.sendResponse(e,t,r)}catch(r){this.sendResponse(e,t,{content:[{type:"text",text:`Error: ${r}`}],isError:!0})}}async toolReadFile(e){try{let t=p.Uri.file(e.path),i=await p.workspace.fs.readFile(t);return{content:[{type:"text",text:Buffer.from(i).toString("utf8")}]}}catch(t){return{content:[{type:"text",text:`Failed to read file: ${t}`}],isError:!0}}}async toolWriteFile(e){try{let t=p.Uri.file(e.path);return await p.workspace.fs.writeFile(t,Buffer.from(e.content,"utf8")),{content:[{type:"text",text:"File written successfully"}]}}catch(t){return{content:[{type:"text",text:`Failed to write file: ${t}`}],isError:!0}}}async toolGetDiagnostics(e){let t=p.Uri.file(e.path),r=p.languages.getDiagnostics(t).map(n=>({message:n.message,severity:p.DiagnosticSeverity[n.severity],range:{start:{line:n.range.start.line,character:n.range.start.character},end:{line:n.range.end.line,character:n.range.end.character}},source:n.source}));return{content:[{type:"text",text:JSON.stringify(r,null,2)}]}}async toolGetSelection(){let e=p.window.activeTextEditor;if(!e)return{content:[{type:"text",text:"No active editor"}],isError:!0};let t=e.selection,i=e.document.getText(t),r=e.document.uri.fsPath,n=t.active.line;return{content:[{type:"text",text:JSON.stringify({text:i,file:r,line:n,startLine:t.start.line,endLine:t.end.line})}]}}async toolOpenFile(e){try{let t=p.Uri.file(e.path),i=await p.workspace.openTextDocument(t),r=await p.window.showTextDocument(i);if(e.line!==void 0){let n=Math.max(0,Math.min(e.line,i.lineCount-1)),o=new p.Position(n,0);r.selection=new p.Selection(o,o),r.revealRange(new p.Range(o,o))}return{content:[{type:"text",text:"File opened successfully"}]}}catch(t){return{content:[{type:"text",text:`Failed to open file: ${t}`}],isError:!0}}}async toolSaveFile(){let e=p.window.activeTextEditor;return e?(await e.document.save(),{content:[{type:"text",text:"File saved successfully"}]}):{content:[{type:"text",text:"No active editor"}],isError:!0}}async toolListFiles(e){try{let i=(await p.workspace.fs.readDirectory(p.Uri.file(e.path))).map(([r,n])=>({name:r,type:n===p.FileType.Directory?"directory":"file"}));return{content:[{type:"text",text:JSON.stringify(i,null,2)}]}}catch(t){return{content:[{type:"text",text:`Failed to list files: ${t}`}],isError:!0}}}async toolGetWorkspaceFolders(){let t=(p.workspace.workspaceFolders||[]).map(i=>({name:i.name,path:i.uri.fsPath}));return{content:[{type:"text",text:JSON.stringify(t,null,2)}]}}sendResponse(e,t,i){e.send(JSON.stringify({jsonrpc:"2.0",id:t,result:i}))}sendToolsList(e,t){e.send(JSON.stringify({jsonrpc:"2.0",id:t||"tools-list",result:{tools:Rr}}))}sendError(e,t,i){e.send(JSON.stringify({jsonrpc:"2.0",id:t,error:{code:-32e3,message:i}}))}writeLockfile(){let e=wt.join(zs.homedir(),".claude","ide");$.mkdirSync(e,{recursive:!0});let t={workspaceFolders:p.workspace.workspaceFolders?.map(i=>i.uri.fsPath)||[],pid:process.pid,ideName:"VS Code",transport:"ws",runningInWindows:process.platform==="win32",authToken:this.authToken,mcpPort:this.port};this.lockfilePath=wt.join(e,`${this.port}.lock`),$.writeFileSync(this.lockfilePath,JSON.stringify(t,null,2))}removeLockfile(){this.lockfilePath&&$.existsSync(this.lockfilePath)&&($.unlinkSync(this.lockfilePath),this.lockfilePath=null)}};var A=f(require("vscode"),1),je=f(require("path"),1),Hs=f(require("fs"),1),ve=class{constructor(e,t,i,r,n,o,a){this.extensionUri=e;this.config=t,this.permissionManager=i,this.sessionStorage=r,this.diffManager=n,this.outputChannel=o,this.cliProvider=a,this.currentSessionId=r.generateSessionId()}static viewType="cclocal.chatView";view;config;permissionManager;sessionStorage;diffManager;outputChannel;cliProvider;currentSessionId=null;messages=[];isInitialized=!1;resolveWebviewView(e,t,i){this.view=e,e.webview.options={enableScripts:!0,localResourceRoots:[this.extensionUri]},e.webview.html=this.getWebviewContent(e.webview),e.webview.onDidReceiveMessage(r=>{this.handleWebviewMessage(r)}),this.isInitialized=!0}sendToWebview(e){this.view&&this.view.webview.postMessage(e)}updateConfig(e){this.sendToWebview({type:"configChanged",config:e})}focusInput(){this.sendToWebview({type:"statusChange",status:"connected"})}async handleWebviewMessage(e){switch(e.type){case"ready":await this.handleReady();break;case"sendMessage":await this.handleSendMessage(e.text);break;case"stopGeneration":this.handleStopGeneration();break;case"newSession":await this.handleNewSession();break;case"clearChat":this.handleClearChat();break;case"restoreSession":await this.handleRestoreSession(e.sessionId);break;case"permissionResponse":this.handlePermissionResponse(e.requestId,e.response);break;case"diffDecision":await this.handleDiffDecision(e.diffId,e.accepted);break;case"openSettings":await A.commands.executeCommand("workbench.action.openSettings","cclocal");break;case"insertAtMention":await A.commands.executeCommand("cclocal.insertAtMention");break;case"getSelection":await A.commands.executeCommand("cclocal.sendSelectedCode");break;case"toggleDictation":await A.commands.executeCommand("cclocal.toggleDictation");break;default:this.outputChannel.warn(`Unknown message type: ${e.type}`)}}async handleReady(){this.sendToWebview({type:"sessionId",sessionId:this.currentSessionId||""}),this.sendToWebview({type:"statusChange",status:"connected"});let e=await this.sessionStorage.getRecentSession();e&&e.messages.length>0&&(this.messages=e.messages,this.sendToWebview({type:"restoreSession",sessionId:e.id,messages:e.messages}))}async handleSendMessage(e){if(e.trim()){if(this.sendToWebview({type:"statusChange",status:"running"}),this.cliProvider){this.cliProvider.sendMessage(e);return}this.outputChannel.info(`Message sent: ${e.slice(0,50)}...`)}}handleStopGeneration(){this.cliProvider&&this.cliProvider.handleCommand("stopGeneration"),this.sendToWebview({type:"statusChange",status:"idle"})}async handleNewSession(){this.messages.length>0&&this.currentSessionId&&await this.sessionStorage.saveSession(this.currentSessionId,this.messages),this.currentSessionId=this.sessionStorage.generateSessionId(),this.messages=[],this.sendToWebview({type:"sessionId",sessionId:this.currentSessionId}),this.sendToWebview({type:"sessionCleared"}),this.cliProvider&&this.cliProvider.handleCommand("newSession")}handleClearChat(){this.messages=[],this.sendToWebview({type:"sessionCleared"}),this.cliProvider&&this.cliProvider.handleCommand("clearChat")}async handleRestoreSession(e){let t=await this.sessionStorage.loadSession(e);t&&(this.currentSessionId=e,this.messages=t,this.sendToWebview({type:"restoreSession",sessionId:e,messages:t}))}handlePermissionResponse(e,t){this.permissionManager.handlePermissionResponse(e,t.behavior,t.always)}async handleDiffDecision(e,t){t?await this.diffManager.acceptDiff():await this.diffManager.rejectDiff()}getWebviewContent(e){let t=je.join(this.extensionUri.fsPath,"webview-dist"),i=je.join(t,"index.js"),r=je.join(t,"index.css");return Hs.existsSync(i)?this.getBuiltWebviewContent(e,i,r):this.getInlineWebviewContent(e)}getBuiltWebviewContent(e,t,i){let r=e.asWebviewUri(A.Uri.file(t)),n=e.asWebviewUri(A.Uri.file(i));return`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${e.cspSource} 'unsafe-inline'; script-src ${e.cspSource} 'unsafe-inline'; font-src ${e.cspSource}; img-src ${e.cspSource} https: data:; connect-src ${e.cspSource} ws: wss:;" />
  <link href="${n}" rel="stylesheet" />
  <title>CCLocal</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="${r}"></script>
</body>
</html>`}getInlineWebviewContent(e){return`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';" />
  <title>CCLocal</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { height: 100%; width: 100%; }
    body {
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      color: var(--vscode-foreground, #cccccc);
      background: var(--vscode-editor-background, #1e1e1e);
      display: flex;
      flex-direction: column;
    }
    .loading {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 16px;
    }
    .loading h2 { color: var(--vscode-foreground); }
    .loading p { color: var(--vscode-descriptionForeground, #8c8c8c); }
  </style>
</head>
<body>
  <div id="root">
    <div class="loading">
      <h2>CCLocal</h2>
      <p>Loading webview... (Run 'npm run build:webview' in packages/vscode-ext/webview)</p>
    </div>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`}};var _t=f(require("crypto"),1),Zs=f(require("os"),1),xt=f(require("vscode"),1);var Js=require("child_process"),Ys=f(require("path"),1),Ks=f(require("fs"),1),Xs=f(require("os"),1),Ge=class{constructor(e){this.callbacks=e}process=null;buffer="";killed=!1;launch(e){this.process&&this.kill(),this.buffer="",this.killed=!1;let{args:t,cmd:i}=this.buildCommand(e);this.process=(0,Js.spawn)(i,t,{cwd:e.cwd,env:this.buildEnv(),stdio:["ignore","pipe","pipe"],shell:!0}),this.process.stdout?.on("data",n=>{this.handleStdoutChunk(n.toString())});let r="";this.process.stderr?.on("data",n=>{r+=n.toString()}),this.process.on("error",n=>{this.killed||this.callbacks.onError(`\u542F\u52A8 cclocal \u5931\u8D25: ${n.message}`)}),this.process.on("close",n=>{if(this.process=null,!this.killed){if(n!==0&&n!==null){let o=r.trim()?`
\u8BE6\u60C5: ${r.trim().split(`
`).slice(-3).join(" | ")}`:"";this.callbacks.onError(`cclocal \u8FDB\u7A0B\u4EE5\u9000\u51FA\u7801 ${n} \u7ED3\u675F${o}`)}this.callbacks.onExit()}})}kill(){this.killed=!0,this.process&&(this.process.kill("SIGTERM"),this.process=null)}isRunning(){return this.process!==null&&!this.killed}buildEnv(){let e=Xs.homedir(),t=["/opt/homebrew/bin","/usr/local/bin",`${e}/.bun/bin`,`${e}/.local/bin`,`${e}/.eigent/bin`,"/usr/bin","/bin"],i=process.env.PATH??"",r=[...t,i].filter(Boolean).join(Ys.delimiter);return{...process.env,PATH:r}}buildCommand(e){let i=["--print",e.prompt,"--output-format","stream-json","--verbose"];return e.model&&i.push("--model",e.model),e.projectPath&&Ks.existsSync(e.projectPath)?{cmd:e.executablePath||"bun",args:["run","start","--",...i]}:{cmd:e.executablePath||"cclocal",args:i}}handleStdoutChunk(e){this.buffer+=e;let t=this.buffer.split(`
`);this.buffer=t.pop()??"";for(let i of t){let r=i.trim();if(r)try{let n=JSON.parse(r);this.callbacks.onMessage(n)}catch{}}}};var Ve=class{constructor(e){this.extensionUri=e;this.cclocalProcess=new Ge({onMessage:t=>this.handleStreamMsg(t),onError:t=>{this.sendToWebview({type:"error",message:t}),this.setStatus("error")},onExit:()=>{this.currentMessageId&&(this.sendToWebview({type:"assistantDone",messageId:this.currentMessageId}),this.currentMessageId=""),this.setStatus("idle")}})}static viewType="cclocal.chatView";view;cclocalProcess;currentMessageId="";status="idle";resolveWebviewView(e,t,i){this.view=e,e.webview.options={enableScripts:!0,localResourceRoots:[this.extensionUri]},e.webview.html=this.buildHtml(e.webview),e.webview.onDidReceiveMessage(r=>{this.handleWebviewMessage(r)})}handleCommand(e){switch(e){case"newSession":this.newSession();break;case"clearChat":this.clearChat();break;case"stopGeneration":this.stopGeneration();break}}sendMessage(e){this.handleSendMessage(e)}handleWebviewMessage(e){switch(e.type){case"ready":this.sendToWebview({type:"statusChange",status:this.status});break;case"sendMessage":this.handleSendMessage(e.text);break;case"stopGeneration":this.stopGeneration();break;case"newSession":this.newSession();break;case"clearChat":this.clearChat();break}}handleSendMessage(e){if(this.status==="running"){this.sendToWebview({type:"error",message:"\u6B63\u5728\u5904\u7406\u4E0A\u4E00\u6761\u6D88\u606F\uFF0C\u8BF7\u7B49\u5F85\u6216\u70B9\u51FB\u505C\u6B62"});return}let t=xt.workspace.getConfiguration("cclocal"),i=t.get("cclocalPath")||"cclocal",r=t.get("model")||"",n=xt.workspace.workspaceFolders?.[0]?.uri.fsPath??Zs.homedir();this.currentMessageId=this.generateId(),this.sendToWebview({type:"userMessage",text:e,messageId:this.generateId()}),this.setStatus("running"),this.cclocalProcess.launch({executablePath:i,cwd:n,prompt:e,model:r||void 0})}handleStreamMsg(e){switch(e.type){case"assistant":{let t=e.message?.content??[];for(let i of t)i.type==="text"&&i.text?(this.currentMessageId||(this.currentMessageId=this.generateId()),this.sendToWebview({type:"assistantChunk",text:i.text,messageId:this.currentMessageId})):i.type==="tool_use"&&this.sendToWebview({type:"toolUse",name:i.name??"tool",input:i.input,messageId:this.currentMessageId||this.generateId()});break}case"content_block_delta":e.delta?.type==="text_delta"&&e.delta.text&&(this.currentMessageId||(this.currentMessageId=this.generateId()),this.sendToWebview({type:"assistantChunk",text:e.delta.text,messageId:this.currentMessageId}));break;case"tool_use":this.sendToWebview({type:"toolUse",name:e.name??"tool",input:e.input,messageId:this.currentMessageId||this.generateId()});break;case"result":this.currentMessageId&&(this.sendToWebview({type:"assistantDone",messageId:this.currentMessageId}),this.currentMessageId=""),this.setStatus("idle");break;case"system":break;default:break}}stopGeneration(){this.status==="running"&&(this.cclocalProcess.kill(),this.currentMessageId&&(this.sendToWebview({type:"assistantDone",messageId:this.currentMessageId}),this.currentMessageId=""),this.setStatus("idle"))}newSession(){this.stopGeneration(),this.sendToWebview({type:"sessionCleared"})}clearChat(){this.stopGeneration(),this.sendToWebview({type:"sessionCleared"})}setStatus(e){this.status=e,this.sendToWebview({type:"statusChange",status:e})}sendToWebview(e){this.view?.webview.postMessage(e)}generateId(){return _t.randomBytes(8).toString("hex")}buildHtml(e){let t=_t.randomBytes(16).toString("base64");return`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src 'nonce-${t}'; script-src 'nonce-${t}';" />
  <title>CCLocal</title>
  <style nonce="${t}">
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

<script nonce="${t}">
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
</html>`}};var Qs=require("child_process"),St=f(require("path"),1),ze=class{serverProcess;serverPort=5678;serverUrl="ws://127.0.0.1:5678";getServerUrl(){return this.serverUrl}async ensureServerRunning(){if(await this.checkServerHealth()){console.log("CCLocal server already running");return}await this.startEmbeddedServer()}async checkServerHealth(){try{return(await fetch(`http://127.0.0.1:${this.serverPort}/health`)).ok}catch{return!1}}async startEmbeddedServer(){return new Promise((e,t)=>{let i=this.findServerPath();if(!i){t(new Error("CCLocal server not found"));return}console.log(`Starting CCLocal server from: ${i}`),this.serverProcess=(0,Qs.spawn)("bun",[i],{env:{...process.env,CCLOCAL_PORT:String(this.serverPort),CCLOCAL_HOST:"127.0.0.1"},detached:!1}),this.serverProcess.stdout?.on("data",r=>{console.log(`[CCLocal Server] ${r.toString().trim()}`)}),this.serverProcess.stderr?.on("data",r=>{console.error(`[CCLocal Server] ${r.toString().trim()}`)}),setTimeout(async()=>{await this.checkServerHealth()?e():t(new Error("Server failed to start"))},3e3)})}findServerPath(){let e=[St.join(__dirname,"..","..","server","dist","index.js"),St.join(__dirname,"..","..","..","packages","server","dist","index.js")];for(let t of e)try{if(require("fs").existsSync(t))return t}catch{}}stopServer(){this.serverProcess&&(this.serverProcess.kill(),this.serverProcess=void 0)}};var D,He,re,be,H,we=null,C=null,O;async function Wr(s){O=v.window.createOutputChannel("CCLocal",{log:!0}),O.info("CCLocal extension activating..."),D=new xe,He=new ae,re=new Ee(He),be=new ke(D),H=new Ce(s),s.subscriptions.push(v.workspace.registerFileSystemProvider(ae.scheme,He,{isCaseSensitive:!0}));let e=D.getMode();if(e==="cli"){let t=new Ve(s.extensionUri);C=new ve(s.extensionUri,D,be,H,re,O,t),s.subscriptions.push(v.window.registerWebviewViewProvider("cclocal.chatView",t,{webviewOptions:{retainContextWhenHidden:!0}}))}else if(e==="websocket"){let t=new ze;await t.ensureServerRunning();let{WsViewProvider:i}=await Promise.resolve().then(()=>(ti(),ei)),r=new i(s.extensionUri,t);s.subscriptions.push(v.window.registerWebviewViewProvider("cclocal.chatView",r))}else we=new qe(O),await we.start(),O.info(`MCP server started on port ${we.getPort()}`),C=new ve(s.extensionUri,D,be,H,re,O),s.subscriptions.push(v.window.registerWebviewViewProvider("cclocal.chatView",C,{webviewOptions:{retainContextWhenHidden:!0}}));Fr(s),s.subscriptions.push(D.onConfigChange(t=>{C?.updateConfig(t),O.info("Configuration updated")})),s.subscriptions.push(be.onPermissionRequest(t=>{C?.sendToWebview({type:"permissionRequest",request:t})})),await H.cleanupExpiredSessions(),D.getHideOnboarding()||Xr(),O.info("CCLocal extension activated successfully")}function Fr(s){let e=[{id:"cclocal.newSession",handler:Nr},{id:"cclocal.clearChat",handler:Ur},{id:"cclocal.stopGeneration",handler:Br},{id:"cclocal.restoreSession",handler:$r},{id:"cclocal.openInPanel",handler:Ar},{id:"cclocal.openInSidebar",handler:qr},{id:"cclocal.focusInput",handler:jr},{id:"cclocal.acceptEdit",handler:Gr},{id:"cclocal.rejectEdit",handler:Vr},{id:"cclocal.sendSelectedCode",handler:zr},{id:"cclocal.insertAtMention",handler:Hr},{id:"cclocal.toggleDictation",handler:Jr},{id:"cclocal.openSettings",handler:Yr},{id:"cclocal.showLogs",handler:Kr}];for(let{id:t,handler:i}of e)s.subscriptions.push(v.commands.registerCommand(t,i))}async function Nr(){let s=H.generateSessionId();C?.sendToWebview({type:"sessionId",sessionId:s}),C?.sendToWebview({type:"sessionCleared"}),v.window.showInformationMessage("New session started")}async function Ur(){C?.sendToWebview({type:"sessionCleared"})}async function Br(){C?.sendToWebview({type:"statusChange",status:"idle"})}async function $r(s){if(!s){let i=(await H.listSessions()).map(n=>({label:n.title||"Untitled",description:new Date(n.timestamp).toLocaleString(),id:n.id})),r=await v.window.showQuickPick(i,{placeHolder:"Select a session to restore"});if(!r)return;s=r.id}let e=await H.loadSession(s);e&&C?.sendToWebview({type:"restoreSession",sessionId:s,messages:e})}async function Ar(){await D.setPreferredLocation("panel"),v.window.showInformationMessage("Opening in panel (coming soon)")}async function qr(){await D.setPreferredLocation("sidebar"),await v.commands.executeCommand("workbench.view.extension.ccalocal-sidebar")}async function jr(){C?.focusInput()}async function Gr(){await re.acceptDiff()}async function Vr(){await re.rejectDiff()}async function zr(){let s=v.window.activeTextEditor;if(!s){v.window.showWarningMessage("No active editor");return}let e=s.selection;if(e.isEmpty){v.window.showWarningMessage("No text selected");return}let t=s.document.getText(e),i=s.document.uri.fsPath,r=e.start.line;C?.sendToWebview({type:"selectionChanged",selection:{text:t,file:i,line:r}})}async function Hr(){if(!v.window.activeTextEditor)return;let t=(await v.workspace.findFiles("**/*","**/node_modules/**",100)).slice(0,50).map(r=>({label:si.basename(r.fsPath),description:v.workspace.asRelativePath(r),path:r.fsPath})),i=await v.window.showQuickPick(t,{placeHolder:"Select a file to mention"});i&&C?.sendToWebview({type:"selectionChanged",selection:{text:`@${i.description}`,file:i.path,line:0}})}async function Jr(){v.window.showInformationMessage("Voice dictation coming soon")}async function Yr(){await v.commands.executeCommand("workbench.action.openSettings","cclocal")}async function Kr(){O.show()}function Xr(){v.window.showInformationMessage("Welcome to CCLocal! Start a conversation to begin.","Open Settings","Dismiss").then(e=>{e==="Open Settings"&&v.commands.executeCommand("workbench.action.openSettings","cclocal")})}async function Zr(){O.info("CCLocal extension deactivating..."),we&&await we.stop(),D.dispose(),be.dispose(),re.dispose(),He.dispose(),O.info("CCLocal extension deactivated")}0&&(module.exports={activate,deactivate});
