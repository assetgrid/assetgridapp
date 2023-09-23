import * as React from "react";
import { useTranslation } from "react-i18next";
import { ActionDelete } from "../../../models/automation/transactionAutomation";
import { TransactionActionEditorProps, DefaultTransactionEditorLayout } from "./TransactionActionEditor";

export function DeleteEditor (props: TransactionActionEditorProps<ActionDelete>): React.ReactElement {
    const { t } = useTranslation();
    return <DefaultTransactionEditorLayout {...props} description={t("transaction.delete_transactions")!}>
        {t("automation.transaction.warning_will_delete_all_matching")!}
    </DefaultTransactionEditorLayout>;
}
