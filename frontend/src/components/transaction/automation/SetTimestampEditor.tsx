import * as React from "react";
import { DefaultTransactionEditorLayout, TransactionActionEditorProps } from "./TransactionActionEditor";
import InputDateTime from "../../input/InputDateTime";
import { ActionSetTimestmap } from "../../../models/automation/transactionAutomation";
import { useUser } from "../../App";
import { useTranslation } from "react-i18next";
import { formatDateTimeWithUser } from "../../../lib/Utils";

export function SetTimestampEditor (props: TransactionActionEditorProps<ActionSetTimestmap>): React.ReactElement {
    const user = useUser();
    const { t } = useTranslation();
    return <DefaultTransactionEditorLayout {...props}
        description={t("transaction.set_timestamp_to_value", { value: formatDateTimeWithUser(props.action.value, user) })}>
        <InputDateTime label={t("transaction.select_timestamp")!}
            disabled={props.disabled}
            fullwidth={false}
            value={props.action.value}
            onChange={value => props.onChange({ ...props.action, value })} />
    </DefaultTransactionEditorLayout>;
}
