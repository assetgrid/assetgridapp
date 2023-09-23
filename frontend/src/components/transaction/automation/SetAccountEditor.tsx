import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useApi } from "../../../lib/ApiClient";
import { Account } from "../../../models/account";
import { ActionSetAccount } from "../../../models/automation/transactionAutomation";
import InputAccount from "../../account/input/InputAccount";
import InputSelect from "../../input/InputSelect";
import { TransactionActionEditorProps, DefaultTransactionEditorLayout } from "./TransactionActionEditor";

export function SetAccountEditor (props: TransactionActionEditorProps<ActionSetAccount>): React.ReactElement {
    const { t } = useTranslation();
    const { data: account } = useQuery({
        queryKey: ["account", props.action.value],
        queryFn: getAccount
    });
    const api = useApi();
    const accountTypes = [{ key: "source", value: t("transaction.source") }, { key: "destination", value: t("transaction.destination") }];
    const description = props.action.value === null
        ? (props.action.account === "source" ? t("transaction.set_source_account_to_no_account") : t("transaction.set_destination_account_to_no_account"))
        : (props.action.account === "source"
            ? t("transaction.set_source_account_to_value", { value: `#${props.action.value} ${account?.name ?? "…"}` })
            : t("transaction.set_destination_account_to_value", { value: `#${props.action.value} ${account?.name ?? "…"}` }));
    return <DefaultTransactionEditorLayout {...props} description={description}>
        <InputSelect
            items={accountTypes}
            value={props.action.account}
            isFullwidth={true}
            label={t("transaction.source_or_destination")!}
            onChange={value => props.onChange({ ...props.action, account: value as "source" | "destination" })} />
        <InputAccount label={t("transaction.select_account")!}
            value={props.action.value ?? null}
            onChange={value => props.onChange({ ...props.action, value: value?.id ?? null })}
            disabled={props.disabled}
            allowNull={true}
            allowCreateNewAccount={true} />
    </DefaultTransactionEditorLayout>;

    async function getAccount (): Promise<Account | null> {
        if (props.action.value === null) {
            return null;
        }

        const result = await api.Account.search({
            from: 0,
            to: 1,
            query: {
                type: 2,
                query: {
                    column: "Id",
                    operator: 0,
                    value: props.action.value,
                    not: false,
                    metaData: false
                }
            },
            descending: false,
            orderByColumn: "Id"
        });

        if (result.data.totalItems === 0) {
            // No items found. Reset the selection
            return null;
        } else {
            return result.data.data[0];
        }
    }
}
