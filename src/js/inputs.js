import calendars from './calendars';
import data from './data';
import events from './events';
import history from './history';
import panel from './panel';
import selection from './selection';
import ui from './ui';

export default {
    capsLockIsDown: false,
    isMouseDown: false,

    init() {
        // Store mouseclick status
        $(document).on('mousedown', () => { this.isMouseDown = true; });
        $(document).on('mouseup', () => { this.isMouseDown = false; });

        // Shortcuts
        $(document).on('keydown', e => {
            // Capture caps lock
            if (e.which === 20) this.capsLock(e.originalEvent.getModifierState('CapsLock'));

            if (e.which === 27 && $('.event.new').length) selection.cancelDraw(); // Escape new event

            // Disable custom shortcuts when editing a contenteditable
            if ($(e.target).is('[contenteditable]')) return;

            const ctrlOrMeta = e.metaKey || e.ctrlKey;

            if ([37, 38, 39, 40].includes(e.which)) {                             // Arrow keys
                // Prevent scroll
                e.preventDefault();

                if (panel.isOpen) return;

                if (ctrlOrMeta && [38, 40].includes(e.which)) {
                    if (e.which === 38) calendars.selectPreviousCalendar();       // Cmd + up
                    if (e.which === 40) calendars.selectNextCalendar();           // Cmd + down
                } else {
                    selection.moveSelection(e);                                   // Cmd + right/left
                }
            }
            else if (e.which === 18 && this.isMouseDown) selection.dragSelect(e); // Alt + click
            else if (ctrlOrMeta && e.which === 8) {                               // Cmd + backspace
                const $calendar = $('.calendars-wrap .calendar.selected');
                calendars.deleteCalendar($calendar);
            }
            else if (e.which === 8) selection.emptySelection();                   // Backspace
            else if (e.which === 27) {                                            // Esc
                if (panel.isOpen) panel.closePanel();
                else selection.narrowSelection();
            }
            else if (ctrlOrMeta && e.which === 65) selection.selectAll();         // Cmd + A
            else if (ctrlOrMeta && e.which === 67) selection.copySelection();     // Cmd + C
            else if (ctrlOrMeta && e.which === 68) {                              // Cmd + D
                const $calendar = $('.calendars-wrap .calendar.selected');
                calendars.duplicateCalendar($calendar);
                return false;
            }
            else if (ctrlOrMeta && e.which === 72) {                              // Cmd + H
                const $calendar = $('.calendars-wrap .calendar.selected');
                calendars.toggleCalendar($calendar);
                return false;
            }
            else if (ctrlOrMeta && e.which === 75) data.clear();                  // Cmd + K
            else if (ctrlOrMeta && e.which === 83) return data.save(true);        // Cmd + S
            else if (ctrlOrMeta && e.which === 86) selection.pasteSelection();    // Cmd + V
            else if (ctrlOrMeta && e.which === 88) selection.cutSelection();      // Cmd + X
            else if (ctrlOrMeta && e.which === 90) {                              // Cmd + Z
                e.preventDefault();
                if (e.shiftKey) history.redo();
                else history.undo();
            }
            else if (e.which === 68) ui.changeTool('draw');                       // D
            else if (e.which === 70) ui.fullView();                               // F
            else if (e.which === 76) ui.linearView();                             // L
            else if (e.which === 83) ui.changeTool('select');                     // S
        });

        // Enter key in contenteditable: blur
        $(document).on('keypress', '[contenteditable]', e => {
            if (e.which === 13) {
                const $el = $(e.target);
                $el.blur();

                // If leaving an event title, remove contenteditable
                if ($el.is('.title')) $el.removeAttr('contenteditable');

                // Remove selection if any
                window.getSelection().removeAllRanges();

                // Prevent panel opening
                return false;
            }
        });

        $(document).on('keyup', e => {
            if (e.which === 18 && this.isMouseDown) selection.dragSelect(e);

            // Capture caps lock (unlock)
            else if (e.which === 20) this.capsLock(e.originalEvent.getModifierState('CapsLock'));
        });

        // // Click on contenteditable: select all
        // $(document).on('click', '[contenteditable]', e => {
        //     document.execCommand('selectAll', false, null);
        // });

        // // Tab to contenteditable: select all
        // $(document).on('keyup', '[contenteditable]', e => {
        //     if (e.which === 9) document.execCommand('selectAll', false, null);
        // });
    },

    capsLock(isDown) {
        // Save status
        this.capsLockIsDown = isDown;

        if (isDown) {
            $('.calendars-wrap').addClass('edit-all');
            $('nav [data-tool="edit-all"]').addClass('checked');
        } else {
            $('.calendars-wrap').removeClass('edit-all');
            $('nav [data-tool="edit-all"]').removeClass('checked');
        }
    }
}