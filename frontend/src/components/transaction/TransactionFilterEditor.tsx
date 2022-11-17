import { DateTime } from "luxon";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { SearchGroup, SearchOperator } from "../../models/search";
import QueryBuilder from "../search/QueryBuilder";
import { SearchConditionField } from "../search/SearchConditionEditor";
import {
    ConditionValueEditorAccount, ConditionValueEditorCategory, ConditionValueEditorDateTime, ConditionValueEditorDecimal,
    ConditionValueEditorDecimalArray, ConditionValueEditorInteger, ConditionValueEditorIntegerArray,
    ConditionValueEditorText, ConditionValueEditorTextArray
} from "../search/SearchConditionValueEditor";

interface Props {
    disabled: boolean
    query: SearchGroup
    setQuery: (newQuery: SearchGroup) => void
}

export default function TransactionFilterEditor (props: Props): React.ReactElement {
    const { t } = useTranslation();
    const fields: SearchConditionField[] = [{
        key: "Id",
        label: t("transaction.transaction_id"),
        defaultValue: 0,
        operators: [SearchOperator.Equals],
        editor: ConditionValueEditorInteger
    }, {
        key: "Id",
        label: t("transaction.transaction_id"),
        defaultValue: [],
        operators: [SearchOperator.In],
        editor: ConditionValueEditorIntegerArray
    }, {
        key: "SourceAccountId",
        label: t("transaction.source_account"),
        defaultValue: null,
        operators: [SearchOperator.Equals],
        editor: ConditionValueEditorAccount
    }, {
        key: "DestinationAccountId",
        label: t("transaction.destination_account"),
        defaultValue: null,
        operators: [SearchOperator.Equals],
        editor: ConditionValueEditorAccount
    }, {
        key: "DateTime",
        label: t("common.timestamp"),
        defaultValue: DateTime.now().toISO(),
        operators: [SearchOperator.Equals, SearchOperator.GreaterThan, SearchOperator.GreaterThanOrEqual],
        editor: ConditionValueEditorDateTime
    }, {
        key: "Category",
        label: t("common.category"),
        defaultValue: "",
        operators: [SearchOperator.Equals, SearchOperator.Contains],
        editor: ConditionValueEditorCategory
    }, {
        key: "Category",
        label: t("common.category"),
        defaultValue: [],
        operators: [SearchOperator.In],
        editor: ConditionValueEditorTextArray
    }, {
        key: "Description",
        label: t("common.description"),
        defaultValue: "",
        operators: [SearchOperator.Equals, SearchOperator.Contains],
        editor: ConditionValueEditorText
    }, {
        key: "Description",
        label: t("common.description"),
        defaultValue: [],
        operators: [SearchOperator.In],
        editor: ConditionValueEditorTextArray
    }, {
        key: "Total",
        label: t("account.total"),
        defaultValue: 0,
        operators: [SearchOperator.Equals, SearchOperator.GreaterThan, SearchOperator.GreaterThanOrEqual],
        editor: ConditionValueEditorDecimal
    }, {
        key: "Total",
        label: t("account.total"),
        defaultValue: [],
        operators: [SearchOperator.In],
        editor: ConditionValueEditorDecimalArray
    }];

    return <QueryBuilder
        query={props.query}
        disabled={props.disabled}
        setQuery={query => (query != null) && props.setQuery(query)}
        fields={fields} />;
}
