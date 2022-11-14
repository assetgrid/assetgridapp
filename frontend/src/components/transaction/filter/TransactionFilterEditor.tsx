import { faTrashCan } from "@fortawesome/free-regular-svg-icons";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { AndSearchGroup, OrSearchGroup, SearchGroup, SearchGroupType, SearchOperator } from "../../../models/search";
import InputButton from "../../input/InputButton";
import InputIconButton from "../../input/InputIconButton";
import Condition from "./TransactionFilterConditionEditor";

// Inspiration: https://www.npmjs.com/package/comet-awesome-query-builder

interface Props<T1, T2> {
    query: T1
    setQuery: (newQuery: T2) => void
    disabled: boolean
}

export default function TransactionFilterEditor (props: Props<SearchGroup, SearchGroup>): React.ReactElement {
    return <Group query={props.query}
        disabled={props.disabled}
        setQuery={query => (query != null) && props.setQuery(query)}
        isParent={true} />;
}

function Group (props: Props<SearchGroup, SearchGroup | null> & { isParent: boolean }): React.ReactElement {
    switch (props.query.type) {
        case SearchGroupType.And:
        case SearchGroupType.Or:
            return <AndOrGroup query={props.query} disabled={props.disabled} setQuery={props.setQuery} isParent={props.isParent} />;
        case SearchGroupType.Query:
            if (props.isParent) {
                // Top level SearchGroups must not be queries
                return <AndOrGroup
                    isParent={true}
                    disabled={props.disabled}
                    setQuery={props.setQuery}
                    query={{
                        type: SearchGroupType.And,
                        children: [props.query]
                    }} />;
            }
            return <Condition query={props.query.query}
                disabled={props.disabled}
                setQuery={query => query === null ? props.setQuery(null) : props.setQuery({ type: SearchGroupType.Query, query })} />;
    }
}

function AndOrGroup (props: Props<AndSearchGroup | OrSearchGroup, SearchGroup | null> & { isParent: boolean }): React.ReactElement {
    const { t } = useTranslation();
    return <div className="filter-group">
        <div className="filter-group--header">
            <InputButton className="is-small"
                disabled={props.disabled}
                onClick={() => props.setQuery({ ...props.query, type: props.query.type === SearchGroupType.And ? SearchGroupType.Or : SearchGroupType.And })}>
                {props.query.type === SearchGroupType.And ? <>{t("search.AND")}</> : <>{t("search.OR")}</>}
            </InputButton>
            {props.query.type === SearchGroupType.And
                ? <Trans i18nKey="search.all_conditions_mest"><span>All</span> of the following conditions must be met</Trans>
                : <Trans i18nKey="search.one_condition_met"><span>One</span> of the following conditions must be met</Trans>}
            {!props.isParent && <InputIconButton
                className="btn-delete"
                disabled={props.disabled}
                icon={faTrashCan}
                onClick={() => props.setQuery(null)} />}
        </div>

        <div className="filter-group--children">
            {props.query.children.map((child, i) => <React.Fragment key={i}>
                {i > 0 && (props.query.type === SearchGroupType.And
                    ? <div className="filter-and-or">{t("search.AND")}</div>
                    : <div className="filter-and-or">{t("search.OR")}</div>)}
                <Group disabled={props.disabled} query={child} setQuery={query => setChildQuery(query, i)} isParent={false} />
            </React.Fragment>)}
            <div className="buttons">
                <InputButton disabled={props.disabled} onClick={() => addCondition()}>
                    {t("search.add_condition")}
                </InputButton>
                <InputButton disabled={props.disabled} onClick={() => addGroup()}>
                    {t("search.add_group")}
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
