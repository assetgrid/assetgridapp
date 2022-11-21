import { faTrashCan } from "@fortawesome/free-regular-svg-icons";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { SearchGroup, SearchGroupType, SearchOperator } from "../../models/search";
import InputButton from "../input/InputButton";
import InputIconButton from "../input/InputIconButton";
import SearchConditionEditor, { SearchConditionField } from "./SearchConditionEditor";

interface Props {
    disabled: boolean
    model: SearchGroup
    onChange: (value: SearchGroup) => void
    delete?: () => void
    fields: SearchConditionField[]
}

export function SearchGroupEditor (props: Props): React.ReactElement {
    switch (props.model.type) {
        case SearchGroupType.And:
        case SearchGroupType.Or:
            return <AndOrGroup
                model={props.model}
                disabled={props.disabled}
                onChange={props.onChange}
                delete={props.delete}
                fields={props.fields}
            />;
        case SearchGroupType.Query:
            if (props.delete === undefined) {
                // Top level SearchGroups must not be queries
                return <AndOrGroup
                    disabled={props.disabled}
                    onChange={props.onChange}
                    delete={props.delete}
                    fields={props.fields}
                    model={{
                        type: SearchGroupType.And,
                        children: [props.model]
                    }} />;
            }
            return <SearchConditionEditor
                model={props.model.query}
                disabled={props.disabled}
                onChange={model => props.onChange({ type: SearchGroupType.Query, query: model })}
                fields={props.fields}
                delete={props.delete}
            />;
    }
}

interface AndOrGroupProps {
    disabled: boolean
    model: SearchGroup & { type: SearchGroupType.And | SearchGroupType.Or }
    onChange: (value: SearchGroup & { type: SearchGroupType.And | SearchGroupType.Or }) => void
    delete?: () => void
    fields: SearchConditionField[]
}
function AndOrGroup (props: AndOrGroupProps): React.ReactElement {
    const { t } = useTranslation();
    return <div className="filter-group">
        <div className="filter-group--header">
            <InputButton className="is-small"
                disabled={props.disabled}
                onClick={() => props.onChange({ ...props.model, type: props.model.type === SearchGroupType.And ? SearchGroupType.Or : SearchGroupType.And })}>
                {props.model.type === SearchGroupType.And ? <>{t("search.AND")}</> : <>{t("search.OR")}</>}
            </InputButton>
            {props.model.type === SearchGroupType.And
                ? <Trans i18nKey="search.all_conditions_mest"><span>All</span> of the following conditions must be met</Trans>
                : <Trans i18nKey="search.one_condition_met"><span>One</span> of the following conditions must be met</Trans>}
            {props.delete !== undefined && <InputIconButton
                className="btn-delete"
                disabled={props.disabled}
                icon={faTrashCan}
                onClick={props.delete} />}
        </div>

        <div className="filter-group--children">
            {props.model.children.map((child, i) => <React.Fragment key={i}>
                {i > 0 && (props.model.type === SearchGroupType.And
                    ? <div className="filter-and-or">{t("search.AND")}</div>
                    : <div className="filter-and-or">{t("search.OR")}</div>)}
                <SearchGroupEditor
                    disabled={props.disabled}
                    model={child}
                    fields={props.fields}
                    onChange={query => setChildQuery(query, i)}
                    delete={() => setChildQuery(null, i)} />
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
        props.onChange({
            ...props.model,
            children: [...props.model.children, {
                type: SearchGroupType.Query,
                query: {
                    column: "Id",
                    not: false,
                    operator: SearchOperator.Equals,
                    value: 0,
                    metaData: false
                }
            }]
        });
    }

    function addGroup (): void {
        props.onChange({
            ...props.model,
            children: [...props.model.children, {
                type: props.model.type === SearchGroupType.And ? SearchGroupType.Or : SearchGroupType.And,
                children: [{
                    type: SearchGroupType.Query,
                    query: {
                        column: "Id",
                        not: false,
                        operator: SearchOperator.Equals,
                        value: 0,
                        metaData: false
                    }
                }]
            }]
        });
    }

    function setChildQuery (query: SearchGroup | null, index: number): void {
        let children: SearchGroup[] = [];
        if (query !== null && !(query.type === SearchGroupType.Query && query.query === null)) {
            if (query.type === props.model.type) {
                children = query.children;
            } else {
                children = [query];
            }
        }
        props.onChange({
            ...props.model,
            children: [
                ...props.model.children.slice(0, index),
                ...children,
                ...props.model.children.slice(index + 1)
            ]
        });
    }
}
