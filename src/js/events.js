import calendars from './calendars';
import data from './data';
import dates from './dates';
import events from './events';
import history from './history';
import selection from './selection';
import settings from './settings';
import stats from './stats';

export default {
    data: [],
    eventID: -1,
    type: -1,

    init() {
        // Add new event
        $(document).on('click', '.events-wrap .add', () => {
            this.newEvent();
            return false;
        });

        // Rename event
        $(document).on('input', '.events-wrap ul span', e => {
            const $el = $(e.target);
            this.renameEvent($el);
        });

        // Insert event instances
        $(document).on('click', '.events-wrap ul li', e => {
            const $el = $(e.target);
            if ($el.is('.tools') || $el.parents().is('.tools')) return;

            const $event = $el.closest('li');
            this.insertEvent($event);
        });

        // Open dropdown menu
        $(document).on('click', '.events-wrap ul li [data-tool="dropdown"]', e => {
            // Close any open dropdown menu
            $('.dropdown.visible').removeClass('visible');
            $('#color-swatch').removeClass('visible');

            const $dropdown = $(e.target).closest('li').find('.dropdown');
            $dropdown.toggleClass('visible');
            e.stopPropagation();
        });

        // Click outside
        $(document).on('click', e => {
            if ($(e.target).is('#color-swatch')) return;

            // Close dropdown menu
            $('.dropdown.visible').removeClass('visible');
            $('#color-swatch').removeClass('visible');

            if ($(e.target).parents().is('[data-tool="dropdown"], .dropdown')) return;

            // Remove contenteditable attr
            $('.events-wrap ul li .title[contenteditable]').removeAttr('contenteditable');
        });

        // Rename event
        $(document).on('click', '.events-wrap ul li [data-tool="rename"]', e => {
            const $title = $(e.target).closest('li').find('span.title');
            $title.attr('contenteditable', 'true').focus();

            const setEndOfContenteditable = (contentEditableElement) => {
                let range = document.createRange();
                range.selectNodeContents(contentEditableElement);
                range.collapse(false);
                let selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            }

            setEndOfContenteditable($title[0]);

            // Close dropdown menu
            $('.dropdown.visible').removeClass('visible');

            // Prevent li click
            return false;
        });

        // Open color swatch
        $(document).on('click', '.events-wrap ul li [data-tool="color"]', e => {
            const $el = $(e.target.closest('li'));

            // Select current event color
            $('#color-swatch .color.selected').removeClass('selected');
            $($('#color-swatch .color').toArray().find(c => $(c).css('background-color') === $el.css('background-color'))).addClass('selected');

            // Open swatch
            $('#color-swatch')
            .css({
                'top': $el.position().top + $el.outerHeight(),
                'left': $el.position().left
            })
            .addClass('visible')
            .attr('data-type', $el.attr('data-type'));

            // Close dropdown
            $('.dropdown.visible').removeClass('visible');

            return false;
        });

        // Change event color
        $(document).on('click', '#color-swatch .color', e => {
            const $color = $(e.target);
            const eventType = parseInt($('#color-swatch').attr('data-type'));

            // Select color
            $('#color-swatch .color.selected').removeClass('selected');
            $color.addClass('selected');

            // Update event, occurences and stats
            const color = $color.attr('data-color');
            $(`.events-wrap ul li[data-type="${eventType}"], .event[data-type="${eventType}"]`).attr('data-color', color);
            $(`.stat[data-type="${eventType}"] .event-icon`).attr('data-color', color);

            // Update data
            this.data.find(e => e.type === eventType).color = parseInt($color.attr('data-color'));
            data.save();

            return false;
        });

        // Delete event
        $(document).on('click', '.events-wrap ul li [data-tool="delete"]', e => {
            const $el = $(e.target).closest('li');
            const type = parseInt($el.attr('data-type'));
            $el.remove();
            this.removeEventsByType(type);
            stats.update();

            // Update data
            const event = this.data.find(e => e.type === type);
            this.data.splice(this.data.indexOf(event), 1);
            data.save();
        });

        // // Selected event
        // $(document).on('mousedown', '.events-wrap ul li', e => {
        //     $('.events-wrap ul li.selected').removeClass('selected');
        //     $(e.target).closest('li').addClass('selected');
        // });

        for (const [i, color] of settings.eventsColors.entries()) {
            $('#color-swatch').append(`<div class="color" data-color="${i}" style="background-color: ${color}"></div>`);
        }
    },

    newEvent(events) {
        if (!Array.isArray(events)) events = [events];

        for (const event of events) {
            this.type++;
            const type = event && event.type ? event.type : this.type;
            const li = `<li data-type="${type}" class="sortable" style="background-color: ${event && !isNaN(event.color) ? settings.eventsColors[event.color] : settings.eventsColors[type]}">
                <span class="title" ${!event ? 'contenteditable' : ''} spellcheck="false">${event && event.title ? event.title : ''}</span>
                <span class="tools">
                    <i class="fas fa-angle-down" data-tool="dropdown"></i>
                    <i data-tool="sort">⋮⋮</i>
                    <span class="dropdown">
                        <span data-tool="rename"><i class="fas fa-pen"></i> Rename</span>
                        <span data-tool="color"><i class="fas fa-palette"></i> Change color</span>
                        <span data-tool="delete"><i class="far fa-trash-alt"></i> Delete</span>
                    </span>
                </span>
            </li>`;

            const $ul = $('.events-wrap ul');
            $ul.append(li);

            // Select new event
            $ul.find('li.selected').removeClass('selected');
            $ul.find('li:last-child').addClass('selected');

            // Focus span if empty
            if (!event) $ul.find('li:last-child .title').focus();

            // Save data
            this.data.push({
                ...event,
                type
            });
        }

        stats.update();
    },

    renameEvent($el) {
        const val = $el.text();
        const type = parseInt($el.closest('li').attr('data-type'));

        $(`.event[data-type="${type}"] span`).text(val);

        // Update data
        this.data.find(e => e.type === type).title = val;

        stats.update();
        data.save();
    },

    insertEvent($event) {
        const type = parseInt($event.attr('data-type'));
    
        const selectedDaysEvents = selection.selectedDays.map(d => {
            const date = dates.toString(d);
            return $(`.calendar-wrap .day[data-date="${date}"] .event`).attr('data-type');
        });
    
        if (settings.oneEventPerDay && selectedDaysEvents.every(e => e === type)) {
            // If only one event per day and same type, remove event and don't recreate one
            for (const day of selection.selectedDays) {
                const date = dates.toString(day);

                // Edit all calendars or only selected one
                let $events;
                if ($('.calendars-wrap').hasClass('edit-all')) {
                    $events = $(`.day[data-date="${date}"] .event`);
                } else {
                    $events = $(`.calendars-wrap .calendar.selected .day[data-date="${date}"] .event, .calendar-wrap .day[data-date="${date}"] .event`);
                }

                $events.remove();
            }
        } else {
            const action = {
                type: 'addEvents',
                events: []
            };
    
            for (const day of selection.selectedDays) {
                const date = dates.toString(day);

                // Edit all calendars or only selected one
                let $events;
                if ($('.calendars-wrap').hasClass('edit-all')) {
                    $events = $(`.day[data-date="${date}"] .event`);
                } else {
                    $events = $(`.calendars-wrap .calendar.selected .day[data-date="${date}"] .event, .calendar-wrap .day[data-date="${date}"] .event`);
                }

                // Remove existing event if one event per day only
                if (settings.oneEventPerDay) $events.remove();
                    
                const $day = $(`.calendar-wrap .day[data-date="${date}"]`);
                
                const event = {
                    id: ++this.eventID,
                    calendar: parseInt($('.calendars-wrap .calendar.selected').attr('data-id')),
                    type: type,
                    // title: $event.find('.title').text(),
                    // color: $event.css('background-color'),
                    start: $day.attr('data-date'),
                    end: $day.attr('data-date')
                };
    
                action.events.push(event);
        
                this.buildEvent(event);
            }
    
            history.pushAction(action);
        }

        stats.update();
        data.save();
    },

    buildEvent(event) {
        const getEventsWrap = (day) => {
            const date = dates.toString(new Date(day));
            let $el;
            if ($('.calendars-wrap').hasClass('edit-all')) {
                $el = $(`.day[data-date="${date}"] .events`);
            } else {
                $el = $(`.calendar[data-id="${event.calendar}"]`).length ? $(`.calendar[data-id="${event.calendar}"] .day[data-date="${date}"] .events`) : $(`.calendar.selected .day[data-date="${date}"] .events, .calendar-wrap .day[data-date="${date}"] .events`);
            }
            return $el;
        }

        const range = dates.range(event.start, event.end);

        // Get first available top coordinate for multi-days event
        const top = new Array(32).fill(0).map(d => d).findIndex((_, i) => {
            return range.map(day => {
                const events = getEventsWrap(day).eq(0).find('.event').toArray();
                return events.every(ev => parseInt($(ev).css('top')) !== i * 32);
            }).every(d => d);
        });

        for (const day of range) {
            const $events = getEventsWrap(day);
    
            // Build classname
            let classname = '';
            if (day.valueOf() === new Date(event.start).valueOf()) classname += ' start';
            if (day.valueOf() === new Date(event.end).valueOf()) classname += ' end';

            let eventType;
            if (event.type === undefined) {
                eventType = { title: '', color: 17 };
                classname += ' new';
            } else {
                eventType = this.data.find(e => e.type === event.type);
            }
            
            // Find title and color from event
            const { title, color } = eventType;

            // Add event
            $events.append(`<div data-id="${event.id}" data-type="${event.type}" data-color="${color}" class="event${classname}" style="top: ${top * 32}px">${classname.includes('start') || day.getDay() === 1 ? `<span class="title${!classname.includes('start') ? ' not-linear' : ''}">${title}</span>` : ''}</div>`);
        }

        // Save data
        const { id, type, start, end } = event;
        calendars.data.find(c => c.id === event.calendar).events.push({
            id,
            type,
            start,
            end
        });

        calendars.updateCalendarHeight();
    },

    updateEvent(event) {
        this.removeEvent(event);
        this.buildEvent(event);
    },

    replaceEvent(event, undo = false) {
        // Edit all calendars or only selected one
        let $el;
        if ($('.calendars-wrap').hasClass('edit-all')) {
            $el = $(`.event[data-id="${event.id}"]`);
        } else {
            $el = $(`.calendar[data-id="${event.calendar}"]`).length ? $(`.calendar[data-id="${event.calendar}"] .event[data-id="${event.id}"]`) : $(`.calendar.selected .event[data-id="${event.id}"], .calendar-wrap .event[data-id="${event.id}"]`);
        }

        let $target;
        if (!undo) $target = $(`.events-wrap ul li[data-type="${event.type}"]`);
        else $target = $(`.events-wrap ul li[data-type="${event.from}"]`);

        $el.css('background-color', $target.css('background-color'));
        $el.find('.title').text($target.find('.title').text());
        $el.attr('data-type', $target.attr('data-type'));

        // Update data
        calendars.data.find(c => c.id === event.calendar).events.find(e => e.id === event.id).type = event.type;

        stats.update();
    },

    removeEvent(event) {
        $(`.event[data-id="${event.id}"]`).remove();
        calendars.updateCalendarHeight();

        // Update data
        calendars.data.forEach(c => c.events = c.events.filter(e => e.id !== event.id));
    },

    removeEventsByType(type) {
        // Create action for history
        const action = {
            type: 'removeEvents',
            events: []
        };

        for (const minical of $('.calendars-wrap .calendar').toArray()) {
            const $events = $(minical).find(`.event[data-type="${type}"]`);

            $events.each((_, el) => {
                const $el = $(el);

                const event = {
                    id: parseInt($el.attr('data-id')),
                    calendar: parseInt($(minical).attr('data-id')),
                    type: $el.attr('data-type'),
                    // title: $el.find('.title').text(),
                    // color: $el.css('background-color'),
                    start: $el.closest('.day').attr('data-date'),
                    end: $el.closest('.day').attr('data-date')
                };

                // Remove event
                this.removeEvent(event);

                // Save event in action
                action.events.push(event);
            });
        }

        // Save action in history
        history.pushAction(action);
    },

    reorder() {
        this.data.forEach(e => e.order = parseInt($(`.events-wrap ul li[data-type="${e.type}"]`).attr('data-order')));
    }
}