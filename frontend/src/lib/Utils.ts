import Decimal from "decimal.js";
import { DateTime } from "luxon";
import { Preferences } from "../models/preferences";
import { SearchGroup, SearchGroupType } from "../models/search";
import { User } from "../models/user";

const Utils = {
    arrayToObject,
    groupBy,
    objectMap,
    range
};
export default Utils;

/**
 * Creates an object by mapping through all the elements of the array
 * @param array The array to create an object from
 * @param selector A function taking an array element and returning an array where the
 *                 first item is the key of the object and the second is the value
 * @returns An object
 */
function arrayToObject<A, K extends string | number, V> (array: A[], selector: (item: A) => [K, V]): { [key in string | number]: V } {
    const output: { [key: string]: V } = {};

    for (const item of array) {
        const [key, value] = selector(item);
        output[key.toString()] = value;
    }

    return output;
}

/**
 * Groups the items of the array by a specified key
 * @param array The array to group
 * @param selector A function selecting the key to group by for each array element
 * @returns An object where the key is the group and the value is an array grouped by the selected key
 */
function groupBy<A, K extends string | number, V> (array: A[], selector: (item: A) => [K, V]): { [key in K]: V[] } {
    const output: { [key: string]: V[] } = {};

    for (const item of array) {
        const [key, value] = selector(item);
        if (output[key.toString()] === undefined) {
            output[key.toString()] = [];
        }
        output[key.toString()].push(value);
    }

    return output as { [key in K]: V[] };
}

function objectMap<A, B> (object: { [key: string]: A }, selector: (item: A) => B): { [key: string]: B } {
    const output: { [key: string]: B } = {};
    for (const key of Object.keys(object)) {
        output[key] = selector(object[key]);
    }

    return output;
}

/**
 * Generate a range of integer numbers
 * @param start The beginning of the range (inclusive)
 * @param end The end of the range (inclusive)
 * @returns An array of numbers from start to end
 */
function range (start: number, end: number): number[] {
    const ans = [];
    for (let i = start; i <= end; i++) {
        ans.push(i);
    }
    return ans;
}

/**
 * Creates a class string from an object specifying which classes should be included
 * @param classes An object with the classname as the key and whether to include the class as a value
 * @returns a CSS class string
 */
export function classList (classes: { [className: string]: boolean | undefined }): string {
    return Object.keys(classes)
        .filter(className => classes[className] === true)
        .join(" ");
}

/**
 * Formats a date to a string based on the user preferences
 * @param date The date to format
 * @param user The user whose preferences to use
 * @returns A string representation of the date
 */
export function formatDateWithUser (date: DateTime, user?: User): string {
    return formatDateWithPreferences(date, user?.preferences ?? "fetching");
}

/**
 * Formats a date to a string based on preferences
 * @param date The date to format
 * @param preferences The preferences to use
 * @returns A string representation of the date
 */
export function formatDateWithPreferences (date: DateTime, preferences: Preferences | "fetching"): string {
    if (preferences === "fetching" || preferences.dateFormat === null) {
        return date.toJSDate().toLocaleDateString();
    } else {
        return date.toFormat(preferences.dateFormat);
    }
}

/**
 * Formats a dateTime to a string based on the user preferences
 * @param dateTime The dateTime to format
 * @param user The user whose preferences to use
 * @returns A string representation of the dateTime
 */
export function formatDateTimeWithUser (dateTime: DateTime, user?: User): string {
    return formatDateTimeWithPreferences(dateTime, user?.preferences ?? "fetching");
}

/**
 * Formats a date to a string based on preferences
 * @param dateTime The date to format
 * @param preferences The preferences to use
 * @returns A string representation of the date
 */
export function formatDateTimeWithPreferences (dateTime: DateTime, preferences: Preferences | "fetching"): string {
    if (preferences === "fetching" || preferences.dateTimeFormat === null) {
        return dateTime.toJSDate().toLocaleString();
    } else {
        return dateTime.toFormat(preferences.dateTimeFormat);
    }
}

export function formatNumberWithUser (number: Decimal, user?: User): string {
    return formatNumberWithPreferences(number, user?.preferences ?? "fetching");
}

export function formatNumberWithPreferences (number: Decimal, preferences: Preferences | "fetching"): string {
    let decimalDigits: number = 2;
    let decimalSeparator: string = ".";
    let thousandsSeparator: string = ",";
    if (preferences !== "fetching") {
        decimalDigits = preferences.decimalDigits;
        decimalSeparator = preferences.decimalSeparator;
        thousandsSeparator = preferences.thousandsSeparator;
    }

    return formatNumber(number, decimalDigits, decimalSeparator, thousandsSeparator);
}

export function formatNumber (number: Decimal, decimals: number, decimalSeparator: string, thousandsSeparator: string): string {
    // http://kevin.vanzonneveld.net
    // +   original by: Jonas Raoni Soares Silva (http://www.jsfromhell.com)
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +     bugfix by: Michael White (http://getsprink.com)
    // +     bugfix by: Benjamin Lupton
    // +     bugfix by: Allan Jensen (http://www.winternet.no)
    // +    revised by: Jonas Raoni Soares Silva (http://www.jsfromhell.com)
    // +     bugfix by: Howard Yeend
    // +    revised by: Luke Smith (http://lucassmith.name)
    // +     bugfix by: Diogo Resende
    // +     bugfix by: Rival
    // +      input by: Kheang Hok Chin (http://www.distantia.ca/)
    // +   improved by: davook
    // +   improved by: Brett Zamir (http://brett-zamir.me)
    // +      input by: Jay Klehr
    // +   improved by: Brett Zamir (http://brett-zamir.me)
    // +      input by: Amir Habibi (http://www.residence-mixte.com/)
    // +     bugfix by: Brett Zamir (http://brett-zamir.me)
    // +   improved by: Theriault
    // +   improved by: Drew Noakes
    // +   improved by: Alexander (to work with decimaljs)
    // *     example 1: number_format(1234.56);
    // *     returns 1: '1,235'
    // *     example 2: number_format(1234.56, 2, ',', ' ');
    // *     returns 2: '1 234,56'
    // *     example 3: number_format(1234.5678, 2, '.', '');
    // *     returns 3: '1234.57'
    // *     example 4: number_format(67, 2, ',', '.');
    // *     returns 4: '67,00'
    // *     example 5: number_format(1000);
    // *     returns 5: '1,000'
    // *     example 6: number_format(67.311, 2);
    // *     returns 6: '67.31'
    // *     example 7: number_format(1000.55, 1);
    // *     returns 7: '1,000.6'
    // *     example 8: number_format(67000, 5, ',', '.');
    // *     returns 8: '67.000,00000'
    // *     example 9: number_format(0.9, 0);
    // *     returns 9: '1'
    // *    example 10: number_format('1.20', 2);
    // *    returns 10: '1.20'
    // *    example 11: number_format('1.20', 4);
    // *    returns 11: '1.2000'
    // *    example 12: number_format('1.2000', 3);
    // *    returns 12: '1.200'
    const s = number.toFixed(decimals).split(".");
    if (s[0].length > 3) {
        s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, thousandsSeparator);
    }
    if ((s[1] ?? "").length < decimals) {
        s[1] = s[1] ?? "";
        s[1] += new Array(decimals - s[1].length + 1).join("0");
    }
    return s.join(decimalSeparator);
}

export function debounce<T1 extends (...args: any) => T2, T2 extends void | Promise<void>> (this: any, func: T1, wait?: number): (...args: Parameters<T1>) => void {
    let timeoutId: NodeJS.Timeout | null = null;

    return (...args: Parameters<T1>) => {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const context = this;

        const later = (): void => {
            timeoutId = null;
            void func.apply(context, args);
        };

        const callNow = wait === undefined || wait === 0;

        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }

        if (callNow) {
            void func.apply(context, args);
        } else {
            timeoutId = setTimeout(later, wait);
        }
    };
};

/**
 * A query that allows everything
 */
export const emptyQuery: SearchGroup = {
    type: SearchGroupType.And,
    children: []
};

/**
 * Turn an async function into a function that will fire and forget without waiting for completion
 * @param asyncFunction An async function returning void
 * @returns A function that is still asynchronous but does not expect to be awaited
 */
export function forget (asyncFunction: (...args: any) => Promise<void>): (...args: any) => void {
    return (...args: any) => {
        void asyncFunction(...args);
    };
}
