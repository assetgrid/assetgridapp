import Decimal from "decimal.js";
import { DateTime } from "luxon";

export type SearchRequest = {
    from: number;
    to: number;
    query?: SearchGroup;
}

export type SearchGroup = {
    type: SearchGroupType.Query;
    query: SearchQuery;
} | AndSearchGroup | OrSearchGroup;

export type AndSearchGroup = {
    type: SearchGroupType.And;
    children: SearchGroup[];
}

export type OrSearchGroup = {
    type: SearchGroupType.Or;
    children: SearchGroup[];
}

export type SearchQuery = {
    column: string;
    value: string | number | Decimal | DateTime | string[] | number[] | Decimal[];
    operator: SearchOperator;
    not: boolean;
}

export enum SearchOperator {
    Equals = 0,
    Contains = 1,
    In = 2,
    GreaterThan = 3,
    GreaterThanOrEqual = 4,
}

export enum SearchGroupType {
    Or = 0,
    And = 1,
    Query = 2,
}

export type SearchResponse<T> = {
    data: T[];
    totalItems: number;
}
