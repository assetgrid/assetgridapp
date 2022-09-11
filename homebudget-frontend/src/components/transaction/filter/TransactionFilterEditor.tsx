import * as React from "react";
import { AndSearchGroup, OrSearchGroup, SearchGroup, SearchGroupType, SearchOperator, SearchQuery, SearchRequest } from "../../../models/search";
import InputButton from "../../form/InputButton";
import Condition from "./TransactionFilterConditionEditor";

interface Props<T1, T2> {
    query: T1;
    setQuery: (newQuery: T2) => void;
}

export default function TransactionFilterEditor(props: Props<SearchGroup, SearchGroup>) {
    return <Group query={props.query} setQuery={props.setQuery} />;
}

function Group(props: Props<SearchGroup, SearchGroup | null>) {
    switch (props.query.type) {
        case SearchGroupType.And:
        case SearchGroupType.Or:
            return <AndOrGroup query={props.query} setQuery={props.setQuery} />;
        case SearchGroupType.Query:
            return <Condition query={props.query.query} setQuery={query => props.setQuery({ type: SearchGroupType.Query, query: query })}/>;
        default:
            throw "Unknown search group";
    }
}

function AndOrGroup(props: Props<AndSearchGroup | OrSearchGroup, SearchGroup>) {
    return <div className="filter-group">
        {props.query.type === SearchGroupType.And
            ?<div><span>All</span> of the following conditions must be met</div>
            :<div><span>One</span> of the following conditions must be met</div>}
        
        {props.query.children.map((child, i) => <React.Fragment key={i}>
            {i > 0 && (props.query.type === SearchGroupType.And
                ? <div className="filter-and-or" onClick={() => split(i)}>AND</div>
                : <div className="filter-and-or" onClick={() => split(i)}>OR</div>)}
            <Group query={child} setQuery={query => setChildQuery(query, i)} />
        </React.Fragment>)}
        <AddConditionButton onClick={() => addCondition()}/>
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

    function setChildQuery(query: SearchGroup, index: number) {
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

    function split(index: number) {
        let newType: SearchGroupType.And | SearchGroupType.Or = props.query.type === SearchGroupType.And ? SearchGroupType.Or : SearchGroupType.And;
        let beforeChildren = props.query.children.slice(0, index);
        if (beforeChildren.length > 1) {
            beforeChildren = [{ type: props.query.type, children: beforeChildren }];
        }
        beforeChildren = beforeChildren.flatMap(child => child.type === newType ? child.children : [child]);

        let afterChildren = props.query.children.slice(index);
        if (afterChildren.length > 1) {
            afterChildren = [{ type: props.query.type, children: afterChildren }];
        }
        afterChildren = afterChildren.flatMap(child => child.type === newType ? child.children : [child]);
        
        props.setQuery({
            type: newType,
            children: [
                ...beforeChildren,
                ...afterChildren,
            ]
        })
    }
}

function AddConditionButton(props: { onClick: () => void }) {
    return <InputButton onClick={() => props.onClick()}>
        Add condition    
    </InputButton>;
}