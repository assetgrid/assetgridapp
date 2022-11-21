import * as React from "react";
import { SearchGroup, SearchQuery } from "../../models/search";
import { SearchConditionField } from "./SearchConditionEditor";
import { SearchGroupEditor } from "./SearchGroupEditor";

interface Props {
    query: SearchGroup
    disabled: boolean
    setQuery: (newQuery: SearchGroup) => void
    fields: SearchConditionField[]
}

export interface ConditionComponentProps {
    disabled: boolean
    model: SearchQuery
    onChange: (newValue: SearchQuery | null) => void
}

export default function QueryBuilder (props: Props): React.ReactElement {
    return <SearchGroupEditor model={props.query}
        disabled={props.disabled}
        onChange={query => props.setQuery(query)}
        fields={props.fields}
    />;
}
