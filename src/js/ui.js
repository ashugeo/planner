import calendars from './calendars';
import data from './data';
import history from './history';
import selection from './selection';
import toast from './toast';

export default {
    view: 'full',
    tool: 'select',
    daysShown: [true, true, true, true, true, true, true],

    init() {
        $(document).on('click', 'header nav > ul > li', e => {
            const $el = $(e.currentTarget);
            $el.siblings('.open').removeClass('open');
            $el.toggleClass('open');

            return false;
        });

        $(document).on('mouseenter', 'header nav > ul > li', e => {
            const $el = $(e.currentTarget);
            if ($el.siblings('.open').length) {
                $('header ul li.open').removeClass('open');
                $el.toggleClass('open');
            }

            return false;
        });

        // Create triangle safezone
        $(document).on('mouseenter', 'header nav li', e => {
            const $el = $(e.target);
            if ($el.is('.disabled')) return;

            const w = $el.outerWidth();
            const h = $el.outerHeight();
            if ($el.find('ul').length) $el.append(`<svg width="${w}px">
                <polygon points="0,${h} ${w},${h} 0,0" />
            </svg>`);
        });

        // Remove triangle safezone
        $(document).on('mouseleave', 'header nav li', () => {
            $('nav svg').remove();
        });

        // Update triangle safezone
        $(document).on('click mousemove', 'header nav li', e => {
            const $el = $(e.target).closest('li');
            const $ul = $el.children('ul');
            if (!$ul.length) return;

            const $svg = $el.find('svg');
            const $polygon = $el.find('polygon');

            const under = $el.parent().parent().is('nav');

            const w = under && $el.is('.open') ? Math.max($el.outerWidth(), $ul.outerWidth()) : $el.outerWidth();
            const h = under ? $el.outerHeight() : Math.max($el.outerHeight(), $ul.outerHeight());

            $svg.attr('width', `${w}px`);
            $svg.attr('height', `${h}px`);
            if (under) $polygon.attr('points', `0,${h} ${w},${h} ${e.offsetX},${e.offsetY}`);
            else $polygon.attr('points', `${w},0 ${w},${h} ${e.offsetX},${e.offsetY}`);
        });

        $(document).on('click', 'header nav li:not(.disabled)', e => {
            const $target = $(e.currentTarget);

            if ($target.attr('data-checkable') === '') {
                if ($target.attr('data-radio')) this.onRadioChange($target);
                else this.check($target);
            } else if ($target.attr('data-tool')) {
                const tool = $target.attr('data-tool');

                if (tool === 'save') data.download();
                else if (tool === 'open') data.open();
                else if (tool === 'undo') history.undo();
                else if (tool === 'redo') history.redo();
                else if (tool === 'cut') selection.cutSelection();
                else if (tool === 'copy') selection.copySelection();
                else if (tool === 'paste') selection.pasteSelection();
                else if (tool === 'select-all') {
                    selection.selectAll();
                    $('nav li.open').removeClass('open');
                }
                else if (tool === 'edit-all') {
                    $target.toggleClass('checked');
                    $('.calendars-wrap').toggleClass('edit-all');
                }
            }

            return false;
        });

        $(document).on('click', '', () => {
            $('header ul li.open').removeClass('open');
        });

        // Scroll in linear mode
        $(document).on('wheel', '.calendar-wrap .calendars, .calendars-wrap .scroll-wrap, .hours-track', e => {
            if (this.viewIs('full')) return;

            if (this.viewIs('linear')) {
                // Keep scroll in sync
                const scrollTop = e.currentTarget.scrollTop;
                $('.calendar-wrap .calendars, .calendars-wrap .scroll-wrap').scrollTop(scrollTop);
            } else if (this.viewIs('week')) {
                const scrollTop = $(e.currentTarget).is('.hours-track') ? $('.hours-track').scrollTop() : $('.calendar.content.selected').scrollTop();
                $('.calendar.content.selected, .hours-track').scrollTop(scrollTop);
            }

            this.moveStickyLabels();
        });

        // Change tool
        $(document).on('click', 'header .tool', e => {
            this.changeTool($(e.currentTarget).attr('data-tool'));
        });

        // Click on day in timeline
        $(document).on('click', '.head [data-day]', e => {
            const $el = $(e.currentTarget);

            $('.head [data-day].open').removeClass('open');
            $('.dropdown').removeClass('visible');

            if (e.altKey) {
                // Alt + click: select all days in column
                const $day = $el.closest('[data-day]');
                let day = $day.attr('data-day');

                const $first = $('.head.full [data-day].selected-first');

                if (e.metaKey) {
                    // Meta key: toggle (add to or remove from selection)
                    if ($day.hasClass('selected')) selection.selectByWeekdays([day], true, true);
                    else selection.selectByWeekdays([day], true);
                } else if (e.shiftKey) {
                    // Shift key: select range
                    let first = $first.attr('data-day');

                    day = (day == 0) ? 7 : day;
                    first = (first == 0) ? 7 : first;

                    const lowest = Math.min(day, first);
                    const highest = Math.max(day, first);

                    // Build array from lowest to highest day
                    const days = Array(highest - lowest + 1).fill(0).map((_, i) => i + lowest).map(d => d === 7 ? '0' : d.toString());

                    selection.selectByWeekdays(days);
                } else {
                    // Default selection
                    selection.selectByWeekdays([day]);

                    $first.removeClass('selected-first');
                    $day.addClass('selected-first');
                }
            } else {
                $el.addClass('open');
                $el.find('.dropdown').addClass('visible');
            }

            return false;
        });

        // Select all days in column
        $(document).on('click', '[data-tool="select-weekday"]', e => {
            const $el = $(e.currentTarget);
            const day = $el.closest('[data-day]').attr('data-day');

            selection.selectByWeekdays([day]);

            $el.closest('[data-day]').removeClass('open');
            $el.closest('.dropdown').removeClass('visible');

            return false;
        });

        // Hide day column
        $(document).on('click', '[data-tool="hide-weekday"]', e => {
            const $el = $(e.currentTarget);
            $el.closest('[data-day]').removeClass('open');
            $el.closest('.dropdown').removeClass('visible');

            const day = $el.closest('[data-day]').attr('data-day');
            this.showHideWeekday(day, false);

            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            toast.show(`${days[day]} column hidden`, () => { this.showHideWeekday(day, true) });

            return false;
        });

        // Change head columns icons on mouseenter
        $(document).on('mouseenter', '.head.full', e => {
            if (e.altKey) $(e.currentTarget).addClass('alt');
            else $(e.currentTarget).removeClass('alt');
        });

        // Change head columns icons on keydown
        $(document).on('keydown', e => {
            if (e.which === 18) $('.head.full').addClass('alt');
        });

        // Change head columns icons on keyup
        $(document).on('keyup', e => {
            if (e.which === 18) $('.head.full').removeClass('alt');
        });

        $(document).on('click', '[data-view]', e => {
            const $el = $(e.currentTarget);
            const view = $el.attr('data-view');
            this.switchView(view);
        });
    },

    check($target) {
        const setting = $target.attr('data-setting');
        const value = $target.attr('data-value');
        const checked = $target.hasClass('checked');

        if (setting === 'show-weekday') this.showHideWeekday(value, !checked);
        else $target.toggleClass('checked');
    },

    onRadioChange($target) {
        const radio = $target.attr('data-radio');
        $(`nav [data-radio="${radio}"]`).removeClass('checked');
        $target.addClass('checked');

        if (radio === 'view') {
            const view = $target.attr('data-value');
            this.switchView(view);
        }
    },

    switchView(view) {
        this.view = view;

        // Update UI
        $('main').removeClass('week full linear');
        $('main').addClass(view);
        $('[data-view]').removeClass('selected');
        $(`[data-view="${view}"]`).addClass('selected');

        // Check option in menu (when switched from shorcut)
        $(`nav [data-radio="view"]`).removeClass('checked');
        $(`nav [data-radio="view"][data-value="${view}"]`).addClass('checked');

        // Update height
        calendars.updateHeight();

        if (view === 'full' || view === 'week') {
            // Keep only one calendar
            $('.calendar-wrap .calendar').eq(1).empty();
            $('.calendar-wrap .calendar').slice(1).remove();

            // Select current calendar
            const $selectedCalendar = $('.calendars-wrap .calendar.selected');
            calendars.select($selectedCalendar);
        } else if (view === 'linear') {
            // Store .selected-first and .selected-last dates
            const selectedFirst = $('.selected-first').attr('data-date');
            const selectedLast = $('.selected-last').attr('data-date');

            // Duplicate every minical
            $('.calendar-wrap .calendar').remove();
            $('.calendars-wrap .calendar').each((_, el) => {
                const $el = $(el);
                const content = $el.find('.content').html();
                $('.calendar-wrap .calendars').append(`<div class="content calendar ${$el.hasClass('hidden') ? 'hidden' : ''}" data-id="${$el.attr('data-id')}">${content}</div>`);
            });

            // Select current calendar and restore .selected-first and .selected-last classes
            const $selectedCalendar = $('.calendars-wrap .calendar.selected');
            calendars.select($selectedCalendar, selectedFirst, selectedLast);
        }
        
        this.moveStickyLabels();
        data.save();
    },

    viewIs(view) {
        return this.view === view;
    },

    changeTool(tool) {
        this.tool = tool;

        // Update header UI
        $('header .tool.selected').removeClass('selected');
        $(`header .tool[data-tool="${tool}"]`).addClass('selected');

        // Update main calendar UI
        $('.calendar-wrap').removeClass('select draw comment').addClass(tool);

        // Remove selection when entering draw mode
        if (tool === 'draw') {
            selection.selected = [];
            selection.highlightSelection();
        }

        data.save();
    },

    toolIs(tool) {
        return this.tool === tool;
    },

    showHideWeekday(day, show) {
        const $day = $(`[data-day=${day}]`);
        const $li = $(`nav [data-setting="show-weekday"][data-value="${day}"]`);
        if (show) {
            $day.show();
            $li.addClass('checked');
        } else {
            $day.hide();
            $li.removeClass('checked');
        }

        this.daysShown[day] = show;
        data.save();
    },

    moveStickyLabels() {
        return false;
        const colWidth = $(window).width() <= 1120 ? 24 : 240;

        // Keep (visible) event titles in view
        $('.calendar-wrap .event .title:visible').each((_, el) => {
            const $title = $(el);
            const $event = $title.closest('.event');
            const id = $event.attr('data-id');
            const $events = $(`.calendar-wrap .event[data-id="${id}"]`);

            // Ignore one-day events
            if ($events.length === 1) return;

            // Total event width (add up single .events widths)
            const width = $events.toArray().reduce((acc, curr) => acc + curr.offsetWidth, 0);

            const padding = this.viewIs('week') ? 56 : 0;

            const eventOffsetLeft = $event.offset().left - padding;
            const eventOffsetRight = eventOffsetLeft + width;

            if (eventOffsetLeft < colWidth && eventOffsetRight > colWidth) {
                const top = $event.offset().top + 2;

                // Make title stick to left border or right end of event
                let left = Math.min(Math.ceil(eventOffsetRight - $title.outerWidth() - (colWidth + 14)), 0) + colWidth + 6;
                if (this.viewIs('week')) left += padding;

                $title.css({
                    'position': 'fixed',
                    'top': top,
                    'left': left
                });
            } else {
                $title.css({
                    'position': '',
                    'top': '',
                    'left': ''
                });
            }
        });
    }
}