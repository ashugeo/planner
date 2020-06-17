export default {
    toString(date) {
        return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;
    },

    isInArray(arr, date) {
        return arr.some(d => d.getTime() === date.getTime());
    },

    relativeDate(date, n) {
        return new Date(new Date(date).setDate(date.getDate() + n));
    },

    relativeFirstWeekDay(date) {
        return new Date(new Date(date).setDate(date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1)));
    },

    // Build array of all days from start to end
    range(start, end) {
        const days = [start];
        while (days[days.length - 1] < end) days.push(new Date(new Date(days[days.length - 1].valueOf()).setDate(days[days.length - 1].getDate() + 1)));
        return days;
    }
}