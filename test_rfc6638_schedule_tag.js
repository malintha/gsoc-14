/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

 Components.utils.import("resource://gre/modules/Promise.jsm");

 Components.utils.import("resource://testing-common/httpd.js");
 Components.utils.import("resource://gre/modules/NetUtil.jsm")
 Components.utils.import("resource://gre/modules/CSPUtils.jsm");
 Components.utils.import("resource://calendar/modules/calUtils.jsm");
 Components.utils.import("resource://gre/modules/FileUtils.jsm");

// TODO temporary logging
Components.utils.import("resource:///modules/Services.jsm");
Services.prefs.setBoolPref("javascript.options.showInConsole", true);
Services.prefs.setBoolPref("browser.dom.window.dump.enabled", true);
Services.prefs.setBoolPref("calendar.debug.log", true);
Services.prefs.setBoolPref("calendar.debug.log.verbose", true);

var fileContent=""; //using this temporary
var currentScheduleTag;
var currentEtag;
const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n';

var serverProperties = {
  port : 50001,
  name : "xpcshellServer"
};

var calDavProperties = {
  getctag : 1378022830,
  basePath : "http://localhost:5001/xpcshell",

  icalString :     "BEGIN:VEVENT\n" + 
        "           DTSTART:20140725T230000\n" +
        "           DTEND:20140726T000000\n" +
        "           LOCATION:Paris\n"+
        "           TRANSP:OPAQUE\n"+
        "           END:VEVENT",

  itemID : "1b05e158-631a-445f-8c5a-5743b5a05169",
  supportedComps : ["VEVENT","VTODO"],
  userPrincipalHref : "/users/xpcshell/",
  getetag : 2314233447,
  scheduletag : ""
};

var resTemplate = {

  initPropfind : function initPropfind(request){

    let responseQuery =  '<D:multistatus xmlns:a="urn:ietf:params:xml:ns:caldav" xmlns:b="http://calendarserver.org/ns/" xmlns:D="DAV:">\n' +
    '   <D:response>\n' +
    '    <D:href>' + request.path + '</D:href>\n' +
    '     <D:propstat>\n' +
    '       <D:status>HTTP/1.1 200 OK</D:status>\n' +
    '       <D:prop>\n' +
    '         <D:resourcetype>\n' +
    '           <D:collection/>\n' +
    '           <calendar xmlns="urn:ietf:params:xml:ns:caldav"/>\n' +
    '         </D:resourcetype>\n' +
    '         <D:owner xmlns:D="DAV:">\n' +
    '           <D:href>'+calDavProperties.userPrincipalHref+'</D:href>\n' +
    '         </D:owner>\n' +
    '         <D:current-user-principal xmlns:D="DAV:">\n' +
    '           <D:href>'+calDavProperties.userPrincipalHref+'</D:href>\n' +
    '         </D:current-user-principal>\n' +
    '         <n1:supported-calendar-component-set xmlns:n1="urn:ietf:params:xml:ns:caldav" xmlns:D="DAV:">\n';

    for(let a=0; a<calDavProperties.supportedComps.length;a++){
      responseQuery += '            <n1:comp name="'+calDavProperties.supportedComps[a]+'"/>\n';
    }

    responseQuery += '         </n1:supported-calendar-component-set>\n' +
    '         <b:getctag>'+calDavProperties.getctag+'</b:getctag>\n' +
    '       </D:prop>\n' +
    '     </D:propstat>\n' +
    '   </D:response>\n' +
    ' </D:multistatus>';
    return responseQuery;
  },

  propPropfind : function propPropfind(request){

    let item = createEventFromIcalString(calDavProperties.icalString);
    item.id = calDavProperties.itemID;

    let responseQuery = xmlHeader+"\n"+ 
    '   <D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">\n'+
    '     <D:response>\n'+
    '       <D:href>'+request.path+calDavProperties.itemID+'.ics</D:href>\n'+
    '         <D:propstat>\n'+
    '           <D:prop>\n'+
    '             <D:getetag>"'+calDavProperties.getetag+'"</D:getetag>\n'+
 // '             <C:schedule-tag>"'+scheduleTagGenerator("new")+'"</C:schedule-tag>\n'+
    '             <C:calendar-data>'+item+'</C:calendar-data>\n'+
    '           </D:prop>\n'+
    '           <D:status>HTTP/1.1 200 OK</D:status>\n'+
    '         </D:propstat>\n'+
    '     </D:response>\n'+
    '   </D:multistatus>\n';
    return responseQuery;
  },

  reportPropfind : function reportPropfind(request){

    let item = createEventFromIcalString(calDavProperties.icalString);
    item.id = calDavProperties.itemID;

    let responseQuery = xmlHeader+"\n"+ 
        '<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">\n'+
        '<D:response>\n'+
        '<D:href>'+request.path+calDavProperties.itemID+'.ics</D:href>\n'+
        '<D:propstat>\n'+
        '<D:prop>\n'+
        '<D:getetag>"'+calDavProperties.getetag+'"</D:getetag>\n'+
                             // '<C:schedule-tag>"'+scheduleTagGenerator("new")+'"</C:schedule-tag>\n'+
                             '<C:calendar-data>'+item+
                             '</C:calendar-data>\n'+
                             '</D:prop>\n'+
                             '<D:status>HTTP/1.1 200 OK</D:status>\n'+
                             '</D:propstat>\n'+
                             ' </D:response>\n'+
                             '</D:multistatus>\n';
  

    return responseQuery;
}
};


function registerFakeUMimTyp() {
  try {
    Services.dirsvc.get("UMimTyp", Components.interfaces.nsIFile);
  } catch (e) {
    Services.dirsvc.registerProvider({
      getFile: function(prop, persist) {
        if (prop == "UMimTyp") {
          var mimeTypes = Services.dirsvc.get("ProfD", Ci.nsIFile);
          mimeTypes.append("mimeTypes.rdf");
          return mimeTypes;
        }
        throw Components.results.NS_ERROR_FAILURE;
      }
    });
  }
}


function run_test() {
  do_get_profile();
  registerFakeUMimTyp();

    //start server
    var server = new HttpServer(); 
    server.registerPathHandler("/calendar/xpcshell/1b05e158-631a-445f-8c5a-5743b5a05169.ics", createResourceHandler);
    server.registerPathHandler("/calendar/", calendarHandler);
    server.registerPathHandler("/calendar/xpcshell/", initPropfindHandler);
    server.registerPathHandler("/users/xpcshell/",principalHandler);
    server.start(50001);

    do_register_cleanup(() => server.stop(() => {}));
    cal.getCalendarManager().startup({onResult: function() {
      run_next_test();
    }});
  }

  function waitForInit(calendar) {
    let deferred = Promise.defer();
    let caldavCheckSeverInfo = calendar.wrappedJSObject.completeCheckServerInfo;
    let wrapper = function(listener, error) {
      if (Components.isSuccessCode(error)) {
        deferred.resolve();
      } else {
        deferred.reject();
      }   
      calendar.wrappedJSObject.completeCheckServerInfo = caldavCheckServerInfo;
      caldavCheckServerInfo(listener, error);
    }; 
    calendar.wrappedJSObject.completeCheckServerInfo = wrapper;
    return deferred.promise;
  } 

  function promiseAddItem(item, calendar) {
    let deferred = Promise.defer();
    calendar.addItem(item, {
      onOperationComplete: function(aCalendar, aStatus, aOperationType, aId, aDetail) {
        dump("onOperationComplete:"+aCalendar.name+" "+aStatus+" "+aOperationType+" "+aId+" "+aDetail + "\n");
        deferred.resolve(aStatus);
      }
    });
    return deferred.promise;
  }


//method to create the item with calendar.addItem which is pointed to localhost
add_task(test_CreateResource);

function test_CreateResource(){
  dump("base"+calDavProperties.basePath);
  //get the string from caldavProperties
  let icalString = "BEGIN:VEVENT\n" + 
  "DTSTART:20140725T230000\n" +
  "DTEND:20140726T000000\n" +
  "LOCATION:Paris\n"+
  "TRANSP:OPAQUE\n"+
  "END:VEVENT";

  var item = createEventFromIcalString(icalString);
  item.id = "1b05e158-631a-445f-8c5a-5743b5a05169";
  let calmgr = cal.getCalendarManager();

  let calendar = calmgr.createCalendar("caldav", Services.io.newURI("http://localhost:50001/calendar/xpcshell", null, null));
  calendar.name="testCalendar";
  calmgr.registerCalendar(calendar);

  yield waitForInit(calendar);
  yield promiseAddItem(item, calendar);

}

//handler for incoming requests to http://localhost:50001/calendar/event.ics
function createResourceHandler(request,response) {
  try {
    dump("In createResource Handler");
    //get the request and set the response data
    let is = request.bodyInputStream;
    let body = NetUtil.readInputStreamToString(is, is.available(),  { charset: "UTF-8" });
    fileContent = body;
    let method = request.method;
    let matchheader = request.getHeader("If-None-Match");
    dump(method+"||"+matchheader);
    dump("request body : "+body);
    //write the logic for creating resources
    if(method=="PUT" && matchheader=="*" && body){
      dump("GETFILE: 1\n");
      let file = FileUtils.getFile("TmpD", ["1b05e158-631a-445f-8c5a-5743b5a05169.ics.tmp"]);
      file.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, parseInt("0600", 8));
        //this creates the file at /tmp/
        dump("file_created at : "+file.path);
        //deleting after the test should also implement. no method found
        writeToFile(file,body);
        response.setStatusLine(request.httpVersion, 201, "resource created");
        response.write("");
        //after this, there will be a sequence of requests. create those handlers :|
      } else{
        response.setStatusLine(request.httpVersion, 400, "Bad Request");
      }
    } catch (e) {
      dump("\n\n#### EEE: " + e + e.fileName + e.lineNumber +"\n");
    }
  }

  function initPropfindHandler(request,response){

    let body;
    try {
      let is = request.bodyInputStream;
      body = NetUtil.readInputStreamToString(is, is.available(),  { charset: "UTF-8" });
    } catch (e) {
      body = "";
    }

    dump("path:"+request.path+"method:"+request.method+"\n"+body);
    try {

    //problem at calDavRequestHandlers #984 this.calendar.addTargetCalendarItem
    //caldav #1116 this.mOfflineStorage.adoptItem(item, aListener);
    if (request.method == "PROPFIND" && body.indexOf("current-user-prin") > -1) {
        let resText = resTemplate.initPropfind(request);
        response.setStatusLine(request.httpVersion, 207, "Multi-Status");
        response.setHeader("content-type","text/xml");
        response.write(resText);
      } 

    else if (request.method == "PROPFIND" && body.indexOf("getetag") > -1) {
         let resText = resTemplate.propPropfind(request);
         response.setStatusLine(request.httpVersion, 207, "Multi-Status");
         response.setHeader("content-type","text/xml");
         response.write(resText);
   } 

   else if (request.method=="REPORT") {
        //let file = FileUtils.getFile("TmpD", ["event.ics.tmp"]);
        let resText = resTemplate.reportPropfind(request);
        response.setStatusLine(request.httpVersion, 207, "Multi-Status");
        response.setHeader("content-type","text/xml");
        response.write(resText);
        //saxParser throws fatal error on the response
      } else {
        dump("### GOT INVALID METHOD " + request.method + "\n");
        response.setStatusLine(request.httpVersion, 400, "Bad Request");
      }
    } catch (e) {
      dump("\n\n#### EEE: " + e + e.fileName + e.lineNumber +"\n");
    }
  }

  function calendarHandler(request,response){
    if (request.method == "OPTIONS") {
      response.setStatusLine(request.httpVersion, "200", "OK");
      response.setHeader("DAV", "1, 2, access-control, calendar-access, calendar-schedule, calendar-auto-schedule, calendar-proxy, calendar-query-extended, extended-mkcol, calendarserver-principal-property-search")
      response.write("");
    } else {
      dump("### GOT INVALID METHOD " + request.method + "\n");
      response.setStatusLine(request.httpVersion, 400, "Bad Request");
    }
  }

  function principalHandler(request, response) {
    if (request.method == "PROPFIND") {
      var respText = xmlHeader +
      '<D:multistatus xmlns:a="urn:ietf:params:xml:ns:caldav" xmlns:D="DAV:">\n' +
      '  <D:response>\n' +
      '    <D:href>/calendar/xpcshell/</D:href>\n' +
      '    <D:propstat>\n' +
      '      <D:status>HTTP/1.1 200 OK</D:status>\n' +
      '      <D:prop>\n' +
      '        <a:calendar-home-set>\n' +
      '          <D:href xmlns:D="DAV:">/calendar/</D:href>\n' +
      '        </a:calendar-home-set>\n' +
      '        <a:schedule-inbox-URL>\n' +
      '          <D:href xmlns:D="DAV:">/calendar/xpcshell</D:href>\n' +
      '        </a:schedule-inbox-URL>\n' +
      '        <a:schedule-outbox-URL>\n' +
      '          <D:href xmlns:D="DAV:">/calendar/xpcshell</D:href>\n' +
      '        </a:schedule-outbox-URL>\n' +
      '        <a:calendar-user-address-set>\n' +
      '          <D:href xmlns:D="DAV:">mailto:mozilla@kewis.ch</D:href>\n' +
      '          <D:href xmlns:D="DAV:">mailto:uni@kewis.ch</D:href>\n' +
      '          <D:href xmlns:D="DAV:">mailto:kewisch@kewis.ch</D:href>\n' +
      '          <D:href xmlns:D="DAV:">/SOGo/dav/kewisch/</D:href>\n' +
      '        </a:calendar-user-address-set>\n' +
      '      </D:prop>\n' +
      '    </D:propstat>\n' +
      '  </D:response>\n' +
      '</D:multistatus>';
      response.setStatusLine(request.httpVersion, 207, "Multi-Status");
      response.write(respText);
    } else {
      dump("### PRINCIPAL  HANDLER GOT INVALID METHOD " + request.method + "\n");
      response.setStatusLine(request.httpVersion, 400, "Bad Request");
    }
  }

  function scheduleTagGenerator(mode){
    var newScheduleTag;
    switch(mode) {
      case "new" : 
      newScheduleTag = 488177;
      currentScheduleTag = newScheduleTag;
      dump("mode:new"+currentScheduleTag);
      break;
      case "orgChange" :
      newScheduleTag = currentScheduleTag+1;
      dump("mode:orgChange"+currentScheduleTag);
      break;
      case "attChange" :
      newScheduleTag = currentScheduleTag;
      dump("mode:attChange"+currentScheduleTag);
      break;   
    }
    return newScheduleTag; 
  }
  function etagGenerator(mode){
    if(mode=="new") {
      currentEtag = 127876;
      return currentEtag;
    }
    if(mode=="change"){
      return currentEtag+1;
    } else {
      return currentEtag;
    }
  }

  function writeToFile(file,data){
    let ostream = FileUtils.openSafeFileOutputStream(file);
    let converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].
    createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
    converter.charset = "UTF-8";
    let istream = converter.convertToInputStream(data);
    NetUtil.asyncCopy(istream, ostream, function(status) {
      if (!Components.isSuccessCode(status)) {
        return;
      }
      // Data has been written to the file.
    });
  }

//this is not working
/*
function readFile(file, callback)
{
  dump("came"+file.path+file.exists());
let channel = NetUtil.newChannel(file);
 
 NetUtil.asyncFetch(channel, function(ainputStream, astatus) {
   ok(Components.isSuccessCode(astatus),"file was read successfully");
   let content = NetUtil.readInputStreamToString(ainputStream,
     ainputStream.available());
   callback(content);
 });
}
*/
