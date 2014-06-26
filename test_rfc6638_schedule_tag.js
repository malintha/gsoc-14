/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

 Components.utils.import("resource://testing-common/httpd.js");
 Components.utils.import("resource://gre/modules/NetUtil.jsm");
 Components.utils.import("resource://gre/modules/CSPUtils.jsm");
 Components.utils.import("resource://calendar/modules/calUtils.jsm");
 Components.utils.import("resource://gre/modules/FileUtils.jsm");

 function run_test() {
  // start server
  server = new HttpServer(); 
  server.registerPathHandler("/calendar/event.ics", createResourceHandler);
  server.start(50001);
  add_test(test_CreateResource());
  do_test_pending();
  run_next_test();

}

//method to create the item with calendar.addItem which is pointed to localhost
function test_CreateResource(){

 let icalString ="BEGIN:VEVENT\n" + 
 "DTSTART:20020402T114500Z\n" +
 "DTEND:20020402T124500Z\n" +
 "END:VEVENT\n";

 var createListener = {
  onOperationComplete: function(aCalendar,
    aStatus,
    aOperationType,
    aId,
    aDetail) {
    print("onOperationComplete:"+aCalendar.name+" "+aStatus+" "+aOperationType+" "+aId+" "+aDetail);

  }
};

var item = createEventFromIcalString(icalString);
item.id = "event";
let calmgr = cal.getCalendarManager();
print(item.id);

let calendar = calmgr.createCalendar("caldav", Services.io.newURI("http://localhost:50001/calendar", null, null));
calendar.name="testCalendar";
calendar.addItem(item, createListener);
print("event added");
//do_test_finished(); //uncomment this part to pass the test. commented to see log outputs.

}

//handler for incoming requests to http://localhost:50001/calendar/event.ics
function createResourceHandler(request,response){ 
  print("createResource Handler");
  //get the request and set the response data
  let is = request.bodyInputStream;
  let body = NetUtil.readInputStreamToString(is, is.available(),  { charset: "UTF-8" });
  let method = request.method;
  let matchheader = request.getHeader("If-None-Match");
  print(method+"||"+matchheader);
  print("request body : "+body);
  //write the logic for creating resources
  if(method=="PUT" && matchheader=="*" && body){
    var file = FileUtils.getFile("TmpD", ["event.ics.tmp"]);
    file.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, parseInt("0600", 8));
    //this createsTmpD the file at /tmp/
    print("file_created at : "+file.path);
    //deleting after the test should also implement. no method found
    writeToFile(file,body);
    response.setStatusLine(request.httpVersion, 201, "resource created");
    response.write("created");
    //after this, there will be a sequence of requests. create those handlers :|
  }
  else{
    response.setStatusLine(request.httpVersion, 400, "Bad Request");
  }

}

function writeToFile(file,data){
  var ostream = FileUtils.openSafeFileOutputStream(file);
  var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].
  createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
  converter.charset = "UTF-8";
  var istream = converter.convertToInputStream(data);
  NetUtil.asyncCopy(istream, ostream, function(status) {
    if (!Components.isSuccessCode(status)) {
      return;
    }
  // Data has been written to the file.
});
}
