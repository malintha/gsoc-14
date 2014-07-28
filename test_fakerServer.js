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
    this.httpServer.registerPathHandler('/', this.prefixHandler);
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
        dump("\n### prefixHandler");
        let is = request.bodyInputStream;
        let body = NetUtil.readInputStreamToString(is, is.available(), {
            charset: 'UTF-8'
        });
        try {
            if(request.path == this._propertyBag.scheduleInboxURL){
                //PUT requests to /event.ics and PROPFIND,REPORT to / come here ---------------------------------
                this.initPropfindHandler(this,body,request,response);
            }
            else if (request.path == this._propertyBag.calendarHomeSetset){
                this.calendarHandler(this,body,request,response);
            }
            else if(request.path == this._propertyBag.userPrincipalHref){
                let responseText = this.principalHandler(this,body,request,response);
            }
            else {
                dump("###Recieved unidentified request : "+request.path+"\n"+body);
                response.setStatusLine(request.httpVersion, 400, 'Bad Request');
            }

        } catch (e) {
            dump('\n\n#### EEE: ' + e + e.fileName + e.lineNumber + '\n');
        }
     },
        
    initPropfind: function initPropfind(x,body,request,response) {
        //resolve the scope problem
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
       let a = this.initPropfind('a','b');
       dump("\n\n###"+a);
    }

};

function sogo() {
    this._propertyBag = {
        name: 'sogo',
        id: 'calendar1',
        calendarHomeSetset: '/calendar/',
        scheduleInboxURL: '/calendar/xpcshell',
        scheduleOutboxURL: '/calendar/xpcshell',
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
            '       <D:href>' + this._propertyBag.scheduleInboxURL+{itemId} + '.ics</D:href>\n' +
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
            '   </D:multistatus>\n',
        
}

sogo.prototype = new fakeServer();

var sogoObj = new sogo();
sogoObj.id = "Sogo1";

function run_test() {
    sogoObj.init(sogoObj._propertyBag.scheduleInboxURL);
    dump("### Server "+sogoObj.id+" started on "+sogoObj.getLocalPort());
    do_test_pending();
    // do_get_profile();
    // registerFakeUMimTyp();
    //   //start server
    //   var server = new HttpServer();
    //   server.registerPathHandler("/calendar/xpcshell/1b05e158-631a-445f-8c5a-5743b5a05169.ics", createResourceHandler); ----
    //   server.registerPathHandler("/calendar/", calendarHandler);
    //   server.registerPathHandler("/calendar/xpcshell/", initPropfindHandler);   --------------------------------------------
    //   server.registerPathHandler("/users/xpcshell/",principalHandler);
    //   server.start(serverProperties.port);
    //   do_register_cleanup(() => server.stop(() => {}));
    //   cal.getCalendarManager().startup({onResult: function() {
    //     run_next_test();
    //   }});
}
