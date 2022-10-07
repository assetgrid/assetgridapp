import { faTrashCan } from "@fortawesome/free-regular-svg-icons";
import * as React from "react";
import { AndSearchGroup, OrSearchGroup, SearchGroup, SearchGroupType, SearchOperator } from "../../../models/search";
import InputButton from "../../input/InputButton";
import InputIconButton from "../../input/InputIconButton";
import Condition from "./TransactionFilterConditionEditor";

// Inspiration: https://www.npmjs.com/package/comet-awesome-query-builder

interface Props<T1, T2> {
    query: T1
    setQuery: (newQuery: T2) => void
}

export default function TransactionFilterEditor (props: Props<SearchGroup, SearchGroup>): React.ReactElement {
    return <Group query={props.query} setQuery={query => (query != null) && props.setQuery(query)} isParent={true} />;
}

function Group (props: Props<SearchGroup, SearchGroup | null> & { isParent: boolean }): React.ReactElement {
    switch (props.query.type) {
        case SearchGroupType.And:
        case SearchGroupType.Or:
            return <AndOrGroup query={props.query} setQuery={props.setQuery} isParent={props.isParent} />;
        case SearchGroupType.Query:
            if (props.isParent) {
            // Top level SearchGroups must not be queries
                return <AndOrGroup
                    isParent={true}
                    setQuery={props.setQuery}
                    query={{
                        type: SearchGroupType.And,
                        children: [props.query]
                    }} />;
            }
            return <Condition query={props.query.query} setQuery={query => query === null ? props.setQuery(null) : props.setQuery({ type: SearchGroupType.Query, query })}/>;
    }
}

function AndOrGroup (props: Props<AndSearchGroup | OrSearchGroup, SearchGroup | null> & { isParent: boolean }): React.ReactElement {
    return <div className="filter-group">
        <div className="filter-group--header">
            <InputButton className="is-small"
                onClick={() => props.setQuery({ ...props.query, type: props.query.type === SearchGroupType.And ? SearchGroupType.Or : SearchGroupType.And })}>
                {props.query.type === SearchGroupType.And ? <>AND</> : <>OR</>}
            </InputButton>
            {props.query.type === SearchGroupType.And
                ? <div><span>All</span> of the following conditions must be met</div>
                : <div><span>One</span> of the following conditions must be met</div>}
            {!props.isParent && <InputIconButton className="btn-delete" icon={faTrashCan} onClick={() => props.setQuery(null)} />}
        </div>

        <div className="filter-group--children">
            {props.query.children.map((child, i) => <React.Fragment key={i}>
                {i > 0 && (props.query.type === SearchGroupType.And
                    ? <div className="filter-and-or">AND</div>
                    : <div className="filter-and-or">OR</div>)}
                <Group query={child} setQuery={query => setChildQuery(query, i)} isParent={false} />
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

    function addCondition (): void {
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

    function addGroup (): void {
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

    function setChildQuery (query: SearchGroup | null, index: number): void {
        let children: SearchGroup[] = [];
        if (query !== null && !(query.type === SearchGroupType.Query && query.query === null)) {
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
