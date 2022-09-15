import Decimal from "decimal.js";
import { Preferences } from "../models/preferences";

const Utils = {
    arrayToObject,
    groupBy,
    objectMap,
    range,
};
export default Utils;

function arrayToObject<A, K extends string | number, V>(array: A[], selector: (item: A) => [K, V]) {
    const output: { [key: string]: V} = {};

    for (const item of array) {
        const [key, value] = selector(item);
        output[key.toString()] = value;
    }

    return output;
}

function groupBy<A, K extends string | number, V>(array: A[], selector: (item: A) => [K, V]) {
    const output: { [key: string]: V[]} = {};

    for (const item of array) {
        const [key, value] = selector(item);
        if (output[key.toString()] === undefined) {
            output[key.toString()] = [];
        }
        output[key.toString()].push(value);
    }

    return output;
}

function objectMap<A, B>(object: { [key: string]: A }, selector: (item: A) => B): { [key: string]: B } {
    const output: { [key: string]: B } = {};
    for (const key of Object.keys(object)) {
        output[key] = selector(object[key]);
    }

    return output;
}

function range(start: number, end: number) {
    const ans = [];
    for (let i = start; i <= end; i++) {
        ans.push(i);
    }
    return ans;
}

export function formatNumberWithPrefs(number: Decimal, preferences: Preferences | "fetching"): string {
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

export function formatNumber(number: Decimal, decimals: number, decimalSeparator: string, thousandsSeparator: string): string {
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
    let s = number.toFixed(decimals).split('.');
    if (s[0].length > 3) {
        s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, thousandsSeparator);
    }
    if ((s[1] || '').length < decimals) {
        s[1] = s[1] || '';
        s[1] += new Array(decimals - s[1].length + 1).join('0');
    }
    return s.join(decimalSeparator);
}

export function debounce(this: any, func: Function, wait: number) {
    let timeoutId: NodeJS.Timeout | null = null;

    return (...args: any[]) => {
        var context = this;

        var later = () => {
            timeoutId = null;
            func.apply(context, args);
        };

        var callNow = ! wait || wait === 0;

        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }

        if (callNow) {
            func.apply(context, args);
        } else {
            timeoutId = setTimeout(later, wait);
        }
    };
};