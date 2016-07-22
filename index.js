function makeHTTPRequest(traverseShallow, isFunction, dummyFunc){

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

  function myCompleter(){
    this.apply(null, arguments);
  }

  function xhrOnReadyStateChange(onComplete) {
    if (this.readyState === 4) {
      onComplete(this);
      this.onreadystatechange = dummyFunc;
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

    if (options.hasOwnProperty('onError')) {
      ret.onError = options.onError;
    }
    if (options.hasOwnProperty('onData')) {
      ret.onData = options.onData;
    }
    return ret;

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
    xhr.open(method, url, true);

    if (method === 'POST' || method === 'PUT') {
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    }

    xhr.send(body);
    return xhr;
  }

  function onResponse(cb, res) {
    var ret = {
      statusCode: res.statusCode,
      data: ''
    };
    res.setEncoding('utf8');
    res.on('data', function(chunk){
      ret.data += chunk;
    });
    res.on('end', function(){
      cb(ret);
    });
  }

  function onResponseBinary(ondata, oncomplete, res) {
    res.on('data', ondata);
    res.on('end', oncomplete);
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
      resphandler;
    if (prep.onData) {
      resphandler = onResponseBinary.bind(null, prep.onData, prep.onComplete);
    } else {
      resphandler = onResponse.bind(null, prep.onComplete);
    }
    //console.log('request for', parsed);
    require('http').request(parsed, resphandler).
      on('error', nodejs_request_error.bind(null, url, prep.onError)).
      end();
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
