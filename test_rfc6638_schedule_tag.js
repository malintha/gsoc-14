/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

 Components.utils.import("resource://gre/modules/Promise.jsm");

 Components.utils.import("resource://testing-common/httpd.js");
 Components.utils.import("resource://gre/modules/NetUtil.jsm")
 Components.utils.import("resource://gre/modules/CSPUtils.jsm");
 Components.utils.import("resource://calendar/modules/calUtils.jsm");
 Components.utils.import("resource://gre/modules/FileUtils.jsm");

 Components.utils.import("resource:///modules/Services.jsm");
 Services.prefs.setBoolPref("javascript.options.showInConsole", true);
 Services.prefs.setBoolPref("browser.dom.window.dump.enabled", true);
 Services.prefs.setBoolPref("calendar.debug.log", true);
 Services.prefs.setBoolPref("calendar.debug.log.verbose", true);

 var currentScheduleTag;
 var currentEtag;
 const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n';
 var calItem;
 var attendItem;
 var calendar;
 var attenCalendar;
 var responseCounter = 0;
 var serverProperties = {
  port : 50001,
  name : "xpcshellServer"
};

var calDavProperties = {
  getctag : 1378022830,
  basePath : "http://localhost:"+serverProperties.port,
  calendarHomeSetset : "/calendar/",
  scheduleInboxURL : "/calendar/xpcshell",
  scheduleOutboxURL : "/calendar/xpcshell",
  userPrincipalHref : "/users/xpcshell/",

  icalString :      'BEGIN:VEVENT\n' + 
  'DTSTART:20140725T230000\n' +
  'DTEND:20140726T000000\n' +
  'LOCATION:Paris\n'+
  'TRANSP:OPAQUE\n'+
  'ORGANIZER;CN=Organizer Name;SENT-BY="mailto:malinthak2@gmail.com":mailto:malinthak2@gmail.com\n'+
  'ATTENDEE;CN=Attendee1 Name;PARTSTAT=NEEDS-ACTION;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;X-NUM-GUESTS=0:mailto:mozilla@kewis.ch\n'+
  'ATTENDEE;CN=Attendee2 Name;PARTSTAT=NEEDS-ACTION;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;X-NUM-GUESTS=0:mailto:attendee@example.com\n'+
  'END:VEVENT\n',
  itemID : "1b05e158-631a-445f-8c5a-5743b5a05169",
  supportedComps : ["VEVENT","VTODO"],
  //principal object resource is organizer's object resource
  userAddressSet : ["malinthak2@gmail.com"],
  //schedule-tag and etag of organizer's object resource
  getetag : 2314233447,
  scheduletag : 12345
};

//schedule-tag and etag of attendees' object resource
var attendee1 = {
  getctag : 1434568,
  basePath : "http://localhost:"+serverProperties.port,
  calendarHomeSetset : "/calendar/",
  scheduleInboxURL : "/calendar/attendee1",
  scheduleOutboxURL : "/calendar/attendee1",
  userPrincipalHref : "/users/attendee1/",
  itemID : "111111-631a-445f-8c5a-5743b5a05169",
  supportedComps : ["VEVENT","VTODO"],
  userAddressSet : ["mozilla@kewis.ch"],
  getetag : 1114233447,
  scheduletag : 23456
};

var attendee2 = {
  getetag : 2224233447,
  scheduletag : 34567
};

var resTemplate = {

  initPropfind : function initPropfind(request){
    responseCounter++;
    let targetUser;
    dump("responseCounter:"+responseCounter);

    if(responseCounter>2){
      attendee1.getctag = 63541198784;
    }

    if(request.path=="/calendar/xpcshell/"){
      targetUser = calDavProperties;
      dump("\ncalenarOrg:");
    }
    else{
      targetUser = attendee1;
      dump("\nattendeeCal:");
    }

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
    '           <D:href>'+targetUser.userPrincipalHref+'</D:href>\n' +
    '         </D:owner>\n' +
    '         <D:current-user-principal xmlns:D="DAV:">\n' +
    '           <D:href>'+targetUser.userPrincipalHref+'</D:href>\n' +
    '         </D:current-user-principal>\n' +
    '         <n1:supported-calendar-component-set xmlns:n1="urn:ietf:params:xml:ns:caldav" xmlns:D="DAV:">\n';

    for(let i=0; i<targetUser.supportedComps.length;i++){
      responseQuery += '<n1:comp name="'+targetUser.supportedComps[i]+'"/>\n';
    }
    responseQuery += '</n1:supported-calendar-component-set>\n' +
    '         <b:getctag>'+targetUser.getctag+'</b:getctag>\n' +
    '       </D:prop>\n' +
    '     </D:propstat>\n' +
    '   </D:response>\n' +
    ' </D:multistatus>';
    return responseQuery;
  },

  propPropfind : function propPropfind(request){
    dump("\npropPropfind\n");
    let tempItem;
    let targetUser;
    if(request.path=="/calendar/xpcshell/"){
      targetUser = calDavProperties;
      tempItem = item;
      dump("\ncalenarOrgReport:");
    }
    else{
      targetUser = attendee1;
      tempItem = item;
      tempItem.id = attendee1.itemID;
      dump("\nattendeeCalReport:");
    }

    item = createEventFromIcalString(calDavProperties.icalString);
    item.id = calDavProperties.itemID;

    let responseQuery = xmlHeader+"\n"+ 
    '   <D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">\n'+
    '     <D:response>\n'+
    '       <D:href>'+request.path+targetUser.itemID+'.ics</D:href>\n'+
    '         <D:propstat>\n'+
    '           <D:prop>\n'+
    '             <D:getetag>"'+targetUser.getetag+'"</D:getetag>\n'+
    '             <C:schedule-tag>"'+targetUser.scheduletag+'"</C:schedule-tag>\n'+
    '             <C:calendar-data>'+tempItem+'</C:calendar-data>\n'+
    '           </D:prop>\n'+
    '           <D:status>HTTP/1.1 200 OK</D:status>\n'+
    '         </D:propstat>\n'+
    '     </D:response>\n'+
    '   </D:multistatus>\n';
    return responseQuery;
  },

  reportPropfind : function reportPropfind(request){
    dump("\nreportPropfind\n");
    let tempItem;
    let targetUser;
    if(request.path=="/calendar/xpcshell/"){
      targetUser = calDavProperties;
      tempItem = item;
      dump("\ncalenarOrgReport:");
    }
    else{
      targetUser = attendee1;
      tempItem = item;
      tempItem.id = attendee1.itemID;
      dump("\nattendeeCalReport:");
    }

    let responseQuery = xmlHeader+"\n"+ 
    ' <D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">\n'+
    '   <D:response>\n'+
    '     <D:href>'+request.path+targetUser.itemID+'.ics</D:href>\n'+
    '     <D:propstat>\n'+
    '        <D:prop>\n'+
    '         <D:getetag>"'+targetUser.getetag+'"</D:getetag>\n'+
    '         <C:schedule-tag>"'+targetUser.scheduletag+'"</C:schedule-tag>\n'+
    '         <C:calendar-data>'+tempItem+
    '         </C:calendar-data>\n'+
    '        </D:prop>\n'+
    '        <D:status>HTTP/1.1 200 OK</D:status>\n'+
    '        </D:propstat>\n'+
    '   </D:response>\n'+
    ' </D:multistatus>\n';
    
    return responseQuery;
  },

  principalProperty : function principalProperty(request){
     dump("\nprincipalProperty:"+request.path+"\n");
    let targetUser;
    if(request.path=="/users/xpcshell/"){
      targetUser = calDavProperties;
      dump("\ncalenarOrgPrincipal:");
    }
    else{
      targetUser = attendee1;
      dump("\nattendeeCalPrincipal:");
    }


    let responseQuery = '<D:multistatus xmlns:a="urn:ietf:params:xml:ns:caldav" xmlns:D="DAV:">\n' +
    '  <D:response>\n' +
    '    <D:href>/calendar/xpcshell/</D:href>\n' +
    '    <D:propstat>\n' +
    '      <D:status>HTTP/1.1 200 OK</D:status>\n' +
    '      <D:prop>\n' +
    '        <a:calendar-home-set>\n' +
    '          <D:href xmlns:D="DAV:">'+targetUser.calendarHomeSetset+'</D:href>\n' +
    '        </a:calendar-home-set>\n' +
    '        <a:schedule-inbox-URL>\n' +
    '          <D:href xmlns:D="DAV:">'+targetUser.scheduleInboxURL+'</D:href>\n' +
    '        </a:schedule-inbox-URL>\n' +
    '        <a:schedule-outbox-URL>\n' +
    '          <D:href xmlns:D="DAV:">'+targetUser.scheduleOutboxURL+'</D:href>\n' +
    '        </a:schedule-outbox-URL>\n' +
    '        <a:calendar-user-address-set>\n';

    for (var i = 0; i < targetUser.userAddressSet.length; i++) {
     responseQuery += '<D:href xmlns:D="DAV:">mailto:'+targetUser.userAddressSet[i]+'</D:href>\n';
   }
   responseQuery += '</a:calendar-user-address-set>\n' +
   '      </D:prop>\n' +
   '    </D:propstat>\n' +
   '  </D:response>\n' +
   '</D:multistatus>';
      //dump("responseQuery\n"+responseQuery);
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
    //atendee handlers registration
    server.registerPathHandler("/calendar/attendee1/", initPropfindHandler);
    server.registerPathHandler("/calendar/attendee1/111111-631a-445f-8c5a-5743b5a05169.ics", createResourceHandler);
    server.registerPathHandler("/calendar/", calendarHandler);
    server.registerPathHandler("/users/attendee1/", principalHandler);

    server.registerPathHandler("/calendar/xpcshell/", initPropfindHandler);
    server.registerPathHandler("/calendar/xpcshell/1b05e158-631a-445f-8c5a-5743b5a05169.ics", createResourceHandler);
    server.registerPathHandler("/calendar/", calendarHandler);
    server.registerPathHandler("/users/xpcshell/",principalHandler);
    server.start(serverProperties.port);

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
  //get the string from caldavProperties
  let icalString = calDavProperties.icalString;

  calItem = createEventFromIcalString(icalString);
  calItem.id = calDavProperties.itemID;
  let calmgr = cal.getCalendarManager();

  //initialization of organizer calendar
  let calendarURL = calDavProperties.basePath+calDavProperties.scheduleInboxURL;
  dump("calendarURL:"+calendarURL);
  calendar = calmgr.createCalendar("caldav", Services.io.newURI(calendarURL, null, null));
  calendar.name="testCalendar";
  calmgr.registerCalendar(calendar);
  yield waitForInit(calendar);
  dump("yielded:calendar\n");
  //initialization of tendee calendar
  let attendeeCalURL = attendee1.basePath+attendee1.scheduleInboxURL;
  dump("attendeeCalURL:"+attendeeCalURL);
  attenCalendar = calmgr.createCalendar("caldav", Services.io.newURI(attendeeCalURL, null, null));
  attenCalendar.name = "attendeeCalendar";
  calmgr.registerCalendar(attenCalendar);
  yield waitForInit(attenCalendar);
  dump("yielded:attendeeCalendar");
  //organizer creates the event in his calendar
  yield promiseAddItem(calItem, calendar);
  dump("yielded:OrgpromiseAddItem");
  //server processes the event and automatically adds the item in attendee1's inbox
  attendItem = calItem.clone();
  attendItem.id = attendee1.itemID;
  yield promiseAddItem(attendItem,attenCalendar);
  dump("\nyielded:AttpromiseAddItem"+attendItem.id);

}

//now t is in the organizers calendar and attendee1's calendars. Organizer does a change to the event now.
//Since the change is not a partstat change, schedule tags should be changed and the change should be merged with
//attendee1's calendar.

add_task(function(){
  yield promise_org_ChangeEvent();
  dump("yieldedmodifyItem");
  yield promise_attendee1_assert();
});

var newItem=null;
function promise_org_ChangeEvent(){

  let deferred = Promise.defer(); 
  let oldItem = calItem;
  newItem = calItem.clone();
  newItem.title = "NewTitle";
  dump("xpcshell:"+calendar.name);
  dump("oldtem:"+oldItem.title+":ID:"+oldItem.id);
  dump("newItem:"+newItem.title+":ID:"+newItem.id);
  calendar.modifyItem(newItem,oldItem,{
    onOperationComplete: function checkModifiedItem(aCalendar, aStatus, aOperationType, aId, aitem) {
     dump("\nItem successfully modified on calendar "+aCalendar.name);
     do_execute_soon(function() {
        //retrieve the item on behalf of the organizer, as organizer is in the principal user list.
        //considering the schedule-tag
        calendar.getItem(aitem.id, retrieveItem);
        deferred.resolve(aStatus);
      });
   }
 });
  return deferred.promise;
}

let retrieveItem = {
  onGetResult: function(c, s, t, d, c, items) {
    dump("modifieditem:"+items[0].title);
    let modifieditem = items[0];
    let attendeesMod = modifieditem.getAttendees({});
    let attendeesOrig = newItem.getAttendees({});
       //check modified item properties
       do_check_eq(modifieditem.id,newItem.id);
       do_check_eq(modifieditem.title,newItem.title);
       do_check_eq(attendeesMod[0].id,attendeesOrig[0].id);
       do_check_eq(attendeesMod[0].isOrganizer,attendeesOrig[0].isOrganizer);
       do_check_eq(attendeesMod[0].role, attendeesOrig[0].role);
       do_check_eq(attendeesMod[1].id,attendeesOrig[1].id);
       do_check_eq(attendeesMod[1].isOrganizer,attendeesOrig[1].isOrganizer);
       do_check_eq(attendeesMod[1].role, attendeesOrig[1].role);
     },
    onOperationComplete: function() {}      
   };

//now event should retrieve from attendee1's calendar and assert it against changed event of organizer's
function promise_attendee1_assert(){
  dump("\ncameattendeeassert:ctag:"+attenCalendar.id);
  let deferred = Promise.defer(); 
  dump("\ncameattendeeassert:"+attendItem);
  attenCalendar.refresh();
  dump("get refreshed item");

  // attenCalendar.getItem(attendItem.id, {
  //        onGetResult: function onGetResult(cal, stat, type, detail, count, items) {
  //            retrievedItem = items[0];
  //            dump("\nitem:"+retrievedItem.title);
  //        },
  //        onOperationComplete: function() {
  //         deferred.resolve();
  //        }
  //      });
  deferred.resolve();
  return deferred.promise;
}

//handler for incoming requests to http://localhost:50001/calendar/event.ics
function createResourceHandler(request,response) {
  try {
    dump("In createResource Handler");
    //get the request and set the response data
    let is = request.bodyInputStream;
    let body = NetUtil.readInputStreamToString(is, is.available(),  { charset: "UTF-8" });
    item = body;
    let method = request.method;
    let matchheader="";

    if(request.hasHeader("If-None-Match")){
      matchheader = request.getHeader("If-None-Match");
    }

    else if(request.hasHeader("If-Schedule-Tag-Match")){
      dump("gotchca:");
      matchheader = request.getHeader("If-Schedule-Tag-Match");
    }

    dump(method+"||"+matchheader);
    dump("request body : "+body);
    //write the logic for creating resources
    if(method=="PUT" && matchheader=="*" && body){
      dump("GETFILE: 1\n");
      //creating resources and adding changes.
      let fileOrg = FileUtils.getFile("TmpD", ["1b05e158-631a-445f-8c5a-5743b5a05169.ics.org"]);
      let fileAtt1 = FileUtils.getFile("TmpD", ["111111-631a-445f-8c5a-5743b5a05169.ics.att1"]);
      let fileAtt2 = FileUtils.getFile("TmpD", ["1b05e158-631a-445f-8c5a-5743b5a05169.ics.att2"]);
      fileOrg.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, parseInt("0600", 8));
      fileAtt1.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, parseInt("0600", 8));
      fileAtt2.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, parseInt("0600", 8));

      writeToFile(fileOrg,body);
      writeToFile(fileAtt1,body);
      writeToFile(fileAtt2,body);
      response.setStatusLine(request.httpVersion, 201, "resource created");
      response.write("");
    }

    else if(method=="PUT" && matchheader == '"12345"'){
      dump("got scheduletag:");
        //update object resources. here organizer's and attendees resources should be changed and schedule-tags as well.
        // since this is a change not only containing a partstat change
        let fileOrg = FileUtils.getFile("TmpD", ["1b05e158-631a-445f-8c5a-5743b5a05169.ics.org"]);
        let fileAtt1 = FileUtils.getFile("TmpD", ["111111-631a-445f-8c5a-5743b5a05169.ics.att1"]);
        let fileAtt2 = FileUtils.getFile("TmpD", ["1b05e158-631a-445f-8c5a-5743b5a05169.ics.att2"]);

        writeToFile(fileOrg,body);
        writeToFile(fileAtt1,body);
        writeToFile(fileAtt2,body);

        calDavProperties.getetag++;
        //change the schedule tag of organizer object
        calDavProperties.scheduletag++;
        //now changing attendees schedule tags since resources are updated
        attendee1.scheduletag++;
        attendee2.scheduletag++;
        dump("new schedule-tag:"+calDavProperties.scheduletag);
        dump("newEtag:"+calDavProperties.getetag);
        response.setStatusLine(request.httpVersion, 200, "resource changed");
        response.write("");
      }
      else{
        response.setStatusLine(request.httpVersion, 400, "Bad Request");
      }
    } catch (e) {
      dump("\n\n#### EEE:" + e + e.fileName + e.lineNumber +"\n");
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
      if (request.method == "PROPFIND" && body.indexOf("current-user-prin") > -1) {
        dump("camehere1");
        let resText = resTemplate.initPropfind(request);
        response.setStatusLine(request.httpVersion, 207, "Multi-Status");
        response.setHeader("content-type","text/xml");
        response.write(resText);
      } 

      else if (request.method == "PROPFIND" && body.indexOf("getetag") > -1) {
        dump("camehere3");
        let resText = resTemplate.propPropfind(request);
        response.setStatusLine(request.httpVersion, 207, "Multi-Status");
        response.setHeader("content-type","text/xml");
        response.write(resText);
      } 

      else if (request.method=="REPORT") {
    //modified item request also comes here.
    dump("camehere4");
    let reportResText = resTemplate.reportPropfind(request);
    dump("camehere5:changed etag"+reportResText);
        //calDavRequestHandlers #759
        response.setStatusLine(request.httpVersion, 207, "Multi-Status");
        response.setHeader("content-type","text/xml");
        response.write(reportResText);
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
      response.setStatusLine(request.httpVersion, 200, "OK");
      response.setHeader("DAV", "1, 2, access-control, calendar-access, calendar-schedule, calendar-auto-schedule, calendar-proxy, calendar-query-extended, extended-mkcol, calendarserver-principal-property-search")
      response.write("");
    } else {
      dump("### GOT INVALID METHOD " + request.method + "\n");
      response.setStatusLine(request.httpVersion, 400, "Bad Request");
    }
  }

  function principalHandler(request, response) {
    dump("camehere6");
    if (request.method == "PROPFIND") {
      dump("\ncamehere7");

      let principalResText = resTemplate.principalProperty(request);
      dump("princtest");
      response.setStatusLine(request.httpVersion, 207, "Multi-Status");
      response.write(principalResText);
    } else {
      dump("### PRINCIPAL  HANDLER GOT INVALID METHOD " + request.method + "\n");
      response.setStatusLine(request.httpVersion, 400, "Bad Request");
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
    });
  }

