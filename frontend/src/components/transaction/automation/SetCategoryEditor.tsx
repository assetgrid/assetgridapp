import { useTranslation } from "react-i18next";
import { ActionSetCategory } from "../../../models/automation/transactionAutomation";
import InputCategory from "../../input/InputCategory";
import { TransactionActionEditorProps, DefaultTransactionEditorLayout } from "./TransactionActionEditor";
import * as React from "react";

export function SetCategoryEditor (props: TransactionActionEditorProps<ActionSetCategory>): React.ReactElement {
    const { t } = useTranslation();
    return <DefaultTransactionEditorLayout {...props} description={t("transaction.set_category_to_value", { value: props.action.value })}>
        <InputCategory label="Enter category"
            value={props.action.value}
            onChange={value => props.onChange({ ...props.action, value })}
            disabled={props.disabled} />
        <p className="help">{t("transaction.will_set_category_for_all_lines_on_split")!}</p>
    </DefaultTransactionEditorLayout>;
}
