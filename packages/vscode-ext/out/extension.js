"use strict";var Eo=Object.create;var et=Object.defineProperty;var Mo=Object.getOwnPropertyDescriptor;var _o=Object.getOwnPropertyNames;var To=Object.getPrototypeOf,Io=Object.prototype.hasOwnProperty;var V=(o,e)=>()=>(o&&(e=o(o=0)),e);var _=(o,e)=>()=>(e||o((e={exports:{}}).exports,e),e.exports),Le=(o,e)=>{for(var t in e)et(o,t,{get:e[t],enumerable:!0})},Os=(o,e,t,s)=>{if(e&&typeof e=="object"||typeof e=="function")for(let n of _o(e))!Io.call(o,n)&&n!==t&&et(o,n,{get:()=>e[n],enumerable:!(s=Mo(e,n))||s.enumerable});return o};var g=(o,e,t)=>(t=o!=null?Eo(To(o)):{},Os(e||!o||!o.__esModule?et(t,"default",{value:o,enumerable:!0}):t,o)),Ao=o=>Os(et({},"__esModule",{value:!0}),o);var K=_((Er,Ns)=>{"use strict";var Fs=["nodebuffer","arraybuffer","fragments"],Us=typeof Blob<"u";Us&&Fs.push("blob");Ns.exports={BINARY_TYPES:Fs,CLOSE_TIMEOUT:3e4,EMPTY_BUFFER:Buffer.alloc(0),GUID:"258EAFA5-E914-47DA-95CA-C5AB0DC85B11",hasBlob:Us,kForOnEventAttribute:Symbol("kIsForOnEventAttribute"),kListener:Symbol("kListener"),kStatusCode:Symbol("status-code"),kWebSocket:Symbol("websocket"),NOOP:()=>{}}});var De=_((Mr,st)=>{"use strict";var{EMPTY_BUFFER:Lo}=K(),Ut=Buffer[Symbol.species];function Oo(o,e){if(o.length===0)return Lo;if(o.length===1)return o[0];let t=Buffer.allocUnsafe(e),s=0;for(let n=0;n<o.length;n++){let i=o[n];t.set(i,s),s+=i.length}return s<e?new Ut(t.buffer,t.byteOffset,s):t}function js(o,e,t,s,n){for(let i=0;i<n;i++)t[s+i]=o[i]^e[i&3]}function Ws(o,e){for(let t=0;t<o.length;t++)o[t]^=e[t&3]}function Do(o){return o.length===o.buffer.byteLength?o.buffer:o.buffer.slice(o.byteOffset,o.byteOffset+o.length)}function Nt(o){if(Nt.readOnly=!0,Buffer.isBuffer(o))return o;let e;return o instanceof ArrayBuffer?e=new Ut(o):ArrayBuffer.isView(o)?e=new Ut(o.buffer,o.byteOffset,o.byteLength):(e=Buffer.from(o),Nt.readOnly=!1),e}st.exports={concat:Oo,mask:js,toArrayBuffer:Do,toBuffer:Nt,unmask:Ws};if(!process.env.WS_NO_BUFFER_UTIL)try{let o=require("bufferutil");st.exports.mask=function(e,t,s,n,i){i<48?js(e,t,s,n,i):o.mask(e,t,s,n,i)},st.exports.unmask=function(e,t){e.length<32?Ws(e,t):o.unmask(e,t)}}catch{}});var Gs=_((_r,Ks)=>{"use strict";var Vs=Symbol("kDone"),jt=Symbol("kRun"),Wt=class{constructor(e){this[Vs]=()=>{this.pending--,this[jt]()},this.concurrency=e||1/0,this.jobs=[],this.pending=0}add(e){this.jobs.push(e),this[jt]()}[jt](){if(this.pending!==this.concurrency&&this.jobs.length){let e=this.jobs.shift();this.pending++,e(this[Vs])}}};Ks.exports=Wt});var ge=_((Tr,Js)=>{"use strict";var Be=require("zlib"),zs=De(),Bo=Gs(),{kStatusCode:qs}=K(),Ho=Buffer[Symbol.species],$o=Buffer.from([0,0,255,255]),ot=Symbol("permessage-deflate"),G=Symbol("total-length"),ue=Symbol("callback"),X=Symbol("buffers"),pe=Symbol("error"),nt,Vt=class{constructor(e){if(this._options=e||{},this._threshold=this._options.threshold!==void 0?this._options.threshold:1024,this._maxPayload=this._options.maxPayload|0,this._isServer=!!this._options.isServer,this._deflate=null,this._inflate=null,this.params=null,!nt){let t=this._options.concurrencyLimit!==void 0?this._options.concurrencyLimit:10;nt=new Bo(t)}}static get extensionName(){return"permessage-deflate"}offer(){let e={};return this._options.serverNoContextTakeover&&(e.server_no_context_takeover=!0),this._options.clientNoContextTakeover&&(e.client_no_context_takeover=!0),this._options.serverMaxWindowBits&&(e.server_max_window_bits=this._options.serverMaxWindowBits),this._options.clientMaxWindowBits?e.client_max_window_bits=this._options.clientMaxWindowBits:this._options.clientMaxWindowBits==null&&(e.client_max_window_bits=!0),e}accept(e){return e=this.normalizeParams(e),this.params=this._isServer?this.acceptAsServer(e):this.acceptAsClient(e),this.params}cleanup(){if(this._inflate&&(this._inflate.close(),this._inflate=null),this._deflate){let e=this._deflate[ue];this._deflate.close(),this._deflate=null,e&&e(new Error("The deflate stream was closed while data was being processed"))}}acceptAsServer(e){let t=this._options,s=e.find(n=>!(t.serverNoContextTakeover===!1&&n.server_no_context_takeover||n.server_max_window_bits&&(t.serverMaxWindowBits===!1||typeof t.serverMaxWindowBits=="number"&&t.serverMaxWindowBits>n.server_max_window_bits)||typeof t.clientMaxWindowBits=="number"&&!n.client_max_window_bits));if(!s)throw new Error("None of the extension offers can be accepted");return t.serverNoContextTakeover&&(s.server_no_context_takeover=!0),t.clientNoContextTakeover&&(s.client_no_context_takeover=!0),typeof t.serverMaxWindowBits=="number"&&(s.server_max_window_bits=t.serverMaxWindowBits),typeof t.clientMaxWindowBits=="number"?s.client_max_window_bits=t.clientMaxWindowBits:(s.client_max_window_bits===!0||t.clientMaxWindowBits===!1)&&delete s.client_max_window_bits,s}acceptAsClient(e){let t=e[0];if(this._options.clientNoContextTakeover===!1&&t.client_no_context_takeover)throw new Error('Unexpected parameter "client_no_context_takeover"');if(!t.client_max_window_bits)typeof this._options.clientMaxWindowBits=="number"&&(t.client_max_window_bits=this._options.clientMaxWindowBits);else if(this._options.clientMaxWindowBits===!1||typeof this._options.clientMaxWindowBits=="number"&&t.client_max_window_bits>this._options.clientMaxWindowBits)throw new Error('Unexpected or invalid parameter "client_max_window_bits"');return t}normalizeParams(e){return e.forEach(t=>{Object.keys(t).forEach(s=>{let n=t[s];if(n.length>1)throw new Error(`Parameter "${s}" must have only a single value`);if(n=n[0],s==="client_max_window_bits"){if(n!==!0){let i=+n;if(!Number.isInteger(i)||i<8||i>15)throw new TypeError(`Invalid value for parameter "${s}": ${n}`);n=i}else if(!this._isServer)throw new TypeError(`Invalid value for parameter "${s}": ${n}`)}else if(s==="server_max_window_bits"){let i=+n;if(!Number.isInteger(i)||i<8||i>15)throw new TypeError(`Invalid value for parameter "${s}": ${n}`);n=i}else if(s==="client_no_context_takeover"||s==="server_no_context_takeover"){if(n!==!0)throw new TypeError(`Invalid value for parameter "${s}": ${n}`)}else throw new Error(`Unknown parameter "${s}"`);t[s]=n})}),e}decompress(e,t,s){nt.add(n=>{this._decompress(e,t,(i,r)=>{n(),s(i,r)})})}compress(e,t,s){nt.add(n=>{this._compress(e,t,(i,r)=>{n(),s(i,r)})})}_decompress(e,t,s){let n=this._isServer?"client":"server";if(!this._inflate){let i=`${n}_max_window_bits`,r=typeof this.params[i]!="number"?Be.Z_DEFAULT_WINDOWBITS:this.params[i];this._inflate=Be.createInflateRaw({...this._options.zlibInflateOptions,windowBits:r}),this._inflate[ot]=this,this._inflate[G]=0,this._inflate[X]=[],this._inflate.on("error",Fo),this._inflate.on("data",Ys)}this._inflate[ue]=s,this._inflate.write(e),t&&this._inflate.write($o),this._inflate.flush(()=>{let i=this._inflate[pe];if(i){this._inflate.close(),this._inflate=null,s(i);return}let r=zs.concat(this._inflate[X],this._inflate[G]);this._inflate._readableState.endEmitted?(this._inflate.close(),this._inflate=null):(this._inflate[G]=0,this._inflate[X]=[],t&&this.params[`${n}_no_context_takeover`]&&this._inflate.reset()),s(null,r)})}_compress(e,t,s){let n=this._isServer?"server":"client";if(!this._deflate){let i=`${n}_max_window_bits`,r=typeof this.params[i]!="number"?Be.Z_DEFAULT_WINDOWBITS:this.params[i];this._deflate=Be.createDeflateRaw({...this._options.zlibDeflateOptions,windowBits:r}),this._deflate[G]=0,this._deflate[X]=[],this._deflate.on("data",Ro)}this._deflate[ue]=s,this._deflate.write(e),this._deflate.flush(Be.Z_SYNC_FLUSH,()=>{if(!this._deflate)return;let i=zs.concat(this._deflate[X],this._deflate[G]);t&&(i=new Ho(i.buffer,i.byteOffset,i.length-4)),this._deflate[ue]=null,this._deflate[G]=0,this._deflate[X]=[],t&&this.params[`${n}_no_context_takeover`]&&this._deflate.reset(),s(null,i)})}};Js.exports=Vt;function Ro(o){this[X].push(o),this[G]+=o.length}function Ys(o){if(this[G]+=o.length,this[ot]._maxPayload<1||this[G]<=this[ot]._maxPayload){this[X].push(o);return}this[pe]=new RangeError("Max payload size exceeded"),this[pe].code="WS_ERR_UNSUPPORTED_MESSAGE_LENGTH",this[pe][qs]=1009,this.removeListener("data",Ys),this.reset()}function Fo(o){if(this[ot]._inflate=null,this[pe]){this[ue](this[pe]);return}o[qs]=1007,this[ue](o)}});var he=_((Ir,it)=>{"use strict";var{isUtf8:Qs}=require("buffer"),{hasBlob:Uo}=K(),No=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,1,1,1,1,0,0,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1,0];function jo(o){return o>=1e3&&o<=1014&&o!==1004&&o!==1005&&o!==1006||o>=3e3&&o<=4999}function Kt(o){let e=o.length,t=0;for(;t<e;)if(!(o[t]&128))t++;else if((o[t]&224)===192){if(t+1===e||(o[t+1]&192)!==128||(o[t]&254)===192)return!1;t+=2}else if((o[t]&240)===224){if(t+2>=e||(o[t+1]&192)!==128||(o[t+2]&192)!==128||o[t]===224&&(o[t+1]&224)===128||o[t]===237&&(o[t+1]&224)===160)return!1;t+=3}else if((o[t]&248)===240){if(t+3>=e||(o[t+1]&192)!==128||(o[t+2]&192)!==128||(o[t+3]&192)!==128||o[t]===240&&(o[t+1]&240)===128||o[t]===244&&o[t+1]>143||o[t]>244)return!1;t+=4}else return!1;return!0}function Wo(o){return Uo&&typeof o=="object"&&typeof o.arrayBuffer=="function"&&typeof o.type=="string"&&typeof o.stream=="function"&&(o[Symbol.toStringTag]==="Blob"||o[Symbol.toStringTag]==="File")}it.exports={isBlob:Wo,isValidStatusCode:jo,isValidUTF8:Kt,tokenChars:No};if(Qs)it.exports.isValidUTF8=function(o){return o.length<24?Kt(o):Qs(o)};else if(!process.env.WS_NO_UTF_8_VALIDATE)try{let o=require("utf-8-validate");it.exports.isValidUTF8=function(e){return e.length<32?Kt(e):o(e)}}catch{}});var Jt=_((Ar,on)=>{"use strict";var{Writable:Vo}=require("stream"),Xs=ge(),{BINARY_TYPES:Ko,EMPTY_BUFFER:Zs,kStatusCode:Go,kWebSocket:zo}=K(),{concat:Gt,toArrayBuffer:qo,unmask:Yo}=De(),{isValidStatusCode:Jo,isValidUTF8:en}=he(),rt=Buffer[Symbol.species],A=0,tn=1,sn=2,nn=3,zt=4,qt=5,at=6,Yt=class extends Vo{constructor(e={}){super(),this._allowSynchronousEvents=e.allowSynchronousEvents!==void 0?e.allowSynchronousEvents:!0,this._binaryType=e.binaryType||Ko[0],this._extensions=e.extensions||{},this._isServer=!!e.isServer,this._maxPayload=e.maxPayload|0,this._skipUTF8Validation=!!e.skipUTF8Validation,this[zo]=void 0,this._bufferedBytes=0,this._buffers=[],this._compressed=!1,this._payloadLength=0,this._mask=void 0,this._fragmented=0,this._masked=!1,this._fin=!1,this._opcode=0,this._totalPayloadLength=0,this._messageLength=0,this._fragments=[],this._errored=!1,this._loop=!1,this._state=A}_write(e,t,s){if(this._opcode===8&&this._state==A)return s();this._bufferedBytes+=e.length,this._buffers.push(e),this.startLoop(s)}consume(e){if(this._bufferedBytes-=e,e===this._buffers[0].length)return this._buffers.shift();if(e<this._buffers[0].length){let s=this._buffers[0];return this._buffers[0]=new rt(s.buffer,s.byteOffset+e,s.length-e),new rt(s.buffer,s.byteOffset,e)}let t=Buffer.allocUnsafe(e);do{let s=this._buffers[0],n=t.length-e;e>=s.length?t.set(this._buffers.shift(),n):(t.set(new Uint8Array(s.buffer,s.byteOffset,e),n),this._buffers[0]=new rt(s.buffer,s.byteOffset+e,s.length-e)),e-=s.length}while(e>0);return t}startLoop(e){this._loop=!0;do switch(this._state){case A:this.getInfo(e);break;case tn:this.getPayloadLength16(e);break;case sn:this.getPayloadLength64(e);break;case nn:this.getMask();break;case zt:this.getData(e);break;case qt:case at:this._loop=!1;return}while(this._loop);this._errored||e()}getInfo(e){if(this._bufferedBytes<2){this._loop=!1;return}let t=this.consume(2);if(t[0]&48){let n=this.createError(RangeError,"RSV2 and RSV3 must be clear",!0,1002,"WS_ERR_UNEXPECTED_RSV_2_3");e(n);return}let s=(t[0]&64)===64;if(s&&!this._extensions[Xs.extensionName]){let n=this.createError(RangeError,"RSV1 must be clear",!0,1002,"WS_ERR_UNEXPECTED_RSV_1");e(n);return}if(this._fin=(t[0]&128)===128,this._opcode=t[0]&15,this._payloadLength=t[1]&127,this._opcode===0){if(s){let n=this.createError(RangeError,"RSV1 must be clear",!0,1002,"WS_ERR_UNEXPECTED_RSV_1");e(n);return}if(!this._fragmented){let n=this.createError(RangeError,"invalid opcode 0",!0,1002,"WS_ERR_INVALID_OPCODE");e(n);return}this._opcode=this._fragmented}else if(this._opcode===1||this._opcode===2){if(this._fragmented){let n=this.createError(RangeError,`invalid opcode ${this._opcode}`,!0,1002,"WS_ERR_INVALID_OPCODE");e(n);return}this._compressed=s}else if(this._opcode>7&&this._opcode<11){if(!this._fin){let n=this.createError(RangeError,"FIN must be set",!0,1002,"WS_ERR_EXPECTED_FIN");e(n);return}if(s){let n=this.createError(RangeError,"RSV1 must be clear",!0,1002,"WS_ERR_UNEXPECTED_RSV_1");e(n);return}if(this._payloadLength>125||this._opcode===8&&this._payloadLength===1){let n=this.createError(RangeError,`invalid payload length ${this._payloadLength}`,!0,1002,"WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH");e(n);return}}else{let n=this.createError(RangeError,`invalid opcode ${this._opcode}`,!0,1002,"WS_ERR_INVALID_OPCODE");e(n);return}if(!this._fin&&!this._fragmented&&(this._fragmented=this._opcode),this._masked=(t[1]&128)===128,this._isServer){if(!this._masked){let n=this.createError(RangeError,"MASK must be set",!0,1002,"WS_ERR_EXPECTED_MASK");e(n);return}}else if(this._masked){let n=this.createError(RangeError,"MASK must be clear",!0,1002,"WS_ERR_UNEXPECTED_MASK");e(n);return}this._payloadLength===126?this._state=tn:this._payloadLength===127?this._state=sn:this.haveLength(e)}getPayloadLength16(e){if(this._bufferedBytes<2){this._loop=!1;return}this._payloadLength=this.consume(2).readUInt16BE(0),this.haveLength(e)}getPayloadLength64(e){if(this._bufferedBytes<8){this._loop=!1;return}let t=this.consume(8),s=t.readUInt32BE(0);if(s>Math.pow(2,21)-1){let n=this.createError(RangeError,"Unsupported WebSocket frame: payload length > 2^53 - 1",!1,1009,"WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH");e(n);return}this._payloadLength=s*Math.pow(2,32)+t.readUInt32BE(4),this.haveLength(e)}haveLength(e){if(this._payloadLength&&this._opcode<8&&(this._totalPayloadLength+=this._payloadLength,this._totalPayloadLength>this._maxPayload&&this._maxPayload>0)){let t=this.createError(RangeError,"Max payload size exceeded",!1,1009,"WS_ERR_UNSUPPORTED_MESSAGE_LENGTH");e(t);return}this._masked?this._state=nn:this._state=zt}getMask(){if(this._bufferedBytes<4){this._loop=!1;return}this._mask=this.consume(4),this._state=zt}getData(e){let t=Zs;if(this._payloadLength){if(this._bufferedBytes<this._payloadLength){this._loop=!1;return}t=this.consume(this._payloadLength),this._masked&&this._mask[0]|this._mask[1]|this._mask[2]|this._mask[3]&&Yo(t,this._mask)}if(this._opcode>7){this.controlMessage(t,e);return}if(this._compressed){this._state=qt,this.decompress(t,e);return}t.length&&(this._messageLength=this._totalPayloadLength,this._fragments.push(t)),this.dataMessage(e)}decompress(e,t){this._extensions[Xs.extensionName].decompress(e,this._fin,(n,i)=>{if(n)return t(n);if(i.length){if(this._messageLength+=i.length,this._messageLength>this._maxPayload&&this._maxPayload>0){let r=this.createError(RangeError,"Max payload size exceeded",!1,1009,"WS_ERR_UNSUPPORTED_MESSAGE_LENGTH");t(r);return}this._fragments.push(i)}this.dataMessage(t),this._state===A&&this.startLoop(t)})}dataMessage(e){if(!this._fin){this._state=A;return}let t=this._messageLength,s=this._fragments;if(this._totalPayloadLength=0,this._messageLength=0,this._fragmented=0,this._fragments=[],this._opcode===2){let n;this._binaryType==="nodebuffer"?n=Gt(s,t):this._binaryType==="arraybuffer"?n=qo(Gt(s,t)):this._binaryType==="blob"?n=new Blob(s):n=s,this._allowSynchronousEvents?(this.emit("message",n,!0),this._state=A):(this._state=at,setImmediate(()=>{this.emit("message",n,!0),this._state=A,this.startLoop(e)}))}else{let n=Gt(s,t);if(!this._skipUTF8Validation&&!en(n)){let i=this.createError(Error,"invalid UTF-8 sequence",!0,1007,"WS_ERR_INVALID_UTF8");e(i);return}this._state===qt||this._allowSynchronousEvents?(this.emit("message",n,!1),this._state=A):(this._state=at,setImmediate(()=>{this.emit("message",n,!1),this._state=A,this.startLoop(e)}))}}controlMessage(e,t){if(this._opcode===8){if(e.length===0)this._loop=!1,this.emit("conclude",1005,Zs),this.end();else{let s=e.readUInt16BE(0);if(!Jo(s)){let i=this.createError(RangeError,`invalid status code ${s}`,!0,1002,"WS_ERR_INVALID_CLOSE_CODE");t(i);return}let n=new rt(e.buffer,e.byteOffset+2,e.length-2);if(!this._skipUTF8Validation&&!en(n)){let i=this.createError(Error,"invalid UTF-8 sequence",!0,1007,"WS_ERR_INVALID_UTF8");t(i);return}this._loop=!1,this.emit("conclude",s,n),this.end()}this._state=A;return}this._allowSynchronousEvents?(this.emit(this._opcode===9?"ping":"pong",e),this._state=A):(this._state=at,setImmediate(()=>{this.emit(this._opcode===9?"ping":"pong",e),this._state=A,this.startLoop(t)}))}createError(e,t,s,n,i){this._loop=!1,this._errored=!0;let r=new e(s?`Invalid WebSocket frame: ${t}`:t);return Error.captureStackTrace(r,this.createError),r.code=i,r[Go]=n,r}};on.exports=Yt});var Zt=_((Or,ln)=>{"use strict";var{Duplex:Lr}=require("stream"),{randomFillSync:Qo}=require("crypto"),rn=ge(),{EMPTY_BUFFER:Xo,kWebSocket:Zo,NOOP:ei}=K(),{isBlob:me,isValidStatusCode:ti}=he(),{mask:an,toBuffer:se}=De(),L=Symbol("kByteLength"),si=Buffer.alloc(4),lt=8*1024,ne,fe=lt,$=0,ni=1,oi=2,Qt=class o{constructor(e,t,s){this._extensions=t||{},s&&(this._generateMask=s,this._maskBuffer=Buffer.alloc(4)),this._socket=e,this._firstFragment=!0,this._compress=!1,this._bufferedBytes=0,this._queue=[],this._state=$,this.onerror=ei,this[Zo]=void 0}static frame(e,t){let s,n=!1,i=2,r=!1;t.mask&&(s=t.maskBuffer||si,t.generateMask?t.generateMask(s):(fe===lt&&(ne===void 0&&(ne=Buffer.alloc(lt)),Qo(ne,0,lt),fe=0),s[0]=ne[fe++],s[1]=ne[fe++],s[2]=ne[fe++],s[3]=ne[fe++]),r=(s[0]|s[1]|s[2]|s[3])===0,i=6);let a;typeof e=="string"?(!t.mask||r)&&t[L]!==void 0?a=t[L]:(e=Buffer.from(e),a=e.length):(a=e.length,n=t.mask&&t.readOnly&&!r);let l=a;a>=65536?(i+=8,l=127):a>125&&(i+=2,l=126);let c=Buffer.allocUnsafe(n?a+i:i);return c[0]=t.fin?t.opcode|128:t.opcode,t.rsv1&&(c[0]|=64),c[1]=l,l===126?c.writeUInt16BE(a,2):l===127&&(c[2]=c[3]=0,c.writeUIntBE(a,4,6)),t.mask?(c[1]|=128,c[i-4]=s[0],c[i-3]=s[1],c[i-2]=s[2],c[i-1]=s[3],r?[c,e]:n?(an(e,s,c,i,a),[c]):(an(e,s,e,0,a),[c,e])):[c,e]}close(e,t,s,n){let i;if(e===void 0)i=Xo;else{if(typeof e!="number"||!ti(e))throw new TypeError("First argument must be a valid error code number");if(t===void 0||!t.length)i=Buffer.allocUnsafe(2),i.writeUInt16BE(e,0);else{let a=Buffer.byteLength(t);if(a>123)throw new RangeError("The message must not be greater than 123 bytes");i=Buffer.allocUnsafe(2+a),i.writeUInt16BE(e,0),typeof t=="string"?i.write(t,2):i.set(t,2)}}let r={[L]:i.length,fin:!0,generateMask:this._generateMask,mask:s,maskBuffer:this._maskBuffer,opcode:8,readOnly:!1,rsv1:!1};this._state!==$?this.enqueue([this.dispatch,i,!1,r,n]):this.sendFrame(o.frame(i,r),n)}ping(e,t,s){let n,i;if(typeof e=="string"?(n=Buffer.byteLength(e),i=!1):me(e)?(n=e.size,i=!1):(e=se(e),n=e.length,i=se.readOnly),n>125)throw new RangeError("The data size must not be greater than 125 bytes");let r={[L]:n,fin:!0,generateMask:this._generateMask,mask:t,maskBuffer:this._maskBuffer,opcode:9,readOnly:i,rsv1:!1};me(e)?this._state!==$?this.enqueue([this.getBlobData,e,!1,r,s]):this.getBlobData(e,!1,r,s):this._state!==$?this.enqueue([this.dispatch,e,!1,r,s]):this.sendFrame(o.frame(e,r),s)}pong(e,t,s){let n,i;if(typeof e=="string"?(n=Buffer.byteLength(e),i=!1):me(e)?(n=e.size,i=!1):(e=se(e),n=e.length,i=se.readOnly),n>125)throw new RangeError("The data size must not be greater than 125 bytes");let r={[L]:n,fin:!0,generateMask:this._generateMask,mask:t,maskBuffer:this._maskBuffer,opcode:10,readOnly:i,rsv1:!1};me(e)?this._state!==$?this.enqueue([this.getBlobData,e,!1,r,s]):this.getBlobData(e,!1,r,s):this._state!==$?this.enqueue([this.dispatch,e,!1,r,s]):this.sendFrame(o.frame(e,r),s)}send(e,t,s){let n=this._extensions[rn.extensionName],i=t.binary?2:1,r=t.compress,a,l;typeof e=="string"?(a=Buffer.byteLength(e),l=!1):me(e)?(a=e.size,l=!1):(e=se(e),a=e.length,l=se.readOnly),this._firstFragment?(this._firstFragment=!1,r&&n&&n.params[n._isServer?"server_no_context_takeover":"client_no_context_takeover"]&&(r=a>=n._threshold),this._compress=r):(r=!1,i=0),t.fin&&(this._firstFragment=!0);let c={[L]:a,fin:t.fin,generateMask:this._generateMask,mask:t.mask,maskBuffer:this._maskBuffer,opcode:i,readOnly:l,rsv1:r};me(e)?this._state!==$?this.enqueue([this.getBlobData,e,this._compress,c,s]):this.getBlobData(e,this._compress,c,s):this._state!==$?this.enqueue([this.dispatch,e,this._compress,c,s]):this.dispatch(e,this._compress,c,s)}getBlobData(e,t,s,n){this._bufferedBytes+=s[L],this._state=oi,e.arrayBuffer().then(i=>{if(this._socket.destroyed){let a=new Error("The socket was closed while the blob was being read");process.nextTick(Xt,this,a,n);return}this._bufferedBytes-=s[L];let r=se(i);t?this.dispatch(r,t,s,n):(this._state=$,this.sendFrame(o.frame(r,s),n),this.dequeue())}).catch(i=>{process.nextTick(ii,this,i,n)})}dispatch(e,t,s,n){if(!t){this.sendFrame(o.frame(e,s),n);return}let i=this._extensions[rn.extensionName];this._bufferedBytes+=s[L],this._state=ni,i.compress(e,s.fin,(r,a)=>{if(this._socket.destroyed){let l=new Error("The socket was closed while data was being compressed");Xt(this,l,n);return}this._bufferedBytes-=s[L],this._state=$,s.readOnly=!1,this.sendFrame(o.frame(a,s),n),this.dequeue()})}dequeue(){for(;this._state===$&&this._queue.length;){let e=this._queue.shift();this._bufferedBytes-=e[3][L],Reflect.apply(e[0],this,e.slice(1))}}enqueue(e){this._bufferedBytes+=e[3][L],this._queue.push(e)}sendFrame(e,t){e.length===2?(this._socket.cork(),this._socket.write(e[0]),this._socket.write(e[1],t),this._socket.uncork()):this._socket.write(e[0],t)}};ln.exports=Qt;function Xt(o,e,t){typeof t=="function"&&t(e);for(let s=0;s<o._queue.length;s++){let n=o._queue[s],i=n[n.length-1];typeof i=="function"&&i(e)}}function ii(o,e,t){Xt(o,e,t),o.onerror(e)}});var vn=_((Dr,fn)=>{"use strict";var{kForOnEventAttribute:He,kListener:es}=K(),cn=Symbol("kCode"),dn=Symbol("kData"),un=Symbol("kError"),pn=Symbol("kMessage"),gn=Symbol("kReason"),ve=Symbol("kTarget"),hn=Symbol("kType"),mn=Symbol("kWasClean"),z=class{constructor(e){this[ve]=null,this[hn]=e}get target(){return this[ve]}get type(){return this[hn]}};Object.defineProperty(z.prototype,"target",{enumerable:!0});Object.defineProperty(z.prototype,"type",{enumerable:!0});var oe=class extends z{constructor(e,t={}){super(e),this[cn]=t.code===void 0?0:t.code,this[gn]=t.reason===void 0?"":t.reason,this[mn]=t.wasClean===void 0?!1:t.wasClean}get code(){return this[cn]}get reason(){return this[gn]}get wasClean(){return this[mn]}};Object.defineProperty(oe.prototype,"code",{enumerable:!0});Object.defineProperty(oe.prototype,"reason",{enumerable:!0});Object.defineProperty(oe.prototype,"wasClean",{enumerable:!0});var be=class extends z{constructor(e,t={}){super(e),this[un]=t.error===void 0?null:t.error,this[pn]=t.message===void 0?"":t.message}get error(){return this[un]}get message(){return this[pn]}};Object.defineProperty(be.prototype,"error",{enumerable:!0});Object.defineProperty(be.prototype,"message",{enumerable:!0});var $e=class extends z{constructor(e,t={}){super(e),this[dn]=t.data===void 0?null:t.data}get data(){return this[dn]}};Object.defineProperty($e.prototype,"data",{enumerable:!0});var ri={addEventListener(o,e,t={}){for(let n of this.listeners(o))if(!t[He]&&n[es]===e&&!n[He])return;let s;if(o==="message")s=function(i,r){let a=new $e("message",{data:r?i:i.toString()});a[ve]=this,ct(e,this,a)};else if(o==="close")s=function(i,r){let a=new oe("close",{code:i,reason:r.toString(),wasClean:this._closeFrameReceived&&this._closeFrameSent});a[ve]=this,ct(e,this,a)};else if(o==="error")s=function(i){let r=new be("error",{error:i,message:i.message});r[ve]=this,ct(e,this,r)};else if(o==="open")s=function(){let i=new z("open");i[ve]=this,ct(e,this,i)};else return;s[He]=!!t[He],s[es]=e,t.once?this.once(o,s):this.on(o,s)},removeEventListener(o,e){for(let t of this.listeners(o))if(t[es]===e&&!t[He]){this.removeListener(o,t);break}}};fn.exports={CloseEvent:oe,ErrorEvent:be,Event:z,EventTarget:ri,MessageEvent:$e};function ct(o,e,t){typeof o=="object"&&o.handleEvent?o.handleEvent.call(o,t):o.call(e,t)}});var dt=_((Br,bn)=>{"use strict";var{tokenChars:Re}=he();function F(o,e,t){o[e]===void 0?o[e]=[t]:o[e].push(t)}function ai(o){let e=Object.create(null),t=Object.create(null),s=!1,n=!1,i=!1,r,a,l=-1,c=-1,u=-1,p=0;for(;p<o.length;p++)if(c=o.charCodeAt(p),r===void 0)if(u===-1&&Re[c]===1)l===-1&&(l=p);else if(p!==0&&(c===32||c===9))u===-1&&l!==-1&&(u=p);else if(c===59||c===44){if(l===-1)throw new SyntaxError(`Unexpected character at index ${p}`);u===-1&&(u=p);let m=o.slice(l,u);c===44?(F(e,m,t),t=Object.create(null)):r=m,l=u=-1}else throw new SyntaxError(`Unexpected character at index ${p}`);else if(a===void 0)if(u===-1&&Re[c]===1)l===-1&&(l=p);else if(c===32||c===9)u===-1&&l!==-1&&(u=p);else if(c===59||c===44){if(l===-1)throw new SyntaxError(`Unexpected character at index ${p}`);u===-1&&(u=p),F(t,o.slice(l,u),!0),c===44&&(F(e,r,t),t=Object.create(null),r=void 0),l=u=-1}else if(c===61&&l!==-1&&u===-1)a=o.slice(l,p),l=u=-1;else throw new SyntaxError(`Unexpected character at index ${p}`);else if(n){if(Re[c]!==1)throw new SyntaxError(`Unexpected character at index ${p}`);l===-1?l=p:s||(s=!0),n=!1}else if(i)if(Re[c]===1)l===-1&&(l=p);else if(c===34&&l!==-1)i=!1,u=p;else if(c===92)n=!0;else throw new SyntaxError(`Unexpected character at index ${p}`);else if(c===34&&o.charCodeAt(p-1)===61)i=!0;else if(u===-1&&Re[c]===1)l===-1&&(l=p);else if(l!==-1&&(c===32||c===9))u===-1&&(u=p);else if(c===59||c===44){if(l===-1)throw new SyntaxError(`Unexpected character at index ${p}`);u===-1&&(u=p);let m=o.slice(l,u);s&&(m=m.replace(/\\/g,""),s=!1),F(t,a,m),c===44&&(F(e,r,t),t=Object.create(null),r=void 0),a=void 0,l=u=-1}else throw new SyntaxError(`Unexpected character at index ${p}`);if(l===-1||i||c===32||c===9)throw new SyntaxError("Unexpected end of input");u===-1&&(u=p);let h=o.slice(l,u);return r===void 0?F(e,h,t):(a===void 0?F(t,h,!0):s?F(t,a,h.replace(/\\/g,"")):F(t,a,h),F(e,r,t)),e}function li(o){return Object.keys(o).map(e=>{let t=o[e];return Array.isArray(t)||(t=[t]),t.map(s=>[e].concat(Object.keys(s).map(n=>{let i=s[n];return Array.isArray(i)||(i=[i]),i.map(r=>r===!0?n:`${n}=${r}`).join("; ")})).join("; ")).join(", ")}).join(", ")}bn.exports={format:li,parse:ai}});var ht=_((Rr,In)=>{"use strict";var ci=require("events"),di=require("https"),ui=require("http"),kn=require("net"),pi=require("tls"),{randomBytes:gi,createHash:hi}=require("crypto"),{Duplex:Hr,Readable:$r}=require("stream"),{URL:ts}=require("url"),Z=ge(),mi=Jt(),fi=Zt(),{isBlob:vi}=he(),{BINARY_TYPES:wn,CLOSE_TIMEOUT:bi,EMPTY_BUFFER:ut,GUID:wi,kForOnEventAttribute:ss,kListener:yi,kStatusCode:ki,kWebSocket:S,NOOP:Sn}=K(),{EventTarget:{addEventListener:Si,removeEventListener:Ci}}=vn(),{format:xi,parse:Pi}=dt(),{toBuffer:Ei}=De(),Cn=Symbol("kAborted"),ns=[8,13],q=["CONNECTING","OPEN","CLOSING","CLOSED"],Mi=/^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/,y=class o extends ci{constructor(e,t,s){super(),this._binaryType=wn[0],this._closeCode=1006,this._closeFrameReceived=!1,this._closeFrameSent=!1,this._closeMessage=ut,this._closeTimer=null,this._errorEmitted=!1,this._extensions={},this._paused=!1,this._protocol="",this._readyState=o.CONNECTING,this._receiver=null,this._sender=null,this._socket=null,e!==null?(this._bufferedAmount=0,this._isServer=!1,this._redirects=0,t===void 0?t=[]:Array.isArray(t)||(typeof t=="object"&&t!==null?(s=t,t=[]):t=[t]),xn(this,e,t,s)):(this._autoPong=s.autoPong,this._closeTimeout=s.closeTimeout,this._isServer=!0)}get binaryType(){return this._binaryType}set binaryType(e){wn.includes(e)&&(this._binaryType=e,this._receiver&&(this._receiver._binaryType=e))}get bufferedAmount(){return this._socket?this._socket._writableState.length+this._sender._bufferedBytes:this._bufferedAmount}get extensions(){return Object.keys(this._extensions).join()}get isPaused(){return this._paused}get onclose(){return null}get onerror(){return null}get onopen(){return null}get onmessage(){return null}get protocol(){return this._protocol}get readyState(){return this._readyState}get url(){return this._url}setSocket(e,t,s){let n=new mi({allowSynchronousEvents:s.allowSynchronousEvents,binaryType:this.binaryType,extensions:this._extensions,isServer:this._isServer,maxPayload:s.maxPayload,skipUTF8Validation:s.skipUTF8Validation}),i=new fi(e,this._extensions,s.generateMask);this._receiver=n,this._sender=i,this._socket=e,n[S]=this,i[S]=this,e[S]=this,n.on("conclude",Ii),n.on("drain",Ai),n.on("error",Li),n.on("message",Oi),n.on("ping",Di),n.on("pong",Bi),i.onerror=Hi,e.setTimeout&&e.setTimeout(0),e.setNoDelay&&e.setNoDelay(),t.length>0&&e.unshift(t),e.on("close",Mn),e.on("data",gt),e.on("end",_n),e.on("error",Tn),this._readyState=o.OPEN,this.emit("open")}emitClose(){if(!this._socket){this._readyState=o.CLOSED,this.emit("close",this._closeCode,this._closeMessage);return}this._extensions[Z.extensionName]&&this._extensions[Z.extensionName].cleanup(),this._receiver.removeAllListeners(),this._readyState=o.CLOSED,this.emit("close",this._closeCode,this._closeMessage)}close(e,t){if(this.readyState!==o.CLOSED){if(this.readyState===o.CONNECTING){T(this,this._req,"WebSocket was closed before the connection was established");return}if(this.readyState===o.CLOSING){this._closeFrameSent&&(this._closeFrameReceived||this._receiver._writableState.errorEmitted)&&this._socket.end();return}this._readyState=o.CLOSING,this._sender.close(e,t,!this._isServer,s=>{s||(this._closeFrameSent=!0,(this._closeFrameReceived||this._receiver._writableState.errorEmitted)&&this._socket.end())}),En(this)}}pause(){this.readyState===o.CONNECTING||this.readyState===o.CLOSED||(this._paused=!0,this._socket.pause())}ping(e,t,s){if(this.readyState===o.CONNECTING)throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");if(typeof e=="function"?(s=e,e=t=void 0):typeof t=="function"&&(s=t,t=void 0),typeof e=="number"&&(e=e.toString()),this.readyState!==o.OPEN){os(this,e,s);return}t===void 0&&(t=!this._isServer),this._sender.ping(e||ut,t,s)}pong(e,t,s){if(this.readyState===o.CONNECTING)throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");if(typeof e=="function"?(s=e,e=t=void 0):typeof t=="function"&&(s=t,t=void 0),typeof e=="number"&&(e=e.toString()),this.readyState!==o.OPEN){os(this,e,s);return}t===void 0&&(t=!this._isServer),this._sender.pong(e||ut,t,s)}resume(){this.readyState===o.CONNECTING||this.readyState===o.CLOSED||(this._paused=!1,this._receiver._writableState.needDrain||this._socket.resume())}send(e,t,s){if(this.readyState===o.CONNECTING)throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");if(typeof t=="function"&&(s=t,t={}),typeof e=="number"&&(e=e.toString()),this.readyState!==o.OPEN){os(this,e,s);return}let n={binary:typeof e!="string",mask:!this._isServer,compress:!0,fin:!0,...t};this._extensions[Z.extensionName]||(n.compress=!1),this._sender.send(e||ut,n,s)}terminate(){if(this.readyState!==o.CLOSED){if(this.readyState===o.CONNECTING){T(this,this._req,"WebSocket was closed before the connection was established");return}this._socket&&(this._readyState=o.CLOSING,this._socket.destroy())}}};Object.defineProperty(y,"CONNECTING",{enumerable:!0,value:q.indexOf("CONNECTING")});Object.defineProperty(y.prototype,"CONNECTING",{enumerable:!0,value:q.indexOf("CONNECTING")});Object.defineProperty(y,"OPEN",{enumerable:!0,value:q.indexOf("OPEN")});Object.defineProperty(y.prototype,"OPEN",{enumerable:!0,value:q.indexOf("OPEN")});Object.defineProperty(y,"CLOSING",{enumerable:!0,value:q.indexOf("CLOSING")});Object.defineProperty(y.prototype,"CLOSING",{enumerable:!0,value:q.indexOf("CLOSING")});Object.defineProperty(y,"CLOSED",{enumerable:!0,value:q.indexOf("CLOSED")});Object.defineProperty(y.prototype,"CLOSED",{enumerable:!0,value:q.indexOf("CLOSED")});["binaryType","bufferedAmount","extensions","isPaused","protocol","readyState","url"].forEach(o=>{Object.defineProperty(y.prototype,o,{enumerable:!0})});["open","error","close","message"].forEach(o=>{Object.defineProperty(y.prototype,`on${o}`,{enumerable:!0,get(){for(let e of this.listeners(o))if(e[ss])return e[yi];return null},set(e){for(let t of this.listeners(o))if(t[ss]){this.removeListener(o,t);break}typeof e=="function"&&this.addEventListener(o,e,{[ss]:!0})}})});y.prototype.addEventListener=Si;y.prototype.removeEventListener=Ci;In.exports=y;function xn(o,e,t,s){let n={allowSynchronousEvents:!0,autoPong:!0,closeTimeout:bi,protocolVersion:ns[1],maxPayload:104857600,skipUTF8Validation:!1,perMessageDeflate:!0,followRedirects:!1,maxRedirects:10,...s,socketPath:void 0,hostname:void 0,protocol:void 0,timeout:void 0,method:"GET",host:void 0,path:void 0,port:void 0};if(o._autoPong=n.autoPong,o._closeTimeout=n.closeTimeout,!ns.includes(n.protocolVersion))throw new RangeError(`Unsupported protocol version: ${n.protocolVersion} (supported versions: ${ns.join(", ")})`);let i;if(e instanceof ts)i=e;else try{i=new ts(e)}catch{throw new SyntaxError(`Invalid URL: ${e}`)}i.protocol==="http:"?i.protocol="ws:":i.protocol==="https:"&&(i.protocol="wss:"),o._url=i.href;let r=i.protocol==="wss:",a=i.protocol==="ws+unix:",l;if(i.protocol!=="ws:"&&!r&&!a?l=`The URL's protocol must be one of "ws:", "wss:", "http:", "https:", or "ws+unix:"`:a&&!i.pathname?l="The URL's pathname is empty":i.hash&&(l="The URL contains a fragment identifier"),l){let v=new SyntaxError(l);if(o._redirects===0)throw v;pt(o,v);return}let c=r?443:80,u=gi(16).toString("base64"),p=r?di.request:ui.request,h=new Set,m;if(n.createConnection=n.createConnection||(r?Ti:_i),n.defaultPort=n.defaultPort||c,n.port=i.port||c,n.host=i.hostname.startsWith("[")?i.hostname.slice(1,-1):i.hostname,n.headers={...n.headers,"Sec-WebSocket-Version":n.protocolVersion,"Sec-WebSocket-Key":u,Connection:"Upgrade",Upgrade:"websocket"},n.path=i.pathname+i.search,n.timeout=n.handshakeTimeout,n.perMessageDeflate&&(m=new Z({...n.perMessageDeflate,isServer:!1,maxPayload:n.maxPayload}),n.headers["Sec-WebSocket-Extensions"]=xi({[Z.extensionName]:m.offer()})),t.length){for(let v of t){if(typeof v!="string"||!Mi.test(v)||h.has(v))throw new SyntaxError("An invalid or duplicated subprotocol was specified");h.add(v)}n.headers["Sec-WebSocket-Protocol"]=t.join(",")}if(n.origin&&(n.protocolVersion<13?n.headers["Sec-WebSocket-Origin"]=n.origin:n.headers.Origin=n.origin),(i.username||i.password)&&(n.auth=`${i.username}:${i.password}`),a){let v=n.path.split(":");n.socketPath=v[0],n.path=v[1]}let w;if(n.followRedirects){if(o._redirects===0){o._originalIpc=a,o._originalSecure=r,o._originalHostOrSocketPath=a?n.socketPath:i.host;let v=s&&s.headers;if(s={...s,headers:{}},v)for(let[E,ce]of Object.entries(v))s.headers[E.toLowerCase()]=ce}else if(o.listenerCount("redirect")===0){let v=a?o._originalIpc?n.socketPath===o._originalHostOrSocketPath:!1:o._originalIpc?!1:i.host===o._originalHostOrSocketPath;(!v||o._originalSecure&&!r)&&(delete n.headers.authorization,delete n.headers.cookie,v||delete n.headers.host,n.auth=void 0)}n.auth&&!s.headers.authorization&&(s.headers.authorization="Basic "+Buffer.from(n.auth).toString("base64")),w=o._req=p(n),o._redirects&&o.emit("redirect",o.url,w)}else w=o._req=p(n);n.timeout&&w.on("timeout",()=>{T(o,w,"Opening handshake has timed out")}),w.on("error",v=>{w===null||w[Cn]||(w=o._req=null,pt(o,v))}),w.on("response",v=>{let E=v.headers.location,ce=v.statusCode;if(E&&n.followRedirects&&ce>=300&&ce<400){if(++o._redirects>n.maxRedirects){T(o,w,"Maximum redirects exceeded");return}w.abort();let Ie;try{Ie=new ts(E,e)}catch{let de=new SyntaxError(`Invalid URL: ${E}`);pt(o,de);return}xn(o,Ie,t,s)}else o.emit("unexpected-response",w,v)||T(o,w,`Unexpected server response: ${v.statusCode}`)}),w.on("upgrade",(v,E,ce)=>{if(o.emit("upgrade",v),o.readyState!==y.CONNECTING)return;w=o._req=null;let Ie=v.headers.upgrade;if(Ie===void 0||Ie.toLowerCase()!=="websocket"){T(o,E,"Invalid Upgrade header");return}let Is=hi("sha1").update(u+wi).digest("base64");if(v.headers["sec-websocket-accept"]!==Is){T(o,E,"Invalid Sec-WebSocket-Accept header");return}let de=v.headers["sec-websocket-protocol"],Ae;if(de!==void 0?h.size?h.has(de)||(Ae="Server sent an invalid subprotocol"):Ae="Server sent a subprotocol but none was requested":h.size&&(Ae="Server sent no subprotocol"),Ae){T(o,E,Ae);return}de&&(o._protocol=de);let As=v.headers["sec-websocket-extensions"];if(As!==void 0){if(!m){T(o,E,"Server sent a Sec-WebSocket-Extensions header but no extension was requested");return}let Ht;try{Ht=Pi(As)}catch{T(o,E,"Invalid Sec-WebSocket-Extensions header");return}let Ls=Object.keys(Ht);if(Ls.length!==1||Ls[0]!==Z.extensionName){T(o,E,"Server indicated an extension that was not requested");return}try{m.accept(Ht[Z.extensionName])}catch{T(o,E,"Invalid Sec-WebSocket-Extensions header");return}o._extensions[Z.extensionName]=m}o.setSocket(E,ce,{allowSynchronousEvents:n.allowSynchronousEvents,generateMask:n.generateMask,maxPayload:n.maxPayload,skipUTF8Validation:n.skipUTF8Validation})}),n.finishRequest?n.finishRequest(w,o):w.end()}function pt(o,e){o._readyState=y.CLOSING,o._errorEmitted=!0,o.emit("error",e),o.emitClose()}function _i(o){return o.path=o.socketPath,kn.connect(o)}function Ti(o){return o.path=void 0,!o.servername&&o.servername!==""&&(o.servername=kn.isIP(o.host)?"":o.host),pi.connect(o)}function T(o,e,t){o._readyState=y.CLOSING;let s=new Error(t);Error.captureStackTrace(s,T),e.setHeader?(e[Cn]=!0,e.abort(),e.socket&&!e.socket.destroyed&&e.socket.destroy(),process.nextTick(pt,o,s)):(e.destroy(s),e.once("error",o.emit.bind(o,"error")),e.once("close",o.emitClose.bind(o)))}function os(o,e,t){if(e){let s=vi(e)?e.size:Ei(e).length;o._socket?o._sender._bufferedBytes+=s:o._bufferedAmount+=s}if(t){let s=new Error(`WebSocket is not open: readyState ${o.readyState} (${q[o.readyState]})`);process.nextTick(t,s)}}function Ii(o,e){let t=this[S];t._closeFrameReceived=!0,t._closeMessage=e,t._closeCode=o,t._socket[S]!==void 0&&(t._socket.removeListener("data",gt),process.nextTick(Pn,t._socket),o===1005?t.close():t.close(o,e))}function Ai(){let o=this[S];o.isPaused||o._socket.resume()}function Li(o){let e=this[S];e._socket[S]!==void 0&&(e._socket.removeListener("data",gt),process.nextTick(Pn,e._socket),e.close(o[ki])),e._errorEmitted||(e._errorEmitted=!0,e.emit("error",o))}function yn(){this[S].emitClose()}function Oi(o,e){this[S].emit("message",o,e)}function Di(o){let e=this[S];e._autoPong&&e.pong(o,!this._isServer,Sn),e.emit("ping",o)}function Bi(o){this[S].emit("pong",o)}function Pn(o){o.resume()}function Hi(o){let e=this[S];e.readyState!==y.CLOSED&&(e.readyState===y.OPEN&&(e._readyState=y.CLOSING,En(e)),this._socket.end(),e._errorEmitted||(e._errorEmitted=!0,e.emit("error",o)))}function En(o){o._closeTimer=setTimeout(o._socket.destroy.bind(o._socket),o._closeTimeout)}function Mn(){let o=this[S];if(this.removeListener("close",Mn),this.removeListener("data",gt),this.removeListener("end",_n),o._readyState=y.CLOSING,!this._readableState.endEmitted&&!o._closeFrameReceived&&!o._receiver._writableState.errorEmitted&&this._readableState.length!==0){let e=this.read(this._readableState.length);o._receiver.write(e)}o._receiver.end(),this[S]=void 0,clearTimeout(o._closeTimer),o._receiver._writableState.finished||o._receiver._writableState.errorEmitted?o.emitClose():(o._receiver.on("error",yn),o._receiver.on("finish",yn))}function gt(o){this[S]._receiver.write(o)||this.pause()}function _n(){let o=this[S];o._readyState=y.CLOSING,o._receiver.end(),this.end()}function Tn(){let o=this[S];this.removeListener("error",Tn),this.on("error",Sn),o&&(o._readyState=y.CLOSING,this.destroy())}});var Dn=_((Ur,On)=>{"use strict";var Fr=ht(),{Duplex:$i}=require("stream");function An(o){o.emit("close")}function Ri(){!this.destroyed&&this._writableState.finished&&this.destroy()}function Ln(o){this.removeListener("error",Ln),this.destroy(),this.listenerCount("error")===0&&this.emit("error",o)}function Fi(o,e){let t=!0,s=new $i({...e,autoDestroy:!1,emitClose:!1,objectMode:!1,writableObjectMode:!1});return o.on("message",function(i,r){let a=!r&&s._readableState.objectMode?i.toString():i;s.push(a)||o.pause()}),o.once("error",function(i){s.destroyed||(t=!1,s.destroy(i))}),o.once("close",function(){s.destroyed||s.push(null)}),s._destroy=function(n,i){if(o.readyState===o.CLOSED){i(n),process.nextTick(An,s);return}let r=!1;o.once("error",function(l){r=!0,i(l)}),o.once("close",function(){r||i(n),process.nextTick(An,s)}),t&&o.terminate()},s._final=function(n){if(o.readyState===o.CONNECTING){o.once("open",function(){s._final(n)});return}o._socket!==null&&(o._socket._writableState.finished?(n(),s._readableState.endEmitted&&s.destroy()):(o._socket.once("finish",function(){n()}),o.close()))},s._read=function(){o.isPaused&&o.resume()},s._write=function(n,i,r){if(o.readyState===o.CONNECTING){o.once("open",function(){s._write(n,i,r)});return}o.send(n,r)},s.on("end",Ri),s.on("error",Ln),s}On.exports=Fi});var is=_((Nr,Bn)=>{"use strict";var{tokenChars:Ui}=he();function Ni(o){let e=new Set,t=-1,s=-1,n=0;for(n;n<o.length;n++){let r=o.charCodeAt(n);if(s===-1&&Ui[r]===1)t===-1&&(t=n);else if(n!==0&&(r===32||r===9))s===-1&&t!==-1&&(s=n);else if(r===44){if(t===-1)throw new SyntaxError(`Unexpected character at index ${n}`);s===-1&&(s=n);let a=o.slice(t,s);if(e.has(a))throw new SyntaxError(`The "${a}" subprotocol is duplicated`);e.add(a),t=s=-1}else throw new SyntaxError(`Unexpected character at index ${n}`)}if(t===-1||s!==-1)throw new SyntaxError("Unexpected end of input");let i=o.slice(t,n);if(e.has(i))throw new SyntaxError(`The "${i}" subprotocol is duplicated`);return e.add(i),e}Bn.exports={parse:Ni}});var jn=_((Wr,Nn)=>{"use strict";var ji=require("events"),mt=require("http"),{Duplex:jr}=require("stream"),{createHash:Wi}=require("crypto"),Hn=dt(),ie=ge(),Vi=is(),Ki=ht(),{CLOSE_TIMEOUT:Gi,GUID:zi,kWebSocket:qi}=K(),Yi=/^[+/0-9A-Za-z]{22}==$/,$n=0,Rn=1,Un=2,rs=class extends ji{constructor(e,t){if(super(),e={allowSynchronousEvents:!0,autoPong:!0,maxPayload:100*1024*1024,skipUTF8Validation:!1,perMessageDeflate:!1,handleProtocols:null,clientTracking:!0,closeTimeout:Gi,verifyClient:null,noServer:!1,backlog:null,server:null,host:null,path:null,port:null,WebSocket:Ki,...e},e.port==null&&!e.server&&!e.noServer||e.port!=null&&(e.server||e.noServer)||e.server&&e.noServer)throw new TypeError('One and only one of the "port", "server", or "noServer" options must be specified');if(e.port!=null?(this._server=mt.createServer((s,n)=>{let i=mt.STATUS_CODES[426];n.writeHead(426,{"Content-Length":i.length,"Content-Type":"text/plain"}),n.end(i)}),this._server.listen(e.port,e.host,e.backlog,t)):e.server&&(this._server=e.server),this._server){let s=this.emit.bind(this,"connection");this._removeListeners=Ji(this._server,{listening:this.emit.bind(this,"listening"),error:this.emit.bind(this,"error"),upgrade:(n,i,r)=>{this.handleUpgrade(n,i,r,s)}})}e.perMessageDeflate===!0&&(e.perMessageDeflate={}),e.clientTracking&&(this.clients=new Set,this._shouldEmitClose=!1),this.options=e,this._state=$n}address(){if(this.options.noServer)throw new Error('The server is operating in "noServer" mode');return this._server?this._server.address():null}close(e){if(this._state===Un){e&&this.once("close",()=>{e(new Error("The server is not running"))}),process.nextTick(Fe,this);return}if(e&&this.once("close",e),this._state!==Rn)if(this._state=Rn,this.options.noServer||this.options.server)this._server&&(this._removeListeners(),this._removeListeners=this._server=null),this.clients?this.clients.size?this._shouldEmitClose=!0:process.nextTick(Fe,this):process.nextTick(Fe,this);else{let t=this._server;this._removeListeners(),this._removeListeners=this._server=null,t.close(()=>{Fe(this)})}}shouldHandle(e){if(this.options.path){let t=e.url.indexOf("?");if((t!==-1?e.url.slice(0,t):e.url)!==this.options.path)return!1}return!0}handleUpgrade(e,t,s,n){t.on("error",Fn);let i=e.headers["sec-websocket-key"],r=e.headers.upgrade,a=+e.headers["sec-websocket-version"];if(e.method!=="GET"){re(this,e,t,405,"Invalid HTTP method");return}if(r===void 0||r.toLowerCase()!=="websocket"){re(this,e,t,400,"Invalid Upgrade header");return}if(i===void 0||!Yi.test(i)){re(this,e,t,400,"Missing or invalid Sec-WebSocket-Key header");return}if(a!==13&&a!==8){re(this,e,t,400,"Missing or invalid Sec-WebSocket-Version header",{"Sec-WebSocket-Version":"13, 8"});return}if(!this.shouldHandle(e)){Ue(t,400);return}let l=e.headers["sec-websocket-protocol"],c=new Set;if(l!==void 0)try{c=Vi.parse(l)}catch{re(this,e,t,400,"Invalid Sec-WebSocket-Protocol header");return}let u=e.headers["sec-websocket-extensions"],p={};if(this.options.perMessageDeflate&&u!==void 0){let h=new ie({...this.options.perMessageDeflate,isServer:!0,maxPayload:this.options.maxPayload});try{let m=Hn.parse(u);m[ie.extensionName]&&(h.accept(m[ie.extensionName]),p[ie.extensionName]=h)}catch{re(this,e,t,400,"Invalid or unacceptable Sec-WebSocket-Extensions header");return}}if(this.options.verifyClient){let h={origin:e.headers[`${a===8?"sec-websocket-origin":"origin"}`],secure:!!(e.socket.authorized||e.socket.encrypted),req:e};if(this.options.verifyClient.length===2){this.options.verifyClient(h,(m,w,v,E)=>{if(!m)return Ue(t,w||401,v,E);this.completeUpgrade(p,i,c,e,t,s,n)});return}if(!this.options.verifyClient(h))return Ue(t,401)}this.completeUpgrade(p,i,c,e,t,s,n)}completeUpgrade(e,t,s,n,i,r,a){if(!i.readable||!i.writable)return i.destroy();if(i[qi])throw new Error("server.handleUpgrade() was called more than once with the same socket, possibly due to a misconfiguration");if(this._state>$n)return Ue(i,503);let c=["HTTP/1.1 101 Switching Protocols","Upgrade: websocket","Connection: Upgrade",`Sec-WebSocket-Accept: ${Wi("sha1").update(t+zi).digest("base64")}`],u=new this.options.WebSocket(null,void 0,this.options);if(s.size){let p=this.options.handleProtocols?this.options.handleProtocols(s,n):s.values().next().value;p&&(c.push(`Sec-WebSocket-Protocol: ${p}`),u._protocol=p)}if(e[ie.extensionName]){let p=e[ie.extensionName].params,h=Hn.format({[ie.extensionName]:[p]});c.push(`Sec-WebSocket-Extensions: ${h}`),u._extensions=e}this.emit("headers",c,n),i.write(c.concat(`\r
`).join(`\r
`)),i.removeListener("error",Fn),u.setSocket(i,r,{allowSynchronousEvents:this.options.allowSynchronousEvents,maxPayload:this.options.maxPayload,skipUTF8Validation:this.options.skipUTF8Validation}),this.clients&&(this.clients.add(u),u.on("close",()=>{this.clients.delete(u),this._shouldEmitClose&&!this.clients.size&&process.nextTick(Fe,this)})),a(u,n)}};Nn.exports=rs;function Ji(o,e){for(let t of Object.keys(e))o.on(t,e[t]);return function(){for(let s of Object.keys(e))o.removeListener(s,e[s])}}function Fe(o){o._state=Un,o.emit("close")}function Fn(){this.destroy()}function Ue(o,e,t,s){t=t||mt.STATUS_CODES[e],s={Connection:"close","Content-Type":"text/html","Content-Length":Buffer.byteLength(t),...s},o.once("finish",o.destroy),o.end(`HTTP/1.1 ${e} ${mt.STATUS_CODES[e]}\r
`+Object.keys(s).map(n=>`${n}: ${s[n]}`).join(`\r
`)+`\r
\r
`+t)}function re(o,e,t,s,n,i){if(o.listenerCount("wsClientError")){let r=new Error(n);Error.captureStackTrace(r,re),o.emit("wsClientError",r,t,e)}else Ue(t,s,n,i)}});var Jn={};Le(Jn,{PerMessageDeflate:()=>Kn.default,Receiver:()=>Gn.default,Sender:()=>zn.default,WebSocket:()=>as.default,WebSocketServer:()=>Yn.default,createWebSocketStream:()=>Wn.default,default:()=>Qi,extension:()=>Vn.default,subprotocol:()=>qn.default});var Wn,Vn,Kn,Gn,zn,qn,as,Yn,Qi,Qn=V(()=>{Wn=g(Dn(),1),Vn=g(dt(),1),Kn=g(ge(),1),Gn=g(Jt(),1),zn=g(Zt(),1),qn=g(is(),1),as=g(ht(),1),Yn=g(jn(),1),Qi=as.default});var no,U,Ke=V(()=>{"use strict";no=g(require("vscode"),1),U=class{constructor(e,t,s){this.provider=e;this.config=t;this.storage=s}storage;async getApiKey(){let e=await this.storage.getApiKey(this.provider);if(e)return e;if(this.config.envVarName){let s=process.env[this.config.envVarName];if(s)return s}let t=this.getStandardEnvVars();for(let s of t){let n=process.env[s];if(n)return n}}async storeApiKey(e){await this.storage.storeApiKey(this.provider,e)}async validateApiKey(e){switch(this.provider){case"anthropic":return this.validateAnthropicKey(e);case"openai":return this.validateOpenAIKey(e);case"bedrock":return this.validateBedrockKey(e);case"vertex":return this.validateVertexKey(e);default:return this.validateGenericKey(e)}}async validateAnthropicKey(e){if(!e.startsWith("sk-ant-"))return{valid:!1,error:"Invalid Anthropic API key format. Key should start with sk-ant-"};try{let t=await fetch("https://api.anthropic.com/v1/models",{headers:{"x-api-key":e,"anthropic-version":"2023-06-01"}});return t.ok?{valid:!0,provider:"anthropic"}:t.status===401?{valid:!1,error:"Invalid API key"}:{valid:!1,error:`API error: ${t.status}`}}catch(t){return{valid:!1,error:`Connection error: ${t}`}}}async validateOpenAIKey(e){if(!e.startsWith("sk-"))return{valid:!1,error:"Invalid OpenAI API key format. Key should start with sk-"};try{let t=await fetch("https://api.openai.com/v1/models",{headers:{Authorization:`Bearer ${e}`}});return t.ok?{valid:!0,provider:"openai"}:t.status===401?{valid:!1,error:"Invalid API key"}:{valid:!1,error:`API error: ${t.status}`}}catch(t){return{valid:!1,error:`Connection error: ${t}`}}}async validateBedrockKey(e){return{valid:!0,provider:"bedrock"}}async validateVertexKey(e){return{valid:!0,provider:"vertex"}}async validateGenericKey(e){return!e||e.length<10?{valid:!1,error:"API key is too short"}:{valid:!0,provider:this.provider}}getStandardEnvVars(){return{anthropic:["ANTHROPIC_API_KEY","ANTHROPIC_AUTH_TOKEN"],openai:["OPENAI_API_KEY"],bedrock:["AWS_ACCESS_KEY_ID"],vertex:["GOOGLE_APPLICATION_CREDENTIALS"]}[this.provider]||[]}async promptForApiKey(){return await no.window.showInputBox({prompt:`Enter your ${this.provider} API key`,password:!0,placeHolder:`Enter your ${this.provider} API key`,validateInput:async t=>!t||t.trim().length===0?"API key cannot be empty":null})}async deleteApiKey(){await this.storage.delete(`apikey_${this.provider}`)}async hasApiKey(){let e=await this.getApiKey();return e!==void 0&&e.length>0}async getAuthHeader(){let e=await this.getApiKey();return e?`${this.config.prefix||"Bearer "}${e}`:void 0}dispose(){}}});var io={};Le(io,{CustomProviderAuth:()=>ze});var C,Q,Ge,oo,J,ze,ps=V(()=>{"use strict";C=g(require("vscode"),1),Q=g(require("fs"),1),Ge=g(require("path"),1),oo=g(require("os"),1);Ke();J=Ge.join(oo.homedir(),".claude","models.json"),ze=class extends U{modelsConfig=null;constructor(e){super("custom",{provider:"custom"},e)}async configure(){await this.loadModelsConfig();let e=[{label:"$(add) Add New Provider",action:"new"},{label:"$(file) Edit models.json",action:"edit"},{label:"$(list) View Existing Providers",action:"list"}],t=await C.window.showQuickPick(e,{placeHolder:"Custom Provider Configuration"});if(!t)return!1;switch(t.action){case"new":return await this.addNewProvider();case"edit":return await this.editModelsJson();case"list":return await this.listProviders()}return!1}async addNewProvider(){let e=await C.window.showInputBox({prompt:"Provider Name",placeHolder:"e.g., OpenRouter, DeepSeek, Groq"});if(!e)return!1;let t=await C.window.showInputBox({prompt:"API Base URL",placeHolder:"https://api.example.com/v1"});if(!t)return!1;let s=[{label:"Anthropic",value:"anthropic"},{label:"OpenAI",value:"openai"}],n=await C.window.showQuickPick(s,{placeHolder:"Select API Format"});if(!n)return!1;let i=n.value,r=await C.window.showInputBox({prompt:"API Key",password:!0});if(!r)return!1;let a=await C.window.showInputBox({prompt:"Default Model Name (optional)",placeHolder:"e.g., gpt-4, claude-3-opus"});return!await this.validateProvider({name:e,baseUrl:t,apiKey:r,apiFormat:i})&&await C.window.showWarningMessage("Could not validate the API configuration. Save anyway?","Yes","No")!=="Yes"?!1:(await this.saveProviderConfig({name:e,baseUrl:t,apiKey:r,apiFormat:i,models:a?{[a]:{name:a}}:void 0}),C.window.showInformationMessage(`Provider "${e}" configured successfully!`),!0)}async validateProvider(e){try{let t={"Content-Type":"application/json"};e.apiFormat==="openai"?t.Authorization=`Bearer ${e.apiKey}`:t["x-api-key"]=e.apiKey;let s=e.baseUrl.endsWith("/")?`${e.baseUrl}models`:`${e.baseUrl}/models`,n=await fetch(s,{headers:t});return n.ok||n.status===404?!0:n.status<500}catch{return!1}}async saveProviderConfig(e){this.modelsConfig||(this.modelsConfig={providers:{}});let t=e.name.toLowerCase().replace(/\s+/g,"-");await this.storeApiKey(e.apiKey),this.modelsConfig.providers[t]={name:e.name,baseUrl:e.baseUrl,apiKey:`{env:CCLOCAL_${t.toUpperCase()}_API_KEY}`,apiFormat:e.apiFormat,models:e.models},await this.saveModelsConfig(),process.env[`CCLOCAL_${t.toUpperCase()}_API_KEY`]=e.apiKey}async editModelsJson(){Q.existsSync(J)||await this.createDefaultModelsConfig();let e=await C.workspace.openTextDocument(J);return await C.window.showTextDocument(e),!0}async listProviders(){if(await this.loadModelsConfig(),!this.modelsConfig||Object.keys(this.modelsConfig.providers).length===0)return C.window.showInformationMessage("No custom providers configured yet."),!1;let e=Object.entries(this.modelsConfig.providers).map(([i,r])=>({label:r.name,description:r.baseUrl,detail:`API Format: ${r.apiFormat||"openai"}`,key:i})),t=await C.window.showQuickPick(e,{placeHolder:"Configured Providers"});if(!t)return!1;let s=[{label:"$(pencil) Edit",action:"edit"},{label:"$(trash) Delete",action:"delete"},{label:"$(check) Test",action:"test"}],n=await C.window.showQuickPick(s,{placeHolder:`Actions for ${t.label}`});if(!n)return!1;switch(n.action){case"edit":return await this.editProvider(t.key);case"delete":return await this.deleteProvider(t.key);case"test":return await this.testProvider(t.key)}return!1}async editProvider(e){return await this.editModelsJson(),!0}async deleteProvider(e){return await C.window.showWarningMessage(`Delete provider "${e}"?`,"Yes","No")!=="Yes"?!1:(this.modelsConfig&&(delete this.modelsConfig.providers[e],await this.saveModelsConfig()),!0)}async testProvider(e){if(!this.modelsConfig)return!1;let t=this.modelsConfig.providers[e];if(!t)return!1;let s=await this.validateProvider(t);return s?C.window.showInformationMessage(`Provider "${t.name}" is working!`):C.window.showErrorMessage(`Provider "${t.name}" test failed.`),s}async loadModelsConfig(){try{if(Q.existsSync(J)){let e=await Q.promises.readFile(J,"utf8");this.modelsConfig=JSON.parse(e)}else this.modelsConfig={providers:{}}}catch(e){console.error("Failed to load models.json:",e),this.modelsConfig={providers:{}}}}async saveModelsConfig(){let e=Ge.dirname(J);await Q.promises.mkdir(e,{recursive:!0}),await Q.promises.writeFile(J,JSON.stringify(this.modelsConfig,null,2),"utf8")}async createDefaultModelsConfig(){let e={providers:{},defaultModel:void 0,smallFastModel:void 0};await Q.promises.mkdir(Ge.dirname(J),{recursive:!0}),await Q.promises.writeFile(J,JSON.stringify(e,null,2),"utf8"),this.modelsConfig=e}async getConfiguredProviders(){return await this.loadModelsConfig(),this.modelsConfig?.providers||{}}static getModelsConfigPath(){return J}}});function Et(o,e){return!xe&&o&&(xe=new Ye(o,e)),xe}function Mt(){xe&&(xe.dispose(),xe=null)}var N,Pt,ro,ms,Ye,xe,ao=V(()=>{"use strict";N=g(require("vscode"),1),Pt=g(require("path"),1),ro=g(require("fs"),1),ms={user:".claude.json",local:"cclocal.json",project:".mcp.json"},Ye=class{outputChannel;servers;options;disposables;stateChangeEmitter;onDidChangeState;constructor(e,t={}){this.outputChannel=e,this.options={autoDiscoverProject:!0,autoApproveKnown:!1,preApprovedServers:[],deniedServers:[],allowedPatterns:[],blockedPatterns:[],...t},this.servers=new Map,this.disposables=[],this.stateChangeEmitter=new N.EventEmitter,this.onDidChangeState=this.stateChangeEmitter.event,this.outputChannel.debug("MCPManager initialized")}async discoverServers(){this.outputChannel.debug("Discovering MCP servers...");let e=[],t=await this.discoverFromConfig(this.getUserConfigPath(),"user");e.push(...t);let s=await this.discoverFromConfig(this.getLocalConfigPath(),"local");if(e.push(...s),this.options.autoDiscoverProject){let n=await this.discoverFromConfig(this.getProjectConfigPath(),"project");e.push(...n)}for(let n of e)this.mergeServer(n);return this.outputChannel.info(`Discovered ${e.length} MCP servers`),e}async discoverFromConfig(e,t){if(!e)return[];try{let s=await ro.promises.readFile(e,"utf-8"),n=JSON.parse(s);if(!n.mcpServers)return[];let i=[],r=Date.now();for(let[a,l]of Object.entries(n.mcpServers)){let c=this.determineApprovalState(a,t),u={name:a,config:l,status:"registered",tools:[],approvalState:c,authState:this.determineAuthState(l),source:t,updatedAt:r,description:l.description};i.push(u)}return this.outputChannel.debug(`Found ${i.length} servers in ${e}`),i}catch(s){return s.code!=="ENOENT"&&this.outputChannel.warn(`Failed to read config ${e}: ${s}`),[]}}determineApprovalState(e,t){if(this.options.preApprovedServers?.includes(e))return"approved";if(this.options.deniedServers?.includes(e))return"denied";if(this.options.allowedPatterns?.length){for(let s of this.options.allowedPatterns)if(new RegExp(s).test(e))return"approved"}if(this.options.blockedPatterns?.length){for(let s of this.options.blockedPatterns)if(new RegExp(s).test(e))return"denied"}return t==="user"||t==="local"?"approved":"pending"}determineAuthState(e){return e.authToken?"authenticated":e.oauth||e.requiresAuth?"required":"none"}async approveServer(e,t=!1){let s=this.servers.get(e);if(!s)return this.outputChannel.warn(`Cannot approve: server "${e}" not found`),!1;let n={...s};return s.approvalState="approved",s.updatedAt=Date.now(),t&&await this.saveApprovalDecision(e,!0),this.emitStateChange("server_approved",e,s,n),this.outputChannel.info(`Approved MCP server: ${e}`),!0}async denyServer(e,t=!1,s){let n=this.servers.get(e);if(!n)return this.outputChannel.warn(`Cannot deny: server "${e}" not found`),!1;let i={...n};return n.approvalState="denied",n.updatedAt=Date.now(),t&&await this.saveApprovalDecision(e,!1),this.emitStateChange("server_denied",e,n,i),this.outputChannel.info(`Denied MCP server: ${e}${s?` (${s})`:""}`),!0}async removeServer(e){let t=this.servers.get(e);return t?(this.servers.delete(e),this.emitStateChange("server_removed",e,void 0,t),this.outputChannel.info(`Removed MCP server: ${e}`),!0):!1}async enableServer(e){let t=this.servers.get(e);return t?t.approvalState!=="approved"?(this.outputChannel.warn(`Cannot enable: server "${e}" is not approved`),!1):!0:!1}async disableServer(e){let t=this.servers.get(e);if(!t)return!1;let s={...t};return t.status="disconnected",t.updatedAt=Date.now(),this.emitStateChange("server_disconnected",e,t,s),!0}getServer(e){return this.servers.get(e)}getAllServers(){return Array.from(this.servers.values())}getServersByApproval(e){return this.getAllServers().filter(t=>t.approvalState===e)}getServersByStatus(e){return this.getAllServers().filter(t=>t.status===e)}getPendingApprovals(){return this.getServersByApproval("pending")}getActiveServers(){return this.getAllServers().filter(e=>e.approvalState==="approved"&&e.status==="connected")}getStats(){let e=this.getAllServers(),t={registered:0,connecting:0,connected:0,disconnected:0,failed:0},s={pending:0,approved:0,denied:0},n={user:0,local:0,project:0};for(let a of e)t[a.status]++,s[a.approvalState]++,n[a.source]++;let i=e.filter(a=>a.status==="connected").map(a=>a.name),r=e.filter(a=>a.status==="failed").map(a=>a.name);return{totalDiscovered:e.length,byStatus:t,byApproval:s,bySource:n,totalTools:e.reduce((a,l)=>a+l.tools.length,0),connectedServers:i,failedServers:r}}updateServerStatus(e,t,s){let n=this.servers.get(e);if(!n)return;let i={...n};n.status=t,n.lastError=s,n.updatedAt=Date.now();let r=t==="connected"?"server_connected":t==="failed"?"server_failed":t==="disconnected"?"server_disconnected":"server_discovered";this.emitStateChange(r,e,n,i)}updateServerTools(e,t){let s=this.servers.get(e);if(!s)return;let n={...s};s.tools=t,s.updatedAt=Date.now(),this.emitStateChange("tools_updated",e,s,n)}async showApprovalUI(e){let t=e.info,s=this.formatApprovalMessage(e),n=[{title:"Approve"},{title:"Approve & Remember"},{title:"Deny"},{title:"Deny & Remember"}],i=await N.window.showInformationMessage(s,{modal:!0,detail:this.formatApprovalDetail(e)},...n);return i?i.title==="Approve"?this.approveServer(t.name,!1):i.title==="Approve & Remember"?this.approveServer(t.name,!0):i.title==="Deny"?this.denyServer(t.name,!1):i.title==="Deny & Remember"?this.denyServer(t.name,!0):!1:!1}formatApprovalMessage(e){return`MCP Server Approval Request: "${e.name}"`}formatApprovalDetail(e){return[`Source: ${e.info.source}`,`Transport: ${e.info.config.type}`,"","Tools that will be available:",...e.tools.slice(0,5).map(s=>`  \u2022 ${s.name}: ${s.description||"No description"}`),e.tools.length>5?`  ... and ${e.tools.length-5} more`:""].filter(Boolean).join(`
`)}getUserConfigPath(){let e=process.env.HOME||process.env.USERPROFILE||"";return Pt.join(e,ms.user)}getLocalConfigPath(){let e=process.env.HOME||process.env.USERPROFILE||"";return Pt.join(e,".claude",ms.local)}getProjectConfigPath(){let e=N.workspace.workspaceFolders;if(!(!e||e.length===0))return Pt.join(e[0].uri.fsPath,ms.project)}async saveApprovalDecision(e,t){let s=N.workspace.getConfiguration("cclocal");if(t){let n=s.get("approvedMcpServers")||[];n.includes(e)||(n.push(e),await s.update("approvedMcpServers",n,N.ConfigurationTarget.Global))}else{let n=s.get("deniedMcpServers")||[];n.includes(e)||(n.push(e),await s.update("deniedMcpServers",n,N.ConfigurationTarget.Global))}}mergeServer(e){let t=this.servers.get(e.name);if(t){let s={...e,approvalState:t.approvalState!=="pending"?t.approvalState:e.approvalState,updatedAt:Date.now()};this.servers.set(e.name,s)}else this.servers.set(e.name,e),this.emitStateChange("server_discovered",e.name,e)}emitStateChange(e,t,s,n){this.stateChangeEmitter.fire({type:e,serverName:t,info:s,previousState:n})}dispose(){this.servers.clear(),this.disposables.forEach(e=>e.dispose()),this.disposables=[],this.stateChangeEmitter.dispose(),this.outputChannel.debug("MCPManager disposed")}},xe=null});var D,Pe,fs=V(()=>{"use strict";D=g(require("vscode"),1),Pe=class{panel=null;mcpManager;constructor(e){this.mcpManager=e}show(){if(this.panel){this.panel.reveal();return}this.panel=D.window.createWebviewPanel("cclocal.mcp","MCP Servers",D.ViewColumn.One,{enableScripts:!0,retainContextWhenHidden:!0}),this.panel.webview.html=this.getWebviewContent(),this.setupMessageHandler(),this.mcpManager.onDidChangeState(e=>{this.sendState()})}setupMessageHandler(){this.panel&&this.panel.webview.onDidReceiveMessage(async e=>{switch(e.type){case"getState":this.sendState();break;case"refreshServers":await this.mcpManager.discoverServers(),this.sendState();break;case"approveServer":await this.mcpManager.approveServer(e.name,e.remember),this.sendState();break;case"denyServer":await this.mcpManager.denyServer(e.name,e.remember),this.sendState();break;case"enableServer":await this.mcpManager.enableServer(e.name),this.sendState();break;case"disableServer":await this.mcpManager.disableServer(e.name),this.sendState();break;case"removeServer":await this.mcpManager.removeServer(e.name),this.sendState();break;case"openSettings":await D.commands.executeCommand("workbench.action.openSettings","cclocal.mcp");break;case"openConfigFile":await this.openConfigFile(e.source);break}})}sendState(){let e=this.mcpManager.getAllServers(),t=this.mcpManager.getStats(),s=this.mcpManager.getPendingApprovals();this.panel?.webview.postMessage({type:"state",servers:e,stats:t,pendingApprovals:s})}async openConfigFile(e){let t=process.env.HOME||process.env.USERPROFILE||"",s={user:`${t}/.claude.json`,local:`${t}/.claude/cclocal.json`,project:""};if(e==="project"){let i=D.workspace.workspaceFolders;if(i&&i.length>0)s.project=`${i[0].uri.fsPath}/.mcp.json`;else{D.window.showWarningMessage("No workspace folder open");return}}let n=s[e];if(n)try{let i=await D.workspace.openTextDocument(n);await D.window.showTextDocument(i)}catch(i){D.window.showErrorMessage(`Failed to open ${n}: ${i}`)}}getWebviewContent(){return`
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
`}dispose(){this.panel?.dispose(),this.panel=null}}});var Tt,lo,co,Je,_t,uo=V(()=>{"use strict";Tt=g(require("vscode"),1),lo=g(require("http"),1),co=g(require("url"),1),Je=g(require("crypto"),1),_t=class{outputChannel;context;pendingFlows;callbackServer;constructor(e,t){this.context=e,this.outputChannel=t,this.pendingFlows=new Map,this.callbackServer=null}async authenticate(e,t){this.outputChannel.info(`Starting OAuth flow for MCP server: ${e.name}`);let s=await this.getStoredToken(e.name);if(s&&!this.isTokenExpired(s))return this.outputChannel.debug(`Using cached token for: ${e.name}`),s;if(s?.refreshToken)try{let n=await this.refreshToken(t,s.refreshToken);return await this.storeToken(e.name,n),n}catch(n){this.outputChannel.debug(`Token refresh failed for ${e.name}: ${n}`)}return this.startOAuthFlow(t)}async clearAuth(e){await this.context.secrets.delete(`mcp_token_${e}`),this.outputChannel.info(`Cleared auth for MCP server: ${e}`)}async startOAuthFlow(e){let t=this.generateCodeVerifier(),s=await this.generateCodeChallenge(t),n=Je.randomBytes(16).toString("hex"),i=new URL(e.authorizationUrl);i.searchParams.set("response_type","code"),i.searchParams.set("client_id",e.clientId),i.searchParams.set("redirect_uri",e.redirectUri||this.getLocalCallbackUrl()),i.searchParams.set("scope",(e.scope||[]).join(" ")),i.searchParams.set("state",n),i.searchParams.set("code_challenge",s),i.searchParams.set("code_challenge_method","S256");let r=await this.startCallbackServer(),a=new Promise((c,u)=>{this.pendingFlows.set(e.serverName,{resolve:c,reject:u,state:n,codeVerifier:t})}),l=Tt.Uri.parse(i.toString());await Tt.env.openExternal(l),this.outputChannel.debug(`Opened OAuth authorization URL for: ${e.serverName}`);try{let c=await a;return await this.storeToken(e.serverName,c),c}catch(c){throw this.outputChannel.error(`OAuth flow failed for ${e.serverName}: ${c}`),c}finally{this.pendingFlows.delete(e.serverName),this.stopCallbackServer()}}handleCallback(e,t){let s=new co.URL(e.url||"/","http://localhost");if(s.pathname==="/callback"){let n=s.searchParams.get("code"),i=s.searchParams.get("state"),r=s.searchParams.get("error");if(r){t.writeHead(400,{"Content-Type":"text/html"}),t.end("<h1>Authentication Failed</h1><p>You can close this window.</p>"),this.rejectAllFlows(new Error(`OAuth error: ${r}`));return}if(!n||!i){t.writeHead(400,{"Content-Type":"text/html"}),t.end("<h1>Invalid Callback</h1><p>You can close this window.</p>");return}for(let[a,l]of this.pendingFlows)if(l.state===i){t.writeHead(200,{"Content-Type":"text/html"}),t.end(`
            <h1>Authentication Successful</h1>
            <p>You can close this window and return to VS Code.</p>
            <script>window.close()</script>
          `),l.resolve({accessToken:n,tokenType:"pending",obtainedAt:Date.now()});return}t.writeHead(400,{"Content-Type":"text/html"}),t.end("<h1>No matching flow found</h1><p>You can close this window.</p>")}else t.writeHead(404),t.end("Not found")}async exchangeCode(e,t,s){let n=new URL(e.tokenUrl),i=new URLSearchParams;i.set("grant_type","authorization_code"),i.set("code",t),i.set("client_id",e.clientId),e.clientSecret&&i.set("client_secret",e.clientSecret),i.set("redirect_uri",e.redirectUri||this.getLocalCallbackUrl()),i.set("code_verifier",s);let r=await fetch(n.toString(),{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:i.toString()});if(!r.ok)throw new Error(`Token exchange failed: ${r.status} ${r.statusText}`);let a=await r.json();return{accessToken:a.access_token,refreshToken:a.refresh_token,tokenType:a.token_type||"Bearer",expiresIn:a.expires_in,obtainedAt:Date.now(),scope:typeof a.scope=="string"?a.scope.split(" "):void 0}}async refreshToken(e,t){let s=new URL(e.tokenUrl),n=new URLSearchParams;n.set("grant_type","refresh_token"),n.set("refresh_token",t),n.set("client_id",e.clientId),e.clientSecret&&n.set("client_secret",e.clientSecret);let i=await fetch(s.toString(),{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:n.toString()});if(!i.ok)throw new Error(`Token refresh failed: ${i.status}`);let r=await i.json();return{accessToken:r.access_token,refreshToken:r.refresh_token||t,tokenType:r.token_type||"Bearer",expiresIn:r.expires_in,obtainedAt:Date.now(),scope:typeof r.scope=="string"?r.scope.split(" "):void 0}}async startCallbackServer(){return this.callbackServer?0:new Promise(e=>{this.callbackServer=lo.createServer((t,s)=>{this.handleCallback(t,s)}),this.callbackServer.listen(0,"127.0.0.1",()=>{let t=this.callbackServer?.address(),s=t&&typeof t=="object"?t.port:0;this.outputChannel.debug(`OAuth callback server started on port ${s}`),e(s)})})}stopCallbackServer(){this.callbackServer&&(this.callbackServer.close(),this.callbackServer=null,this.outputChannel.debug("OAuth callback server stopped"))}getLocalCallbackUrl(){let e=this.callbackServer?.address();return`http://127.0.0.1:${e&&typeof e=="object"?e.port:8765}/callback`}async getStoredToken(e){let t=await this.context.secrets.get(`mcp_token_${e}`);if(t)try{return JSON.parse(t)}catch{return}}async storeToken(e,t){await this.context.secrets.store(`mcp_token_${e}`,JSON.stringify(t))}isTokenExpired(e){if(!e.expiresIn)return!1;let t=e.obtainedAt+(e.expiresIn-300)*1e3;return Date.now()>t}generateCodeVerifier(){return Je.randomBytes(32).toString("base64url")}async generateCodeChallenge(e){return Je.createHash("sha256").update(e).digest().toString("base64url")}rejectAllFlows(e){for(let[,t]of this.pendingFlows)t.reject(e);this.pendingFlows.clear()}dispose(){this.stopCallbackServer(),this.rejectAllFlows(new Error("Authenticator disposed")),this.outputChannel.debug("MCPAuthenticator disposed")}}});function sr(){return{name:"get_open_files",description:"Get a list of all currently open files in the editor.",inputSchema:{type:"object",properties:{includePath:{type:"boolean",default:!0,description:"Include full file paths"},includeLanguage:{type:"boolean",default:!0,description:"Include language identifiers"}}},execute:async o=>{let e=o;return{files:k.window.tabGroups.all.flatMap(n=>n.tabs).filter(n=>n.input instanceof k.TabInputText).map(n=>{let i=n.input,r={name:i.uri.path.split("/").pop()||""};return e.includePath!==!1&&(r.path=i.uri.fsPath),e.includeLanguage!==!1&&(r.language=void 0),r})}}}}function nr(){return{name:"get_visible_text",description:"Get the currently visible text in the active editor.",inputSchema:{type:"object",properties:{includeRange:{type:"boolean",default:!0,description:"Include line range information"}}},execute:async o=>{let e=o,t=k.window.activeTextEditor;if(!t)return{error:"No active editor"};let n=t.visibleRanges.map(i=>{let a={text:t.document.getText(i)};return e.includeRange!==!1&&(a.startLine=i.start.line+1,a.endLine=i.end.line+1),a});return{fileName:t.document.fileName,language:t.document.languageId,visibleTexts:n}}}}function or(){return{name:"run_task",description:"Run a background task in the VS Code terminal.",inputSchema:{type:"object",properties:{command:{type:"string",description:"The command to execute"},name:{type:"string",description:"Name for the terminal instance"},cwd:{type:"string",description:"Working directory for the command"}},required:["command"]},execute:async o=>{let e=o,t=k.window.createTerminal({name:e.name||"CCLocal Task",cwd:e.cwd});return t.show(),t.sendText(e.command),{success:!0,message:`Task started in terminal: ${e.name||"CCLocal Task"}`}}}}function ir(){return{name:"diagnostics_changed",description:"Get current diagnostics (errors, warnings) for all open files or a specific file.",inputSchema:{type:"object",properties:{filePath:{type:"string",description:"Optional specific file path to check. If omitted, checks all open files."},severities:{type:"array",items:{type:"string",enum:["error","warning","info","hint"]},description:"Filter by severity levels"}}},execute:async o=>{let e=o,t={error:k.DiagnosticSeverity.Error,warning:k.DiagnosticSeverity.Warning,info:k.DiagnosticSeverity.Information,hint:k.DiagnosticSeverity.Hint},s=(e.severities||["error","warning"]).map(r=>t[r]).filter(r=>r!==void 0),n;e.filePath?n=[k.Uri.file(e.filePath)]:n=k.window.tabGroups.all.flatMap(r=>r.tabs).filter(r=>r.input instanceof k.TabInputText).map(r=>r.input.uri);let i={};for(let r of n){let l=k.languages.getDiagnostics(r).filter(c=>s.includes(c.severity));l.length>0&&(i[r.fsPath]=l.map(c=>({severity:["error","warning","info","hint"][c.severity],message:c.message,line:c.range.start.line+1,source:c.source,code:c.code?.toString()})))}return{diagnostics:i}}}}function rr(){return{name:"file_saved",description:"Listen for file save events. Returns recently saved files.",inputSchema:{type:"object",properties:{since:{type:"number",description:"Unix timestamp to get saves since (defaults to last 60 seconds)"}}},execute:async o=>{let t=o.since||Date.now()-6e4;return{savedFiles:It.filter(n=>n.timestamp>=t)}}}}function lr(o){for(It.push({path:o.fileName,timestamp:Date.now(),language:o.languageId});It.length>ar;)It.shift()}function po(){return vs||(vs=[sr(),nr(),or(),ir(),rr()]),vs}function At(o){o.subscriptions.push(k.workspace.onDidSaveTextDocument(e=>{lr(e)}))}var k,It,ar,vs,go=V(()=>{"use strict";k=g(require("vscode"),1);It=[],ar=100;vs=null});var ho={};Le(ho,{MCPAuthenticator:()=>_t,MCPManager:()=>Ye,MCPPanelProvider:()=>Pe,disposeMCPManager:()=>Mt,formatApprovalState:()=>dr,formatServerStatus:()=>cr,getApprovalColor:()=>pr,getMCPManager:()=>Et,getStatusColor:()=>ur,getTransportIcon:()=>gr,getVSCodeMCPTools:()=>po,registerFileSaveListener:()=>At});function cr(o){return{registered:"Registered",connecting:"Connecting...",connected:"Connected",disconnected:"Disconnected",failed:"Failed"}[o]||o}function dr(o){return{pending:"Pending",approved:"Approved",denied:"Denied"}[o]||o}function ur(o){return{connected:"#4CAF50",connecting:"#2196F3",failed:"#f44336",disconnected:"#9E9E9E",registered:"#757575"}[o]||"#757575"}function pr(o){return{approved:"#4CAF50",pending:"#FF9800",denied:"#f44336"}[o]||"#757575"}function gr(o){return{stdio:"$(terminal)",sse:"$(globe)",http:"$(globe)",ws:"$(plug)"}[o]||"$(server)"}var bs=V(()=>{"use strict";ao();fs();uo();go()});var fo={};Le(fo,{ConfigPanelProvider:()=>Ps});var te,Ps,vo=V(()=>{"use strict";te=g(require("vscode"),1),Ps=class{panel=null;configManager;constructor(e){this.configManager=e}show(){if(this.panel){this.panel.reveal();return}this.panel=te.window.createWebviewPanel("cclocal.config","CCLocal Settings",te.ViewColumn.One,{enableScripts:!0,retainContextWhenHidden:!0}),this.panel.webview.html=this.getWebviewContent(),this.setupMessageHandler()}setupMessageHandler(){this.panel&&this.panel.webview.onDidReceiveMessage(async e=>{switch(e.type){case"getConfig":let t=this.configManager.getConfig();this.panel?.webview.postMessage({type:"config",config:t});break;case"updateConfig":await this.updateConfig(e.key,e.value);break;case"resetConfig":await this.resetConfig(e.key);break;case"addEnvironmentVariable":await this.configManager.addEnvironmentVariable(e.name,e.value),this.sendConfig();break;case"removeEnvironmentVariable":await this.configManager.removeEnvironmentVariable(e.name),this.sendConfig();break;case"addPermissionRule":await this.configManager.addPermissionRule(e.rule),this.sendConfig();break;case"addAllowedMcpServer":await this.configManager.addAllowedMcpServer(e.server),this.sendConfig();break;case"addDeniedMcpServer":await this.configManager.addDeniedMcpServer(e.server),this.sendConfig();break;case"openSettings":await te.commands.executeCommand("workbench.action.openSettings","cclocal");break;case"editModelsJson":await te.commands.executeCommand("cclocal.configureCustomProvider");break;case"addHook":await this.addHook(e.hookType,e.definition),this.sendConfig();break;case"removeHook":await this.removeHook(e.hookType,e.defIndex,e.handlerIndex),this.sendConfig();break;case"getHookStats":let s=await te.commands.executeCommand("cclocal.hooks.stats");this.panel?.webview.postMessage({type:"hookStats",stats:s});break}})}async updateConfig(e,t){await this.configManager.update(e,t),this.sendConfig()}async resetConfig(e){await this.configManager.update(e,void 0),this.sendConfig()}sendConfig(){let e=this.configManager.getConfig();this.panel?.webview.postMessage({type:"config",config:e})}async addHook(e,t){let s=this.configManager.get("hooks")||{},n=s[e]||[];n.push(t),s[e]=n,await this.configManager.update("hooks",s)}async removeHook(e,t,s){let n=this.configManager.get("hooks")||{},i=n[e];if(i&&i[t]){let r=i[t];r.hooks&&r.hooks.length>s&&(r.hooks.splice(s,1),r.hooks.length===0&&i.splice(t,1)),i.length===0&&delete n[e],await this.configManager.update("hooks",n)}}getWebviewContent(){return`
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
`}dispose(){this.panel?.dispose(),this.panel=null}}});var kr={};Le(kr,{activate:()=>mr,configManager:()=>M,deactivate:()=>fr,hookManager:()=>W,mcpManager:()=>Te,outputChannel:()=>R});module.exports=Ao(kr);var d=g(require("vscode"),1),Ts=g(require("path"),1);var Rt=g(require("crypto"),1),Rs=g(require("os"),1),Ft=g(require("vscode"),1);var Ds=require("child_process"),Bs=g(require("path"),1),Hs=g(require("fs"),1),$s=g(require("os"),1),tt=class{constructor(e){this.callbacks=e}process=null;buffer="";killed=!1;launch(e){this.process&&this.kill(),this.buffer="",this.killed=!1;let{args:t,cmd:s}=this.buildCommand(e);this.process=(0,Ds.spawn)(s,t,{cwd:e.cwd,env:this.buildEnv(),stdio:["ignore","pipe","pipe"],shell:!0}),this.process.stdout?.on("data",i=>{this.handleStdoutChunk(i.toString())});let n="";this.process.stderr?.on("data",i=>{n+=i.toString()}),this.process.on("error",i=>{this.killed||this.callbacks.onError(`\u542F\u52A8 cclocal \u5931\u8D25: ${i.message}`)}),this.process.on("close",i=>{if(this.process=null,!this.killed){if(i!==0&&i!==null){let r=n.trim()?`
\u8BE6\u60C5: ${n.trim().split(`
`).slice(-3).join(" | ")}`:"";this.callbacks.onError(`cclocal \u8FDB\u7A0B\u4EE5\u9000\u51FA\u7801 ${i} \u7ED3\u675F${r}`)}this.callbacks.onExit()}})}kill(){this.killed=!0,this.process&&(this.process.kill("SIGTERM"),this.process=null)}isRunning(){return this.process!==null&&!this.killed}buildEnv(){let e=$s.homedir(),t=["/opt/homebrew/bin","/usr/local/bin",`${e}/.bun/bin`,`${e}/.local/bin`,`${e}/.eigent/bin`,"/usr/bin","/bin"],s=process.env.PATH??"",n=[...t,s].filter(Boolean).join(Bs.delimiter);return{...process.env,PATH:n}}buildCommand(e){let s=["--print",e.prompt,"--output-format","stream-json","--verbose"];return e.model&&s.push("--model",e.model),e.projectPath&&Hs.existsSync(e.projectPath)?{cmd:e.executablePath||"bun",args:["run","start","--",...s]}:{cmd:e.executablePath||"cclocal",args:s}}handleStdoutChunk(e){this.buffer+=e;let t=this.buffer.split(`
`);this.buffer=t.pop()??"";for(let s of t){let n=s.trim();if(n)try{let i=JSON.parse(n);this.callbacks.onMessage(i)}catch{}}}};var Oe=class{constructor(e){this.extensionUri=e;this.cclocalProcess=new tt({onMessage:t=>this.handleStreamMsg(t),onError:t=>{this.sendToWebview({type:"error",message:t}),this.setStatus("error")},onExit:()=>{this.currentMessageId&&(this.sendToWebview({type:"assistantDone",messageId:this.currentMessageId}),this.currentMessageId=""),this.setStatus("idle")}})}static viewType="cclocal.chatView";view;cclocalProcess;currentMessageId="";status="idle";resolveWebviewView(e,t,s){this.view=e,e.webview.options={enableScripts:!0,localResourceRoots:[this.extensionUri]},e.webview.html=this.buildHtml(e.webview),e.webview.onDidReceiveMessage(n=>{this.handleWebviewMessage(n)})}handleCommand(e){switch(e){case"newSession":this.newSession();break;case"clearChat":this.clearChat();break;case"stopGeneration":this.stopGeneration();break}}sendMessage(e){this.handleSendMessage(e)}handleWebviewMessage(e){switch(e.type){case"ready":this.sendToWebview({type:"statusChange",status:this.status});break;case"sendMessage":this.handleSendMessage(e.text);break;case"stopGeneration":this.stopGeneration();break;case"newSession":this.newSession();break;case"clearChat":this.clearChat();break}}handleSendMessage(e){if(this.status==="running"){this.sendToWebview({type:"error",message:"\u6B63\u5728\u5904\u7406\u4E0A\u4E00\u6761\u6D88\u606F\uFF0C\u8BF7\u7B49\u5F85\u6216\u70B9\u51FB\u505C\u6B62"});return}let t=Ft.workspace.getConfiguration("cclocal"),s=t.get("cclocalPath")||"cclocal",n=t.get("model")||"",i=Ft.workspace.workspaceFolders?.[0]?.uri.fsPath??Rs.homedir();this.currentMessageId=this.generateId(),this.sendToWebview({type:"userMessage",text:e,messageId:this.generateId()}),this.setStatus("running"),this.cclocalProcess.launch({executablePath:s,cwd:i,prompt:e,model:n||void 0})}handleStreamMsg(e){switch(e.type){case"assistant":{let t=e.message?.content??[];for(let s of t)s.type==="text"&&s.text?(this.currentMessageId||(this.currentMessageId=this.generateId()),this.sendToWebview({type:"assistantChunk",text:s.text,messageId:this.currentMessageId})):s.type==="tool_use"&&this.sendToWebview({type:"toolUse",name:s.name??"tool",input:s.input,messageId:this.currentMessageId||this.generateId()});break}case"content_block_delta":e.delta?.type==="text_delta"&&e.delta.text&&(this.currentMessageId||(this.currentMessageId=this.generateId()),this.sendToWebview({type:"assistantChunk",text:e.delta.text,messageId:this.currentMessageId}));break;case"tool_use":this.sendToWebview({type:"toolUse",name:e.name??"tool",input:e.input,messageId:this.currentMessageId||this.generateId()});break;case"result":this.currentMessageId&&(this.sendToWebview({type:"assistantDone",messageId:this.currentMessageId}),this.currentMessageId=""),this.setStatus("idle");break;case"system":break;default:break}}stopGeneration(){this.status==="running"&&(this.cclocalProcess.kill(),this.currentMessageId&&(this.sendToWebview({type:"assistantDone",messageId:this.currentMessageId}),this.currentMessageId=""),this.setStatus("idle"))}newSession(){this.stopGeneration(),this.sendToWebview({type:"sessionCleared"})}clearChat(){this.stopGeneration(),this.sendToWebview({type:"sessionCleared"})}setStatus(e){this.status=e,this.sendToWebview({type:"statusChange",status:e})}sendToWebview(e){this.view?.webview.postMessage(e)}generateId(){return Rt.randomBytes(8).toString("hex")}buildHtml(e){let t=Rt.randomBytes(16).toString("base64");return`<!DOCTYPE html>
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
</html>`}};var Ne=g(require("vscode"),1),je=class{static viewType="cclocal.chatView";view;ws;serverManager;currentMessageId="";messageBuffer="";status="idle";constructor(e,t){this.serverManager=t,this.connectToServer()}resolveWebviewView(e,t,s){this.view=e,e.webview.options={enableScripts:!0,localResourceRoots:[this.getExtensionUri()]},e.webview.html=this.getWebviewContent(),e.webview.onDidReceiveMessage(async n=>{switch(n.type){case"sendMessage":n.text&&await this.sendMessage(n.text);break;case"cancel":this.stopGeneration();break}}),e.onDidDispose(()=>{this.ws?.close()})}async connectToServer(){let e=this.serverManager.getServerUrl();try{let{default:t}=await Promise.resolve().then(()=>(Qn(),Jn));this.ws=new t(`${e}/ws?token=default`),this.ws.onopen=()=>{this.ws?.send(JSON.stringify({type:"auth",payload:{clientType:"vscode"},timestamp:Date.now()}))},this.ws.onmessage=s=>{try{let n=JSON.parse(s.data.toString());this.handleServerMessage(n)}catch(n){console.error("Failed to parse message:",n)}},this.ws.onerror=()=>{this.setStatus("error"),this.sendToWebview({type:"error",message:"Connection error. Please try again."})},this.ws.onclose=()=>{setTimeout(()=>this.connectToServer(),3e3)}}catch(t){console.error("Failed to connect:",t)}}handleServerMessage(e){switch(e.type){case"auth_success":break;case"stream_start":this.messageBuffer="",this.setStatus("running");break;case"stream_delta":{let t=e.payload;t?.delta?.type==="text_delta"&&t.delta.text&&(this.messageBuffer+=t.delta.text,this.sendToWebview({type:"stream_delta",text:t.delta.text,messageId:this.currentMessageId}));break}case"stream_end":this.setStatus("idle"),this.sendToWebview({type:"assistantDone",messageId:this.currentMessageId}),this.currentMessageId="";break;case"error":{let t=e.payload;this.setStatus("error"),this.sendToWebview({type:"error",message:t?.message||"Unknown error"});break}case"cancelled":this.setStatus("idle");break}}async sendMessage(e){if(this.status==="running"){Ne.window.showWarningMessage("Already processing a message. Please wait or cancel.");return}if(!this.ws||this.ws.readyState!==WebSocket.OPEN){Ne.window.showErrorMessage("Not connected to CCLocal server. Please try again.");return}this.currentMessageId=this.generateId(),this.sendToWebview({type:"userMessage",text:e,messageId:this.generateId()}),this.setStatus("running"),this.ws.send(JSON.stringify({type:"message",payload:{sessionId:"default-session",content:e},timestamp:Date.now()}))}stopGeneration(){this.status==="running"&&this.ws?.send(JSON.stringify({type:"cancel",payload:{sessionId:"default-session"},timestamp:Date.now()}))}clearChat(){this.sendToWebview({type:"clear"})}setStatus(e){this.status=e,this.sendToWebview({type:"status",status:e})}sendToWebview(e){this.view?.webview.postMessage(e)}generateId(){return`msg_${Date.now()}_${Math.random().toString(36).substr(2,9)}`}getExtensionUri(){return Ne.Uri.file(__dirname)}getWebviewContent(){return`<!DOCTYPE html>
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
</html>`}};var Xn=require("child_process"),ls=g(require("path"),1),ft=class{serverProcess;serverPort=5678;serverUrl="ws://127.0.0.1:5678";getServerUrl(){return this.serverUrl}async ensureServerRunning(){if(await this.checkServerHealth()){console.log("CCLocal server already running");return}await this.startEmbeddedServer()}async checkServerHealth(){try{return(await fetch(`http://127.0.0.1:${this.serverPort}/health`)).ok}catch{return!1}}async startEmbeddedServer(){return new Promise((e,t)=>{let s=this.findServerPath();if(!s){t(new Error("CCLocal server not found"));return}console.log(`Starting CCLocal server from: ${s}`),this.serverProcess=(0,Xn.spawn)("bun",[s],{env:{...process.env,CCLOCAL_PORT:String(this.serverPort),CCLOCAL_HOST:"127.0.0.1"},detached:!1}),this.serverProcess.stdout?.on("data",n=>{console.log(`[CCLocal Server] ${n.toString().trim()}`)}),this.serverProcess.stderr?.on("data",n=>{console.error(`[CCLocal Server] ${n.toString().trim()}`)}),setTimeout(async()=>{await this.checkServerHealth()?e():t(new Error("Server failed to start"))},3e3)})}findServerPath(){let e=[ls.join(__dirname,"..","..","server","dist","index.js"),ls.join(__dirname,"..","..","..","packages","server","dist","index.js")];for(let t of e)try{if(require("fs").existsSync(t))return t}catch{}}stopServer(){this.serverProcess&&(this.serverProcess.kill(),this.serverProcess=void 0)}};var Zn=g(require("vscode"),1),eo=g(require("child_process"),1),Xi=g(require("https"),1),Zi=g(require("http"),1),cs=g(require("url"),1),we=class{createResult(e,t,s,n,i,r){return{hookId:e,handlerIndex:t,success:s,output:n,error:i,duration:r||0}}getTimeout(e,t){return e.timeout||t}},ye=class extends we{outputChannel;allowedCommands;constructor(e,t){super(),this.outputChannel=e,this.allowedCommands=t?new Set(t):null}async execute(e,t){let s=`hook_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,n=Date.now(),i=this.getTimeout(e,3e4),r=this.buildEnvironment(t,e.env),a=this.substituteContext(e.command,t);this.outputChannel.debug(`Executing command hook: ${a}`);try{let l=await this.runCommand(a,r,i,t),c=Date.now()-n;return this.createResult(s,0,l.success,l.output,l.error,c)}catch(l){let c=Date.now()-n;return this.createResult(s,0,!1,void 0,l instanceof Error?l.message:String(l),c)}}runCommand(e,t,s,n){return new Promise(i=>{let r=Zn.workspace.workspaceFolders?.[0]?.uri.fsPath,a=eo.spawn(e,[],{cwd:r||process.cwd(),env:{...process.env,...t},shell:!0,timeout:s}),l="",c="";if(a.stdout?.on("data",u=>{l+=u.toString()}),a.stderr?.on("data",u=>{c+=u.toString()}),a.on("error",u=>{i({success:!1,output:l,error:u.message})}),a.on("close",u=>{i({success:u===0,output:l,error:u!==0?c:void 0})}),n)try{a.stdin?.write(JSON.stringify(n)),a.stdin?.end()}catch{}})}buildEnvironment(e,t){let s={CCLOCAL_HOOK_TYPE:e.type,CCLOCAL_HOOK_TIMESTAMP:String(e.timestamp)};return e.sessionId&&(s.CCLOCAL_SESSION_ID=e.sessionId),e.toolName&&(s.CCLOCAL_TOOL_NAME=e.toolName),e.filePath&&(s.CCLOCAL_FILE_PATH=e.filePath),e.command&&(s.CCLOCAL_COMMAND=e.command),e.model&&(s.CCLOCAL_MODEL=e.model),t&&Object.assign(s,t),s}substituteContext(e,t){return e.replace(/\$\{toolName\}/g,t.toolName||"").replace(/\$\{filePath\}/g,t.filePath||"").replace(/\$\{command\}/g,t.command||"").replace(/\$\{model\}/g,t.model||"").replace(/\$\{sessionId\}/g,t.sessionId||"").replace(/\$\{timestamp\}/g,String(t.timestamp)).replace(/\$\{type\}/g,t.type)}},ke=class extends we{outputChannel;allowedUrls;allowedEnvVars;constructor(e,t,s){super(),this.outputChannel=e,this.allowedUrls=t?new Set(t):null,this.allowedEnvVars=new Set(s||[])}async execute(e,t){let s=`hook_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,n=Date.now(),i=this.getTimeout(e,1e4);if(this.allowedUrls&&!this.isUrlAllowed(e.url))return this.createResult(s,0,!1,void 0,`URL not in whitelist: ${e.url}`,Date.now()-n);this.outputChannel.debug(`Executing HTTP hook: ${e.url}`);try{let r=await this.makeRequest(e,t,i),a=Date.now()-n;return this.createResult(s,0,r.success,r.output,r.error,a)}catch(r){let a=Date.now()-n;return this.createResult(s,0,!1,void 0,r instanceof Error?r.message:String(r),a)}}isUrlAllowed(e){if(!this.allowedUrls)return!0;try{let t=new cs.URL(e);for(let s of this.allowedUrls)if(t.origin===s||e.startsWith(s))return!0;return!1}catch{return!1}}makeRequest(e,t,s){return new Promise(n=>{let i=new cs.URL(e.url),r=i.protocol==="https:",a=r?Xi:Zi,l={"Content-Type":"application/json",...e.headers};for(let[p,h]of Object.entries(l))if(typeof h=="string"&&h.startsWith("${env:")){let m=h.match(/\$\{env:([^}]+)\}/)?.[1];m&&this.allowedEnvVars.has(m)?l[p]=process.env[m]||"":m&&delete l[p]}let c={hostname:i.hostname,port:i.port||(r?443:80),path:i.pathname+i.search,method:e.method||"POST",headers:l,timeout:s},u=a.request(c,p=>{let h="";p.on("data",m=>{h+=m.toString()}),p.on("end",()=>{n({success:p.statusCode!==void 0&&p.statusCode>=200&&p.statusCode<300,output:h,error:p.statusCode!==void 0&&p.statusCode>=400?`HTTP ${p.statusCode}`:void 0})})});u.on("error",p=>{n({success:!1,error:p.message})}),u.on("timeout",()=>{u.destroy(),n({success:!1,error:"Request timed out"})}),u.write(JSON.stringify(t)),u.end()})}},We=class extends we{outputChannel;registeredFunctions;constructor(e,t){super(),this.outputChannel=e,this.registeredFunctions=t||new Map}registerFunction(e,t){this.registeredFunctions.set(e,t)}unregisterFunction(e){this.registeredFunctions.delete(e)}async execute(e,t){let s=`hook_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,n=Date.now(),i=this.getTimeout(e,5e3),r=this.registeredFunctions.get(e.handler);if(!r)return this.createResult(s,0,!1,void 0,`Function not registered: ${e.handler}`,Date.now()-n);this.outputChannel.debug(`Executing function hook: ${e.handler}`);try{let a=await Promise.race([r(t),new Promise((c,u)=>setTimeout(()=>u(new Error("Function timed out")),i))]),l=Date.now()-n;return this.createResult(s,0,!0,JSON.stringify(a),void 0,l)}catch(a){let l=Date.now()-n;return this.createResult(s,0,!1,void 0,a instanceof Error?a.message:String(a),l)}}};var vt=class{outputChannel;hooks;executors;enabled=!0;allowedHttpUrls;allowedCommands;allowedEnvVars;constructor(e,t){this.outputChannel=e,this.hooks=new Map,this.allowedHttpUrls=new Set(t?.allowedHttpUrls||[]),this.allowedCommands=new Set(t?.allowedCommands||[]),this.allowedEnvVars=new Set(t?.allowedEnvVars||[]),this.executors={command:new ye(e,t?.allowedCommands),http:new ke(e,t?.allowedHttpUrls,t?.allowedEnvVars),function:new We(e,t?.registeredFunctions)},this.outputChannel.debug("HookManager initialized")}loadFromConfig(e){this.clear();for(let[t,s]of Object.entries(e))if(s&&s.length>0){let n=t;this.hooks.set(n,s.filter(i=>i.enabled!==!1))}this.outputChannel.debug(`Loaded ${this.getTotalHookCount()} hooks from configuration`)}setAllowedHttpUrls(e){this.allowedHttpUrls=new Set(e),this.executors.http=new ke(this.outputChannel,e,Array.from(this.allowedEnvVars))}setAllowedCommands(e){this.allowedCommands=new Set(e),this.executors.command=new ye(this.outputChannel,e)}registerFunction(e,t){this.executors.function.registerFunction(e,t),this.outputChannel.debug(`Registered function hook: ${e}`)}unregisterFunction(e){this.executors.function.unregisterFunction(e),this.outputChannel.debug(`Unregistered function hook: ${e}`)}setEnabled(e){this.enabled=e,this.outputChannel.debug(`Hooks ${e?"enabled":"disabled"}`)}register(e,t){let s=this.hooks.get(e)||[];s.push(t),this.hooks.set(e,s),this.outputChannel.debug(`Registered ${e} hook with ${t.hooks.length} handlers`)}unregister(e,t){let s=this.hooks.get(e);return!s||t<0||t>=s.length?!1:(s.splice(t,1),s.length===0&&this.hooks.delete(e),this.outputChannel.debug(`Unregistered ${e} hook at index ${t}`),!0)}clear(){this.hooks.clear(),this.outputChannel.debug("Cleared all hooks")}async execute(e,t,s){if(!this.enabled)return this.outputChannel.debug(`Hooks disabled, skipping ${e}`),[];let n=this.hooks.get(e);if(!n||n.length===0)return this.outputChannel.debug(`No hooks registered for ${e}`),[];let i={type:e,timestamp:Date.now(),...t},r=[],a=s?.timeout??6e4,l=s?.parallel??!1,c=s?.stopOnFailure??!0;this.outputChannel.debug(`Executing ${n.length} ${e} hooks (${l?"parallel":"sequential"})`);try{if(l){let u=n.flatMap((h,m)=>this.executeDefinition(h,m,i,a)),p=await Promise.allSettled(u);for(let h of p)h.status==="fulfilled"?r.push(...h.value):this.outputChannel.error(`Hook execution failed: ${h.reason}`)}else for(let u=0;u<n.length;u++){let p=await this.executeDefinition(n[u],u,i,a);if(r.push(...p),c){let h=p.some(w=>!w.success),m=p.some(w=>w.block);if(h||m){this.outputChannel.debug(`Stopping hook execution due to ${m?"block":"failure"}`);break}}}}catch(u){this.outputChannel.error(`Hook execution error: ${u}`)}return this.outputChannel.debug(`Hook ${e} completed with ${r.length} results`),r}async executeDefinition(e,t,s,n){if(e.matcher&&!this.matchesContext(e.matcher,s))return this.outputChannel.debug(`Matcher "${e.matcher}" did not match, skipping`),[];let i=[],r=Date.now();for(let a=0;a<e.hooks.length;a++){let l=e.hooks[a],c=n-(Date.now()-r);if(c<=0){this.outputChannel.warn("Hook execution timed out");break}try{let u=await this.executeHandler(l,s,c);if(u.handlerIndex=a,i.push(u),u.block){this.outputChannel.debug("Handler requested block, stopping execution");break}}catch(u){i.push({hookId:`error_${Date.now()}`,handlerIndex:a,success:!1,error:u instanceof Error?u.message:String(u),duration:Date.now()-r})}}return i}async executeHandler(e,t,s){let n=this.executors[e.type];return n?n.execute(e,t):{hookId:`invalid_${Date.now()}`,handlerIndex:0,success:!1,error:`Unknown handler type: ${e.type}`,duration:0}}matchesContext(e,t){try{return t.toolName?new RegExp(e,"i").test(t.toolName):t.filePath?new RegExp(e,"i").test(t.filePath):t.command?new RegExp(e,"i").test(t.command):!0}catch(s){return this.outputChannel.error(`Invalid matcher pattern "${e}": ${s}`),!1}}async executePreToolUse(e,t){let s=await this.execute("PreToolUse",{type:"PreToolUse",timestamp:Date.now(),toolName:e,toolInput:t}),n=s.some(r=>r.block),i=s.find(r=>r.modifiedInput!==void 0)?.modifiedInput;return{blocked:n,modifiedInput:i,results:s}}async executePostToolUse(e,t,s){return this.execute("PostToolUse",{type:"PostToolUse",timestamp:Date.now(),toolName:e,toolResult:t,toolError:s})}async executeFileWrite(e,t){return this.execute("FileWrite",{type:"FileWrite",timestamp:Date.now(),filePath:e,fileContent:t})}async executeFileEdit(e,t){return this.execute("FileEdit",{type:"FileEdit",timestamp:Date.now(),filePath:e,fileContent:t})}async executeBashExecution(e){let t=await this.execute("BashExecution",{type:"BashExecution",timestamp:Date.now(),command:e});return{blocked:t.some(s=>s.block),results:t}}async executeSessionStart(e){return this.execute("SessionStart",{type:"SessionStart",timestamp:Date.now(),sessionId:e})}async executeSessionEnd(e){return this.execute("SessionEnd",{type:"SessionEnd",timestamp:Date.now(),sessionId:e})}async executeError(e,t){return this.execute("Error",{type:"Error",timestamp:Date.now(),errorMessage:e,errorStack:t})}getAllHooks(){return new Map(this.hooks)}getHooks(e){return this.hooks.get(e)||[]}hasHooks(e){let t=this.hooks.get(e);return t!==void 0&&t.length>0}getTotalHookCount(){let e=0;for(let t of this.hooks.values())e+=t.reduce((s,n)=>s+n.hooks.length,0);return e}getStats(){let e={};for(let[t,s]of this.hooks)e[t]=s.reduce((n,i)=>n+i.hooks.length,0);return{totalHooks:this.getTotalHookCount(),hooksByType:e}}dispose(){this.clear(),this.outputChannel.debug("HookManager disposed")}},Se=null;function ds(o,e){return!Se&&o&&(Se=new vt(o,e)),Se}function us(){Se&&(Se.dispose(),Se=null)}var ee=g(require("vscode"),1),bt=class{config;disposables=[];onConfigChangeEmitter=new ee.EventEmitter;constructor(){this.config=ee.workspace.getConfiguration("cclocal"),this.setupConfigWatcher()}getConfig(){return{forceLoginMethod:this.getForceLoginMethod(),forceLoginOrgUUID:this.getForceLoginOrgUUID(),disableLoginPrompt:this.getDisableLoginPrompt(),environmentVariables:this.getEnvironmentVariables(),cclocalPath:this.getCclocalPath(),claudeProcessWrapper:this.getClaudeProcessWrapper(),initialPermissionMode:this.getInitialPermissionMode(),allowDangerouslySkipPermissions:this.getAllowDangerouslySkipPermissions(),permissionRules:this.getPermissionRules(),respectGitIgnore:this.getRespectGitIgnore(),fileSuggestion:this.getFileSuggestion(),autosave:this.getAutosave(),claudeMdExcludes:this.getClaudeMdExcludes(),mcp:this.getMCPConfig(),enableAllProjectMcpServers:this.getEnableAllProjectMcpServers(),allowedMcpServers:this.getAllowedMcpServers(),deniedMcpServers:this.getDeniedMcpServers(),hooks:this.getHooks(),disableAllHooks:this.getDisableAllHooks(),allowedHttpHookUrls:this.getAllowedHttpHookUrls(),httpHookAllowedEnvVars:this.getHttpHookAllowedEnvVars(),allowManagedHooksOnly:this.getAllowManagedHooksOnly(),plugins:this.getPluginConfig(),enabledPlugins:this.getEnabledPlugins(),extraKnownMarketplaces:this.getExtraKnownMarketplaces(),strictKnownMarketplaces:this.getStrictKnownMarketplaces(),blockedMarketplaces:this.getBlockedMarketplaces(),useTerminal:this.getUseTerminal(),useCtrlEnterToSend:this.getUseCtrlEnterToSend(),preferredLocation:this.getPreferredLocation(),hideOnboarding:this.getHideOnboarding(),enableNewConversationShortcut:this.getEnableNewConversationShortcut(),usePythonEnvironment:this.getUsePythonEnvironment(),showTerminalBanner:this.getShowTerminalBanner(),model:this.getModel(),availableModels:this.getAvailableModels(),modelOverrides:this.getModelOverrides(),alwaysThinkingEnabled:this.getAlwaysThinkingEnabled(),fastMode:this.getFastMode(),maxThinkingTokens:this.getMaxThinkingTokens(),outputStyle:this.getOutputStyle(),language:this.getLanguage(),spinnerTipsEnabled:this.getSpinnerTipsEnabled(),spinnerVerbs:this.getSpinnerVerbs(),spinnerTipsOverride:this.getSpinnerTipsOverride(),syntaxHighlightingDisabled:this.getSyntaxHighlightingDisabled(),terminalTitleFromRename:this.getTerminalTitleFromRename(),remoteConfig:this.getRemoteConfig(),sshConfigs:this.getSSHConfigs(),includeCoAuthoredBy:this.getIncludeCoAuthoredBy(),includeGitInstructions:this.getIncludeGitInstructions(),sandbox:this.getSandbox(),skipWebFetchPreflight:this.getSkipWebFetchPreflight(),feedbackSurveyRate:this.getFeedbackSurveyRate(),proactiveSuggestions:this.getProactiveSuggestions(),allowManagedPermissionRulesOnly:this.getAllowManagedPermissionRulesOnly(),allowManagedMcpServersOnly:this.getAllowManagedMcpServersOnly(),strictPluginOnlyCustomization:this.getStrictPluginOnlyCustomization(),bedrockRegion:this.getBedrockRegion(),vertexProjectId:this.getVertexProjectId(),cleanupPeriodDays:this.getCleanupPeriodDays(),attribution:this.getAttribution()}}getForceLoginMethod(){return this.config.get("")||""}getForceLoginOrgUUID(){return this.config.get("forceLoginOrgUUID")||""}getDisableLoginPrompt(){return this.config.get("disableLoginPrompt")??!1}getEnvironmentVariables(){return this.config.get("environmentVariables")||[]}getCclocalPath(){return this.config.get("cclocalPath")||"cclocal"}getClaudeProcessWrapper(){return this.config.get("claudeProcessWrapper")||""}getInitialPermissionMode(){return this.config.get("initialPermissionMode")||"default"}getAllowDangerouslySkipPermissions(){return this.config.get("allowDangerouslySkipPermissions")??!1}getPermissionRules(){return this.config.get("permissionRules")||[]}getRespectGitIgnore(){return this.config.get("respectGitIgnore")??!0}getFileSuggestion(){return this.config.get("fileSuggestion")||{}}getAutosave(){return this.config.get("autosave")??!1}getClaudeMdExcludes(){return this.config.get("claudeMdExcludes")||[]}getMCPConfig(){return this.config.get("mcp")||{}}getEnableAllProjectMcpServers(){return this.config.get("enableAllProjectMcpServers")??!1}getAllowedMcpServers(){return this.config.get("allowedMcpServers")||[]}getDeniedMcpServers(){return this.config.get("deniedMcpServers")||[]}getHooks(){return this.config.get("hooks")||{}}getDisableAllHooks(){return this.config.get("disableAllHooks")??!1}getAllowedHttpHookUrls(){return this.config.get("allowedHttpHookUrls")||[]}getHttpHookAllowedEnvVars(){return this.config.get("httpHookAllowedEnvVars")||[]}getAllowManagedHooksOnly(){return this.config.get("allowManagedHooksOnly")??!1}getPluginConfig(){return this.config.get("plugins")||{}}getEnabledPlugins(){return this.config.get("enabledPlugins")||{}}getExtraKnownMarketplaces(){return this.config.get("extraKnownMarketplaces")||[]}getStrictKnownMarketplaces(){return this.config.get("strictKnownMarketplaces")||[]}getBlockedMarketplaces(){return this.config.get("blockedMarketplaces")||[]}getUseTerminal(){return this.config.get("useTerminal")??!0}getUseCtrlEnterToSend(){return this.config.get("useCtrlEnterToSend")??!1}getPreferredLocation(){return this.config.get("preferredLocation")||"sidebar"}getHideOnboarding(){return this.config.get("hideOnboarding")??!1}getEnableNewConversationShortcut(){return this.config.get("enableNewConversationShortcut")??!0}getUsePythonEnvironment(){return this.config.get("usePythonEnvironment")??!0}getShowTerminalBanner(){return this.config.get("showTerminalBanner")??!0}getModel(){return this.config.get("model")||""}getAvailableModels(){return this.config.get("availableModels")||[]}getModelOverrides(){return this.config.get("modelOverrides")||{}}getAlwaysThinkingEnabled(){return this.config.get("alwaysThinkingEnabled")??!1}getFastMode(){return this.config.get("fastMode")??!1}getMaxThinkingTokens(){return this.config.get("maxThinkingTokens")||16e3}getOutputStyle(){return this.config.get("outputStyle")||{type:"default"}}getLanguage(){return this.config.get("language")||"en"}getSpinnerTipsEnabled(){return this.config.get("spinnerTipsEnabled")??!0}getSpinnerVerbs(){return this.config.get("spinnerVerbs")||[]}getSpinnerTipsOverride(){return this.config.get("spinnerTipsOverride")||[]}getSyntaxHighlightingDisabled(){return this.config.get("syntaxHighlightingDisabled")??!1}getTerminalTitleFromRename(){return this.config.get("terminalTitleFromRename")??!0}getRemoteConfig(){return this.config.get("remoteConfig")||{remote:{enabled:!1}}}getSSHConfigs(){return this.config.get("sshConfigs")||[]}getIncludeCoAuthoredBy(){return this.config.get("includeCoAuthoredBy")??!0}getIncludeGitInstructions(){return this.config.get("includeGitInstructions")??!0}getSandbox(){return this.config.get("sandbox")||{enabled:!1}}getSkipWebFetchPreflight(){return this.config.get("skipWebFetchPreflight")??!1}getFeedbackSurveyRate(){return this.config.get("feedbackSurveyRate")??.1}getProactiveSuggestions(){return this.config.get("proactiveSuggestions")??!0}getAllowManagedPermissionRulesOnly(){return this.config.get("allowManagedPermissionRulesOnly")??!1}getAllowManagedMcpServersOnly(){return this.config.get("allowManagedMcpServersOnly")??!1}getStrictPluginOnlyCustomization(){return this.config.get("strictPluginOnlyCustomization")??!1}getBedrockRegion(){return this.config.get("bedrockRegion")||"us-east-1"}getVertexProjectId(){return this.config.get("vertexProjectId")||""}getCleanupPeriodDays(){return this.config.get("cleanupPeriodDays")||30}getAttribution(){return this.config.get("attribution")??!0}async update(e,t,s){let n=s??ee.ConfigurationTarget.Global;await this.config.update(e,t,n)}async setModel(e){await this.update("model",e)}async setPreferredLocation(e){await this.update("preferredLocation",e)}async setInitialPermissionMode(e){await this.update("initialPermissionMode",e)}async setForceLoginMethod(e){await this.update("forceLoginMethod",e)}async addEnvironmentVariable(e,t){let s=this.getEnvironmentVariables(),n=s.findIndex(i=>i.name===e);n>=0?s[n].value=t:s.push({name:e,value:t}),await this.update("environmentVariables",s)}async removeEnvironmentVariable(e){let t=this.getEnvironmentVariables().filter(s=>s.name!==e);await this.update("environmentVariables",t)}async addPermissionRule(e){let t=this.getPermissionRules();t.push(e),await this.update("permissionRules",t)}async addAllowedMcpServer(e){let t=this.getAllowedMcpServers();t.includes(e)||(t.push(e),await this.update("allowedMcpServers",t))}async addDeniedMcpServer(e){let t=this.getDeniedMcpServers();t.includes(e)||(t.push(e),await this.update("deniedMcpServers",t))}get onConfigChange(){return this.onConfigChangeEmitter.event}setupConfigWatcher(){let e=ee.workspace.onDidChangeConfiguration(t=>{t.affectsConfiguration("cclocal")&&(this.config=ee.workspace.getConfiguration("cclocal"),this.onConfigChangeEmitter.fire(this.getConfig()))});this.disposables.push(e)}dispose(){this.disposables.forEach(e=>e.dispose()),this.onConfigChangeEmitter.dispose()}};var x=g(require("vscode"),1);var qe=g(require("vscode"),1);var ae=g(require("crypto"),1),Ce=class{static SERVICE_NAME="cclocal";context;secrets;memoryCache=new Map;encryptionKey=null;constructor(e,t){this.context=e,this.secrets=e.secrets,t?.encryptionKey&&(this.encryptionKey=Buffer.from(t.encryptionKey,"hex"))}async store(e,t){let s=JSON.stringify(t);await this.secrets.store(e,s),this.memoryCache.set(e,t)}async get(e){let t=this.memoryCache.get(e);if(t)return t;let s=await this.secrets.get(e);if(s)try{let n=JSON.parse(s);return this.memoryCache.set(e,n),n}catch{return}}async delete(e){await this.secrets.delete(e),this.memoryCache.delete(e)}async has(e){return await this.secrets.get(e)!==void 0}async storeApiKey(e,t){let s=`apikey_${e}`;await this.store(s,{provider:e,apiKey:t})}async getApiKey(e){let t=`apikey_${e}`;return(await this.get(t))?.apiKey}async storeOAuthTokens(e,t,s,n,i){let r=`oauth_${e}`,a=Date.now()+n*1e3;await this.store(r,{provider:e,accessToken:t,refreshToken:s,expiresAt:a,scope:i})}async getOAuthTokens(e){let t=`oauth_${e}`,s=await this.get(t);if(s)return{accessToken:s.accessToken,refreshToken:s.refreshToken,expiresAt:s.expiresAt,scope:s.scope}}async isTokenExpired(e,t=300){let s=await this.getOAuthTokens(e);return s?Date.now()>s.expiresAt-t*1e3:!0}async clearProvider(e){await this.delete(`apikey_${e}`),await this.delete(`oauth_${e}`)}async clearAll(){let e=await this.listKeys();for(let t of e)await this.delete(t)}async listKeys(){return this.context.globalState.get("secureStorage:keys",[])}async registerKey(e){let t=this.context.globalState.get("secureStorage:keys",[]);t.includes(e)||(t.push(e),await this.context.globalState.update("secureStorage:keys",t))}static generateEncryptionKey(){return ae.randomBytes(32).toString("hex")}encrypt(e,t){let s=t||this.encryptionKey;if(!s)throw new Error("No encryption key available");let n=ae.randomBytes(16),i=ae.createCipheriv("aes-256-gcm",s,n),r=i.update(e,"utf8","hex");r+=i.final("hex");let a=i.getAuthTag();return`${n.toString("hex")}:${a.toString("hex")}:${r}`}decrypt(e,t){let s=t||this.encryptionKey;if(!s)throw new Error("No encryption key available");let[n,i,r]=e.split(":"),a=Buffer.from(n,"hex"),l=Buffer.from(i,"hex"),c=ae.createDecipheriv("aes-256-gcm",s,a);c.setAuthTag(l);let u=c.update(r,"hex","utf8");return u+=c.final("utf8"),u}dispose(){this.memoryCache.clear()}};var wt=g(require("vscode"),1),to=g(require("http"),1),Ve=g(require("crypto"),1),so=g(require("url"),1),Y=class{constructor(e,t,s){this.provider=e;this.config=t;this.storage=s}storage;server=null;pendingStates=new Map;generateCodeVerifier(){return Ve.randomBytes(32).toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}generateCodeChallenge(e){return Ve.createHash("sha256").update(e).digest("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}generateState(){return Ve.randomBytes(16).toString("hex")}buildAuthorizationUrl(e){let t=this.generateCodeVerifier(),s=this.config.usePKCE!==!1?this.generateCodeChallenge(t):"",n=this.generateState(),i={codeVerifier:t,codeChallenge:s,state:n,redirectUri:e};this.pendingStates.set(n,i);let r=new URLSearchParams({client_id:this.config.clientId,redirect_uri:e,response_type:"code",scope:this.config.scope.join(" "),state:n});return this.config.usePKCE!==!1&&(r.append("code_challenge",s),r.append("code_challenge_method","S256")),{url:`${this.config.authorizationEndpoint}?${r.toString()}`,state:i}}async startCallbackServer(){let e=this.config.port||this.findAvailablePort();return new Promise((t,s)=>{this.server=to.createServer((n,i)=>{this.handleCallback(n,i)}),this.server.listen(e,"127.0.0.1",()=>{t(e)}),this.server.on("error",n=>{s(n)})})}findAvailablePort(){return 8765+Math.floor(Math.random()*1e3)}handleCallback(e,t){let s=so.parse(e.url||"",!0);if(s.pathname==="/callback"||s.pathname==="/"){let n=s.query.code,i=s.query.state,r=s.query.error,a=s.query.error_description;if(r){this.sendErrorResponse(t,r,a);return}if(!n||!i){this.sendErrorResponse(t,"invalid_request","Missing code or state");return}let l=this.pendingStates.get(i);if(!l){this.sendErrorResponse(t,"invalid_state","Invalid or expired state");return}this.pendingStates.delete(i),this.exchangeCodeForTokens(n,l).then(c=>{this.sendSuccessResponse(t),this.stopCallbackServer()}).catch(c=>{this.sendErrorResponse(t,"token_exchange_failed",c.message),this.stopCallbackServer()})}else t.writeHead(404),t.end("Not Found")}async exchangeCodeForTokens(e,t){let s=new URLSearchParams({grant_type:"authorization_code",code:e,redirect_uri:t.redirectUri,client_id:this.config.clientId});this.config.usePKCE!==!1&&s.append("code_verifier",t.codeVerifier);let n=await fetch(this.config.tokenEndpoint,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded",Accept:"application/json"},body:s.toString()});if(!n.ok){let a=await n.text();throw new Error(`Token exchange failed: ${a}`)}let i=await n.json(),r={accessToken:i.access_token,refreshToken:i.refresh_token,expiresIn:i.expires_in,tokenType:i.token_type,scope:i.scope?.split(" ")};return await this.storage.storeOAuthTokens(this.provider,r.accessToken,r.refreshToken,r.expiresIn,r.scope),r}async refreshToken(){let e=await this.storage.getOAuthTokens(this.provider);if(!e)throw new Error("No tokens to refresh");let t=new URLSearchParams({grant_type:"refresh_token",refresh_token:e.refreshToken,client_id:this.config.clientId}),s=await fetch(this.config.tokenEndpoint,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded",Accept:"application/json"},body:t.toString()});if(!s.ok)throw await this.storage.delete(`oauth_${this.provider}`),new Error("Token refresh failed");let n=await s.json(),i={accessToken:n.access_token,refreshToken:n.refresh_token||e.refreshToken,expiresIn:n.expires_in,tokenType:n.token_type,scope:n.scope?.split(" ")};return await this.storage.storeOAuthTokens(this.provider,i.accessToken,i.refreshToken,i.expiresIn,i.scope),i}async getAccessToken(){return await this.storage.isTokenExpired(this.provider)?(await this.refreshToken()).accessToken:(await this.storage.getOAuthTokens(this.provider)).accessToken}async startFlow(){let t=`http://127.0.0.1:${await this.startCallbackServer()}/callback`,{url:s,state:n}=this.buildAuthorizationUrl(t);return await wt.env.openExternal(wt.Uri.parse(s)),this.waitForCallback(12e4)}waitForCallback(e){return new Promise((t,s)=>{let n=setTimeout(()=>{this.stopCallbackServer(),s(new Error("OAuth flow timed out"))},e),i=async()=>{let r=await this.storage.getOAuthTokens(this.provider);r?(clearTimeout(n),this.stopCallbackServer(),t({accessToken:r.accessToken,refreshToken:r.refreshToken,expiresIn:Math.floor((r.expiresAt-Date.now())/1e3),tokenType:"Bearer",scope:r.scope})):setTimeout(i,500)};i()})}stopCallbackServer(){this.server&&(this.server.close(),this.server=null)}sendSuccessResponse(e){e.writeHead(200,{"Content-Type":"text/html"}),e.end(`
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
    `)}sendErrorResponse(e,t,s){e.writeHead(400,{"Content-Type":"text/html"}),e.end(`
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
          <p>${t}${s?`: ${s}`:""}</p>
        </div>
      </body>
      </html>
    `)}async logout(){await this.storage.clearProvider(this.provider),this.pendingStates.clear(),this.stopCallbackServer()}async isAuthenticated(){return await this.storage.getOAuthTokens(this.provider)!==void 0}dispose(){this.stopCallbackServer(),this.pendingStates.clear()}};Ke();var er={clientId:"9d1c250a-e0b9-4f26-8c72-e03f1f1f2187",authorizationEndpoint:"https://claude.ai/oauth/authorize",tokenEndpoint:"https://claude.ai/oauth/token",scope:["openid","profile","email","offline_access"],usePKCE:!0},yt=class extends Y{constructor(e){super("claudeai",er,e)}};var I=g(require("vscode"),1);Ke();var kt=class extends U{config=null;constructor(e){super("bedrock",{provider:"bedrock",envVarName:"AWS_ACCESS_KEY_ID"},e)}async configure(){if(this.checkEnvironmentCredentials())return I.window.showInformationMessage("AWS credentials found in environment variables"),!0;let t=[{label:"$(key) Enter AWS Access Keys",action:"keys"},{label:"$(file) Use AWS Profile",action:"profile"},{label:"$(cloud) Use IAM Role (EC2/Lambda)",action:"role"}],s=await I.window.showQuickPick(t,{placeHolder:"Select AWS credential method"});if(!s)return!1;switch(s.action){case"keys":return await this.configureAccessKeys();case"profile":return await this.configureProfile();case"role":return!0}return!1}async configureAccessKeys(){let e=await I.window.showInputBox({prompt:"AWS Region",placeHolder:"us-east-1",value:"us-east-1"});if(!e)return!1;let t=await I.window.showInputBox({prompt:"AWS Access Key ID",placeHolder:"AKIA..."});if(!t)return!1;let s=await I.window.showInputBox({prompt:"AWS Secret Access Key",password:!0});if(!s)return!1;let n=await I.window.showInputBox({prompt:"AWS Session Token (optional)",password:!0});return this.config={region:e,accessKeyId:t,secretAccessKey:s,sessionToken:n||void 0},await this.storeApiKey(JSON.stringify(this.config)),await this.storeRegion(e),!0}async configureProfile(){let e=await I.window.showInputBox({prompt:"AWS Profile Name",placeHolder:"default",value:"default"});if(!e)return!1;let t=await I.window.showInputBox({prompt:"AWS Region",placeHolder:"us-east-1",value:"us-east-1"});return t?(this.config={region:t,profile:e},await this.storeRegion(t),!0):!1}checkEnvironmentCredentials(){return!!(process.env.AWS_ACCESS_KEY_ID||process.env.AWS_SECRET_ACCESS_KEY||process.env.AWS_PROFILE||process.env.AWS_ROLE_ARN)}async storeRegion(e){await I.workspace.getConfiguration("cclocal").update("bedrockRegion",e,I.ConfigurationTarget.Global)}getConfig(){return this.config}getRegion(){return this.config?.region||process.env.AWS_REGION||process.env.AWS_DEFAULT_REGION||"us-east-1"}};var O=g(require("vscode"),1);Ke();var St=class extends U{config=null;constructor(e){super("vertex",{provider:"vertex",envVarName:"GOOGLE_APPLICATION_CREDENTIALS"},e)}async configure(){if(this.checkEnvironmentCredentials())return O.window.showInformationMessage("GCP credentials found in environment variables"),!0;let t=[{label:"$(file) Service Account Key File",action:"keyfile"},{label:"$(key) Enter API Key",action:"apikey"},{label:"$(cloud) Use Default Credentials",action:"default"}],s=await O.window.showQuickPick(t,{placeHolder:"Select GCP credential method"});if(!s)return!1;switch(s.action){case"keyfile":return await this.configureKeyFile();case"apikey":return await this.configureApiKey();case"default":return await this.configureDefault()}return!1}async configureKeyFile(){let e=await O.window.showInputBox({prompt:"GCP Project ID",placeHolder:"my-project-id"});if(!e)return!1;let t=await O.window.showOpenDialog({canSelectFiles:!0,canSelectFolders:!1,canSelectMany:!1,filters:{"JSON Files":["json"]},title:"Select Service Account Key File"});return!t||t.length===0?!1:(this.config={projectId:e,credentialsPath:t[0].fsPath},await this.storeApiKey(JSON.stringify(this.config)),!0)}async configureApiKey(){let e=await O.window.showInputBox({prompt:"GCP Project ID",placeHolder:"my-project-id"});if(!e)return!1;let t=await O.window.showInputBox({prompt:"GCP API Key",password:!0});return t?(this.config={projectId:e},await this.storeApiKey(t),await this.storeProjectId(e),!0):!1}async configureDefault(){let e=await O.window.showInputBox({prompt:"GCP Project ID",placeHolder:"my-project-id"});return e?(this.config={projectId:e},await this.storeProjectId(e),!0):!1}checkEnvironmentCredentials(){return!!(process.env.GOOGLE_APPLICATION_CREDENTIALS||process.env.GCP_PROJECT_ID||process.env.ANTHROPIC_VERTEX_PROJECT_ID)}async storeProjectId(e){await O.workspace.getConfiguration("cclocal").update("vertexProjectId",e,O.ConfigurationTarget.Global)}getConfig(){return this.config}getProjectId(){return this.config?.projectId||process.env.ANTHROPIC_VERTEX_PROJECT_ID||process.env.GCP_PROJECT_ID||""}getRegion(){return this.config?.region||process.env.ANTHROPIC_VERTEX_REGION||process.env.VERTEX_REGION||"us-central1"}};ps();var gs={claudeai:{name:"Claude.ai",description:"Claude Pro/Max subscription",icon:"\u{1F916}",requiresOAuth:!0},console:{name:"API Key",description:"Anthropic Console API Key",icon:"\u{1F511}",requiresOAuth:!1},bedrock:{name:"AWS Bedrock",description:"Amazon Bedrock",icon:"\u2601\uFE0F",requiresOAuth:!1},vertex:{name:"Google Vertex AI",description:"Google Cloud Vertex AI",icon:"\u{1F537}",requiresOAuth:!1},foundry:{name:"Azure Foundry",description:"Azure AI Foundry",icon:"\u{1FA9F}",requiresOAuth:!1},custom:{name:"Custom Provider",description:"Third-party API (OpenAI compatible)",icon:"\u{1F50C}",requiresOAuth:!1}},Ct=class{constructor(e,t){this.context=e;this.config=t;this.storage=new Ce(e),this.initializeProviders()}storage;state={method:null,status:"unauthenticated"};providers=new Map;onDidChangeStateEmitter=new qe.EventEmitter;onDidChangeState=this.onDidChangeStateEmitter.event;initializeProviders(){this.providers.set("claudeai",new yt(this.storage)),this.providers.set("console",new U("anthropic",{provider:"anthropic",envVarName:"ANTHROPIC_API_KEY"},this.storage)),this.providers.set("bedrock",new kt(this.storage)),this.providers.set("vertex",new St(this.storage)),this.providers.set("custom",new ze(this.storage))}async checkAuthStatus(){let e=["claudeai","console","bedrock","vertex","custom"];for(let t of e){let s=this.providers.get(t);if(!s)continue;if(await this.checkProviderAuth(t,s))return this.state={method:t,status:"authenticated",provider:gs[t]?.name},this.onDidChangeStateEmitter.fire(this.state),this.state}return this.state={method:null,status:"unauthenticated"},this.onDidChangeStateEmitter.fire(this.state),this.state}async checkProviderAuth(e,t){return t instanceof Y?t.isAuthenticated():t.hasApiKey()}async login(e){try{switch(this.state={method:e,status:"connecting"},this.onDidChangeStateEmitter.fire(this.state),e){case"claudeai":return await this.loginClaudeAI();case"console":return await this.loginConsole();case"bedrock":return await this.loginBedrock();case"vertex":return await this.loginVertex();case"custom":return await this.loginCustom();default:throw new Error(`Unknown auth method: ${e}`)}}catch(t){return this.state={method:e,status:"error",error:t instanceof Error?t.message:String(t)},this.onDidChangeStateEmitter.fire(this.state),!1}}async loginClaudeAI(){return await this.providers.get("claudeai").startFlow(),this.checkAuthStatus().then(t=>t.status==="authenticated")}async loginConsole(){let e=this.providers.get("console"),t=await e.promptForApiKey();if(!t)return!1;let s=await e.validateApiKey(t);return s.valid?(await e.storeApiKey(t),this.checkAuthStatus().then(n=>n.status==="authenticated")):(qe.window.showErrorMessage(`Invalid API key: ${s.error}`),!1)}async loginBedrock(){return await this.providers.get("bedrock").configure()?this.checkAuthStatus().then(s=>s.status==="authenticated"):!1}async loginVertex(){return await this.providers.get("vertex").configure()?this.checkAuthStatus().then(s=>s.status==="authenticated"):!1}async loginCustom(){return await this.providers.get("custom").configure()?this.checkAuthStatus().then(s=>s.status==="authenticated"):!1}async logout(){if(this.state.method){let e=this.providers.get(this.state.method);e&&(e instanceof Y?await e.logout():await e.deleteApiKey())}this.state={method:null,status:"unauthenticated"},this.onDidChangeStateEmitter.fire(this.state)}async showLoginPicker(){let e=Object.entries(gs).map(([s,n])=>({label:`${n.icon} ${n.name}`,description:n.description,method:s}));return(await qe.window.showQuickPick(e,{placeHolder:"Select authentication method"}))?.method}getProviderInfo(e){return gs[e]}getState(){return{...this.state}}isAuthenticated(){return this.state.status==="authenticated"}async getAccessToken(){if(!this.state.method)return;let e=this.providers.get(this.state.method);if(e)return e instanceof Y?e.getAccessToken():e.getApiKey()}async refreshAuth(){if(!this.state.method)return!1;let e=this.providers.get(this.state.method);if(!e)return!1;if(e instanceof Y)try{return await e.refreshToken(),!0}catch{return!1}return!0}dispose(){this.providers.forEach(e=>e.dispose()),this.providers.clear(),this.storage.dispose(),this.onDidChangeStateEmitter.dispose()}};var hs=class{statusBarItem;authManager;constructor(e){this.authManager=e,this.statusBarItem=x.window.createStatusBarItem("cclocal.auth",x.StatusBarAlignment.Left,100),this.statusBarItem.command="cclocal.login",this.statusBarItem.name="CCLocal Auth",this.statusBarItem.tooltip="CCLocal Authentication",this.updateStatusBar(),this.authManager.onDidChangeState(()=>this.updateStatusBar())}updateStatusBar(){let e=this.authManager.getState();switch(e.status){case"authenticated":this.statusBarItem.text="$(check) CCLocal",this.statusBarItem.tooltip=`Logged in with ${e.provider||"Unknown"}`,this.statusBarItem.command="cclocal.logout",this.statusBarItem.backgroundColor=void 0;break;case"connecting":this.statusBarItem.text="$(sync~spin) CCLocal",this.statusBarItem.tooltip="Logging in...",this.statusBarItem.command=void 0,this.statusBarItem.backgroundColor=void 0;break;case"expired":this.statusBarItem.text="$(alert) CCLocal",this.statusBarItem.tooltip="Session expired. Click to re-login.",this.statusBarItem.command="cclocal.login",this.statusBarItem.backgroundColor=new x.ThemeColor("statusBarItem.warningBackground");break;case"error":this.statusBarItem.text="$(error) CCLocal",this.statusBarItem.tooltip=`Error: ${e.error||"Unknown error"}`,this.statusBarItem.command="cclocal.login",this.statusBarItem.backgroundColor=new x.ThemeColor("statusBarItem.errorBackground");break;case"unauthenticated":default:this.statusBarItem.text="$(account) CCLocal",this.statusBarItem.tooltip="Click to login",this.statusBarItem.command="cclocal.login",this.statusBarItem.backgroundColor=void 0;break}this.statusBarItem.show()}show(){this.statusBarItem.show()}hide(){this.statusBarItem.hide()}dispose(){this.statusBarItem.dispose()}},xt=class{item;authManager;constructor(e){this.authManager=new Ct(e),this.item=new hs(this.authManager),tr(e,this.authManager,this.item)}getAuthManager(){return this.authManager}dispose(){this.item.dispose(),this.authManager.dispose()}};function tr(o,e,t){o.subscriptions.push(x.commands.registerCommand("cclocal.login",async()=>{let s=await e.showLoginPicker();if(!s)return;await e.login(s)&&x.window.showInformationMessage(`Successfully logged in with ${e.getProviderInfo(s)?.name}`)})),o.subscriptions.push(x.commands.registerCommand("cclocal.logout",async()=>{await x.window.showWarningMessage("Are you sure you want to logout?","Yes","No")==="Yes"&&(await e.logout(),x.window.showInformationMessage("Logged out successfully"))})),o.subscriptions.push(x.commands.registerCommand("cclocal.checkAuth",async()=>{let s=await e.checkAuthStatus();s.status==="authenticated"?x.window.showInformationMessage(`Logged in with ${s.provider||"Unknown"}`):x.window.showInformationMessage("Not logged in")})),o.subscriptions.push(x.commands.registerCommand("cclocal.switchAuthMethod",async()=>{let s=await e.showLoginPicker();s&&(e.isAuthenticated()&&await e.logout(),await e.login(s))})),o.subscriptions.push(x.commands.registerCommand("cclocal.configureCustomProvider",async()=>{let{CustomProviderAuth:s}=await Promise.resolve().then(()=>(ps(),io));await new s(new Ce(o)).configure()}))}bs();fs();var B=g(require("vscode"),1),le=g(require("path"),1),j=g(require("fs"),1),hr="plugins",mo="plugin.json",ws=["https://marketplace.anthropic.com","https://plugins.claude.ai"],Lt=class{outputChannel;context;plugins;marketplaces;options;eventEmitter;pluginStorageDir;onDidPluginEvent;constructor(e,t,s={}){this.context=e,this.outputChannel=t,this.options={officialMarketplaces:ws,extraKnownMarketplaces:[],strictKnownMarketplaces:[],blockedMarketplaces:[],autoUpdate:!1,updateCheckInterval:36e5,...s},this.plugins=new Map,this.marketplaces=new Map,this.eventEmitter=new B.EventEmitter,this.onDidPluginEvent=this.eventEmitter.event,this.pluginStorageDir=le.join(e.globalStorageUri.fsPath,hr),this.ensurePluginDir(),this.initializeMarketplaces(),this.outputChannel.debug("PluginManager initialized")}async install(e,t,s={}){if(this.outputChannel.info(`Installing plugin: ${e}`),this.plugins.has(e))throw new Error(`Plugin "${e}" is already installed`);this.marketplaces.get(t)?.plugins||await this.refreshMarketplace(t);let i=this.findMarketplacePlugin(e,t);if(!i)throw new Error(`Plugin "${e}" not found in marketplace`);if(!s.skipTrust&&!await this.verifyPluginTrust(i))throw new Error(`Plugin "${e}" failed trust verification`);let r=le.join(this.pluginStorageDir,this.sanitizePluginId(e));await j.promises.mkdir(r,{recursive:!0}),await this.downloadPlugin(i,r);let a=await this.loadManifest(r),l=s.autoApprove||await this.requestPermissions(a),c={manifest:a,installPath:r,state:"installed",trustLevel:i.trustLevel,installedAt:Date.now(),updatedAt:Date.now(),permissionsApproved:l,approvedPermissions:l?a.permissions||[]:[],configuration:this.getDefaultConfig(a),marketplaceUrl:t};return this.plugins.set(e,c),this.emitEvent("plugin_installed",e),l&&await this.activate(e),this.outputChannel.info(`Plugin installed: ${e}`),c}async installLocal(e,t={}){let s=await this.loadManifest(e),n=s.id;if(this.plugins.has(n))throw new Error(`Plugin "${n}" is already installed`);let i=t.autoApprove||await this.requestPermissions(s),r={manifest:s,installPath:e,state:"installed",trustLevel:"untrusted",installedAt:Date.now(),updatedAt:Date.now(),permissionsApproved:i,approvedPermissions:i?s.permissions||[]:[],configuration:this.getDefaultConfig(s)};return this.plugins.set(n,r),this.emitEvent("plugin_installed",n),i&&await this.activate(n),this.outputChannel.info(`Local plugin installed: ${n}`),r}async uninstall(e){let t=this.plugins.get(e);if(!t)return!1;t.state==="active"&&await this.deactivate(e),t.state="uninstalling",this.emitEvent("plugin_uninstalled",e);try{await j.promises.rm(t.installPath,{recursive:!0,force:!0})}catch(s){this.outputChannel.warn(`Failed to remove plugin files: ${s}`)}return this.plugins.delete(e),this.outputChannel.info(`Plugin uninstalled: ${e}`),!0}async activate(e){let t=this.plugins.get(e);if(!t)throw new Error(`Plugin "${e}" not found`);if(t.state==="active")return!0;if(!t.permissionsApproved){if(!await this.requestPermissions(t.manifest))return!1;t.permissionsApproved=!0,t.approvedPermissions=t.manifest.permissions||[]}try{return t.manifest.mcpServers&&await this.registerPluginMcpServers(t),t.state="active",t.updatedAt=Date.now(),this.emitEvent("plugin_activated",e),this.outputChannel.info(`Plugin activated: ${e}`),!0}catch(s){return t.state="error",t.lastError=s instanceof Error?s.message:String(s),this.emitEvent("plugin_error",e,{error:t.lastError}),this.outputChannel.error(`Plugin activation failed: ${e}: ${s}`),!1}}async deactivate(e){let t=this.plugins.get(e);return!t||t.state!=="active"?!1:(t.state="installed",t.updatedAt=Date.now(),this.emitEvent("plugin_deactivated",e),this.outputChannel.info(`Plugin deactivated: ${e}`),!0)}async enable(e){let t=this.plugins.get(e);return!t||t.state!=="disabled"?!1:this.activate(e)}async disable(e){let t=this.plugins.get(e);return t?(t.state==="active"&&await this.deactivate(e),t.state="disabled",t.updatedAt=Date.now(),!0):!1}getPlugin(e){return this.plugins.get(e)}getAllPlugins(){return Array.from(this.plugins.values())}getPluginsByState(e){return this.getAllPlugins().filter(t=>t.state===e)}getActivePlugins(){return this.getPluginsByState("active")}getStats(){let e=this.getAllPlugins(),t={available:0,installed:0,active:0,disabled:0,error:0,updating:0,uninstalling:0},s={untrusted:0,community:0,verified:0,official:0,enterprise:0};for(let n of e)t[n.state]++,s[n.trustLevel]++;return{totalInstalled:e.length,totalActive:t.active,byState:t,byTrust:s,marketplaces:this.marketplaces.size,availablePlugins:this.getTotalAvailablePlugins()}}async requestPermissions(e){let t=e.permissions||[];if(t.length===0)return!0;let s=t.filter(r=>["execute-commands","write-files","full-access"].includes(r));if(s.length===0)return!0;let n=[`Plugin: ${e.name} v${e.version}`,`Publisher: ${e.publisher}`,"","This plugin requests the following permissions:",...t.map(r=>`  \u2022 ${this.formatPermission(r)}`),"","Dangerous permissions require your approval:",...s.map(r=>`  \u26A0 ${this.formatPermission(r)}`)].join(`
`);return(await B.window.showWarningMessage(`Plugin Permission Request: ${e.name}`,{modal:!0,detail:n},{title:"Approve"},{title:"Deny"}))?.title==="Approve"}async updatePermissions(e,t){let s=this.plugins.get(e);return s?(s.approvedPermissions=t,s.permissionsApproved=!0,s.updatedAt=Date.now(),this.emitEvent("permissions_granted",e,{permissions:t}),!0):!1}async verifyPluginTrust(e){let t=e.trustLevel;return t==="official"||t==="verified"||t==="enterprise"?!0:t==="community"?(await B.window.showWarningMessage(`Community Plugin: ${e.manifest.name}`,{modal:!0,detail:[`Publisher: ${e.manifest.publisher}`,"This plugin is community-verified but not officially reviewed.","Install at your own risk."].join(`
`)},{title:"Install Anyway"},{title:"Cancel"}))?.title==="Install Anyway":(await B.window.showWarningMessage(`Untrusted Plugin: ${e.manifest.name}`,{modal:!0,detail:[`Publisher: ${e.manifest.publisher}`,"This plugin has not been verified by any trusted source.","Installing untrusted plugins may pose security risks."].join(`
`)},{title:"Install at Own Risk"},{title:"Cancel"}))?.title==="Install at Own Risk"}updateTrustLevel(e,t){let s=this.plugins.get(e);return s?(s.trustLevel=t,s.updatedAt=Date.now(),this.emitEvent("trust_changed",e,{trustLevel:t}),!0):!1}async addMarketplace(e){if(this.isMarketplaceBlocked(e))throw new Error(`Marketplace "${e}" is blocked by policy`);if(this.marketplaces.has(e))return this.marketplaces.get(e);let t=this.determineMarketplaceTrust(e),s={url:e,name:this.extractMarketplaceName(e),trustLevel:t,isKnown:this.isKnownMarketplace(e)};this.marketplaces.set(e,s),await this.refreshMarketplace(e),this.emitEvent("marketplace_added",void 0,e);let n=B.workspace.getConfiguration("cclocal"),i=n.get("extraKnownMarketplaces")||[];return i.includes(e)||(i.push(e),await n.update("extraKnownMarketplaces",i,B.ConfigurationTarget.Global)),this.outputChannel.info(`Marketplace added: ${e}`),s}async removeMarketplace(e){if(!this.marketplaces.has(e))return!1;this.marketplaces.delete(e),this.emitEvent("marketplace_removed",void 0,e);let t=B.workspace.getConfiguration("cclocal"),n=(t.get("extraKnownMarketplaces")||[]).filter(i=>i!==e);return await t.update("extraKnownMarketplaces",n,B.ConfigurationTarget.Global),this.outputChannel.info(`Marketplace removed: ${e}`),!0}async refreshMarketplace(e){let t=this.marketplaces.get(e);if(t)try{let s=await fetch(`${e}/api/plugins`);if(!s.ok)throw new Error(`HTTP ${s.status}`);let n=await s.json();t.plugins=n.plugins||[],t.lastRefreshed=Date.now(),this.emitEvent("marketplace_refreshed",void 0,e)}catch(s){this.outputChannel.warn(`Failed to refresh marketplace ${e}: ${s}`),t.plugins=[]}}getMarketplaces(){return Array.from(this.marketplaces.values())}getPluginConfig(e){return this.plugins.get(e)?.configuration}async updatePluginConfig(e,t,s){let n=this.plugins.get(e);return n?(n.configuration[t]=s,n.updatedAt=Date.now(),!0):!1}async loadInstalledPlugins(){try{let e=await j.promises.readdir(this.pluginStorageDir,{withFileTypes:!0});for(let t of e){if(!t.isDirectory())continue;let s=le.join(this.pluginStorageDir,t.name),n=le.join(s,mo);try{let i=await this.loadManifest(s),r=i.id,a={manifest:i,installPath:s,state:"installed",trustLevel:"community",installedAt:0,updatedAt:Date.now(),permissionsApproved:!1,approvedPermissions:[],configuration:this.getDefaultConfig(i)};this.plugins.set(r,a),this.outputChannel.debug(`Loaded plugin: ${r}`)}catch{this.outputChannel.warn(`Failed to load plugin from: ${s}`)}}}catch(e){e.code!=="ENOENT"&&this.outputChannel.error(`Failed to load plugins: ${e}`)}}ensurePluginDir(){j.existsSync(this.pluginStorageDir)||j.mkdirSync(this.pluginStorageDir,{recursive:!0})}initializeMarketplaces(){let e=this.options.officialMarketplaces||ws;for(let s of e)this.marketplaces.set(s,{url:s,name:this.extractMarketplaceName(s),trustLevel:"official",isKnown:!0});let t=this.options.extraKnownMarketplaces||[];for(let s of t)this.marketplaces.has(s)||this.marketplaces.set(s,{url:s,name:this.extractMarketplaceName(s),trustLevel:"community",isKnown:!0})}async downloadPlugin(e,t){let s=await fetch(e.downloadUrl);if(!s.ok)throw new Error(`Download failed: HTTP ${s.status}`);let n=Buffer.from(await s.arrayBuffer());await j.promises.writeFile(le.join(t,"plugin.tar.gz"),n),this.outputChannel.debug(`Downloaded plugin: ${e.manifest.id}`)}async loadManifest(e){let t=le.join(e,mo),s=await j.promises.readFile(t,"utf-8");return JSON.parse(s)}async registerPluginMcpServers(e){if(!e.manifest.mcpServers)return;let{getMCPManager:t}=await Promise.resolve().then(()=>(bs(),ho)),s=t();for(let[n,i]of Object.entries(e.manifest.mcpServers))try{s.registerServer({name:`${e.manifest.id}__${n}`,config:i})}catch(r){this.outputChannel.warn(`Failed to register MCP server ${n}: ${r}`)}}getDefaultConfig(e){let t={};if(e.configuration)for(let[s,n]of Object.entries(e.configuration))t[s]=n.default;return t}formatPermission(e){return{"read-files":"Read file contents","write-files":"Write/edit files","execute-commands":"Run shell commands","access-network":"Make HTTP requests","access-mcp":"Register MCP servers","access-clipboard":"Access clipboard","access-workspace":"Access workspace info","access-extensions":"Access other extensions","full-access":"Full unrestricted access"}[e]||e}sanitizePluginId(e){return e.replace(/[^a-zA-Z0-9_-]/g,"_")}extractMarketplaceName(e){try{return new URL(e).hostname.replace(/^(www\.|marketplace\.)/,"")}catch{return e}}isKnownMarketplace(e){return[...this.options.officialMarketplaces||[],...this.options.extraKnownMarketplaces||[],...this.options.strictKnownMarketplaces||[]].some(s=>s===e)}isMarketplaceBlocked(e){return(this.options.blockedMarketplaces||[]).includes(e)}determineMarketplaceTrust(e){return(this.options.officialMarketplaces||ws).includes(e)?"official":this.options.strictKnownMarketplaces?.includes(e)?"verified":this.options.extraKnownMarketplaces?.includes(e)?"community":"untrusted"}findMarketplacePlugin(e,t){return this.marketplaces.get(t)?.plugins?.find(n=>n.manifest.id===e)}getTotalAvailablePlugins(){let e=0,t=new Set;for(let s of this.marketplaces.values())for(let n of s.plugins||[])t.has(n.manifest.id)||(t.add(n.manifest.id),e++);return e}emitEvent(e,t,s){this.eventEmitter.fire({type:e,pluginId:t,data:s})}dispose(){this.eventEmitter.dispose(),this.plugins.clear(),this.marketplaces.clear(),this.outputChannel.debug("PluginManager disposed")}},Ee=null;function ys(o,e,t){return!Ee&&o&&e&&(Ee=new Lt(o,e,t)),Ee}function ks(){Ee&&(Ee.dispose(),Ee=null)}var H=g(require("vscode"),1),Qe=class{panel=null;pluginManager;constructor(e){this.pluginManager=e,this.pluginManager.onDidPluginEvent(()=>{this.sendState()})}show(){if(this.panel){this.panel.reveal();return}this.panel=H.window.createWebviewPanel("cclocal.plugins","CCLocal Plugins",H.ViewColumn.One,{enableScripts:!0,retainContextWhenHidden:!0}),this.panel.webview.html=this.getWebviewContent(),this.setupMessageHandler()}setupMessageHandler(){this.panel&&this.panel.webview.onDidReceiveMessage(async e=>{switch(e.type){case"getState":this.sendState();break;case"installPlugin":try{await this.pluginManager.install(e.pluginId,e.marketplaceUrl),H.window.showInformationMessage(`Plugin "${e.pluginId}" installed successfully`)}catch(s){H.window.showErrorMessage(`Failed to install plugin: ${s}`)}this.sendState();break;case"uninstallPlugin":await this.pluginManager.uninstall(e.pluginId),H.window.showInformationMessage(`Plugin "${e.pluginId}" uninstalled`),this.sendState();break;case"activatePlugin":await this.pluginManager.activate(e.pluginId)||H.window.showWarningMessage(`Failed to activate plugin "${e.pluginId}"`),this.sendState();break;case"deactivatePlugin":await this.pluginManager.deactivate(e.pluginId),this.sendState();break;case"enablePlugin":await this.pluginManager.enable(e.pluginId),this.sendState();break;case"disablePlugin":await this.pluginManager.disable(e.pluginId),this.sendState();break;case"addMarketplace":try{await this.pluginManager.addMarketplace(e.url),H.window.showInformationMessage(`Marketplace "${e.url}" added`)}catch(s){H.window.showErrorMessage(`Failed to add marketplace: ${s}`)}this.sendState();break;case"removeMarketplace":await this.pluginManager.removeMarketplace(e.url),this.sendState();break;case"refreshMarketplace":await this.pluginManager.refreshMarketplace(e.url),this.sendState();break;case"openSettings":await H.commands.executeCommand("workbench.action.openSettings","cclocal");break}})}sendState(){let e=this.pluginManager.getAllPlugins(),t=this.pluginManager.getStats(),s=this.pluginManager.getMarketplaces();this.panel?.webview.postMessage({type:"state",plugins:e,stats:t,marketplaces:s})}getWebviewContent(){return`
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
`}dispose(){this.panel?.dispose(),this.panel=null}};var Dt=g(require("vscode"),1),Ss=g(require("crypto"),1),Ot=class{outputChannel;context;sessions;activeSessionId;statuses;eventEmitter;onDidSessionEvent;constructor(e,t){this.context=e,this.outputChannel=t,this.sessions=new Map,this.activeSessionId=null,this.statuses=new Map,this.eventEmitter=new Dt.EventEmitter,this.onDidSessionEvent=this.eventEmitter.event,this.loadSessionList(),this.outputChannel.debug("SessionManager initialized")}async create(e={}){let t=Ss.randomUUID(),s=Date.now(),n=Dt.workspace.workspaceFolders?.[0]?.uri.fsPath||process.cwd(),i={id:t,name:e.name||`Session ${this.sessions.size+1}`,messages:[],cwd:e.cwd||n,model:e.model||"",createdAt:s,updatedAt:s,metadata:{tags:e.tags}};if(e.resumeFromId){let r=this.sessions.get(e.resumeFromId);r&&(i.messages=[...r.messages],i.name=e.name||`Resumed: ${r.name}`)}if(e.forkFromId){let r=this.sessions.get(e.forkFromId);r&&(i.messages=[...r.messages],i.name=e.name||`${r.name} (fork)`,i.metadata={...r.metadata,tags:e.tags,forkSourceId:e.forkFromId},this.emitEvent("session_forked",t,{sourceId:e.forkFromId}))}return e.systemPrompt&&i.messages.push({id:Ss.randomUUID(),role:"system",content:e.systemPrompt,timestamp:s}),this.sessions.set(t,i),this.statuses.set(t,"idle"),this.activeSessionId=t,await this.persistSessionList(),this.emitEvent("session_created",t),this.emitEvent("active_session_changed",t),this.outputChannel.info(`Created session: ${t} (${i.name})`),i}async load(e){let t=this.sessions.get(e);if(!t){let s=this.getStoredSession(e);s&&(t=s,this.sessions.set(e,t))}return t&&(this.activeSessionId=e,this.statuses.has(e)||this.statuses.set(e,"idle"),this.emitEvent("session_loaded",e),this.emitEvent("active_session_changed",e)),t}async save(e){let t=this.sessions.get(e);return t?(t.updatedAt=Date.now(),await this.persistSessionList(),this.emitEvent("session_updated",e),!0):!1}async delete(e){return this.sessions.has(e)?(this.sessions.delete(e),this.statuses.delete(e),this.activeSessionId===e&&(this.activeSessionId=this.sessions.keys().next().value||null,this.emitEvent("active_session_changed",this.activeSessionId||"")),await this.persistSessionList(),this.emitEvent("session_deleted",e),this.outputChannel.info(`Deleted session: ${e}`),!0):!1}async rename(e,t){let s=this.sessions.get(e);return s?(s.name=t,s.updatedAt=Date.now(),await this.persistSessionList(),this.emitEvent("session_renamed",e,{name:t}),!0):!1}addMessage(e,t){let s=this.sessions.get(e);return s?(s.messages.push(t),s.updatedAt=Date.now(),this.emitEvent("session_message_added",e,{messageId:t.id}),!0):!1}getMessages(e,t){let s=this.sessions.get(e);if(!s)return[];let n=t?.limit,i=t?.offset??0;return n===void 0?s.messages.slice(i):s.messages.slice(i,i+n)}replaceMessages(e,t){let s=this.sessions.get(e);return s?(s.messages=t,s.updatedAt=Date.now(),this.emitEvent("session_updated",e),!0):!1}getStatus(e){return this.statuses.get(e)||"idle"}setStatus(e,t){let s=this.statuses.get(e);s!==t&&(this.statuses.set(e,t),this.emitEvent("session_status_changed",e,{status:t,previousStatus:s}))}getActiveSessionId(){return this.activeSessionId}getActiveSession(){if(this.activeSessionId)return this.sessions.get(this.activeSessionId)}async switchSession(e){return this.sessions.has(e)?(this.activeSessionId&&await this.save(this.activeSessionId),this.activeSessionId=e,this.emitEvent("active_session_changed",e),!0):!1}listSessions(){let e=[],t=Array.from(this.sessions.values()).sort((s,n)=>n.updatedAt-s.updatedAt);for(let s of t){let n=s.messages.length>0?s.messages[s.messages.length-1]:void 0,i;if(n){let r=n.content;if(typeof r=="string")i=r.slice(0,80);else if(Array.isArray(r)){let a=r.find(l=>l.type==="text"&&typeof l.text=="string");a&&(i=a.text.slice(0,80))}}e.push({id:s.id,name:s.name,cwd:s.cwd,model:s.model,createdAt:s.createdAt,updatedAt:s.updatedAt,status:this.statuses.get(s.id)||"idle",messageCount:s.messages.length,lastMessagePreview:i,isActive:s.id===this.activeSessionId,tags:s.metadata?.tags,isFork:!!s.metadata?.forkSourceId,forkSourceId:s.metadata?.forkSourceId})}return e}getSessionDetail(e){let t=this.sessions.get(e);if(t)return{session:t,status:this.statuses.get(e)||"idle",messageCount:t.messages.length,tokenCount:0,contextWindow:0}}search(e){let t=this.listSessions();if(e.text){let s=e.text.toLowerCase();t=t.filter(n=>n.name.toLowerCase().includes(s)||(n.lastMessagePreview||"").toLowerCase().includes(s)||(n.tags||[]).some(i=>i.toLowerCase().includes(s)))}return e.model&&(t=t.filter(s=>s.model===e.model)),e.fromDate&&(t=t.filter(s=>s.updatedAt>=e.fromDate)),e.toDate&&(t=t.filter(s=>s.updatedAt<=e.toDate)),e.tags?.length&&(t=t.filter(s=>e.tags.some(n=>(s.tags||[]).includes(n)))),t.slice(0,e.limit||50)}async fork(e,t){let s=this.sessions.get(e);if(!s)throw new Error(`Session ${e} not found`);return this.create({name:t?.name||`${s.name} (fork)`,cwd:t?.cwd||s.cwd,model:t?.model||s.model,forkFromId:e,tags:s.metadata?.tags})}async generateTitle(e){let t=this.sessions.get(e);if(!t)return null;let s=t.messages.find(a=>a.role==="user");if(!s)return null;let n="";if(typeof s.content=="string")n=s.content;else if(Array.isArray(s.content)){let a=s.content.find(l=>l.type==="text"&&typeof l.text=="string");a&&(n=a.text)}if(!n)return null;let i=n.split(`
`)[0].trim(),r=i.length>60?i.slice(0,57)+"...":i;return await this.rename(e,r),r}getStats(){let e={idle:0,running:0,paused:0,error:0,loading:0};for(let n of this.statuses.values())e[n]++;let t=Array.from(this.sessions.values()),s=t.reduce((n,i)=>n+i.messages.length,0);return{totalSessions:this.sessions.size,activeSessionId:this.activeSessionId||void 0,byStatus:e,totalMessages:s,oldestSession:t.length>0?Math.min(...t.map(n=>n.createdAt)):void 0,newestSession:t.length>0?Math.max(...t.map(n=>n.updatedAt)):void 0}}async persistSessionList(){let e=this.listSessions().map(t=>({id:t.id,name:t.name,cwd:t.cwd,model:t.model,createdAt:t.createdAt,updatedAt:t.updatedAt,tags:t.tags,isFork:t.isFork,forkSourceId:t.forkSourceId}));await this.context.globalState.update("cclocal.sessions",e)}loadSessionList(){let e=this.context.globalState.get("cclocal.sessions");if(e){for(let t of e){let s={id:t.id,name:t.name,messages:[],cwd:t.cwd,model:t.model,createdAt:t.createdAt,updatedAt:t.updatedAt,metadata:{tags:t.tags,forkSourceId:t.forkSourceId}};this.sessions.set(t.id,s),this.statuses.set(t.id,"idle")}this.outputChannel.debug(`Loaded ${e.length} sessions from globalState`)}}getStoredSession(e){let t=this.context.globalState.get(`cclocal.session_messages_${e}`),s=this.sessions.get(e);if(s)return t&&(s.messages=Object.values(t)),s}emitEvent(e,t,s){this.eventEmitter.fire({type:e,sessionId:t,data:s})}dispose(){this.eventEmitter.dispose(),this.sessions.clear(),this.statuses.clear(),this.outputChannel.debug("SessionManager disposed")}},Me=null;function Cs(o,e){return!Me&&o&&e&&(Me=new Ot(o,e)),Me}function xs(){Me&&(Me.dispose(),Me=null)}var P=g(require("vscode"),1),Bt=class extends P.TreeItem{constructor(t){super(t.name,P.TreeItemCollapsibleState.None);this.sessionItem=t;this.id=t.id,this.description=this.formatDescription(t),this.tooltip=this.formatTooltip(t),this.iconPath=this.getIcon(t),this.contextValue=this.getContextValue(t),this.resourceUri=void 0,t.isActive&&(this.description=`\u25CF ${this.description}`),this.command={command:"cclocal.switchSession",title:"Switch to Session",arguments:[t.id]}}formatDescription(t){let s=[];t.messageCount>0&&s.push(`${t.messageCount} msgs`);let n=this.formatRelativeTime(t.updatedAt);return s.push(n),s.join(" \u2022 ")}formatTooltip(t){let s=[`Session: ${t.name}`,`ID: ${t.id}`,`Status: ${t.status}`,`Messages: ${t.messageCount}`,`Model: ${t.model||"default"}`,`Created: ${new Date(t.createdAt).toLocaleString()}`,`Updated: ${new Date(t.updatedAt).toLocaleString()}`];return t.tags?.length&&s.push(`Tags: ${t.tags.join(", ")}`),t.isFork&&s.push(`Fork of: ${t.forkSourceId}`),t.lastMessagePreview&&s.push("",`Last message: ${t.lastMessagePreview}`),s.join(`
`)}getIcon(t){if(t.isActive)return new P.ThemeIcon("circle-filled",new P.ThemeColor("charts.green"));switch(t.status){case"running":return new P.ThemeIcon("sync~spin");case"error":return new P.ThemeIcon("error",new P.ThemeColor("errorForeground"));case"paused":return new P.ThemeIcon("debug-pause");case"loading":return new P.ThemeIcon("loading~spin");default:return new P.ThemeIcon("circle-outline")}}getContextValue(t){let s=["session"];return t.isActive&&s.push("active"),t.isFork&&s.push("fork"),t.status==="running"&&s.push("running"),t.status==="error"&&s.push("error"),s.join(".")}formatRelativeTime(t){let s=Date.now()-t,n=Math.floor(s/1e3);return n<60?"just now":n<3600?`${Math.floor(n/60)}m ago`:n<86400?`${Math.floor(n/3600)}h ago`:`${Math.floor(n/86400)}d ago`}},Xe=class{constructor(e){this.sessionManager=e;this.treeView=P.window.createTreeView("cclocal.sessions",{treeDataProvider:this,showCollapseAll:!1}),this.sessionManager.onDidSessionEvent(()=>{this.refresh()})}treeView;_onDidChangeTreeData=new P.EventEmitter;onDidChangeTreeData=this._onDidChangeTreeData.event;searchQuery="";refresh(){this._onDidChangeTreeData.fire()}setSearchQuery(e){this.searchQuery=e,this.refresh()}getTreeItem(e){return e}getChildren(e){let t=this.sessionManager.listSessions();if(this.searchQuery){let s=this.searchQuery.toLowerCase();t=t.filter(n=>n.name.toLowerCase().includes(s)||(n.lastMessagePreview||"").toLowerCase().includes(s)||(n.tags||[]).some(i=>i.toLowerCase().includes(s)))}return t.map(s=>new Bt(s))}dispose(){this.treeView.dispose(),this._onDidChangeTreeData.dispose()}};var f=g(require("vscode"),1),bo=[],wo=[{id:"cclocal.acceptEdit",title:"Accept Edit",icon:"$(check)",register:(o,e)=>{o.subscriptions.push(f.commands.registerCommand("cclocal.acceptEdit",async()=>{f.commands.executeCommand("workbench.action.closeActiveEditor"),f.window.showInformationMessage("CCLocal: Changes accepted")}))}},{id:"cclocal.rejectEdit",title:"Reject Edit",icon:"$(discard)",register:(o,e)=>{o.subscriptions.push(f.commands.registerCommand("cclocal.rejectEdit",async()=>{f.commands.executeCommand("workbench.action.closeActiveEditor"),f.window.showInformationMessage("CCLocal: Changes rejected")}))}},{id:"cclocal.insertAtMention",title:"Insert @-Mention",register:o=>{o.subscriptions.push(f.commands.registerCommand("cclocal.insertAtMention",async()=>{let e=f.window.activeTextEditor;if(!e){f.window.showWarningMessage("CCLocal: No active editor");return}let t=await f.window.showOpenDialog({canSelectMany:!0,filters:{"All Files":["*"]}});if(t&&t.length>0){let s=t.map(i=>`@${i.fsPath}`).join(" "),n=e.selection.active;e.edit(i=>{i.insert(n,s)})}}))}},{id:"cclocal.toggleDictation",title:"Toggle Voice Dictation",register:o=>{let e=!1;o.subscriptions.push(f.commands.registerCommand("cclocal.toggleDictation",()=>{e=!e,e?f.window.showInformationMessage("CCLocal: Voice dictation enabled"):f.window.showInformationMessage("CCLocal: Voice dictation disabled")}))}}],yo=[{id:"cclocal.openInPanel",title:"Open in Panel",icon:"$(empty-window)",register:o=>{o.subscriptions.push(f.commands.registerCommand("cclocal.openInPanel",()=>{f.commands.executeCommand("workbench.action.positionPanelBottom"),f.commands.executeCommand("workbench.view.extension.cclocal-sidebar")}))}},{id:"cclocal.openInSidebar",title:"Open in Sidebar",icon:"$(layout-sidebar-left)",register:o=>{o.subscriptions.push(f.commands.registerCommand("cclocal.openInSidebar",()=>{f.commands.executeCommand("workbench.view.extension.cclocal-sidebar")}))}},{id:"cclocal.openSettings",title:"Open Settings",register:o=>{o.subscriptions.push(f.commands.registerCommand("cclocal.openSettings",()=>{f.commands.executeCommand("workbench.action.openSettings","cclocal")}))}},{id:"cclocal.openConfigPanel",title:"Open Configuration Panel",icon:"$(settings-gear)",register:(o,e)=>{o.subscriptions.push(f.commands.registerCommand("cclocal.openConfigPanel",async()=>{let{ConfigPanelProvider:t}=await Promise.resolve().then(()=>(vo(),fo)),s=new t(e.configManager);o.subscriptions.push(s),s.show()}))}},{id:"cclocal.showLogs",title:"Show Logs",register:(o,e)=>{o.subscriptions.push(f.commands.registerCommand("cclocal.showLogs",()=>{e.outputChannel.show()}))}}],ko=[{id:"cclocal.setModel",title:"Set Model",register:(o,e)=>{o.subscriptions.push(f.commands.registerCommand("cclocal.setModel",async()=>{let t=e.configManager.get("availableModels")||[],s="custom",n=[...t.map(r=>({label:r})),{label:s}],i=await f.window.showQuickPick(n,{placeHolder:"Select a model"});if(i)if(i.label===s){let r=await f.window.showInputBox({prompt:"Enter custom model ID",placeHolder:"claude-3-opus-20240229"});r&&(await e.configManager.setModel(r),f.window.showInformationMessage(`CCLocal: Model set to ${r}`))}else await e.configManager.setModel(i.label),f.window.showInformationMessage(`CCLocal: Model set to ${i.label}`)}))}},{id:"cclocal.setPermissionMode",title:"Set Permission Mode",register:(o,e)=>{o.subscriptions.push(f.commands.registerCommand("cclocal.setPermissionMode",async()=>{let t=[{label:"default",description:"Ask for dangerous operations"},{label:"acceptEdits",description:"Auto-accept file edits"},{label:"plan",description:"Plan mode (no execution)"},{label:"bypassPermissions",description:"Auto-accept all (dangerous)"}],s=await f.window.showQuickPick(t,{placeHolder:"Select permission mode"});s&&(await e.configManager.update("initialPermissionMode",s.label),f.window.showInformationMessage(`CCLocal: Permission mode set to ${s.label}`))}))}}],So=[],Co=[...bo,...wo,...yo,...ko,...So];function Es(o,e){for(let t of Co)t.register(o,e)}var b=g(require("vscode"),1);function Ms(o,e){o.subscriptions.push(b.commands.registerCommand("cclocal.keyboard.sendWithCtrlEnter",()=>{(b.workspace.getConfiguration("cclocal").get("useCtrlEnterToSend")??!1)&&b.commands.executeCommand("cclocal.sendMessage")})),o.subscriptions.push(b.commands.registerCommand("cclocal.keyboard.escape",()=>{let t=e.getActiveSessionId();t&&e.getStatus(t)==="running"&&b.commands.executeCommand("cclocal.stopGeneration")})),o.subscriptions.push(b.commands.registerCommand("cclocal.keyboard.newConversation",()=>{(b.workspace.getConfiguration("cclocal").get("enableNewConversationShortcut")??!0)&&b.commands.executeCommand("cclocal.newConversation")})),o.subscriptions.push(b.commands.registerCommand("cclocal.keyboard.showCommandPalette",()=>{b.commands.executeCommand("cclocal.showCommandPalette")})),o.subscriptions.push(b.commands.registerCommand("cclocal.keyboard.previousSession",async()=>{let t=e.listSessions(),s=e.getActiveSessionId();if(t.length>0&&s){let i=(t.findIndex(r=>r.id===s)-1+t.length)%t.length;await e.switchSession(t[i].id)}})),o.subscriptions.push(b.commands.registerCommand("cclocal.keyboard.nextSession",async()=>{let t=e.listSessions(),s=e.getActiveSessionId();if(t.length>0&&s){let i=(t.findIndex(r=>r.id===s)+1)%t.length;await e.switchSession(t[i].id)}}))}async function xo(){let o=[{id:"new",label:"New Conversation",icon:"$(add)",action:()=>b.commands.executeCommand("cclocal.newConversation")},{id:"clear",label:"Clear Chat",icon:"$(clear-all)",action:()=>b.commands.executeCommand("cclocal.clearChat")},{id:"stop",label:"Stop Generation",icon:"$(debug-stop)",action:()=>b.commands.executeCommand("cclocal.stopGeneration")},{id:"model",label:"Set Model",icon:"$(symbol-color)",action:()=>b.commands.executeCommand("cclocal.setModel")},{id:"permissions",label:"Set Permission Mode",icon:"$(shield)",action:()=>b.commands.executeCommand("cclocal.setPermissionMode")},{id:"settings",label:"Open Settings",icon:"$(settings-gear)",action:()=>b.commands.executeCommand("cclocal.openSettings")},{id:"config",label:"Open Configuration Panel",icon:"$(editor-glyph)",action:()=>b.commands.executeCommand("cclocal.openConfigPanel")},{id:"sessions",label:"Show Session Statistics",icon:"$(graph)",action:()=>b.commands.executeCommand("cclocal.sessionStats")},{id:"mcp",label:"Show MCP Settings",icon:"$(server)",action:()=>b.commands.executeCommand("cclocal.showMCPSettings")},{id:"plugins",label:"Show Plugin Settings",icon:"$(extensions)",action:()=>b.commands.executeCommand("cclocal.showPluginSettings")},{id:"hooks",label:"Show Hook Statistics",icon:"$(bell)",action:()=>b.commands.executeCommand("cclocal.hooks.stats")},{id:"logs",label:"Show Logs",icon:"$(output)",action:()=>b.commands.executeCommand("cclocal.showLogs")},{id:"focus",label:"Focus Input",icon:"$(edit)",shortcut:"Ctrl+Escape",action:()=>b.commands.executeCommand("cclocal.focusInput")}],e=await b.window.showQuickPick(o.map(t=>({label:t.icon?`${t.icon} ${t.label}`:t.label,description:t.description,detail:t.shortcut,command:t})),{placeHolder:"CCLocal Commands",matchOnDescription:!0});e&&await e.command.action()}function _s(o){o.subscriptions.push(b.commands.registerCommand("cclocal.showCommandPalette",()=>xo()))}var W,M,R,Te,Ze,_e;async function mr(o){console.log("CCLocal extension activating..."),R=d.window.createOutputChannel("CCLocal",{log:!0}),o.subscriptions.push(R),M=new bt(o),o.subscriptions.push(M),W=ds(R,{allowedHttpUrls:M.get("allowedHttpHookUrls"),allowedCommands:M.get("allowedCommands"),allowedEnvVars:M.get("allowedEnvVars")}),o.subscriptions.push(W);let e=M.get("hooks");e&&W.loadFromConfig(e),o.subscriptions.push(d.workspace.onDidChangeConfiguration(l=>{if(l.affectsConfiguration("cclocal.hooks")){let c=M?.get("hooks");c&&W&&W.loadFromConfig(c)}if(l.affectsConfiguration("cclocal.disableAllHooks")){let c=M?.get("disableAllHooks");W&&W.setEnabled(!c)}}));let t=new xt(o);o.subscriptions.push(t),Te=Et(R,{autoDiscoverProject:M.get("enableAllProjectMcpServers"),preApprovedServers:M.get("allowedMcpServers"),deniedServers:M.get("deniedMcpServers")}),o.subscriptions.push(Te),Te.discoverServers(),At(o),Ze=ys(o,R,{extraKnownMarketplaces:M.get("extraKnownMarketplaces"),strictKnownMarketplaces:M.get("strictKnownMarketplaces"),blockedMarketplaces:M.get("blockedMarketplaces")}),o.subscriptions.push(Ze),await Ze.loadInstalledPlugins(),_e=Cs(o,R),o.subscriptions.push(_e);let s=new Xe(_e);o.subscriptions.push(s),o.subscriptions.push(d.window.registerTreeDataProvider("cclocal.sessions",s)),Es(o,{sessionManager:_e,sessionTree:s,hookManager:W,mcpManager:Te,pluginManager:Ze,configManager:M,outputChannel:R}),Ms(o,_e),_s(o),yr(o,_e,s),vr(o,W),br(o,Te),wr(o,Ze);let r=d.workspace.getConfiguration("cclocal").get("mode")||"websocket",a;if(r==="cli"){let l=new Oe(o.extensionUri);a=c=>l.sendMessage(c),o.subscriptions.push(d.window.registerWebviewViewProvider(Oe.viewType,l,{webviewOptions:{retainContextWhenHidden:!0}})),o.subscriptions.push(d.commands.registerCommand("cclocal.newSession",()=>{d.commands.executeCommand("cclocal.chatView.focus"),l.handleCommand("newSession")})),o.subscriptions.push(d.commands.registerCommand("cclocal.clearChat",()=>{l.handleCommand("clearChat")})),o.subscriptions.push(d.commands.registerCommand("cclocal.stopGeneration",()=>{l.handleCommand("stopGeneration")}))}else{let l=new ft;await l.ensureServerRunning();let c=new je(o.extensionUri,l);a=u=>c.sendMessage(u),o.subscriptions.push(d.window.registerWebviewViewProvider(je.viewType,c)),o.subscriptions.push(d.commands.registerCommand("cclocal.sendMessage",async()=>{let u=await d.window.showInputBox({prompt:"Enter your message to CCLocal",placeHolder:"How can I help you today?"});u&&await c.sendMessage(u)})),o.subscriptions.push(d.commands.registerCommand("cclocal.clearChat",()=>{c.clearChat()})),o.subscriptions.push(d.commands.registerCommand("cclocal.stopGeneration",()=>{c.stopGeneration()}))}o.subscriptions.push(d.commands.registerCommand("cclocal.sendSelectedCode",()=>{let l=d.window.activeTextEditor;if(!l){d.window.showWarningMessage("CCLocal: \u6CA1\u6709\u6D3B\u52A8\u7684\u7F16\u8F91\u5668");return}let c=l.selection;if(c.isEmpty){d.window.showWarningMessage("CCLocal: \u8BF7\u5148\u9009\u4E2D\u4EE3\u7801");return}let u=l.document.getText(c),p=l.document.languageId,h=l.document.fileName.split("/").pop()??"",m=`\u8BF7\u89E3\u91CA\u4EE5\u4E0B ${p} \u4EE3\u7801\uFF08\u6765\u81EA ${h}\uFF09\uFF1A

\`\`\`${p}
${u}
\`\`\``;d.commands.executeCommand("cclocal.chatView.focus").then(()=>{a(m)})})),console.log("CCLocal extension activated")}function fr(){us(),Mt(),ks(),xs(),R?.dispose()}function vr(o,e){o.subscriptions.push(d.commands.registerCommand("cclocal.hooks.enable",()=>{e.setEnabled(!0),d.window.showInformationMessage("CCLocal: Hooks enabled")})),o.subscriptions.push(d.commands.registerCommand("cclocal.hooks.disable",()=>{e.setEnabled(!1),d.window.showInformationMessage("CCLocal: Hooks disabled")})),o.subscriptions.push(d.commands.registerCommand("cclocal.hooks.clear",()=>{e.clear(),d.window.showInformationMessage("CCLocal: All hooks cleared")})),o.subscriptions.push(d.commands.registerCommand("cclocal.hooks.stats",()=>{let t=e.getStats(),s=`Total hooks: ${t.totalHooks}
${Object.entries(t.hooksByType).filter(([,n])=>n>0).map(([n,i])=>`  ${n}: ${i}`).join(`
`)}`;d.window.showInformationMessage(s,{modal:!0})})),o.subscriptions.push(d.commands.registerCommand("cclocal.hooks.test",async()=>{let t=["PreToolUse","PostToolUse","SessionStart","SessionEnd","FileWrite","FileEdit","BashExecution","Error"],s=await d.window.showQuickPick(t,{placeHolder:"Select hook type to test"});if(s){let n=await e.execute(s,{type:s,timestamp:Date.now(),toolName:"TestTool"}),i=n.map(r=>`Handler ${r.handlerIndex}: ${r.success?"\u2713":"\u2717"} (${r.duration}ms)
`+(r.output?`  Output: ${r.output.slice(0,100)}
`:"")+(r.error?`  Error: ${r.error}
`:"")).join(`
`);R?.info(`Hook test results:
${i}`),d.window.showInformationMessage(`Hook test completed: ${n.filter(r=>r.success).length}/${n.length} passed`)}})),o.subscriptions.push(d.commands.registerCommand("cclocal.hooks.registerFunction",async()=>{let t=await d.window.showInputBox({prompt:"Enter function name",placeHolder:"myCustomHook"});t&&(e.registerFunction(t,async s=>(R?.debug(`Function hook "${t}" called with context:`,s),{success:!0,message:`Hook ${t} executed`,timestamp:Date.now()})),d.window.showInformationMessage(`CCLocal: Function hook "${t}" registered`))}))}function br(o,e){let t=new Pe(e);o.subscriptions.push(t),o.subscriptions.push(d.commands.registerCommand("cclocal.showMCPSettings",()=>{t.show()})),o.subscriptions.push(d.commands.registerCommand("cclocal.mcp.refresh",async()=>{await e.discoverServers(),d.window.showInformationMessage("CCLocal: MCP servers refreshed")})),o.subscriptions.push(d.commands.registerCommand("cclocal.mcp.reviewPending",async()=>{let s=e.getPendingApprovals();if(s.length===0){d.window.showInformationMessage("CCLocal: No pending MCP server approvals");return}for(let n of s)await e.showApprovalUI({name:n.name,info:n,tools:n.tools,reason:"auto_discovery"})?d.window.showInformationMessage(`CCLocal: Approved MCP server "${n.name}"`):d.window.showInformationMessage(`CCLocal: Denied MCP server "${n.name}"`)})),o.subscriptions.push(d.commands.registerCommand("cclocal.mcp.listServers",async()=>{let s=e.getAllServers();if(s.length===0){d.window.showInformationMessage("CCLocal: No MCP servers discovered");return}let n=s.map(r=>({label:r.name,description:`${r.status} | ${r.source} | ${r.config.type}`,detail:r.tools.length>0?`Tools: ${r.tools.map(a=>a.name).join(", ")}`:"No tools",server:r})),i=await d.window.showQuickPick(n,{placeHolder:"Select an MCP server"});if(i){let r=await d.window.showQuickPick([{label:"Enable",value:"enable"},{label:"Disable",value:"disable"},{label:"Remove",value:"remove"},{label:"View Details",value:"details"}],{placeHolder:`Action for "${i.label}"`});if(r)switch(r.value){case"enable":await e.enableServer(i.label);break;case"disable":await e.disableServer(i.label);break;case"remove":await e.removeServer(i.label);break;case"details":t.show();break}}})),o.subscriptions.push(d.commands.registerCommand("cclocal.mcp.stats",()=>{let s=e.getStats(),n=[`Total Discovered: ${s.totalDiscovered}`,`Connected: ${s.byStatus.connected||0}`,`Approved: ${s.byApproval.approved||0}`,`Pending: ${s.byApproval.pending||0}`,`Denied: ${s.byApproval.denied||0}`,`Total Tools: ${s.totalTools}`,"","By Source:",`  User: ${s.bySource.user||0}`,`  Local: ${s.bySource.local||0}`,`  Project: ${s.bySource.project||0}`];s.connectedServers.length>0&&(n.push("","Connected Servers:"),s.connectedServers.forEach(i=>n.push(`  - ${i}`))),s.failedServers.length>0&&(n.push("","Failed Servers:"),s.failedServers.forEach(i=>n.push(`  - ${i}`))),d.window.showInformationMessage(n.join(`
`),{modal:!0})})),o.subscriptions.push(d.commands.registerCommand("cclocal.mcp.openUserConfig",async()=>{let s=process.env.HOME||process.env.USERPROFILE||"",n=await d.workspace.openTextDocument(Ts.join(s,".claude.json"));await d.window.showTextDocument(n)})),o.subscriptions.push(d.commands.registerCommand("cclocal.mcp.openProjectConfig",async()=>{let s=d.workspace.workspaceFolders?.[0];if(!s){d.window.showWarningMessage("CCLocal: No workspace folder open");return}let n=await d.workspace.openTextDocument(Ts.join(s.uri.fsPath,".mcp.json"));await d.window.showTextDocument(n)}))}function wr(o,e){let t=new Qe(e);o.subscriptions.push(t),o.subscriptions.push(d.commands.registerCommand("cclocal.showPluginSettings",()=>{t.show()})),o.subscriptions.push(d.commands.registerCommand("cclocal.installPlugin",async()=>{let s=e.getMarketplaces();if(s.length===0){d.window.showWarningMessage("CCLocal: No marketplaces configured. Add a marketplace source first.");return}let n=[];for(let r of s)for(let a of r.plugins||[])n.push({id:a.manifest.id,name:`${a.manifest.name} v${a.manifest.version} (${r.name})`,marketplaceUrl:r.url});if(n.length===0){d.window.showInformationMessage("CCLocal: No plugins available in marketplaces");return}let i=await d.window.showQuickPick(n.map(r=>({label:r.name,...r})),{placeHolder:"Select a plugin to install"});if(i)try{await e.install(i.id,i.marketplaceUrl),d.window.showInformationMessage(`CCLocal: Plugin "${i.id}" installed`)}catch(r){d.window.showErrorMessage(`Failed to install plugin: ${r}`)}})),o.subscriptions.push(d.commands.registerCommand("cclocal.uninstallPlugin",async()=>{let s=e.getAllPlugins();if(s.length===0){d.window.showInformationMessage("CCLocal: No plugins installed");return}let n=await d.window.showQuickPick(s.map(i=>({label:`${i.manifest.name} v${i.manifest.version}`,pluginId:i.manifest.id})),{placeHolder:"Select a plugin to uninstall"});n&&await d.window.showWarningMessage(`Uninstall plugin "${n.label}"?`,"Yes","No")==="Yes"&&(await e.uninstall(n.pluginId),d.window.showInformationMessage("CCLocal: Plugin uninstalled"))})),o.subscriptions.push(d.commands.registerCommand("cclocal.addMarketplace",async()=>{let s=await d.window.showInputBox({prompt:"Enter marketplace URL",placeHolder:"https://marketplace.example.com"});if(s)try{await e.addMarketplace(s),d.window.showInformationMessage(`CCLocal: Marketplace "${s}" added`)}catch(n){d.window.showErrorMessage(`Failed to add marketplace: ${n}`)}})),o.subscriptions.push(d.commands.registerCommand("cclocal.listPlugins",()=>{let s=e.getAllPlugins();if(s.length===0){d.window.showInformationMessage("CCLocal: No plugins installed");return}let n=s.map(i=>`  ${i.state==="active"?"\u25CF":i.state==="error"?"\u2717":"\u25CB"} ${i.manifest.name} v${i.manifest.version} [${i.state}] (${i.trustLevel})`);d.window.showInformationMessage(`Installed Plugins (${s.length}):
${n.join(`
`)}`,{modal:!0})})),o.subscriptions.push(d.commands.registerCommand("cclocal.pluginStats",()=>{let s=e.getStats(),n=[`Total Installed: ${s.totalInstalled}`,`Active: ${s.totalActive}`,"","By State:",...Object.entries(s.byState).filter(([,i])=>i>0).map(([i,r])=>`  ${i}: ${r}`),"","By Trust:",...Object.entries(s.byTrust).filter(([,i])=>i>0).map(([i,r])=>`  ${i}: ${r}`),"",`Marketplaces: ${s.marketplaces}`,`Available: ${s.availablePlugins}`];d.window.showInformationMessage(n.join(`
`),{modal:!0})}))}function yr(o,e,t){o.subscriptions.push(d.commands.registerCommand("cclocal.newConversation",async()=>{await e.create(),t.refresh()})),o.subscriptions.push(d.commands.registerCommand("cclocal.switchSession",async s=>{await e.switchSession(s),t.refresh()})),o.subscriptions.push(d.commands.registerCommand("cclocal.renameSession",async s=>{let n=await d.window.showInputBox({prompt:"Rename session",value:s.sessionItem.name,placeHolder:"Enter new name"});n&&(await e.rename(s.sessionItem.id,n),t.refresh())})),o.subscriptions.push(d.commands.registerCommand("cclocal.deleteSession",async s=>{await d.window.showWarningMessage(`Delete session "${s.sessionItem.name}"?`,"Delete","Cancel")==="Delete"&&(await e.delete(s.sessionItem.id),t.refresh())})),o.subscriptions.push(d.commands.registerCommand("cclocal.forkSession",async s=>{let n=await e.fork(s.sessionItem.id);d.window.showInformationMessage(`Forked session: ${n.name}`),t.refresh()})),o.subscriptions.push(d.commands.registerCommand("cclocal.searchSessions",async()=>{let s=await d.window.showInputBox({prompt:"Search sessions by name or content",placeHolder:"Type search query..."});s!==void 0&&t.setSearchQuery(s)})),o.subscriptions.push(d.commands.registerCommand("cclocal.clearSessionSearch",()=>{t.setSearchQuery("")})),o.subscriptions.push(d.commands.registerCommand("cclocal.generateSessionTitle",async s=>{let n=await e.generateTitle(s.sessionItem.id);n?d.window.showInformationMessage(`Generated title: ${n}`):d.window.showInformationMessage("No user message found to generate title from"),t.refresh()})),o.subscriptions.push(d.commands.registerCommand("cclocal.sessionStats",()=>{let s=e.getStats(),n=[`Total Sessions: ${s.totalSessions}`,`Active: ${s.activeSessionId||"none"}`,`Total Messages: ${s.totalMessages}`,"","By Status:",...Object.entries(s.byStatus).filter(([,i])=>i>0).map(([i,r])=>`  ${i}: ${r}`)];s.oldestSession&&n.push("",`Oldest: ${new Date(s.oldestSession).toLocaleString()}`),s.newestSession&&n.push(`Newest: ${new Date(s.newestSession).toLocaleString()}`),d.window.showInformationMessage(n.join(`
`),{modal:!0})}))}0&&(module.exports={activate,configManager,deactivate,hookManager,mcpManager,outputChannel});
