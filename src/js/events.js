import calendars from './calendars';
import categories from './categories';
import dates from './dates';
import stats from './stats';

export default {
    list: {},
    id: -1,

    reset() {
        this.list = {};
        this.id = -1;
    },

    get() {
        return this.list;
    },

    insert(category) {
        const action = {
            type: 'addEvents',
            events: []
        };

        for (const day of selection.selectedDays) {
            const date = dates.toString(day);

            // Edit selected calendar(s)
            for (const calendarID of calendars.getSelectedCalendars()) {
                const event = {
                    id: ++this.id,
                    calendar: calendarID,
                    category,
                    start: date,
                    end: date
                };

                this.build(event);
                action.events.push(event);
            }
        }

        history.pushAction(action);

        stats.update();
        data.save();
    },

    update(event, updateHeight) {
        this.remove(event, updateHeight);
        this.build(event, updateHeight);
    },

    remove(event, updateHeight = true) {
        $(`.event[data-id="${event.id}"]`).remove();

        const oldEvent = this.list[event.id];
        const start = oldEvent ? Math.min(new Date(oldEvent.start), new Date(event.start)) : event.start;
        const end = oldEvent ? Math.max(new Date(oldEvent.end), new Date(event.end)) : event.end;

        // Find all events to update top coordinate for
        const range = dates.range(start, end);
        const eventIDs = new Set();

        for (const day of range) {
            const $events = this.getEventsWrap(event, day);
            $events.find('.event').each((_, el) => {
                const $el = $(el);
                const id = parseInt($el.attr('data-id'));
                eventIDs.add(id);
            });
        }

        for (const id of eventIDs) {
            const event = { id,
                start: $(`.event[data-id="${id}"].start`).eq(0).closest('.day').attr('data-date'),
                end: $(`.event[data-id="${id}"].end`).eq(0).closest('.day').attr('data-date'), 
                calendar: parseInt($(`.event[data-id="${id}"].start`).eq(0).closest('.calendar').attr('data-id'))
            };

            // Update top coordinate
            const top = this.getTopCoordinate(event);
            $(`.event[data-id="${id}"]`).css('top', top * 32);
        }

        if (updateHeight) calendars.updateCalendarHeight();

        // Update data
        delete this.list[event.id];
    },

    replace(event, undo = false) {
        const $el = $(`.event[data-id="${event.id}"]`);

        const to = undo ? event.from : event.category;
        const $target = $(`.categories-wrap ul li[data-category="${to}"]`);

        $el.find('.title').text($target.find('.title').text());
        $el.attr('data-category', $target.attr('data-category'));
        $el.attr('data-color', $target.attr('data-color'));

        // Update data
        this.list[id].category = to;

        stats.update();
    },

    removeBy(options, event) {
        const category = options.category;

        // Create action for history
        let action = {
            type: 'removeEvents',
            events: []
        };

        if (event) {
            action.deleted = true;
            action.event = event;
        }

        for (const minical of $('.calendars-wrap .calendar').toArray()) {
            const $events = $(minical).find(`.event[data-category="${category}"]`);

            $events.each((_, el) => {
                const $el = $(el);

                const event = {
                    id: parseInt($el.attr('data-id')),
                    calendar: parseInt($(minical).attr('data-id')),
                    category: parseInt($el.attr('data-category')),
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

    build(event, updateHeight = true) {
        const range = dates.range(event.start, event.end);

        const top = this.getTopCoordinate(event);

        for (const day of range) {
            const $events = this.getEventsWrap(event, day);
    
            // Build classname
            let classname = '';
            if (day.valueOf() === new Date(event.start).valueOf()) classname += ' start';
            if (day.valueOf() === new Date(event.end).valueOf()) classname += ' end';

            let category;
            if (event.category === undefined) {
                category = { title: '', color: 17 };
                classname += ' new';
            } else {
                category = categories.list[event.category];
                // category = categories.findBy({ category: event.category });
            }

            // Find title and color from category
            const { title, color } = category;

            const html = `<div data-id="${event.id}" data-category="${event.category}" data-color="${color}" class="event${classname}" style="top: ${top * 32}px">
                ${classname.includes('start') || day.getDay() === 1 ? `<span class="title${!classname.includes('start') ? ' not-linear' : ''}">${title}</span>` : ''}
                ${classname.includes('start') ? '<div class="anchor anchor-start"></div>' : ''}
                ${classname.includes('end') ? '<div class="anchor anchor-end"></div>' : ''}
            </div>`;

            // Add event
            $events.append(html);
        }

        // Save data
        this.list[event.id] = event;

        if (updateHeight) calendars.updateCalendarHeight();
        stats.update();
    },

    getEventsWrap(event, day) {
        const date = dates.toString(new Date(day));
        let $el;
        // if (calendars.editAll) {
        //     $el = $(`.day[data-date="${date}"] .events`);
        // } else {
            $el = $(`.calendar[data-id="${event.calendar}"]`).length ? $(`.calendar[data-id="${event.calendar}"] .day[data-date="${date}"] .events`) : $(`.calendar.selected .day[data-date="${date}"] .events, .calendar-wrap .day[data-date="${date}"] .events`);
        // }
        return $el;
    },

    getTopCoordinate(event) {
        const range = dates.range(event.start, event.end);

        // Get first available top coordinate for multi-days event
        const top = new Array(32).fill(0).map(d => d).findIndex((_, i) => {
            return range.map(day => {
                const events = this.getEventsWrap(event, day).eq(0).find(`.event[data-id!="${event.id}"]`).toArray();
                return events.every(ev => parseInt($(ev).css('top')) !== i * 32);
            }).every(d => d);
        });

        return top;
    },

    filter(options) {
        let events = this.list;

        // Filter events
        if (options.calendars) events = events.filter(e => options.calendars.includes(e.calendar));
        if (options.days) events = events.filter(e => options.days.some(d => dates.isInRange(e.start, e.end, d)));
        if (!isNaN(options.category)) events = events.filter(e => e.category === options.category);

        return events;
    }
}