export interface ParseOptions {
    trimWhitespace: boolean;

    regex: RegExp | null;
    pattern: string;
}

export function parseWithOptions(input: string, options: ParseOptions): string
{
    let result = input ?? "";

    if (options.regex !== null) {
        let matches = options.regex.exec(input);
        if (matches !== null) {
            result = options.pattern;
            for (let i = 0; i < matches.length; i++) {
                result = result.replace(new RegExp("\\{" + i + "\\}", 'g'), matches[i]);
            }
        } else {
            result = "";
        }
    }

    if (options.trimWhitespace) {
        result = result.trim();
    }

    return result;
}