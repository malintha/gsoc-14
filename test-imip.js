/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
//place this in mail/test/mozmill/calendar
//paste the calendar-utils in mail/test/mozmill/shared-modules

var Ci = Components.interfaces;
var Cc = Components.classes;
var Cu = Components.utils;
 
 
var MODULE_NAME = 'test-imip';
var RELATIVE_ROOT = '../shared-modules';
var MODULE_REQUIRES = ['folder-display-helpers',
                       'window-helpers','calendar-utils','compose-helpers','prompt-helpers','timezone-utils'];
var calUtils = require("../shared-modules/calendar-utils");
//var timezoneUtils = require("../shared-modules/timezone-utils");
var elib = {};
Cu.import('resource://mozmill/modules/elementslib.js', elib);
var EventUtils = {};
Cu.import('resource://mozmill/stdlib/EventUtils.js', EventUtils);
Cu.import("resource://gre/modules/Services.jsm");
 
var messenger;
var folder;
//calUtils=collector.getModule('calendar-utils');
var os = {};
Components.utils.import('resource://mozmill/stdlib/os.js', os);
 
const invitationAttachment = [
        "BEGIN:VCALENDAR",
        "PRODID:-//Inverse inc./SOGo 2.1.1b//EN",
				"VERSION:2.0",
				"CALSCALE:GREGORIAN",
				"METHOD:REQUEST",
        "BEGIN:VEVENT",
        "DTSTART:20140515T050000Z",
				"DTEND:20140515T063000Z",
				"DTSTAMP:20140514T034846Z",
				"RRULE:FREQ=3DYEARLY;BYMONTH=3D3;BYDAY=3D2SU",
        "ORGANIZER;CN=malintha Doe:mailto:malinthaf@wso2.com",
        "UID:576-53715980-1-5E904600",
        "CLASS:PUBLIC",
				"ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=Tinderbox;X-NUM-GUESTS=0:mailto:tinderbox@foo.invalid",
        "ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=TRUE;CN=John Doeo;X-NUM-GUESTS=0:mailto:john@foo.invalid",
        "LOCATION:",
				"SEQUENCE:0",
				"STATUS:CONFIRMED",
				"SUMMARY:wso2:event_test",
				"TRANSP:OPAQUE",
        "CREATED:20140511T112534Z",
        "END:VEVENT",
        "END:VCALENDAR"].join("\r\n");
 
function setupModule(module) {

  controller = mozmill.getMail3PaneController();
       
  let fdh = collector.getModule('folder-display-helpers');
  fdh.installInto(module);
  let ch = collector.getModule("compose-helpers");
  ch.installInto(module);
  let wh = collector.getModule('window-helpers');
  wh.installInto(module);
    
  collector.getModule("prompt-helpers").installInto(module);
  folder = create_folder('ImipFolder');
  messenger = Components.classes['@mozilla.org/messenger;1']
                        .createInstance(Components.interfaces.nsIMessenger);
 
  isWindows = '@mozilla.org/windows-registry-key;1' in Components.classes;

  let msg5 = create_message(
    {
    	from: ["malintha", "malinthaf@wso2.com"],
    	to:["Tinderbox","tinderbox@foo.invalid"],
    	subject:["Invitation: TestingEvent @ Sun May 11, 2014 10am - 11am (my.gsoc.mail@gmail.com)"],
    	body:{
							to:"tinderbox@foo.invalid",
    					body:"",
    					subject: "Customized: TestingEvent @ Sun May 11, 2014 10am - 11am"
    	},
    	attachments: [{ 
								    	from: ["malintha", "malinthaf@gmail.com"],
								    	to:["Tinderbox","tinderbox@foo.invalid"],
											contentType: 'text/calendar',
											MIMEVersion: '1.0',
											method:'REQUEST',
											messageId: 'CAGFBr6MY94cd_PFW5zxkAxjubHpW1OgsurjWdFKpZDmjh4VTaw@mail.gmail.com',
											charset: 'UTF-8',
    									body: invitationAttachment,
     	                filename: 'invite.ics',
                      format: ''
                      }]
    
    });
        
  	add_message_to_folder(folder, msg5);

}


function test_attachment_view_collapsed() {
	be_in_folder(folder);
  select_click_row(0);
  assert_selected_and_displayed(0);    
	controller.sleep(10000);
}

function testAcceptInjectedEvent(){
	/*
	 * This should click on the accept button. If it tries to send out automatically (happens if bydefault is on! though 	 
	 * it shouldn't be happened on the testing profile) it shows up the error of cannot send mail. Is there a way 
	 * to dismiss an error in mozmill? Keypress of enter is a solution.
	 */
		
	gMockPromptService.register();
	//ensure the accept button is available
	let btnAccept = new elementslib.ID(controller.window.document, "imipAcceptButton");
	controller.assertNode(btnAccept);
	try{
		controller.click(btnAccept);
		gMockPromptService.returnValue = false;
	}
	catch(e){
	controller.keypress(undefined, "VK_ENTER", {});
	}		
}

function InjectedEvent(){
	//check for the event injected by mail
	controller.click(new elementslib.ID(controller.window.document, "calendar-tab-button"));
 	calUtils.switchToView(controller, "day");
	calUtils.goToDate(controller, 2014, 5, 15);
	controller.sleep(1000);

	//make sure event was added to the right position
	controller.assertNode(new elementslib.Lookup(controller.window.document, calUtils.getEventBoxPath(controller,"day", calUtils.CANVAS_BOX,undefined, 1, 11)));
	}
	
function deleteInjectedEvent(){
	
	calUtils.goToDate(controller, 2014, 5, 15);
	controller.sleep(1000);
	controller.click(new elementslib.Lookup(controller.window.document, calUtils.getEventBoxPath(controller,"day", calUtils.CANVAS_BOX,undefined, 1, 11)));
	try{
  controller.keypress(new elementslib.ID(controller.window.document, "day-view"), "VK_DELETE", {});
  
  }
  catch(e){}
  controller.sleep(4000);
  let boxPath=calUtils.getEventBoxPath(controller,"day", calUtils.EVENT_BOX,undefined, 1, 11)+'/{"tooltip":"itemTooltip"}';
  controller.assertNodeNotExist(new elementslib.Lookup(controller.window.document,boxPath));

}

function CreateEvent(){
	/*
	 * Adding the event manually, due to error.
	 */
	controller.click(new elementslib.ID(controller.window.document, "calendar-tab-button"));
	//Documentation wrong: it's calUtils.switchToView(controller,"day");
	calUtils.switchToView(controller, "day");
	//goto date: documentation is wrong. it's function goToDate(controller, year, month, day);
	calUtils.goToDate(controller, 2014, 5, 11);
	controller.sleep(500);
	let eventTime = calUtils.getEventBoxPath(controller,"day", calUtils.CANVAS_BOX, undefined, 1, 10);
	let clickEvent = new elementslib.Lookup(controller.window.document,eventTime)
	controller.doubleClick(clickEvent);
	controller.waitForEval('utils.getWindows("Calendar:EventDialog").length > 0', 2000);
	let event = new mozmill.controller.MozMillController(mozmill.utils.getWindows("Calendar:EventDialog")[0]);
	controller.sleep(500);	
	event.click(new elementslib.ID(event.window.document, "button-save"));
	controller.sleep(500);
	}

function CreatedEvent(){
 	controller.click(new elementslib.ID(controller.window.document, "calendar-tab-button"));
 	calUtils.switchToView(controller, "day");
	calUtils.goToDate(controller, 2014, 2, 5);
	let addedEvent = calUtils.getEventBoxPath(controller,"day", calUtils.CANVAS_BOX,undefined, 1, 10);
	controller.assertNode(new elementslib.Lookup(controller.window.document, addedEvent));
}

function deleteCreatedEvent(){
	calUtils.switchToView(controller, "day");
	calUtils.goToDate(controller, 2014, 2, 5);
	controller.click(new elementslib.Lookup(controller.window.document, calUtils.getEventBoxPath(controller,"day", calUtils.CANVAS_BOX,undefined, 1, 10)));
  controller.keypress(new elementslib.ID(controller.window.document, "day-view"), "VK_DELETE", {});
  let boxPath = calUtils.getEventBoxPath(controller,"day", calUtils.EVENT_BOX,undefined, 1, 10)+'/{"tooltip":"itemTooltip"}';
  controller.assertNodeNotExist(new elementslib.Lookup(controller.window.document, boxPath));
}


