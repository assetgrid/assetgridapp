import * as React from "react";
import { useTranslation } from "react-i18next";
import { formatNumberWithUser } from "../../../lib/Utils";
import { ActionSetAmount } from "../../../models/automation/transactionAutomation";
import { useUser } from "../../App";
import InputNumber from "../../input/InputNumber";
import { TransactionActionEditorProps, DefaultTransactionEditorLayout } from "./TransactionActionEditor";

export function SetAmountEditor (props: TransactionActionEditorProps<ActionSetAmount>): React.ReactElement {
    const user = useUser();
    const { t } = useTranslation();
    return <DefaultTransactionEditorLayout {...props} description={t("transaction.set_total_to_value", { value: formatNumberWithUser(props.action.value, user) })}>
        <InputNumber label={t("transaction.enter_total")!}
            value={props.action.value}
            onChange={value => props.onChange({ ...props.action, value })}
            disabled={props.disabled}
            allowNull={false} />
        <p className="help">{t("transaction.will_not_affect_split_transactions")!}</p>
    </DefaultTransactionEditorLayout>;
}
