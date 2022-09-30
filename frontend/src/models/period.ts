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
    throw "Unknown period type";
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
    throw "Unknown period type";
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
    throw "Unknown period type";
}

function getRange(period: Period): [DateTime, DateTime] {
    if (period.type === "month") {
        return [period.start.startOf("day"), period.start.plus({ months: 1 }).minus({ days: 1 }).endOf("day")];
    } else if (period.type === "year") {
        return [period.start.startOf("day"), period.start.plus({ years: 1 }).minus({ days: 1 }).endOf("day")];
    } else if (period.type === "custom") {
        return [period.start.startOf("day"), period.end.endOf("day")];
    }
    throw "Unknown period type";
}

function serialize(period: Period): string {
    switch (period.type) {
        case "month":
            return "m" + period.start.toFormat("yyyy-LL-dd");
        case "year":
            return "y" + period.start.toFormat("yyyy-LL-dd");
        case "custom":
            return "c" + period.start.toFormat("yyyy-LL-dd") + "_" + period.end.toFormat("yyyy-LL-dd")
    }
}

function parse(period: string): Period | null {
    if (period.length === 0) {
        return null;
    }

    const firstChar = period.charAt(0);
    if (firstChar === "c") {
        if (period.length < "cyyyy-LL-dd_yyyy-LL-dd".length) {
            return null;
        }

        const start = DateTime.fromFormat(period.substring(1, "_yyyy-LL-dd".length), "yyyy-LL-dd");
        const end = DateTime.fromFormat(period.substring("_yyyy-LL-dd_".length, "_yyyy-LL-dd_yyyy-LL-dd".length), "yyyy-LL-dd");

        if (! start.isValid || ! end.isValid) {
            return null;
        }
        return {
            type: "custom",
            start: start,
            end: end
        }
    } else {
        if (period.length < "_yyyy-LL-dd".length) {
            return null;
        }

        const start = DateTime.fromFormat(period.substring(1, "_yyyy-LL-dd".length), "yyyy-LL-dd");

        if (! start.isValid) {
            return null;
        }
        return {
            type: firstChar === "y" ? "year" : "month",
            start: start
        }
    }
}

export let PeriodFunctions = {
    print,
    increment,
    decrement,
    getRange,
    serialize,
    parse,
}