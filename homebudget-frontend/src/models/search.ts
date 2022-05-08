export type SearchRequest = {
    from: number;
    to: number;
    query?: SearchGroup;
}

export type SearchGroup = {
    type: SearchGroupType.Query;
    query: SearchQuery;
} & {
    type: SearchGroupType.And | SearchGroupType.Or;
    children: SearchGroup[];
}

export type SearchQuery = {
    column: string;
    value: string | number | string[] | number;
    operator: SearchOperator;
    not: boolean;
}

export enum SearchOperator {
    Equals = 1,
    Contains = 2,
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