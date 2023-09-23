import * as React from "react";
import InputText from "../../input/InputText";
import { useTranslation } from "react-i18next";
import { DefaultTransactionEditorLayout, TransactionActionEditorProps } from "./TransactionActionEditor";
import { ActionSetDescription } from "../../../models/automation/transactionAutomation";

export function SetDescriptionEditor (props: TransactionActionEditorProps<ActionSetDescription>): React.ReactElement {
    const { t } = useTranslation();
    return <DefaultTransactionEditorLayout {...props} description={t("transaction.set_description_to_value", { value: props.action.value })}>
        <InputText label={t("transaction.enter_description")!}
            disabled={props.disabled}
            value={props.action.value}
            onChange={e => props.onChange({ ...props.action, value: e.target.value })} />
    </DefaultTransactionEditorLayout>;
}
