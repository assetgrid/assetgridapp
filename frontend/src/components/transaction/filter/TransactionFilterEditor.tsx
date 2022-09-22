import * as React from "react";
import { AndSearchGroup, OrSearchGroup, SearchGroup, SearchGroupType, SearchOperator, SearchQuery, SearchRequest } from "../../../models/search";
import Tooltip from "../../common/Tooltip";
import InputButton from "../../input/InputButton";
import Condition from "./TransactionFilterConditionEditor";

// Inspiration: https://www.npmjs.com/package/comet-awesome-query-builder

interface Props<T1, T2> {
    query: T1;
    setQuery: (newQuery: T2) => void;
}

export default function TransactionFilterEditor(props: Props<SearchGroup, SearchGroup>) {
    return <Group query={props.query} setQuery={query => query && props.setQuery(query)} />;
}

function Group(props: Props<SearchGroup, SearchGroup | null>) {
    switch (props.query.type) {
        case SearchGroupType.And:
        case SearchGroupType.Or:
            return <AndOrGroup query={props.query} setQuery={props.setQuery} />;
        case SearchGroupType.Query:
            return <Condition query={props.query.query} setQuery={query => query === null ? props.setQuery(null) : props.setQuery({ type: SearchGroupType.Query, query: query })}/>;
        default:
            throw "Unknown search group";
    }
}

function AndOrGroup(props: Props<AndSearchGroup | OrSearchGroup, SearchGroup>) {
    return <div className="filter-group">
        <div className="filter-group--header">
            <InputButton className="is-small"
                onClick={() => props.setQuery({ ...props.query, type: props.query.type === SearchGroupType.And ? SearchGroupType.Or : SearchGroupType.And })}>
                {props.query.type === SearchGroupType.And ? <>AND</> : <>OR</>}
            </InputButton>
            {props.query.type === SearchGroupType.And
                ?<div><span>All</span> of the following conditions must be met</div>
                : <div><span>One</span> of the following conditions must be met</div>}
        </div>
        
        <div className="filter-group--children">
            {props.query.children.map((child, i) => <React.Fragment key={i}>
                {i > 0 && (props.query.type === SearchGroupType.And
                    ? <div className="filter-and-or">AND</div>
                    : <div className="filter-and-or">OR</div>)}
                <Group query={child} setQuery={query => setChildQuery(query, i)} />
            </React.Fragment>)}
            <div className="buttons">
                <InputButton onClick={() => addCondition()}>
                    Add condition    
                </InputButton>
                <InputButton onClick={() => addGroup()}>
                    Add group    
                </InputButton>
            </div>
        </div>
    </div>;

    function addCondition() {
        props.setQuery({
            ...props.query,
            children: [...props.query.children, {
                type: SearchGroupType.Query,
                query: {
                    column: "Id",
                    not: false,
                    operator: SearchOperator.Equals,
                    value: 0
                }
            }]
        });
    }

    function addGroup() {
        props.setQuery({
            ...props.query,
            children: [...props.query.children, {
                type: props.query.type === SearchGroupType.And ? SearchGroupType.Or : SearchGroupType.And,
                children: [{
                    type: SearchGroupType.Query,
                    query: {
                        column: "Id",
                        not: false,
                        operator: SearchOperator.Equals,
                        value: 0
                    }
                }]
            }]
        });
    }

    function setChildQuery(query: SearchGroup | null, index: number) {
        console.log(query);
        let children: SearchGroup[] = [];
        if (query !== null && ! (query.type === SearchGroupType.Query && query.query === null)) {
            if (query.type === props.query.type) {
                children = query.children;
            } else {
                children = [query];
            }
        }
        props.setQuery({
            ...props.query,
            children: [
                ...props.query.children.slice(0, index),
                ...children,
                ...props.query.children.slice(index + 1)
            ]
        });
    }
}