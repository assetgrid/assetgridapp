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
        column: "Id",
        label: t("transaction.transaction_id"),
        defaultValue: 0,
        operators: [SearchOperator.Equals],
        editor: ConditionValueEditorInteger
    }, {
        column: "Id",
        label: t("transaction.transaction_id"),
        defaultValue: [],
        operators: [SearchOperator.In],
        editor: ConditionValueEditorIntegerArray
    }, {
        column: "SourceAccountId",
        label: t("transaction.source_account"),
        defaultValue: null,
        operators: [SearchOperator.Equals],
        editor: ConditionValueEditorAccount
    }, {
        column: "DestinationAccountId",
        label: t("transaction.destination_account"),
        defaultValue: null,
        operators: [SearchOperator.Equals],
        editor: ConditionValueEditorAccount
    }, {
        column: "DateTime",
        label: t("common.timestamp"),
        defaultValue: DateTime.now().toISO(),
        operators: [SearchOperator.Equals, SearchOperator.GreaterThan, SearchOperator.GreaterThanOrEqual],
        editor: ConditionValueEditorDateTime
    }, {
        column: "Category",
        label: t("common.category"),
        defaultValue: "",
        operators: [SearchOperator.Equals, SearchOperator.Contains],
        editor: ConditionValueEditorCategory
    }, {
        column: "Category",
        label: t("common.category"),
        defaultValue: [],
        operators: [SearchOperator.In],
        editor: ConditionValueEditorTextArray
    }, {
        column: "Description",
        label: t("common.description"),
        defaultValue: "",
        operators: [SearchOperator.Equals, SearchOperator.Contains],
        editor: ConditionValueEditorText
    }, {
        column: "Description",
        label: t("common.description"),
        defaultValue: [],
        operators: [SearchOperator.In],
        editor: ConditionValueEditorTextArray
    }, {
        column: "Total",
        label: t("account.total"),
        defaultValue: 0,
        operators: [SearchOperator.Equals, SearchOperator.GreaterThan, SearchOperator.GreaterThanOrEqual],
        editor: ConditionValueEditorDecimal
    }, {
        column: "Total",
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
