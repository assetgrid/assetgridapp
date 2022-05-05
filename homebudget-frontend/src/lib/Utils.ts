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
