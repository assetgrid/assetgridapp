import Decimal from "decimal.js";
import { t } from "i18next";
import { DateTime } from "luxon";
import { Account } from "../../../models/account";
import { SearchGroup, SearchGroupType, SearchOperator } from "../../../models/search";

const arrayOperators = [SearchOperator.In] as const;
const numericScalarOperators = [SearchOperator.Equals, SearchOperator.GreaterThan, SearchOperator.GreaterThanOrEqual] as const;
const numericOperators = [SearchOperator.Equals, SearchOperator.GreaterThan, SearchOperator.GreaterThanOrEqual, ...arrayOperators] as const;
const accountOperators = [SearchOperator.Equals] as const;
const dateTimeOperators = [SearchOperator.Equals, SearchOperator.GreaterThan, SearchOperator.GreaterThanOrEqual] as const;
const stringScalarOperators = [SearchOperator.Equals, SearchOperator.Contains] as const;
const stringOperators = [...stringScalarOperators, ...arrayOperators] as const;

export const Operators = [{
    operator: SearchOperator.Equals,
    negated: false,
    label: t("search.equals")
}, {
    operator: SearchOperator.Equals,
    negated: true,
    label: t("search.does_not_equal")
}, {
    operator: SearchOperator.Contains,
    negated: false,
    label: t("search.contains")
}, {
    operator: SearchOperator.Contains,
    negated: true,
    label: t("search.does_not_contain")
}, {
    operator: SearchOperator.GreaterThan,
    negated: false,
    label: t("search.greater_than")
}, {
    operator: SearchOperator.GreaterThanOrEqual,
    negated: false,
    label: t("search.greater_than_or_equal")
}, {
    operator: SearchOperator.GreaterThanOrEqual,
    negated: true,
    label: t("search.less_than")
}, {
    operator: SearchOperator.GreaterThan,
    negated: true,
    label: t("search.less_than_or_equal")
}, {
    operator: SearchOperator.In,
    negated: false,
    label: t("search.in_list_of_values")
}, {
    operator: SearchOperator.In,
    negated: true,
    label: t("search.not_in_list_of_values")
}
] as const;

export type ConditionModel = {
    column: "Id"
    operator: typeof numericScalarOperators[number]
    negated: boolean
    valueType: "number"
    value: number
    onChange: (value: number) => void
} | {
    column: "Id"
    operator: typeof arrayOperators[number]
    negated: boolean
    valueType: "number[]"
    value: number[]
    onChange: (value: number[]) => void
} | {
    column: "Total"
    operator: typeof numericScalarOperators[number]
    negated: boolean
    valueType: "decimal"
    value: Decimal
    onChange: (value: Decimal) => void
} | {
    column: "Total"
    operator: typeof arrayOperators[number]
    negated: boolean
    valueType: "decimal[]"
    value: Decimal[]
    onChange: (value: Decimal[]) => void
} | {
    column: "SourceAccountId" | "DestinationAccountId"
    operator: typeof accountOperators[number]
    negated: boolean
    valueType: "account"
    value: number | null
    onChange: (value: Account | null) => void
} | {
    column: "DateTime"
    operator: typeof dateTimeOperators[number]
    negated: boolean
    valueType: "datetime"
    value: DateTime
    onChange: (value: DateTime) => void
} | {
    column: "Category" | "Description"
    operator: typeof stringScalarOperators[number]
    negated: boolean
    valueType: "string"
    value: string
    onChange: (value: string) => void
} | {
    column: "Category" | "Description"
    operator: typeof arrayOperators[number]
    negated: boolean
    valueType: "string[]"
    value: string[]
    onChange: (value: string[]) => void
};

export function getPossibleOperators (column: ConditionModel["column"]): Array<typeof Operators[number]> {
    switch (column) {
        case "Id":
        case "Total":
            return Operators.filter(op => numericOperators.includes(op.operator as any));
        case "DateTime":
            return Operators.filter(op => dateTimeOperators.includes(op.operator as any));
        case "SourceAccountId":
        case "DestinationAccountId":
            return Operators.filter(op => accountOperators.includes(op.operator as any));
        case "Category":
        case "Description":
            return Operators.filter(op => stringOperators.includes(op.operator as any));
    }
}

export function getValueType (column: ConditionModel["column"], operator: SearchOperator): ConditionModel["valueType"] {
    switch (column) {
        case "Id":
            switch (operator) {
                case SearchOperator.In:
                    return "number[]";
                default:
                    return "number";
            }
        case "Total":
            switch (operator) {
                case SearchOperator.In:
                    return "decimal[]";
                default:
                    return "decimal";
            }
        case "Category":
        case "Description":
            switch (operator) {
                case SearchOperator.In:
                    return "string[]";
                default:
                    return "string";
            }
        case "SourceAccountId":
        case "DestinationAccountId":
            return "account";
        case "DateTime":
            return "datetime";
    }
}

/*
Serialize objects so they can be stored in history state
*/
export function serializeDecimalForHistory (value: Decimal): string {
    return value.toString();
}
export function deserializeDecimalForHistory (value: string): Decimal {
    return new Decimal(value);
}
export function serializeDateTimeForHistory (value: DateTime): string {
    return value.toISO();
}
export function deserializeDateTimeForHistory (value: string): DateTime {
    return DateTime.fromISO(value);
}
export function serializeQueryForHistory (value: SearchGroup): SearchGroup {
    if (value.type === SearchGroupType.Query) {
        const valueType = getValueType(value.query.column as ConditionModel["column"], value.query.operator);
        switch (valueType) {
            case "datetime":
                return {
                    type: value.type,
                    query: {
                        ...value.query,
                        value: serializeDateTimeForHistory(value.query.value as DateTime)
                    }
                };
            case "decimal":
                return {
                    type: value.type,
                    query: {
                        ...value.query,
                        value: serializeDecimalForHistory(value.query.value as Decimal)
                    }
                };
            case "decimal[]":
                return {
                    type: value.type,
                    query: {
                        ...value.query,
                        value: (value.query.value as Decimal[]).map(value => serializeDecimalForHistory(value))
                    }
                };
            default:
                return value;
        }
    } else {
        return {
            type: value.type,
            children: value.children.map(serializeQueryForHistory)
        };
    }
}
export function deserializeQueryForHistory (value: SearchGroup): SearchGroup {
    if (value.type === SearchGroupType.Query) {
        const valueType = getValueType(value.query.column as ConditionModel["column"], value.query.operator);
        switch (valueType) {
            case "datetime":
                return {
                    type: value.type,
                    query: {
                        ...value.query,
                        value: deserializeDateTimeForHistory(value.query.value as string)
                    }
                };
            case "decimal":
                return {
                    type: value.type,
                    query: {
                        ...value.query,
                        value: deserializeDecimalForHistory(value.query.value as string)
                    }
                };
            case "decimal[]":
                return {
                    type: value.type,
                    query: {
                        ...value.query,
                        value: (value.query.value as string[]).map(value => deserializeDecimalForHistory(value))
                    }
                };
            default:
                return value;
        }
    } else {
        return {
            type: value.type,
            children: value.children.map(deserializeQueryForHistory)
        };
    }
}
