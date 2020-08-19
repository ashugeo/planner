import calendars from './calendars';
import data from './data';
import dates from './dates';
import events from './events';
import history from './history';
import settings from './settings';
import stats from './stats';
import ui from './ui';

export default {
    selectedDays: [],
    clipboard: [],
    lastHoveredDate: null,
    drawing: false,
    event: null,
    eventID: null,
    eventTitle: null,

    init() {
        // Click on a day in main calendar
        $(document).on('mousedown', '.calendar-wrap .day', e => {
            if (ui.toolIs('draw')) {
                if (this.event) this.changeType();
                this.startDraw(e);
            }
            else if (ui.tool === 'select') this.select(e);
        });

        // Double-click on a day in main calendar
        $(document).on('dblclick', '.calendar-wrap .day', e => {
            if (ui.toolIs('draw')) {
                this.startDraw(e);
                this.draw(e);
                this.endDraw();
            }
        });

        // Release click on a day in main calendar
        $(document).on('mouseup', '.calendar-wrap .day', () => {
            if (ui.toolIs('draw')) this.endDraw();
        });

        // Mouse enters a day in main calendar
        $(document).on('mouseenter', '.calendar-wrap .day', e => {
            if (ui.toolIs('draw')) {
                if (this.drawing) this.draw(e);
            } else if (ui.tool === 'select') {
                const date = $(e.currentTarget).attr('data-date');
                this.lastHoveredDate = date;
    
                if (this.selectedDays.length) this.dragSelect(e);
            }
        });

        // Change new event title
        $(document).on('input', '.event.new .title', e => {
            const $el = $(e.currentTarget);
            this.renameEvent($el);
        });

        // Hover new event type option
        $(document).on('mouseenter', '.new-event ul li', e => {
            const $el = $(e.currentTarget);
            $('.new-event ul li.selected').removeClass('selected');
            $el.addClass('selected');
        });

        // Click on new event type option
        $(document).on('click', '.new-event ul li', e => {
            const type = parseInt($(e.currentTarget).attr('data-type'));
            this.changeType(type);
        });

        // Up/down arrow keys + enter key in new event type options
        $(document).on('keydown', e => {
            if (!$('.new-event').hasClass('visible')) return;

            const $li = $('.new-event ul li.selected');
            
            if (e.which === 38) { // Up
                if ($li.length) {
                    if ($li.prev('li').length) $li.prev('li').addClass('selected');
                    else $('.new-event ul li:last-child').addClass('selected');
                    $li.removeClass('selected');
                } else {
                    $('.new-event ul li:last-child').addClass('selected');
                }
            } else if (e.which === 40) { // Down
                if ($li.length) {
                    if ($li.next('li').length) $li.next('li').addClass('selected');
                    else $('.new-event ul li:first-child').addClass('selected');
                    $li.removeClass('selected');
                } else {
                    $('.new-event ul li:first-child').addClass('selected');
                }
            } else if (e.which === 13) { // Enter
                if ($li.length) {
                    const type = parseInt($li.attr('data-type'));
                    this.changeType(type);
                } else {
                    this.changeType();
                }
            }
        });

        // Click on an event in main calendar
        $(document).on('mousedown', '.calendar-wrap .day .event:not(.new)', e => {
            if (ui.toolIs('draw')) return false;
        });

        // Release click on an event in main calendar
        $(document).on('mouseup', '.calendar-wrap .day .event', () => {
            if (ui.toolIs('draw') && !this.event) return false;
        });

        // Double-click on an event in main calendar
        $(document).on('dblclick', '.calendar-wrap .day .event', () => {
            if (ui.toolIs('draw')) return false;
        });

        // Click outside calendar submits new event
        $(document).on('click', e => {
            if (this.event && !$(e.target).closest('.calendar-wrap .calendar').length) this.changeType();

            if (ui.toolIs('draw')) {
                const multiSelect = e.metaKey || e.ctrlKey || e.shiftKey;
                if (!multiSelect) $('.event.selected').removeClass('selected');

                const id = $(e.target).closest('.event').attr('data-id');
                if (!isNaN(id)) this.selectEventByID(id);
            }
        });
    },

    startDraw(e) {
        this.drawing = true;

        const $day = $(e.currentTarget);
        const date = $day.attr('data-date');

        this.event = {
            id: ++events.eventID,
            calendar: parseInt($day.parents('.calendar').attr('data-id')),
            start: date,
            end: date,
            startingDate: date
        };

        this.eventID = this.event.id;
    },

    draw(e) {
        const $day = $(e.currentTarget);
        const date = $day.attr('data-date');

        if (date >= this.event.startingDate) {
            this.event.start = this.event.startingDate;
            this.event.end = date;
        } else if (date < this.event.startingDate) {
            this.event.start = date;
            this.event.end = this.event.startingDate;
        }

        events.updateEvent(this.event);
    },

    endDraw() {
        if (!this.event) return;
        this.drawing = false;
        
        // Find new event start
        const $event = $(`.calendar-wrap .event.new.start[data-id="${this.event.id}"]`);

        // Ignore single click
        if (!$event.length) {
            this.event = null;
            return;
        }

        const $title = $event.find('.title');
        $title.attr('contenteditable', true).focus();

        $('.new-event').css({
            'top': $event.offset().top + $event.outerHeight() + 8,
            'left': $event.offset().left
        })
        .html(this.buildEventsTypesOptions(events.data))
        .addClass('visible');
    },

    cancelDraw() {
        this.event = null;
        events.eventID--;
        events.removeEvent({id: this.eventID });
        $('.new-event').removeClass('visible');
    },

    renameEvent($el) {
        const title = $el.text();

        this.eventTitle = title;

        this.filterTypes(title);

        // Duplicate text to other title fields (event on multiple weeks)
        const id = $el.closest('.event').attr('data-id');
        $(`.event[data-id="${id}"] .title:not(:focus)`).text(title);
    },

    changeType(type) {
        const calendar = calendars.data.find(c => c.events.some(e => e.id === this.eventID));
        const event = calendar.events.find(e => e.id === this.eventID);

        if (isNaN(type)) {
            // New event
            events.newEvent({
                title: this.eventTitle || 'New event',
                color: 17
            });
            event.type = events.type;
        } else {
            event.type = type;
        }

        event.calendar = calendar.id;
        events.updateEvent(event);

        $('.new-event').removeClass('visible');

        this.event = null;

        stats.update();
        data.save();
    },

    filterTypes(title) {
        let eventsList = events.data;
        eventsList = eventsList.filter(e => e.title.toLowerCase().startsWith(title.toLowerCase()));

        if (eventsList.length) $('.new-event').html(this.buildEventsTypesOptions(eventsList)).addClass('visible');
        else $('.new-event').removeClass('visible');
    },

    buildEventsTypesOptions(events) {
        return `<ul>${events.map(e => `<li data-type="${e.type}"><span class="event-icon" data-color="${e.color}"></span>${e.title}</li>`).join('')}</ul>`;
    },

    select(e) {
        const $day = $(e.currentTarget);
        const date = $day.attr('data-date');

        $('.calendar.selected').removeClass('selected');
        $(`.calendar[data-id="${$day.closest('.calendar').attr('data-id')}"]`).addClass('selected');

        if (e.metaKey && !e.shiftKey && !e.altKey) {
            $('.selected-first').removeClass('selected-first');
            $day.addClass('selected-first');

            if (dates.isInArray(this.selectedDays, new Date(date))) {
                this.selectedDays = this.selectedDays.filter(d => d.getTime() !== new Date(date).getTime());
            } else {
                this.selectedDays.push(new Date(date));
            }
        } else if (e.shiftKey) {
            const $selectedFirst = $('.calendar-wrap .day.selected-first').length ? $('.calendar-wrap .day.selected-first') : $('.calendar-wrap .day.selected').eq(0);
            $selectedFirst.addClass('selected-first');

            let days = [];
            const [start, end] = [new Date($selectedFirst.attr('data-date')), new Date($day.attr('data-date'))].sort((a, b) => a > b ? 1 : -1);

            if (ui.viewIs('full')) {
                const _selectedDays = [new Date($selectedFirst.attr('data-date')), new Date(date)];
    
                const lowestWeekDay = Math.min(..._selectedDays.map(d => d.getDay()).map(w => w === 0 ? 7 : w));
                const highestWeekDay = Math.max(..._selectedDays.map(d => d.getDay()).map(w => w === 0 ? 7 : w));
    
    
                start.setDate(start.getDate() - ((start.getDay() === 0 ? 7 : start.getDay()) - lowestWeekDay));
                end.setDate(end.getDate() + (highestWeekDay - (end.getDay() === 0 ? 7 : end.getDay())));
                
                days = dates.range(start, end);
    
                // Filter out days out of rectangle
                days = days.filter(d => (d.getDay() === 0 ? 7 : d.getDay()) >= lowestWeekDay && (d.getDay() === 0 ? 7 : d.getDay()) <= highestWeekDay);
            } else {
                days = dates.range(start, end);
            }

            if (e.metaKey) this.selectedDays.push(...days);
            else this.selectedDays = days;
        } else if (e.altKey) {
            const $selectedFirst = $('.calendar-wrap .day.selected-first').length ? $('.calendar-wrap .day.selected-first') : $('.calendar-wrap .day.selected').eq(0);
            $selectedFirst.addClass('selected-first');

            const [start, end] = [new Date($selectedFirst.attr('data-date')), new Date($day.attr('data-date'))].sort((a, b) => a > b ? 1 : -1);

            const days = dates.range(start, end);

            if (e.metaKey) this.selectedDays.push(...days);
            else this.selectedDays = days;
        } else {
            // if (this.selectedDays.length && this.selectedDays[0].getTime() === new Date(date).getTime()) {
            //     this.selectedDays = []; 
            // } else {
                this.selectedDays = [new Date(date)]; 
                $('.calendar-wrap .day.selected-first').removeClass('selected-first');
                $('.calendar-wrap .day.selected-last').removeClass('selected-last');
                $day.addClass('selected-first selected-last');
            // }
        }

        this.highlightSelection();
    },

    dragSelect(e) {
        if (!(e.which === 1 || e.which === 18)) return;

        let date;
        if (e.which === 18) date = this.lastHoveredDate;
        else if (e.which === 1) date = $(e.currentTarget).attr('data-date');

        const $selectedFirst = $('.calendar-wrap .day.selected-first').length ? $('.calendar-wrap .day.selected-first') : $('.calendar-wrap .day.selected').eq(0);
        $selectedFirst.addClass('selected-first');

        let days = [];

        if (e.metaKey) {
            this.selectedDays.push(new Date(date));
        } else {
            const [start, end] = [new Date($selectedFirst.attr('data-date')), new Date(date)].sort((a, b) => a > b ? 1 : -1);

            if (ui.viewIs('full')) {
                const _selectedDays = [new Date($selectedFirst.attr('data-date')), new Date(date)];
    
                const lowestWeekDay = Math.min(..._selectedDays.map(d => d.getDay()).map(w => w === 0 ? 7 : w));
                const highestWeekDay = Math.max(..._selectedDays.map(d => d.getDay()).map(w => w === 0 ? 7 : w));
                
                if (!e.altKey) {
                    // Rectangle mode, move start date to top left corner and end date to bottom right corner
                    start.setDate(start.getDate() - ((start.getDay() === 0 ? 7 : start.getDay()) - lowestWeekDay));
                    end.setDate(end.getDate() + (highestWeekDay - (end.getDay() === 0 ? 7 : end.getDay())));
                }
                
                days = dates.range(start, end);

                // Filter out days out of rectangle
                if (!e.altKey) days = days.filter(d => (d.getDay() === 0 ? 7 : d.getDay()) >= lowestWeekDay && (d.getDay() === 0 ? 7 : d.getDay()) <= highestWeekDay);
            } else {
                days = dates.range(start, end);
            }
        }   

        if (!$selectedFirst.hasClass('selected')) {
            this.selectedDays = this.selectedDays.filter(d => d.getTime() !== new Date(date).getTime());
        } else {
            if (e.metaKey) this.selectedDays.push(...days);
            else this.selectedDays = days;
        }

        this.highlightSelection();
    },

    moveSelection(e) {
        // Ignore if no selection
        const $selected = $('.calendar-wrap .day.selected-last');
        if (!$selected.length) return;
    
        // Target set to same date by default (for linear mode)
        const date = new Date($selected.attr('data-date'));
        let target = date;
    
        if (e.which === 37) {
            if (e.metaKey) { // Meta + left
                // Full: beginning of week
                if (ui.viewIs('full')) target = dates.relativeFirstWeekDay(date);

                // Linear: one week before
                else if (ui.viewIs('linear')) target = dates.relativeDate(date, -7);

            } else { // Left

                // One day before
                target = dates.relativeDate(date, -1);
                
                // Prevent changing week with shift key
                if (ui.viewIs('full') && target.getDay() === 0 && e.shiftKey) return;
            }

        } else if (e.which === 38) { // Up

            // Full: one week before
            if (ui.viewIs('full')) target = dates.relativeDate(date, -7);

            // Linear: calendar above
            else if (ui.viewIs('linear')) calendars.selectPreviousCalendar();

        } else if (e.which === 39) {
            if (e.metaKey) { // Meta + right

                // Full: end of week
                if (ui.viewIs('full')) target = dates.relativeLastWeekDay(date);

                // Linear: one week after
                else if (ui.viewIs('linear')) target = dates.relativeDate(date, 7);

            } else { // Right
                
                // One day after
                target = dates.relativeDate(date, 1);
        
                // Prevent changing week with shift key
                if (ui.viewIs('full') && target.getDay() === 1 && e.shiftKey) return;
            }

        } else if (e.which === 40) { // Down
            // Full: one week after
            if (ui.viewIs('full')) target = dates.relativeDate(date, 7);
            
            // Linear: move to calendar under
            else if (ui.viewIs('linear')) calendars.selectNextCalendar();
        }
    
        if (e.shiftKey) {
            const $selectedFirst = $('.selected-first');
            $('.selected-last').removeClass('selected-last');
    
            const targetDate = dates.toString(target);
            const $target = $(`.calendar-wrap .day[data-date="${targetDate}"]`);
            $target.addClass('selected-last');
    
            this.selectedDays = [new Date($selectedFirst.attr('data-date')), new Date(targetDate)];

            const [start, end] = [new Date($selectedFirst.attr('data-date')), new Date(target)].sort((a, b) => a > b ? 1 : -1);
            let days = [];

            if (ui.viewIs('full')) {
                const lowestWeekDay = Math.min(...this.selectedDays.map(d => d.getDay()).map(w => w === 0 ? 7 : w));
                const highestWeekDay = Math.max(...this.selectedDays.map(d => d.getDay()).map(w => w === 0 ? 7 : w));
        
                start.setDate(start.getDate() - ((start.getDay() === 0 ? 7 : start.getDay()) - lowestWeekDay));
                end.setDate(end.getDate() + (highestWeekDay - (end.getDay() === 0 ? 7 : end.getDay())));
                
                days = dates.range(start, end);
        
                // Filter out days out of rectangle
                days = days.filter(d => (d.getDay() === 0 ? 7 : d.getDay()) >= lowestWeekDay && (d.getDay() === 0 ? 7 : d.getDay()) <= highestWeekDay);
            } else {
                days = dates.range(start, end);
            }
    
            this.selectedDays = days;
        } else if (e.altKey) {
            const $selectedFirst = $('.selected-first');
            $('.selected-last').removeClass('selected-last');
    
            const targetDate = dates.toString(target);
            const $target = $(`.calendar-wrap .day[data-date="${targetDate}"]`);
            $target.addClass('selected-last');
    
            const [start, end] = [new Date($selectedFirst.attr('data-date')), new Date(target)].sort((a, b) => a > b ? 1 : -1);
    
            const days = dates.range(start, end);
    
            this.selectedDays = days;
        } else {
            const diff = target - date;

            // Move .selected-first and .selected-last classes
            const $sF = $('.selected-first');
            const dateSF = new Date($sF.attr('data-date'));
            dateSF.setTime(dateSF.getTime() + diff);
            $sF.removeClass('selected-first');
            $(`.calendar-wrap .day[data-date=${dates.toString(dateSF)}]`).addClass('selected-first');

            const $sL = $('.selected-last');
            const dateSL = new Date($sL.attr('data-date'));
            dateSL.setTime(dateSL.getTime() + diff);
            $sL.removeClass('selected-last');
            $(`.calendar-wrap .day[data-date=${dates.toString(dateSL)}]`).addClass('selected-last');

            // For each already selected day, move by diff between first selected day and target
            this.selectedDays = this.selectedDays.map(date => new Date(date.getTime() + diff));
        }
    
        this.highlightSelection();
    },

    emptySelection() {
        // Create action for history
        const action = {
            type: 'removeEvents',
            events: []
        };

        const removeEvents = $events => {
            $events.each((_, el) => {
                const $el = $(el);

                const id = parseInt($el.attr('data-id'));
                const start = $(`.event[data-id="${id}"].start`).closest('.day').attr('data-date');
                const end = $(`.event[data-id="${id}"].end`).closest('.day').attr('data-date');

                if (!start || !end) return;
                
                const event = {
                    id,
                    calendar: parseInt($el.parents('.calendar').attr('data-id')),
                    type: parseInt($el.attr('data-type')),
                    start,
                    end
                };
                
                events.removeEvent(event);
                
                // Save events in action
                action.events.push(event);
            });
        }
        
        if (ui.toolIs('draw')) {
            const $events = $('.event.selected');
            removeEvents($events);    
        }
        else if (ui.tool === 'select') {
            for (const day of this.selectedDays) {
                const date = dates.toString(day);
                let $events;
                if ($('.calendars-wrap').hasClass('edit-all')) {
                    $events = $(`.calendars-wrap .day[data-date="${date}"] .event`);
                } else {
                    $events = $(`.calendars-wrap .calendar.selected .day[data-date="${date}"] .event`);
                }

                if (!$events.length) continue;
                removeEvents($events);
            }
        }
    
        // Save action in history
        history.pushAction(action);

        calendars.updateCalendarHeight();
        stats.update();
        data.save();
    },
    
    selectAll() {
        const start = new Date($('#start').val());
        const end = new Date($('#end').val());

        this.selectedDays = dates.range(start, end);

        this.highlightSelection();
    },

    narrowSelection() {
        const $onlySelectedDay = $('.selected-first.selected-last.selected');

        // Keep only first selected day in selection
        const $selectedFirst = $('.selected-first');
        const date = new Date($selectedFirst.attr('data-date'));

        $('.selected-last').removeClass('selected-last');
        $selectedFirst.addClass('selected-last');
        
        this.selectedDays = [date];
        this.highlightSelection();
        
        // If only one selected day, toggle it
        $onlySelectedDay.removeClass('selected');
    },
        
    copySelection() {
        this.clipboard = [];
    
        // Find selection's bounding rectangle
        let start = new Date(Math.min(...this.selectedDays));
        let end = new Date(Math.max(...this.selectedDays));

        const lowestWeekDay = dates.findLowestWeekDay(this.selectedDays);
        const highestWeekDay = dates.findHighestWeekDay(this.selectedDays);
    
        start.setDate(start.getDate() - ((start.getDay() === 0 ? 7 : start.getDay()) - lowestWeekDay));
        end.setDate(end.getDate() + (highestWeekDay - (end.getDay() === 0 ? 7 : end.getDay())));
    
        // Create range from start to end of bounding rectangle
        let days = dates.range(start, end);
    
        // Filter out days out of bounding rectangle
        days = days.filter(d => (d.getDay() === 0 ? 7 : d.getDay()) >= lowestWeekDay && (d.getDay() === 0 ? 7 : d.getDay()) <= highestWeekDay);
    
        // Create array of events for selected days, keep null for an empty day
        const events = [];
        for (const day of days) {
            const eventsThatDay = [];

            // Ignore unselected days
            if (!dates.isInArray(this.selectedDays, day)) {
                events.push(null);
                continue;
            };
    
            const date = dates.toString(day);
            const $events = $(`.calendar-wrap .day[data-date="${date}"] .event`);
    
            // Copy day events to clipboard
            if ($events.length) {
                $events.each((_, el) => {
                    const $el = $(el);
        
                    const event = {
                        // id: 
                        type: parseInt($el.attr('data-type')),
                        // title: $el.find('.title').text(),
                        // color: $el.css('background-color'),
                        // start: $el.attr('data-start'),
                        // end: $el.attr('data-end')
                    }
        
                    eventsThatDay.push(event);
                });
                events.push(eventsThatDay);

            } else {
                events.push(null);
            }
        }
    
        // Convert 1D array of events to 2D array to mimic selection bounding rectangle layout
        while (events.length) this.clipboard.push(events.splice(0, highestWeekDay - lowestWeekDay + 1));
    },
    
    cutSelection() {
        this.copySelection();
        this.emptySelection();
    },
    
    pasteSelection() {
        // Push action in history
        const action = {
            type: 'addEvents',
            events: []
        };

        // Clipboard paste starts at selected day
        const $selected = $('.calendar-wrap .day.selected-first');
        const date = new Date($selected.attr('data-date'));
    
        for (let j = 0; j < this.clipboard.length; j += 1) {
            for (let i = 0; i < this.clipboard[0].length; i += 1) {
                // Find event in clipboard if any
                const eventsThatDay = this.clipboard[j][i];
                if (!eventsThatDay) continue;

                for (const _event of eventsThatDay) {
                    // Find target day
                    const target = new Date(new Date(date).setDate(date.getDate() + j * 7 + i));
                    const eventDate = dates.toString(target);

                    // Create event
                    const event = {
                        ..._event,
                        id: ++events.eventID,
                        start: eventDate,
                        end: eventDate
                    };
            
                    // Build event
                    events.buildEvent(event);
        
                    // Save event in action
                    action.events.push(event);
                }
            }
        }

        // Save action in history
        history.pushAction(action);

        stats.update();
    },

    highlightSelection() {
        // Reset all currently selected days
        $('.day.selected').removeClass('selected no-top no-right no-bottom no-left');

        $('.event.selected').removeClass('selected');
        const selectedEvents = new Set();

        for (const day of this.selectedDays) {
            const date = dates.toString(day);
            const $el = $(`main:not(.linear) .calendar .day[data-date="${date}"], main.linear .calendar.selected .day[data-date="${date}"]`);

            // Select day
            $el.addClass('selected');
            
            // Add styles classes (for borders)
            const dayBeforeSelected = dates.isInArray(this.selectedDays, dates.relativeDate(day, -1));
            const dayAfterSelected = dates.isInArray(this.selectedDays, dates.relativeDate(day, 1));

            if (ui.viewIs('full')) {
                const dayWeekBeforeSelected = dates.isInArray(this.selectedDays, dates.relativeDate(day, -7));
                const dayWeekAfterSelected = dates.isInArray(this.selectedDays, dates.relativeDate(day, 7));
                
                if (dayBeforeSelected && day.getDay() !== 1) $el.addClass('no-left');
                if (dayAfterSelected && day.getDay() !== 0) $el.addClass('no-right');
                if (dayWeekBeforeSelected) $el.addClass('no-top');
                if (dayWeekAfterSelected) $el.addClass('no-bottom');
            }
            else if (ui.viewIs('linear')) {
                if (dayBeforeSelected) $el.addClass('no-left');
                if (dayAfterSelected) $el.addClass('no-right');
            }

            const $events = $(`.calendar-wrap .day[data-date="${date}"] .event`);
            $events.each((_, el) => {
                const id = parseInt($(el).attr('data-id'));
                if (!isNaN(id)) selectedEvents.add(id);
            });
        }

        for (const eventID of [...selectedEvents]) {
            this.selectEventByID(eventID);
        }
    },

    replaceEvents(from, to) {
        // Create action for history
        const action = {
            type: 'replaceEvents',
            events: []
        };

        for (const day of this.selectedDays) {
            const date = dates.toString(day);
            const $events = $(`.calendar-wrap .day[data-date="${date}"] .event[data-type="${from}"]`);

            $events.each((_, el) => {
                const $el = $(el);

                const event = {
                    id: parseInt($el.attr('data-id')),
                    calendar: parseInt($('.calendars-wrap .calendar.selected').attr('data-id')),
                    type: to,
                    from,
                    start: date,
                    end: date
                };

                // Replace event
                events.replaceEvent(event);

                // Save event in action
                action.events.push(event);
            });
        }

        // Save action in history
        history.pushAction(action);

        data.save();
    },

    removeEvents(type) {
        // Create action for history
        const action = {
            type: 'removeEvents',
            events: []
        };

        for (const day of this.selectedDays) {
            const date = dates.toString(day);
            const $events = $(`.calendar-wrap .day[data-date="${date}"] .event[data-type="${type}"]`);

            $events.each((id, el) => {
                const $el = $(el);

                const event = {
                    id: parseInt($el.attr('data-id')),
                    calendar: parseInt($('.calendars-wrap .calendar.selected').attr('data-id')),
                    type: parseInt($el.attr('data-type')),
                    start: date,
                    end: date
                };

                // Remove event
                events.removeEvent(event);

                // Save event in action
                action.events.push(event);
            });
        }

        // Save action in history
        history.pushAction(action);

        data.save();
    },

    allDaysEmpty() {
        return !this.selectedDays.some(day => $(`.day[data-date="${dates.toString(day)}"] .event`).length);
    },

    selectEventByID(id) {
        const $event = $(`.calendar-wrap .event[data-id="${id}"]`);
        $event.addClass('selected');
    }
}