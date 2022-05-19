import { DateTime } from "luxon";

export type Period = {
    type: "month";
    start: DateTime;
} | {
    type: "year";
    start: DateTime;
} | {
    type: "custom";
    start: DateTime;
    end: DateTime;
};

function print(period: Period): string {
    if (period.type === "month") {
        if (period.start.day === 1) {
            return period.start.toLocaleString({ month: "long", year: "numeric" });
        } else {
            return period.start.toLocaleString(DateTime.DATE_MED) + " - " +
                period.start.plus({ months: 1 }).minus({ days: 1 }).toLocaleString(DateTime.DATE_MED);
        }
    } else if (period.type === "year") {
        if (period.start.day === 1 && period.start.month == 1) {
            return period.start.toLocaleString({ year: "numeric" })
        } else {
            return period.start.toLocaleString(DateTime.DATE_MED) + " - " +
                period.start.plus({ years: 1 }).minus({ days: 1 }).toLocaleString(DateTime.DATE_MED);
        }
    } else if (period.type === "custom") {
        return period.start.toLocaleString(DateTime.DATE_MED) + " - " +
            period.end.toLocaleString(DateTime.DATE_MED);
    }
}

function increment(period: Period): Period {
    if (period.type === "month") {
        return {
            ...period,
            start: period.start.plus({ months: 1 }),
        };
    } else if (period.type === "year") {
        return {
            ...period,
            start: period.start.plus({ years: 1 }),
        };
    } else if (period.type === "custom") {
        return {
            ...period,
            start: period.start.plus({ days: Math.floor(period.end.diff(period.start, "days").days) + 1 }),
            end: period.end.plus({ days: Math.floor(period.end.diff(period.start, "days").days) + 1 }),
        };
    }
}

function decrement(period: Period): Period {
    if (period.type === "month") {
        return {
            ...period,
            start: period.start.minus({ months: 1 }),
        };
    } else if (period.type === "year") {
        return {
            ...period,
            start: period.start.minus({ years: 1 }),
        };
    } else if (period.type === "custom") {
        return {
            ...period,
            start: period.start.minus({ days: Math.floor(period.end.diff(period.start, "days").days) + 1 }),
            end: period.end.minus({ days: Math.floor(period.end.diff(period.start, "days").days) + 1 }),
        };
    }
}

function getRange(period: Period): [DateTime, DateTime] {
    if (period.type === "month") {
        return [period.start, period.start.plus({ months: 1 }).minus({ days: 1 })];
    } else if (period.type === "year") {
        return [period.start, period.start.plus({ years: 1 }).minus({ days: 1 })];
    } else if (period.type === "custom") {
        return [period.start, period.end];
    }
}

export let PeriodFunctions = {
    print,
    increment,
    decrement,
    getRange
}