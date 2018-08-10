function makeHTTPRequest(traverseShallow, isFunction, dummyFunc){

  var keepAliveAgent;

  function addParamsToUrl(url, param) {
    return url + (/\?/.test(url) ? '&' : '?') + param;
  }

  function addParamString(urlobj, param, paramname) {
    urlobj.url += ((/\?/.test(urlobj.url) ? '&' : '?') + (encodeURIComponent(paramname)+'='+encodeURIComponent(param))); 
  }

  var xhrFactories = [
    function() { return new XMLHttpRequest(); },
    function() { return new ActiveXObject("Msxml2.XMLHTTP.3.0"); },
    function() { return new ActiveXObject("Msxml2.XMLHTTP"); },
    function() { return new ActiveXObject("Microsoft.XMLHTTP"); }
  ],
  xhrFactoryIndex = null;
  function makeXHRProducer(resobj,xhrproducer,xhrproducerindex){
    try{
      var xhr = xhrproducer();
      if(xhr){
        resobj.res = xhr;
        xhrFactoryIndex = xhrproducerindex;
        return true;
      }else{
        return false;
      }
    }
    catch(err){
      return false;
    }
  }
  function makeXHR(){
    if(xhrFactoryIndex !== null){
      try{
        return xhrFactories[xhrFactoryIndex]();
      }
      catch(e){
        xhrFactoryIndex = null;
        return makeXHR();
      }
    }else{
      resobj = {res:null};
      xhrFactories.some(makeXHRProducer.bind(null,resobj));
      return resobj.res;
    }
  };

  function ampersandjoiner (joinobj, val, name) {
    if (joinobj.str && joinobj.str.length) {
      joinobj.str += '&';
    }
    joinobj.str += (name+'='+val);
  }

  function ampersandjoinedhash (hash) {
    var joinobj = {str: ''}, ret;
    traverseShallow(hash, ampersandjoiner.bind(null, joinobj));
    ret = joinobj.str;
    joinobj = null;
    //console.log(hash, '=>', ret);
    return ret;
  }

  function myCompleter(){
    this.apply(null, arguments);
  }

  function xhrOnReadyStateChange(onComplete) {
    if (this.readyState === 4) {
      onComplete(this);
      this.onreadystatechange = dummyFunc;
    }
  }

  function progressreporter (progressobj, progresscb) {
    var progress;
    if (progressobj && 
      Number.isInteger(progressobj.total) &&
      Number.isInteger(progressobj.loaded)
    ) {
      progress = Math.round(progressobj.loaded*100/progressobj.total);
      if (progress !== progressobj.progress) {
        if (Number.isInteger(progressobj.progress)) {
          progressobj.progress = progress;
        }
        progresscb(progress);
      }
    }
  }

  function prepareRequest (url, options) {

    options  = options || {};

    var method = options.method ? options.method.toUpperCase() : 'GET',
        onComplete = isFunction(options.onComplete) ? myCompleter.bind(options.onComplete) : dummyFunc,
        body;

    if (method === 'GET') {
      body = null;
      var top = typeof options.parameters;
      if (top === 'string') {
        url = addParamsToUrl(url, options.parameters);
      }
      if (top === 'object'){
        var urlobj={url:url};
        traverseShallow(options.parameters,addParamString.bind(null,urlobj));
        url = urlobj.url;
      }
    }

    var ret = {
      url: url,
      method: method,
      onComplete: onComplete,
      body: body
    };

    if (options.headers) {
      ret.headers = options.headers;
    }

    if (options.hasOwnProperty('onError')) {
      ret.onError = options.onError;
    }
    if (options.hasOwnProperty('onData')) {
      ret.onData = options.onData;
    }
    if (options.hasOwnProperty('onProgress')) {
      ret.onProgress = options.onProgress;
    }
    return ret;

  }

  function browser_progressReporter (progresscb, progressevent) {
    if (progressevent.lengthComputable) {
      progressreporter(progressevent, progresscb);
    }
  }

  function browser_request(url, options) {

    options  = options || {};

    var method = options.method ? options.method.toUpperCase() : 'GET',
        onComplete = isFunction(options.onComplete) ? myCompleter.bind(options.onComplete) : dummyFunc,
        xhr = makeXHR(),
        rand = Date.now() + ~~(Math.random()*10000),
        body;

    xhr.onreadystatechange = xhrOnReadyStateChange.bind(xhr,onComplete);

    if (method === 'GET') {
      body = null;
      var top = typeof options.parameters;
      if (top === 'string') {
        options.parameters += ('&__allexrandomfield__='+rand);
        url = addParamsToUrl(url, options.parameters);
      } else if (top === 'object'){
        var urlobj={url:url,__allexrandomfield__:rand};
        traverseShallow(options.parameters,addParamString.bind(null,urlobj));
        url = urlobj.url;
      } else {
        urls = addParamsToUrl(url,'?'+rand+'='+rand);
      }
    }

    if ( isFunction(options.onError) ) {
      xhr.onerror = options.onError;
    }
    if ( isFunction(options.onProgress) ) {
      xhr.onprogress = browser_progressReporter.bind(null, options.onProgress);
    }
    xhr.open(method, url, true);

    if (method === 'POST' || method === 'PUT') {
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    }

    try {
      xhr.send(body);
      return xhr;
    } catch(e) {
      if (options.onError) {
        options.onError(e);
      }
    }
  }

  function cookieExtractor (cookiestring) {
    var scindex = cookiestring.indexOf(';');
    if (scindex>=0) {
      return cookiestring.substring(0,scindex);
    } else {
      return cookiestring;
    }
  }

  function extractCookies (setcookiestring) {
    if (isFunction(setcookiestring.map)) {
      return setcookiestring.map(cookieExtractor);
    }
    return [];
  }

  function onResponse(cb, progresscb, res) {
    var ret = {
      statusCode: res.statusCode,
      headers: res.headers,
      data: ''
    };
    if (res.headers && res.headers['set-cookie']) {
      ret.cookies = extractCookies(res.headers['set-cookie']);
    }
    res.setEncoding('utf8');
    res.on('data', function(chunk){
      if (progresscb) {
        ret.loaded += chunk.length;
        progressreporter(ret, progresscb);
      }
      ret.data += chunk;
    });
    res.on('end', function(){
      cb(ret);
      ret = null;
      progresscb = null;
    });
    if (progresscb) {
      ret.total = parseInt(res.headers['content-length']);
      ret.loaded = 0;
      ret.progress = 0;
    }
  }

  function onResponseBinary(ondata, oncomplete, onprogress, res) {
    var ret;
    if (onprogress) {
      ret = {
        total: parseInt(res.headers['content-length']),
        loaded: 0,
        progress: 0
      };
      res.on('data', function (data) {
        ret.loaded += data.length;
        progressreporter(ret, onprogress);
        ondata(data);
      });
      res.on('end', function () {
        oncomplete();
        ret = null;
        progressreporter = null;
        ondata = null;
        oncomplete = null;
      });
      res.on('end', oncomplete);
    } else {
      res.on('data', ondata);
      res.on('end', oncomplete);
    }
  }

  function nodejs_request_error(url, errcb, err) {
    if (errcb) {
      errcb(err);
    } else {
      console.error('Error in nodejs http request:',url, err);
    }
  }
  function nodejs_request(url, options) {
    var prep = prepareRequest(url, options),
      parsed = require('url').parse(prep.url),
      resphandler, mod, body, req;
    parsed.method = prep.method;
    parsed.headers = prep.headers;
    if (prep.onData) {
      resphandler = onResponseBinary.bind(null, prep.onData, prep.onComplete, prep.onProgress);
    } else {
      resphandler = onResponse.bind(null, prep.onComplete, prep.onProgress);
    }
    try {
      mod = require(parsed.protocol.substr(0, parsed.protocol.length-1));
    } catch(e) {
      nodejs_request_error(url, prep.onError, e);
    }
    if (!mod) {
      return;
    }
    if (parsed.method === 'POST') {
      parsed.headers = parsed.headers || {};
      if (parsed.headers['Content-Type'] === 'application/x-www-form-urlencoded') {
        body = options.parameters ? ampersandjoinedhash(options.parameters) : null;
      } else {
        body = options.parameters ? JSON.stringify(options.parameters) : null;
        parsed.headers['Content-Type'] = 'application/json';
      }
      if (body) {
        parsed.headers['Content-Length'] = Buffer.byteLength(body);
      }
    }
    if (!keepAliveAgent) {
      keepAliveAgent = new mod.Agent({keepAlive: true});
    }
    parsed.agent = keepAliveAgent;
    req = mod.request(parsed, resphandler).
      on('error', nodejs_request_error.bind(null, url, prep.onError));
    if (body) {
      //console.log('writing', body);
      req.write(body);
    }
    req.end();
  }

  function request(url, options) {
    if ('undefined' === typeof window){
      return nodejs_request(url, options);
    } else {
      return browser_request(url, options);
    }
  }

  return request;
}

module.exports = makeHTTPRequest;
