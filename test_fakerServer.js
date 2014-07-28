/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
Components.utils.import('resource://gre/modules/Promise.jsm');
Components.utils.import('resource://testing-common/httpd.js');
Components.utils.import('resource://gre/modules/NetUtil.jsm')
Components.utils.import('resource://gre/modules/CSPUtils.jsm');
Components.utils.import('resource://calendar/modules/calUtils.jsm');
Components.utils.import('resource://gre/modules/FileUtils.jsm');
Components.utils.import('resource:///modules/Services.jsm');
Services.prefs.setBoolPref('javascript.options.showInConsole', true);
Services.prefs.setBoolPref('browser.dom.window.dump.enabled', true);
Services.prefs.setBoolPref('calendar.debug.log', true);
Services.prefs.setBoolPref('calendar.debug.log.verbose', true);

function fakeServer() {
    this.id = '';
    this._propertyBag = null;
    this._responseTemplates = null;
    this.httpServer = new HttpServer();
    this.httpServer.start(50002);
    this.localPort = this.httpServer.identity.primaryPort;
    this.httpServer.registerPrefixHandler('/', this.prefixHandler);
    //handlers
//     this.httpServer.registerPathHandler("/calendar/xpcshell/1b05e158-631a-445f-8c5a-5743b5a05169.ics", createResourceHandler);

}

fakeServer.prototype = {
    
    init: function init_storage_calendar(scheduleInboxURL) {
        this.serverCalmgr = cal.getCalendarManager();
        this.calUrl = "http://localhost"+this.localPort+scheduleInboxURL;
        this.storage = this.serverCalmgr.createCalendar("memory", Services.io.newURI(this.calUrl, null, null));
        
    },

    getLocalPort: function get_LocalPort() {
        return this.httpServer.identity.primaryPort;
    },
    
    prefixHandler: function main_PrefixHandler(request, response) {
        fakeServer.prototype.test();
        response.processAsync();
        dump("\n### prefixHandler"+ (request.path)+" $$ "+sogoObj._propertyBag.scheduleInboxURL);  
        dump("\n### prefixHandler"+ (request.path == sogoObj._propertyBag.scheduleInboxURL));       
        try {
            if(request.path == sogoObj._propertyBag.scheduleInboxURL){
                //PUT requests to /event.ics and PROPFIND,REPORT to / come here ---------------------------------
                dump("##came");
                fakeServer.prototype.test();
                fakeServer.prototype.initPropfind(request,response);
            }
            else if (request.path == sogoObj._propertyBag.calendarHomeSetset){
                fakeServer.prototype.calendarHandler(request,response);
            }
            else if(request.path == sogoObj._propertyBag.userPrincipalHref){
                let responseText = this.principalHandler(request,response);
            }
            else {
                dump("###Recieved unidentified request : "+request.path+"\n"+body);
                response.setStatusLine(request.httpVersion, 400, 'Bad Request');
                response.write("<h1>"+request.path+"</h1>");
                response.finish()
            }

        } catch (e) {
            dump('\n\n#### EEE: ' + e + e.fileName + e.lineNumber + '\n');
        }
     },
        
    initPropfind: function initPropfind(request,response) {
        //resolve the scope problem
        let is = request.bodyInputStream;
        let body = NetUtil.readInputStreamToString(is, is.available(), {
            charset: 'UTF-8'
        });
        
        dump('initPropfind '+request.method+" : "+body);
        try {
            if (request.method == 'PROPFIND' && body.indexOf('current-user-prin') > -1){
                response.setStatusLine(request.httpVersion, 207, 'Multi-Status');
                response.setHeader('content-type', 'text/xml');
                response.write(sogoObj._responseTemplates._initPropfind);
                response.finish();
            }
            else if (request.method == 'PROPFIND' && body.indexOf('getetag') > -1) {
                response.setStatusLine(request.httpVersion, 207, 'Multi-Status');
                response.setHeader('content-type', 'text/xml');
                response.write(sogoObj._responseTemplates._calDataPropfind);
            }
            else if (request.method == 'REPORT') {
                response.setStatusLine(request.httpVersion, 207, 'Multi-Status');
                response.setHeader('content-type', 'text/xml');
                response.write(sogoObj._responseTemplates.reportPropfind);
            }
            else if (request.method == 'PUT') {
                sogoObj.storage.addItem();

            }
            else {
                dump('### GOT INVALID METHOD ' + request.method + '\n');
                response.setStatusLine(request.httpVersion, 400, 'Bad Request');
                response.finish();
            }
        }
        catch (e) {
            dump('\n\n#### EEE: ' + e + e.fileName + e.lineNumber + '\n');
        }
    },
    
    calendarHandler: function calendarHandler(x,request) {
        let response = sogoObj._responseTemplates._options;
        return response;
    },
    
    test: function test(){
       dump("\n\n###");
    }

};

function sogo() {
    this._propertyBag = {
        name: 'sogo',
        id: 'calendar1',
        calendarHomeSetset: '/calendar/',
        scheduleInboxURL: '/calendar/xpcshell/',
        scheduleOutboxURL: '/calendar/xpcshell/',
        userPrincipalHref: '/users/xpcshell/',
        ctag: '123456',
        supportedComps: ['VEVENT',
                         'VTODO'
                        ],
        userAddressSet: ['user0@example.com',
                         'user1@example.com',
                         'user2@example.com',
                         'user3@example.com'
                        ],
    },

    this._responseTemplates = {       
        _initPropfind: '<?xml version="1.0" encoding="UTF-8"?>\n'+
            '<D:multistatus xmlns:a="urn:ietf:params:xml:ns:caldav" xmlns:b="http://calendarserver.org/ns/" xmlns:D="DAV:">\n' +
            '   <D:response>\n' +
            '    <D:href>' + this._propertyBag.scheduleInboxURL + '</D:href>\n' +
            '     <D:propstat>\n' +
            '       <D:status>HTTP/1.1 200 OK</D:status>\n' +
            '       <D:prop>\n' +
            '         <D:resourcetype>\n' +
            '           <D:collection/>\n' +
            '           <calendar xmlns="urn:ietf:params:xml:ns:caldav"/>\n' +
            '         </D:resourcetype>\n' +
            '         <D:owner xmlns:D="DAV:">\n' +
            '           <D:href>' + this._propertyBag.userPrincipalHref + '</D:href>\n' +
            '         </D:owner>\n' +
            '         <D:current-user-principal xmlns:D="DAV:">\n' +
            '           <D:href>' + this._propertyBag.userPrincipalHref + '</D:href>\n' +
            '         </D:current-user-principal>\n' +
            '         <n1:supported-calendar-component-set xmlns:n1="urn:ietf:params:xml:ns:caldav" xmlns:D="DAV:">\n' +
            '            <n1:comp name="' + this._propertyBag.supportedComps[0] + '"/>\n'+
            '            <n1:comp name="' + this._propertyBag.supportedComps[1] + '"/>\n' +
            '         </n1:supported-calendar-component-set>\n' +
            '         <b:getctag>' + this._propertyBag.ctag + '</b:getctag>\n' +
            '       </D:prop>\n' +
            '     </D:propstat>\n' +
            '   </D:response>\n' +
            ' </D:multistatus>',
        
        _calDataPropfind: '<?xml version="1.0" encoding="UTF-8"?>\n'+
            '   <D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">\n' +
            '     <D:response>\n' +
            '       <D:href>' + this._propertyBag.scheduleInboxURL+'{itemId}' + '.ics</D:href>\n' +
            '         <D:propstat>\n' +
            '           <D:prop>\n' +
            '             <D:getetag>"' /*get the etag from server calendar*/ + '"</D:getetag>\n' +
         // '             <C:schedule-tag>"'+scheduleTagGenerator("new")+'"</C:schedule-tag>\n'+
            //get the item from the calendar and append the icalString
            '             <C:calendar-data>'/* + item */+ '</C:calendar-data>\n' +
            '           </D:prop>\n' +
            '           <D:status>HTTP/1.1 200 OK</D:status>\n' +
            '         </D:propstat>\n' +
            '     </D:response>\n' +
            '   </D:multistatus>\n'  
}
}

sogo.prototype = new fakeServer();

var sogoObj = new sogo();
sogoObj.id = "Sogo1";








function run_test() {
    
    sogoObj.init(sogoObj._propertyBag.scheduleInboxURL);
    dump("### Server "+sogoObj.id+" started on "+sogoObj.getLocalPort());
    
    //create client calendar
    do_get_profile();
    registerFakeUMimTyp();
    
    do_register_cleanup(() => sogoObj.httpServer.stop(() => {}));
    cal.getCalendarManager().startup({onResult: function() {
        run_next_test();
    }});
}

var client = {
    icalString :    'BEGIN:VEVENT\n' +
                    'DTSTART:20140725T230000\n' +
                    'DTEND:20140726T000000\n' +
                    'LOCATION:Paris\n'+
                    'TRANSP:OPAQUE\n'+
                    'ORGANIZER;CN=Organizer Name;SENT-BY="mailto:malinthak2@gmail.com":mailto:malinthak2@gmail.com\n'+
                    'ATTENDEE;CN=Attendee1 Name;PARTSTAT=NEEDS-ACTION;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;X-NUM-GUESTS=0:mailto:mozilla@kewis.ch\n'+
                    'ATTENDEE;CN=Attendee2 Name;PARTSTAT=NEEDS-ACTION;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;X-NUM-GUESTS=0:mailto:attendee@example.com\n'+
                    'END:VEVENT\n',
    itemID : "1b05e158-631a-445f-8c5a-5743b5a05169",
    //schedule-tag and etag of organizer's object resource
    getetag : 2314233447,
    scheduletag : 12345
};

add_task(test_doFakeServer);


function test_doFakeServer(){
    
  let icalString = client.icalString;
  var item = createEventFromIcalString(icalString);
  item.id = client.itemID;
  let calmgr = cal.getCalendarManager();
  let calendarURL = 'http://localhost:'+sogoObj.getLocalPort()+sogoObj._propertyBag.scheduleInboxURL;
  dump(calendarURL);
  let calendar = calmgr.createCalendar("caldav", Services.io.newURI(calendarURL, null, null));
  calendar.name="testCalendar";
  calmgr.registerCalendar(calendar);
  dump('registerCalendar');
  yield waitForInit(calendar);
  dump('waitForInit');
}


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
