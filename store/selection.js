import { eachDayOfInterval, getDay, getWeek, setDay, setWeek } from 'date-fns';

export const state = () => ({
    list: [],
});

export const mutations = {
    select: (state, day) => {
        const string = day.toString();
        if (!state.list.includes(string)) state.list.push(string);
    },
    unselect: (state, day) => {
        state.list.splice(state.list.indexOf(day.toString()), 1);
    },
    unselectAll: (state) => {
        state.list = [];
    },
};

export const actions = {
    select({ commit }, day) {
        commit('select', day);
    },
    selectRect({ commit }, params) {
        const { day, selectedFirst } = params;
        const first = Math.min(selectedFirst, day);
        const last = Math.max(selectedFirst, day);

        const interval = eachDayOfInterval({ start: first, end: last });

        const lowestWeek = Math.min(
            ...interval.map((d) => getWeek(d, { weekStartsOn: 1 }))
        );
        const highestWeek = Math.max(
            ...interval.map((d) => getWeek(d, { weekStartsOn: 1 }))
        );

        const lowestDay = Math.min(getDay(selectedFirst), getDay(day));
        const highestDay = Math.max(getDay(selectedFirst), getDay(day));

        commit('unselectAll');

        for (let w = lowestWeek; w <= highestWeek; w += 1) {
            for (let d = lowestDay; d <= highestDay; d += 1) {
                let day = setWeek(new Date(), w);
                day = setDay(day, d);
                day.setHours(0, 0, 0);
                commit('select', day);
            }
        }
    },
    unselect({ commit }, day) {
        commit('unselect', day);
    },
    unselectAll({ commit }) {
        commit('unselectAll');
    },
};

export const getters = {
    selected(state) {
        return state.list;
    },
};