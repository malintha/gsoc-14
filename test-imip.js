/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var MODULE_NAME = 'test-imip';
var RELATIVE_ROOT = '../shared-modules';
var MODULE_REQUIRES = [
                    'folder-display-helpers',
                    'window-helpers',
                    'calendar-utils',
                    'compose-helpers',
                    'prompt-helpers'
                    ];
var calUtils = require('../shared-modules/calendar-utils');
const sleep = 500;
// Create the text/calendar attachment to be injected
const invitationAttachment = [
                            'BEGIN:VCALENDAR',
                            'PRODID:-//Inverse inc./SOGo 2.1.1b//EN',
                            'VERSION:2.0',
                            'CALSCALE:GREGORIAN',
                            'METHOD:REQUEST',
                            'BEGIN:VEVENT',
                            'DTSTART:20140515T050000',
                            'DTEND:20140515T063000',
                            'DTSTAMP:20140514T034846Z',
                            'RRULE:FREQ=3DYEARLY;BYMONTH=3D3;BYDAY=3D2SU',
                            'ORGANIZER;CN=Organizer:mailto:organizer@example.com',
                            'UID:576-53715980-1-5E904600',
                            'CLASS:PUBLIC',
                            'ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=Attendee1;X-NUM-GUESTS=0:mailto:attendee1@example.com',
                            'ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=TRUE;CN=Attendee2;X-NUM-GUESTS=0:mailto:attendee2@example.com',
                            'LOCATION:Earth',
                            'SEQUENCE:0',
                            'STATUS:CONFIRMED',
                            'SUMMARY:IMIP testing event',
                            'TRANSP:OPAQUE',
                            'CREATED:20140511T112534Z',
                            'END:VEVENT',
                            'END:VCALENDAR'].join('\n');

/**
 * initialize modules and inject the email with attachment
 */
function setupModule(module) {
    controller = mozmill.getMail3PaneController();
    let fdh = collector.getModule('folder-display-helpers');
    fdh.installInto(module);
    let ch = collector.getModule('compose-helpers');
    ch.installInto(module);
    let wh = collector.getModule('window-helpers');
    wh.installInto(module);
    collector.getModule('prompt-helpers') .installInto(module);
    folder = create_folder('ImipFolder');
    messenger = Components.classes['@mozilla.org/messenger;1'].createInstance(Components.interfaces.nsIMessenger);
    let msg = create_message({
        from: [
            'Organizer',
            'Organizer@example.com'
        ],
        to: [
            'Attendee1',
            'attendee1@example.com'
        ],
        subject: [
                'Invitation: TestingEvent @ Sun May 11, 2014 10am - 11am (Organizer@example.com)'
        ],
        body: {
            to: 'attendee1@example.com',
            body: '',
            subject: 'Customized: TestingEvent @ Sun May 11, 2014 10am - 11am'
        },
        attachments: [
            {
                from: [
                    'Organizer',
                    'Organizer@example.com'
                ],
                to: [
                    'Attendee1',
                    'attendee1@example.com'
                ],
                contentType: 'text/calendar',
                MIMEVersion: '1.0',
                method: 'REQUEST',
                messageId: 'CAGFBr6MY94cd_PFW5zxkAxjubHpW1OgsurjWdFKpZDmjh4VTaw@mail.example.com',
                charset: 'UTF-8',
                body: invitationAttachment,
                filename: 'invite.ics',
                format: ''
            }
        ]
    });
    add_message_to_folder(folder, msg);
}

/**
 * move to the folder, display the message and check whether IMIP bar accept button is showed up.
 */
function testAcceptREQUEST() {
    be_in_folder(folder);
    select_click_row(0);
    assert_selected_and_displayed(0);
    controller.sleep(sleep);
    let btnAccept = new elementslib.ID(controller.window.document, 'imipAcceptButton');
    gMockPromptService.register();
    //assert for existence of the accept button
    controller.assertNode(btnAccept);
    //to return the value for not send email notifications button on the dialog
    gMockPromptService.returnValue = 1;
    promptState = gMockPromptService.promptState;
    controller.click(btnAccept);
    gMockPromptService.unregister();
    // assert for existence of the details button
    controller.sleep(sleep);
    let btnDetails = new elementslib.ID(controller.window.document, 'imipDetailsButton');
    controller.assertNode(btnDetails);
}

/**
 *  check whether event is added to the right slot and assert to make sure properties remain the same.
 */
function testEvent() {
    let dayView = '/id("messengerWindow")/id("tabmail-container")/id("tabmail")/'
        + 'id("tabpanelcontainer")/id("calendarTabPanel")/id("calendarContent")/'
        + 'id("calendarDisplayDeck")/id("calendar-view-box")/id("view-deck")/id("day-view")';
    let dayStack = dayView + '/anon({"anonid":"mainbox"})/anon({"anonid":"scrollbox"})/'
        + 'anon({"anonid":"daybox"})/[0]/anon({"anonid":"boxstack"})/anon({"anonid":"topbox"})/'
        + '{"flex":"1"}';
    // check for the event injected by mail
    controller.click(new elementslib.ID(controller.window.document, 'calendar-tab-button'));
    calUtils.switchToView(controller, 'day');
    calUtils.goToDate(controller, 2014, 5, 15);
    // make sure event was added to the right position
    controller.assertNode(new elementslib.Lookup(controller.window.document, calUtils.getEventBoxPath(controller, 'day', calUtils.CANVAS_BOX, undefined, 1, 5)));
    // extract the event from the node to check whether startTime and endTime are correct
    let eventNode = (new elementslib.Lookup(controller.window.document, dayStack)).getNode();
    let eventNodes = new Array();
    // since we inject only one event, get the first node of the array
    calUtils.findEventsInNode(eventNode, eventNodes);
    let startTime = eventNodes[0].mOccurrence.startDate.nativeTime;
    let endTime = eventNodes[0].mOccurrence.endDate.nativeTime;
    // assert start and end times in native format
    assert_equals(startTime, '1400130000000000');
    assert_equals(endTime, '1400135400000000');

    controller.doubleClick(new elementslib.Lookup(controller.window.document, calUtils.getEventBoxPath(controller, 'day', calUtils.CANVAS_BOX, undefined, 1, 5)));
    controller.waitFor(function () {
        return mozmill.utils.getWindows('Calendar:EventSummaryDialog').length > 0
    }, sleep);
    let event = new mozmill.controller.MozMillController(mozmill.utils.getWindows('Calendar:EventSummaryDialog') [0]);
    // check title
    let title = new elementslib.ID(event.window.document, 'item-title');
    controller.assertValue(title, 'IMIP testing event');
    // check organizer
    let organizer = new elementslib.ID(event.window.document, 'item-organizer');
    controller.assertValue(organizer, 'Organizer');
    // check location
    let location = new elementslib.ID(event.window.document, 'item-location');
    controller.assertValue(location, 'Earth');
    // press escape to close Event-Summary-Dialog
    event.keypress(undefined, 'VK_ESCAPE', {
    });
    // cleanup the test
    gMockPromptService.register();
    gMockPromptService.returnValue = 1;
    calUtils.goToDate(controller, 2014, 5, 15);
    promptState = gMockPromptService.promptState;
    controller.keypress(new elementslib.ID(controller.window.document, 'day-view'), 'VK_DELETE', {
    });
    gMockPromptService.unregister();
}
